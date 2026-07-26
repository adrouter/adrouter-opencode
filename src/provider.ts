import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  LanguageModelV3Usage,
} from "@ai-sdk/provider";
import type {
  AdRouterProviderMetadataV1,
  AdRouterProviderOptions,
  AdRouterUsage,
} from "./contracts.js";
import { type ResolvedAdRouterConfig, resolveConfig } from "./transport/config.js";
import {
  AdRouterProtocolError,
  assistantContent,
  finishReason,
  MAX_TOTAL_RESPONSE_BYTES,
  metadata,
  ndjsonLines,
  normalizeOutcome,
  type ParsedToolCall,
  parseAds,
  parseInjection,
  parseSettlement,
  parseToolCalls,
  parseUsage,
  type RouterPayload,
  sanitizeText,
  turnId,
} from "./transport/parse.js";
import { buildNativeContext } from "./transport/prompt.js";

export interface AdRouterProvider {
  readonly specificationVersion: "v3";
  languageModel(modelId: string): LanguageModelV3;
}

interface StreamState {
  snapshot: AdRouterProviderMetadataV1;
  text: string;
  reasoning: string;
  textStarted: boolean;
  reasoningStarted: boolean;
  attachedMetadata: boolean;
  done: boolean;
  usage: LanguageModelV3Usage;
  publicUsage: AdRouterUsage;
  tools: Map<string, ParsedToolCall>;
}

const EMPTY_USAGE: LanguageModelV3Usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
};

const EMPTY_PUBLIC_USAGE: AdRouterUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
const RESPONSE_HEADER_TIMEOUT_MS = 30_000;
const MAX_ERROR_BODY_BYTES = 64 * 1024;
const PROTECTED_HEADERS = new Set(["accept", "authorization", "content-type"]);

function initialState(): StreamState {
  return {
    snapshot: { version: 1, sequence: 0, phase: "streaming", status: "degraded", ads: [] },
    text: "",
    reasoning: "",
    textStarted: false,
    reasoningStarted: false,
    attachedMetadata: false,
    done: false,
    usage: EMPTY_USAGE,
    publicUsage: EMPTY_PUBLIC_USAGE,
    tools: new Map(),
  };
}

function nextSnapshot(
  state: StreamState,
  patch: Partial<Omit<AdRouterProviderMetadataV1, "version" | "sequence">>,
): void {
  state.snapshot = {
    ...state.snapshot,
    ...patch,
    version: 1,
    sequence: state.snapshot.sequence + 1,
  };
}

function firstMetadata(state: StreamState) {
  if (state.attachedMetadata) return undefined;
  state.attachedMetadata = true;
  return metadata(state.snapshot);
}

function reasoningLevel(options: LanguageModelV3CallOptions): "none" | "medium" | "high" {
  const provider = options.providerOptions?.adrouter;
  const value = provider?.thinkingLevel ?? provider?.reasoning;
  if (value === "none" || value === "off" || value === "minimal") return "none";
  if (value === "high" || value === "xhigh" || value === "max") return "high";
  return "medium";
}

function bodyFor(
  requestedModel: string,
  config: ResolvedAdRouterConfig,
  call: LanguageModelV3CallOptions,
): Record<string, unknown> {
  return {
    model: config.model || requestedModel,
    thinking_level: reasoningLevel(call),
    ...(!config.hosted ? { runtime_mode: config.runtimeMode } : {}),
    context: buildNativeContext(call),
    metadata: {
      client: "adrouter-opencode",
      workspace: config.workspace,
      ad_mode: config.adMode,
      ads_enabled: config.adsEnabled,
      min_ad_tier: config.minimumTier,
    },
    max_output_tokens: config.maxOutputTokens,
  };
}

async function readLimitedBody(response: Response, limit: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > limit) {
        throw new AdRouterProtocolError("response body exceeded its size limit.");
      }
      text += decoder.decode(item.value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

async function providerError(response: Response): Promise<Error> {
  let message = "";
  try {
    const value = await readLimitedBody(response, MAX_ERROR_BODY_BYTES);
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      message = sanitizeText(parsed.error ?? parsed.message);
    } catch {
      message = sanitizeText(value);
    }
  } catch (error) {
    if (error instanceof AdRouterProtocolError) return error;
    // Ignore an unreadable error response.
  }
  const safe = message.slice(0, 500) || response.statusText || "request failed";
  return new Error(`AdRouter request failed (${response.status}): ${safe}`);
}

