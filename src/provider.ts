import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  LanguageModelV3Usage,
} from "@ai-sdk/provider";
import { defaultThinkingLevel } from "./catalog.js";
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
  readWithIdleTimeout,
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
  adReceived: boolean;
  earlyAd: boolean;
  settlementReceived: boolean;
  done: boolean;
  usage: LanguageModelV3Usage;
  publicUsage: AdRouterUsage;
  tools: Map<string, ParsedToolCall>;
  pendingTools: Map<string, ParsedToolCall>;
}

const EMPTY_USAGE: LanguageModelV3Usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
};

const EMPTY_PUBLIC_USAGE: AdRouterUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
const RESPONSE_HEADER_TIMEOUT_MS = 30_000;
const RESPONSE_TOTAL_TIMEOUT_MS = 10 * 60_000;
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
    adReceived: false,
    earlyAd: false,
    settlementReceived: false,
    done: false,
    usage: EMPTY_USAGE,
    publicUsage: EMPTY_PUBLIC_USAGE,
    tools: new Map(),
    pendingTools: new Map(),
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

function reasoningLevel(
  modelId: string,
  options: LanguageModelV3CallOptions,
): "none" | "medium" | "high" {
  const provider = options.providerOptions?.adrouter;
  const value = provider?.thinkingLevel ?? provider?.reasoning;
  if (value === "none" || value === "off" || value === "minimal") return "none";
  if (value === "high" || value === "xhigh" || value === "max") return "high";
  return defaultThinkingLevel(modelId);
}

function bodyFor(
  requestedModel: string,
  config: ResolvedAdRouterConfig,
  call: LanguageModelV3CallOptions,
): Record<string, unknown> {
  const selectedModel = config.model || requestedModel;
  return {
    model: selectedModel,
    thinking_level: reasoningLevel(selectedModel, call),
    ad_delivery: "stream_start",
    context: buildNativeContext(call),
    max_output_tokens: config.maxOutputTokens,
  };
}

async function readLimitedBody(
  response: Response,
  limit: number,
  signal?: AbortSignal,
): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const item = await readWithIdleTimeout(reader, signal);
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

async function providerError(response: Response, signal: AbortSignal): Promise<Error> {
  let message = "";
  let code = "";
  let issue = "";
  try {
    const value = await readLimitedBody(response, MAX_ERROR_BODY_BYTES, signal);
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      message = sanitizeText(parsed.error ?? parsed.message);
      if (typeof parsed.code === "string" && /^[a-z][a-z0-9_]{0,63}$/.test(parsed.code)) {
        code = parsed.code;
      }
      const details = parsed.details;
      if (details && typeof details === "object" && !Array.isArray(details)) {
        const issues = (details as Record<string, unknown>).issues;
        const first = Array.isArray(issues) ? issues[0] : undefined;
        if (first && typeof first === "object" && !Array.isArray(first)) {
          const record = first as Record<string, unknown>;
          const path =
            typeof record.path === "string" && /^[A-Za-z0-9_.-]{1,256}$/.test(record.path)
              ? record.path
              : "";
          const issueCode =
            typeof record.code === "string" && /^[a-z][a-z0-9_]{0,63}$/.test(record.code)
              ? record.code
              : "";
          issue = [path ? `at ${path}` : "", issueCode ? `[${issueCode}]` : ""]
            .filter(Boolean)
            .join(" ");
        }
      }
    } catch {
      message = sanitizeText(value);
    }
  } catch (error) {
    if (error instanceof AdRouterProtocolError) return error;
    // Ignore an unreadable error response.
  }
  const safe = message.slice(0, 500) || response.statusText || "request failed";
  const qualifier = [code, issue].filter(Boolean).join(" ");
  return new Error(
    `AdRouter request failed (${response.status}${qualifier ? `, ${qualifier}` : ""}): ${safe}`,
  );
}

