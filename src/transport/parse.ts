import type {
  JSONObject,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3Usage,
  SharedV3ProviderMetadata,
} from "@ai-sdk/provider";
import type {
  AdRouterAd,
  AdRouterInjection,
  AdRouterProviderMetadataV1,
  AdRouterSettlement,
  AdRouterStatus,
  AdRouterTier,
  AdRouterUsage,
} from "../contracts.js";

export interface RouterAssistant {
  content?: unknown;
  reasoning_content?: unknown;
  tool_calls?: unknown;
  toolCalls?: unknown;
}

export interface RouterPayload {
  type?: unknown;
  turn_id?: unknown;
  assistant?: RouterAssistant;
  ad?: unknown;
  ads?: unknown;
  injection?: unknown;
  settlement?: unknown;
  usage?: unknown;
  status?: unknown;
  content?: unknown;
  delta?: unknown;
  tool_call?: unknown;
  message?: unknown;
}

export interface ParsedToolCall {
  id: string;
  name: string;
  input: string;
}

export const MAX_TOTAL_RESPONSE_BYTES = 8 * 1024 * 1024;
export const MAX_NDJSON_LINE_BYTES = 1024 * 1024;
export const STREAM_IDLE_TIMEOUT_MS = 60_000;

export class AdRouterProtocolError extends Error {
  constructor(message: string) {
    super(`AdRouter protocol error: ${message}`);
    this.name = "AdRouterProtocolError";
  }
}

export function sanitizeText(value: unknown, fallback = ""): string {
  return String(value ?? fallback)
    .replace(/\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\x1b\\))/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
}

function displayText(value: unknown, fallback: string, maximum: number): string {
  return sanitizeText(value, fallback).slice(0, maximum);
}

function displayURL(value: unknown): string {
  const text = displayText(value, "", 2048);
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function tier(value: unknown): AdRouterTier | undefined {
  if (value === 1 || value === "1" || value === "A") return "A";
  if (value === 2 || value === "2" || value === "B") return "B";
  if (value === 3 || value === "3" || value === "C") return "C";
  if (value === "NONE") return "NONE";
  return undefined;
}

function parseAdRecord(value: unknown, raw = false): AdRouterAd[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  const normalizedTier = tier(record.tier) ?? (raw ? undefined : "C");
  if (!normalizedTier) return [];
  const sponsor =
    record.sponsor && typeof record.sponsor === "object"
      ? (record.sponsor as Record<string, unknown>)
      : undefined;
  if (normalizedTier === "NONE") {
    return [
      {
        id: displayText(record.id, "ad-none", 128),
        tier: "NONE",
        ...(sanitizeText(record.campaign_id)
          ? { campaignId: sanitizeText(record.campaign_id) }
          : {}),
        ...(sanitizeText(record.reason_code)
          ? { reasonCode: sanitizeText(record.reason_code) }
          : {}),
        title: "No sponsored content",
        body: displayText(record.reason ?? record.body, "Routed without sponsored content.", 500),
        label: "TIER NONE",
      },
    ];
  }
  const title = displayText(record.title ?? sponsor?.brand_name, "", 120);
  const body = displayText(record.body ?? sponsor?.ad_copy, "", 500);
  const url = displayURL(record.url ?? sponsor?.click_url);
  return [
    {
      id: displayText(record.id, "ad-sponsor", 128),
      tier: normalizedTier,
      ...(sanitizeText(record.campaign_id) ? { campaignId: sanitizeText(record.campaign_id) } : {}),
      ...(sanitizeText(record.reason_code) ? { reasonCode: sanitizeText(record.reason_code) } : {}),
      title: title || "No sponsor content available",
      body: body || sanitizeText(record.reason, "Baseline routing fallback."),
      ...(displayText(record.cta, url ? "Learn more" : "", 80)
        ? { cta: displayText(record.cta, "Learn more", 80) }
        : {}),
      ...(url ? { url } : {}),
      label: displayText(record.label, "Sponsored", 80) || "Sponsored",
    },
  ];
}

export function parseAds(ads: unknown, rawAd: unknown): AdRouterAd[] {
  if (Array.isArray(ads)) {
    const parsed = ads.flatMap((value) => parseAdRecord(value));
    if (parsed.length) return parsed;
  }
  return parseAdRecord(rawAd, true);
}

export function normalizeOutcome(
  ads: AdRouterAd[],
  statusValue: unknown,
  adMode: string,
  adsEnabled: boolean,
): { ads: AdRouterAd[]; status: AdRouterStatus } {
  const backendStatus = ["live", "mock", "off", "privacy_protected", "degraded"].includes(
    String(statusValue),
  )
    ? (statusValue as AdRouterStatus)
    : undefined;
  const reasons = new Set(ads.map((ad) => ad.reasonCode));
  if (!adsEnabled || backendStatus === "off" || reasons.has("user_opt_out"))
    return { ads: [], status: "off" };
  if (
    backendStatus === "degraded" ||
    reasons.has("routing_failure") ||
    reasons.has("no_inventory")
  ) {
    return { ads: [], status: "degraded" };
  }
  if (backendStatus === "privacy_protected" || reasons.has("guardrail")) {
    return { ads: ads.filter((ad) => ad.tier === "NONE"), status: "privacy_protected" };
  }
  if (ads.length) return { ads, status: backendStatus === "mock" ? "mock" : "live" };
  if (backendStatus === "mock" || adMode === "mock") {
    return {
      status: "mock",
      ads: [
        {
          id: "mock-tier-3-001",
          tier: "C",
          title: "Developer Tooling",
          body: "Mock sponsored message for validating the AdRouter OpenCode panel.",
          cta: "Learn more",
          url: "https://example.com",
          label: "Sponsored",
        },
      ],
    };
  }
  return { ads: [], status: "degraded" };
}

export function parseInjection(value: unknown): AdRouterInjection | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const result: AdRouterInjection = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (typeof candidate === "string") result[key] = sanitizeText(candidate);
    else if (typeof candidate === "boolean" || typeof candidate === "number")
      result[key] = candidate;
  }
  return Object.keys(result).length ? result : undefined;
}