async function request(
  requestedModel: string,
  providerOptions: AdRouterProviderOptions,
  call: LanguageModelV3CallOptions,
): Promise<{ response: Response; config: ResolvedAdRouterConfig; cleanup: () => void }> {
  const config = resolveConfig(requestedModel, providerOptions, call.maxOutputTokens);
  const headers = new Headers(config.headers);
  for (const [key, value] of Object.entries(call.headers ?? {})) {
    if (value !== undefined && !PROTECTED_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  }
  const controller = new AbortController();
  const abort = () => controller.abort(call.abortSignal?.reason);
  call.abortSignal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () => controller.abort("response-header-timeout"),
    RESPONSE_HEADER_TIMEOUT_MS,
  );
  let response: Response;
  try {
    response = await config.fetch(`${config.baseURL}/v1/agent/turn`, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyFor(requestedModel, config, call)),
      redirect: "manual",
      signal: controller.signal,
    });
  } catch (error) {
    call.abortSignal?.removeEventListener("abort", abort);
    if (controller.signal.reason === "response-header-timeout") {
      throw new AdRouterProtocolError("response header timeout.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel().catch(() => undefined);
    call.abortSignal?.removeEventListener("abort", abort);
    throw new AdRouterProtocolError("authenticated requests must not redirect.");
  }
  if (!response.ok) {
    const error = await providerError(response);
    call.abortSignal?.removeEventListener("abort", abort);
    throw error;
  }
  return {
    response,
    config,
    cleanup: () => call.abortSignal?.removeEventListener("abort", abort),
  };
}

function enqueueText(
  controller: ReadableStreamDefaultController<LanguageModelV3StreamPart>,
  state: StreamState,
  delta: string,
): void {
  if (!delta) return;
  if (!state.textStarted) {
    state.textStarted = true;
    const providerMetadata = firstMetadata(state);
    controller.enqueue({
      type: "text-start",
      id: "adrouter-text",
      ...(providerMetadata ? { providerMetadata } : {}),
    });
  }
  state.text += delta;
  controller.enqueue({ type: "text-delta", id: "adrouter-text", delta });
}

function enqueueReasoning(
  controller: ReadableStreamDefaultController<LanguageModelV3StreamPart>,
  state: StreamState,
  delta: string,
): void {
  if (!delta) return;
  if (!state.reasoningStarted) {
    state.reasoningStarted = true;
    const providerMetadata = firstMetadata(state);
    controller.enqueue({
      type: "reasoning-start",
      id: "adrouter-reasoning",
      ...(providerMetadata ? { providerMetadata } : {}),
    });
  }
  state.reasoning += delta;
  controller.enqueue({ type: "reasoning-delta", id: "adrouter-reasoning", delta });
}

function enqueueTool(
  controller: ReadableStreamDefaultController<LanguageModelV3StreamPart>,
  state: StreamState,
  tool: ParsedToolCall,
): void {
  const prior = state.tools.get(tool.id);
  if (prior) {
    if (prior.name !== tool.name || prior.input !== tool.input) {
      throw new Error(`AdRouter returned conflicting tool calls with ID ${tool.id}.`);
    }
    return;
  }
  state.tools.set(tool.id, tool);
  const providerMetadata = firstMetadata(state);
  controller.enqueue({
    type: "tool-input-start",
    id: tool.id,
    toolName: tool.name,
    ...(providerMetadata ? { providerMetadata } : {}),
  });
  controller.enqueue({ type: "tool-input-delta", id: tool.id, delta: tool.input });
  controller.enqueue({ type: "tool-input-end", id: tool.id });
  controller.enqueue({
    type: "tool-call",
    toolCallId: tool.id,
    toolName: tool.name,
    input: tool.input,
  });
}

function reconcile(
  current: string,
  authoritative: string,
  label: string,
  emit: (suffix: string) => void,
): void {
  if (!authoritative || authoritative === current) return;
  if (!authoritative.startsWith(current)) {
    throw new Error(`AdRouter ${label} snapshot diverged from the streamed ${label}.`);
  }
  emit(authoritative.slice(current.length));
}

function applyAd(state: StreamState, payload: RouterPayload, config: ResolvedAdRouterConfig): void {
  const outcome = normalizeOutcome(
    parseAds(payload.ads, payload.ad),
    payload.status,
    config.adMode,
    config.adsEnabled,
  );
  const id = turnId(payload);
  const injection = parseInjection(payload.injection);
  nextSnapshot(state, {
    phase: "routed",
    status: outcome.status,
    ads: outcome.ads,
    ...(id ? { turnId: id } : {}),
    ...(injection ? { injection } : {}),
  });
}

function applySettlement(state: StreamState, payload: RouterPayload): void {
  const usage = parseUsage(payload.usage);
  state.usage = usage.sdk;
  state.publicUsage = usage.public;
  const id = turnId(payload);
  const settlement = parseSettlement(payload.settlement);
  nextSnapshot(state, {
    phase: "settled",
    ...(id ? { turnId: id } : {}),
    ...(settlement ? { settlement } : {}),
    usage: usage.public,
  });
}

function emitPayload(
  controller: ReadableStreamDefaultController<LanguageModelV3StreamPart>,
  state: StreamState,
  payload: RouterPayload,
  config: ResolvedAdRouterConfig,
): void {
  switch (payload.type) {
    case "ad":
      applyAd(state, payload, config);
      return;
    case "text":
      enqueueText(
        controller,
        state,
        typeof (payload.content ?? payload.delta) === "string"
          ? String(payload.content ?? payload.delta)
          : "",
      );
      return;
    case "thinking":
      enqueueReasoning(
        controller,
        state,
        typeof (payload.content ?? payload.delta) === "string"
          ? String(payload.content ?? payload.delta)
          : "",
      );
      return;
    case "tool_call":
      for (const tool of parseToolCalls([payload.tool_call])) enqueueTool(controller, state, tool);
      return;
    case "settlement":
      applySettlement(state, payload);
      return;
    case "done": {
      const final = assistantContent(payload);
      reconcile(state.reasoning, final.reasoning, "reasoning", (suffix) =>
        enqueueReasoning(controller, state, suffix),
      );
      reconcile(state.text, final.text, "text", (suffix) => enqueueText(controller, state, suffix));
      for (const tool of final.tools) enqueueTool(controller, state, tool);
      state.done = true;
      nextSnapshot(state, { phase: "done" });
      return;
    }
    case "error": {
      const message = sanitizeText(payload.message, "AdRouter stream error");
      nextSnapshot(state, { phase: "error", status: "degraded", ads: [], error: message });
      throw new Error(message);
    }
    default:
      return;
  }
}

function finishStream(
  controller: ReadableStreamDefaultController<LanguageModelV3StreamPart>,
  state: StreamState,
): void {
  const finalMetadata = metadata(state.snapshot);
  if (state.reasoningStarted) {
    controller.enqueue({
      type: "reasoning-end",
      id: "adrouter-reasoning",
      ...(!state.textStarted ? { providerMetadata: finalMetadata } : {}),
    });
  }
  if (state.textStarted) {
    controller.enqueue({ type: "text-end", id: "adrouter-text", providerMetadata: finalMetadata });
  } else if (!state.reasoningStarted) {
    // OpenCode persists provider metadata on content parts. An empty text part is
    // a display-neutral carrier for tool-only and otherwise empty responses.
    controller.enqueue({
      type: "text-start",
      id: "adrouter-metadata",
      providerMetadata: finalMetadata,
    });
    controller.enqueue({
      type: "text-end",
      id: "adrouter-metadata",
      providerMetadata: finalMetadata,
    });
  }
  controller.enqueue({
    type: "finish",
    usage: state.usage,
    finishReason:
      state.snapshot.phase === "error"
        ? { unified: "error", raw: "error" }
        : finishReason(state.tools.size > 0),
    providerMetadata: finalMetadata,
  });
}

function errorStream(error: unknown): LanguageModelV3StreamResult {
  const message = sanitizeText(
    error instanceof Error ? error.message : error,
    "AdRouter request failed",
  );
  const snapshot: AdRouterProviderMetadataV1 = {
    version: 1,
    sequence: 1,
    phase: "error",
    status: "degraded",
    ads: [],
    error: message,
  };
  return {
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "stream-start", warnings: [] });
        controller.enqueue({ type: "error", error: new Error(message) });
        controller.enqueue({
          type: "finish",
          usage: EMPTY_USAGE,
          finishReason: { unified: "error", raw: "error" },
          providerMetadata: metadata(snapshot),
        });
        controller.close();
      },
    }),
  };
}