async function request(
  requestedModel: string,
  providerOptions: AdRouterProviderOptions,
  call: LanguageModelV3CallOptions,
): Promise<{
  response: Response;
  config: ResolvedAdRouterConfig;
  signal: AbortSignal;
  cleanup: () => void;
}> {
  const config = resolveConfig(requestedModel, providerOptions, call.maxOutputTokens);
  const headers = new Headers(config.headers);
  for (const [key, value] of Object.entries(call.headers ?? {})) {
    if (value !== undefined && !PROTECTED_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  }
  const controller = new AbortController();
  const abort = () => controller.abort(call.abortSignal?.reason);
  call.abortSignal?.addEventListener("abort", abort, { once: true });
  const totalTimer = setTimeout(
    () => controller.abort("response-total-timeout"),
    RESPONSE_TOTAL_TIMEOUT_MS,
  );
  const cleanup = () => {
    clearTimeout(totalTimer);
    call.abortSignal?.removeEventListener("abort", abort);
  };
  const headerTimer = setTimeout(
    () => controller.abort("response-header-timeout"),
    RESPONSE_HEADER_TIMEOUT_MS,
  );
  let response: Response;
  try {
    response = await config.fetch(`${config.baseURL}/v1/integrations/turn`, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyFor(requestedModel, config, call)),
      redirect: "manual",
      signal: controller.signal,
    });
  } catch (error) {
    cleanup();
    if (controller.signal.reason === "response-header-timeout") {
      throw new AdRouterProtocolError("response header timeout.");
    }
    if (controller.signal.reason === "response-total-timeout") {
      throw new AdRouterProtocolError("response total timeout.");
    }
    throw error;
  } finally {
    clearTimeout(headerTimer);
  }
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel().catch(() => undefined);
    cleanup();
    throw new AdRouterProtocolError("authenticated requests must not redirect.");
  }
  if (!response.ok) {
    try {
      throw await providerError(response, controller.signal);
    } finally {
      cleanup();
    }
  }
  return {
    response,
    config,
    signal: controller.signal,
    cleanup,
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

function applyAd(state: StreamState, payload: RouterPayload): void {
  const injection = parseInjection(payload.injection);
  if (
    (injection?.mode !== "terminal_trailer" && injection?.mode !== "stream_start") ||
    injection.placement !== "bottom"
  ) {
    throw new AdRouterProtocolError(
      "the integration response did not declare a terminal bottom placement.",
    );
  }
  state.earlyAd = injection.mode === "stream_start";
  const outcome = normalizeOutcome(parseAds(payload.ads, payload.ad), payload.status, "live", true);
  const id = turnId(payload);
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
): void {
  switch (payload.type) {
    case "ad": {
      if (state.adReceived || state.settlementReceived || state.done) {
        throw new AdRouterProtocolError("the integration stream contained a duplicate or late ad.");
      }
      applyAd(state, payload);
      state.adReceived = true;
      if (state.earlyAd) {
        // An empty content part carries display metadata without adding model text.
        // Publish it now, even while the upstream model is still waiting to emit.
        controller.enqueue({
          type: "text-start",
          id: "adrouter-routed",
          providerMetadata: metadata(state.snapshot),
        });
        controller.enqueue({
          type: "text-end",
          id: "adrouter-routed",
          providerMetadata: metadata(state.snapshot),
        });
      }
      return;
    }
    case "text":
      if (state.adReceived && !state.earlyAd)
        throw new AdRouterProtocolError("model output arrived after the terminal ad.");
      enqueueText(
        controller,
        state,
        typeof (payload.content ?? payload.delta) === "string"
          ? String(payload.content ?? payload.delta)
          : "",
      );
      return;
    case "thinking":
      if (state.adReceived && !state.earlyAd)
        throw new AdRouterProtocolError("reasoning output arrived after the terminal ad.");
      enqueueReasoning(
        controller,
        state,
        typeof (payload.content ?? payload.delta) === "string"
          ? String(payload.content ?? payload.delta)
          : "",
      );
      return;
    case "tool_call":
      if (state.adReceived && !state.earlyAd)
        throw new AdRouterProtocolError("a tool call arrived after the terminal ad.");
      for (const tool of parseToolCalls([payload.tool_call])) {
        const prior = state.pendingTools.get(tool.id);
        if (prior && (prior.name !== tool.name || prior.input !== tool.input))
          throw new AdRouterProtocolError("conflicting pending tool calls.");
        state.pendingTools.set(tool.id, tool);
      }
      return;
    case "settlement":
      if (!state.adReceived || state.settlementReceived || state.done) {
        throw new AdRouterProtocolError(
          "settlement must appear exactly once after the terminal ad.",
        );
      }
      applySettlement(state, payload);
      state.settlementReceived = true;
      return;
    case "done": {
      if (!state.adReceived || !state.settlementReceived || state.done) {
        throw new AdRouterProtocolError(
          "done must appear exactly once after the terminal ad and settlement.",
        );
      }
      const final = assistantContent(payload);
      reconcile(state.reasoning, final.reasoning, "reasoning", (suffix) =>
        enqueueReasoning(controller, state, suffix),
      );
      reconcile(state.text, final.text, "text", (suffix) => enqueueText(controller, state, suffix));
      // Validate the complete set before exposing any executable tool call.
      for (const tool of final.tools) {
        const prior = state.pendingTools.get(tool.id);
        if (prior && (prior.name !== tool.name || prior.input !== tool.input))
          throw new AdRouterProtocolError("conflicting final tool calls.");
        state.pendingTools.set(tool.id, tool);
      }
      for (const tool of state.pendingTools.values()) enqueueTool(controller, state, tool);
      state.pendingTools.clear();
      state.done = true;
      nextSnapshot(state, { phase: "done" });
      return;
    }
    case "error": {
      state.pendingTools.clear();
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
  const { response, signal, cleanup } = requested;
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
            for await (const payload of ndjsonLines(response.body, signal))
              emitPayload(controller, state, payload);
            if (!state.done)
              throw new Error("AdRouter stream ended without an authoritative done event.");
          } else {
            const raw = await readLimitedBody(response, MAX_TOTAL_RESPONSE_BYTES, signal);
            let payload: RouterPayload;
            try {
              payload = JSON.parse(raw) as RouterPayload;
            } catch {
              throw new AdRouterProtocolError("response contained malformed JSON.");
            }
            applyAd(state, payload);
            state.adReceived = true;
            if (state.earlyAd) {
              controller.enqueue({
                type: "text-start",
                id: "adrouter-routed",
                providerMetadata: metadata(state.snapshot),
              });
              controller.enqueue({
                type: "text-end",
                id: "adrouter-routed",
                providerMetadata: metadata(state.snapshot),
              });
            }
            if (!payload.settlement || !payload.usage) {
              throw new AdRouterProtocolError(
                "the integration JSON response omitted settlement or usage.",
              );
            }
            applySettlement(state, payload);
            state.settlementReceived = true;
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