export function parseSettlement(value: unknown): AdRouterSettlement | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const result: AdRouterSettlement = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) result[key] = candidate;
    else if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const numbers = Object.fromEntries(
        Object.entries(candidate).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number",
        ),
      );
      if (Object.keys(numbers).length) result[key] = numbers;
    } else if (typeof candidate === "string") result[key] = sanitizeText(candidate);
  }
  return Object.keys(result).length ? result : undefined;
}

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function parseUsage(value: unknown): { sdk: LanguageModelV3Usage; public: AdRouterUsage } {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const input = finite(raw.inputTokens) ?? finite(raw.input) ?? finite(raw.prompt_tokens) ?? 0;
  const output =
    finite(raw.outputTokens) ?? finite(raw.output) ?? finite(raw.completion_tokens) ?? 0;
  const cached =
    finite(raw.cachedInputTokens) ?? finite(raw.cacheRead) ?? finite(raw.cache_read_tokens);
  const reasoning = finite(raw.reasoningTokens) ?? finite(raw.reasoning_tokens);
  const total = finite(raw.totalTokens) ?? finite(raw.total_tokens) ?? input + output;
  return {
    sdk: {
      inputTokens: {
        total: input,
        noCache: Math.max(0, input - (cached ?? 0)),
        cacheRead: cached,
        cacheWrite: undefined,
      },
      outputTokens: {
        total: output,
        text: reasoning === undefined ? output : Math.max(0, output - reasoning),
        reasoning,
      },
      raw: raw as JSONObject,
    },
    public: {
      inputTokens: input,
      outputTokens: output,
      totalTokens: total,
      ...(cached === undefined ? {} : { cachedInputTokens: cached }),
      ...(reasoning === undefined ? {} : { reasoningTokens: reasoning }),
    },
  };
}

export function parseToolCalls(value: unknown): ParsedToolCall[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const fn =
      record.function && typeof record.function === "object"
        ? (record.function as Record<string, unknown>)
        : undefined;
    const id = sanitizeText(record.id);
    const name = sanitizeText(record.name ?? fn?.name);
    if (!id) throw new Error("AdRouter returned a tool call without a stable ID.");
    if (!name) throw new Error(`AdRouter returned tool call ${id} without a name.`);
    const args = record.arguments ?? fn?.arguments ?? {};
    let input: string;
    if (typeof args === "string") {
      try {
        input = JSON.stringify(JSON.parse(args));
      } catch {
        throw new Error(`AdRouter returned malformed arguments for tool call ${id}.`);
      }
    } else {
      input = JSON.stringify(args);
    }
    return [{ id, name, input }];
  });
}