async function streamModel(
  requestedModel: string,
  providerOptions: AdRouterProviderOptions,
  call: LanguageModelV3CallOptions,
): Promise<LanguageModelV3StreamResult> {
  let requested: Awaited<ReturnType<typeof request>>;
  try {
    requested = await request(requestedModel, providerOptions, call);
  } catch (error) {
    return errorStream(error);
  }
  const { response, config, cleanup } = requested;
  const responseHeaders = Object.fromEntries(response.headers.entries());
  return {
    response: { headers: responseHeaders },
    stream: new ReadableStream<LanguageModelV3StreamPart>({
      async start(controller) {
        const state = initialState();
        controller.enqueue({ type: "stream-start", warnings: [] });
        try {
          const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
          if (contentType.includes("application/x-ndjson") && response.body) {
            for await (const payload of ndjsonLines(response.body))
              emitPayload(controller, state, payload, config);
            if (!state.done)
              throw new Error("AdRouter stream ended without an authoritative done event.");
          } else {
            const raw = await readLimitedBody(response, MAX_TOTAL_RESPONSE_BYTES);
            let payload: RouterPayload;
            try {
              payload = JSON.parse(raw) as RouterPayload;
            } catch {
              throw new AdRouterProtocolError("response contained malformed JSON.");
            }
            applyAd(state, payload, config);
            if (payload.settlement || payload.usage) applySettlement(state, payload);
            const final = assistantContent(payload);
            enqueueReasoning(controller, state, final.reasoning);
            enqueueText(controller, state, final.text);
            for (const tool of final.tools) enqueueTool(controller, state, tool);
            state.done = true;
            nextSnapshot(state, { phase: "done" });
          }
          finishStream(controller, state);
        } catch (error) {
          const message = sanitizeText(
            error instanceof Error ? error.message : error,
            "AdRouter protocol error",
          );
          nextSnapshot(state, { phase: "error", status: "degraded", ads: [], error: message });
          controller.enqueue({ type: "error", error: new Error(message) });
          finishStream(controller, state);
        } finally {
          cleanup();
          controller.close();
        }
      },
    }),
  };
}

async function generateModel(
  model: LanguageModelV3,
  call: LanguageModelV3CallOptions,
): Promise<LanguageModelV3GenerateResult> {
  const { stream, response } = await model.doStream(call);
  const content: LanguageModelV3Content[] = [];
  const indexes = new Map<string, number>();
  let usage = EMPTY_USAGE;
  let finish = finishReason(false);
  let providerMetadata: LanguageModelV3GenerateResult["providerMetadata"];

  const reader = stream.getReader();
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    const part = item.value;
    if (part.type === "text-start") {
      indexes.set(`text:${part.id}`, content.length);
      content.push({
        type: "text",
        text: "",
        ...(part.providerMetadata ? { providerMetadata: part.providerMetadata } : {}),
      });
    } else if (part.type === "text-delta") {
      const index = indexes.get(`text:${part.id}`);
      const current = index === undefined ? undefined : content[index];
      if (current?.type === "text") current.text += part.delta;
    } else if (part.type === "text-end") {
      const index = indexes.get(`text:${part.id}`);
      const current = index === undefined ? undefined : content[index];
      if (current?.type === "text" && part.providerMetadata)
        current.providerMetadata = part.providerMetadata;
    } else if (part.type === "reasoning-start") {
      indexes.set(`reasoning:${part.id}`, content.length);
      content.push({
        type: "reasoning",
        text: "",
        ...(part.providerMetadata ? { providerMetadata: part.providerMetadata } : {}),
      });
    } else if (part.type === "reasoning-delta") {
      const index = indexes.get(`reasoning:${part.id}`);
      const current = index === undefined ? undefined : content[index];
      if (current?.type === "reasoning") current.text += part.delta;
    } else if (part.type === "reasoning-end") {
      const index = indexes.get(`reasoning:${part.id}`);
      const current = index === undefined ? undefined : content[index];
      if (current?.type === "reasoning" && part.providerMetadata)
        current.providerMetadata = part.providerMetadata;
    } else if (part.type === "tool-call") {
      content.push(part);
    } else if (part.type === "finish") {
      usage = part.usage;
      finish = part.finishReason;
      providerMetadata = part.providerMetadata;
    } else if (part.type === "error") {
      throw part.error;
    }
  }
  reader.releaseLock();
  return {
    content: content.filter(
      (part) => !((part.type === "text" || part.type === "reasoning") && part.text.length === 0),
    ),
    usage,
    finishReason: finish,
    ...(providerMetadata ? { providerMetadata } : {}),
    ...(response
      ? { response: { ...(response.headers ? { headers: response.headers } : {}) } }
      : {}),
    warnings: [],
  };
}

export function createAdRouter(options: AdRouterProviderOptions = {}): AdRouterProvider {
  return {
    specificationVersion: "v3",
    languageModel(modelId: string): LanguageModelV3 {
      const model: LanguageModelV3 = {
        specificationVersion: "v3",
        provider: "adrouter",
        modelId,
        supportedUrls: {},
        doStream: (call) => streamModel(modelId, options, call),
        doGenerate: (call) => generateModel(model, call),
      };
      return model;
    },
  };
}