export function turnId(payload: RouterPayload): string | undefined {
  if (typeof payload.turn_id === "string" && payload.turn_id) return payload.turn_id;
  if (payload.ad && typeof payload.ad === "object") {
    const value = (payload.ad as Record<string, unknown>).turn_id;
    if (typeof value === "string" && value) return value;
  }
  return undefined;
}

export function metadata(snapshot: AdRouterProviderMetadataV1): SharedV3ProviderMetadata {
  return { adrouter: snapshot as unknown as JSONObject };
}

export function assistantContent(payload: RouterPayload): {
  content: LanguageModelV3Content[];
  tools: ParsedToolCall[];
  text: string;
  reasoning: string;
} {
  const text = typeof payload.assistant?.content === "string" ? payload.assistant.content : "";
  const reasoning =
    typeof payload.assistant?.reasoning_content === "string"
      ? payload.assistant.reasoning_content
      : "";
  const tools = parseToolCalls(payload.assistant?.tool_calls ?? payload.assistant?.toolCalls);
  return {
    text,
    reasoning,
    tools,
    content: [
      ...(reasoning ? [{ type: "reasoning" as const, text: reasoning }] : []),
      ...(text ? [{ type: "text" as const, text }] : []),
      ...tools.map((tool) => ({
        type: "tool-call" as const,
        toolCallId: tool.id,
        toolName: tool.name,
        input: tool.input,
      })),
    ],
  };
}

export function finishReason(hasTools: boolean): LanguageModelV3FinishReason {
  return { unified: hasTools ? "tool-calls" : "stop", raw: hasTools ? "tool_calls" : "stop" };
}

function abortedReadError(signal: AbortSignal): unknown {
  if (signal.reason === "response-total-timeout") {
    return new AdRouterProtocolError("response total timeout.");
  }
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException("The AdRouter request was aborted.", "AbortError");
}

export async function readWithIdleTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal?: AbortSignal,
) {
  if (signal?.aborted) throw abortedReadError(signal);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let removeAbortListener: (() => void) | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new AdRouterProtocolError("stream idle timeout.")),
          STREAM_IDLE_TIMEOUT_MS,
        );
      }),
      ...(signal
        ? [
            new Promise<never>((_resolve, reject) => {
              const abort = () => reject(abortedReadError(signal));
              signal.addEventListener("abort", abort, { once: true });
              removeAbortListener = () => signal.removeEventListener("abort", abort);
            }),
          ]
        : []),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    removeAbortListener?.();
  }
}

export async function* ndjsonLines(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<RouterPayload> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await readWithIdleTimeout(reader, signal);
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_TOTAL_RESPONSE_BYTES) {
        throw new AdRouterProtocolError("response exceeded the 8 MiB limit.");
      }
      buffer += decoder.decode(value, { stream: true });
      let index = buffer.indexOf("\n");
      while (index >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, "").trim();
        if (encoder.encode(line).byteLength > MAX_NDJSON_LINE_BYTES) {
          throw new AdRouterProtocolError("NDJSON line exceeded the 1 MiB limit.");
        }
        buffer = buffer.slice(index + 1);
        if (line) {
          try {
            yield JSON.parse(line) as RouterPayload;
          } catch {
            throw new AdRouterProtocolError("response contained malformed NDJSON.");
          }
        }
        index = buffer.indexOf("\n");
      }
      if (encoder.encode(buffer).byteLength > MAX_NDJSON_LINE_BYTES) {
        throw new AdRouterProtocolError("NDJSON line exceeded the 1 MiB limit.");
      }
    }
    buffer += decoder.decode();
    const finalLine = buffer.replace(/\r$/, "").trim();
    if (encoder.encode(finalLine).byteLength > MAX_NDJSON_LINE_BYTES) {
      throw new AdRouterProtocolError("NDJSON line exceeded the 1 MiB limit.");
    }
    if (finalLine) {
      try {
        yield JSON.parse(finalLine) as RouterPayload;
      } catch {
        throw new AdRouterProtocolError("response contained malformed NDJSON.");
      }
    }
  } catch (error) {
    // Cancellation acknowledgment must not delay delivery of an abort/error.
    void reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}
