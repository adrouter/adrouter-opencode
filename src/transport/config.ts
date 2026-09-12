import type { AdRouterProviderOptions } from "../contracts.js";

export const DEFAULT_BASE_URL = "https://api-staging.adrouter.co";
export const MAX_OUTPUT_TOKENS = 16_384;
export const INTEGRATION_KEY_PATTERN = /^adr_int_[A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]{43}$/;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export interface ResolvedAdRouterConfig {
  apiKey: string;
  baseURL: string;
  hosted: boolean;
  model: string;
  maxOutputTokens: number;
  fetch: typeof globalThis.fetch;
  headers: Headers;
}

export function parseBaseURL(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("AdRouter base URL must be a valid absolute URL.");
  }
  if (url.username || url.password) {
    throw new Error("AdRouter base URL must not contain credentials.");
  }
  const hostname = url.hostname.toLowerCase();
  const loopback = LOOPBACK_HOSTS.has(hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error(
      "AdRouter base URL must use HTTPS; HTTP is allowed only for loopback development.",
    );
  }
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url;
}

function env(name: string): string | undefined {
  const value = typeof process === "undefined" ? undefined : process.env[name];
  return value?.trim() || undefined;
}

export function isHostedURL(value: string): boolean {
  try {
    return isHostedHostname(parseBaseURL(value).hostname);
  } catch {
    return false;
  }
}

function isHostedHostname(value: string): boolean {
  const hostname = value.toLowerCase();
  return hostname === "api.adrouter.co" || hostname === "api-staging.adrouter.co";
}

export function resolveConfig(
  requestedModel: string,
  options: AdRouterProviderOptions,
  callMaxOutputTokens?: number,
): ResolvedAdRouterConfig {
  const apiKey = options.apiKey?.trim() || env("ADROUTER_INTEGRATION_API_KEY");
  if (!apiKey) {
    if (env("ADROUTER_API_KEY")) {
      throw new Error(
        "ADROUTER_API_KEY is reserved for other AdRouter clients. Create a Developers integration key and set ADROUTER_INTEGRATION_API_KEY.",
      );
    }
    throw new Error(
      "AdRouter integration authentication is not configured. Set ADROUTER_INTEGRATION_API_KEY or run `opencode auth login --provider adrouter` with an adr_int_ key from the Developers page.",
    );
  }

  const baseURL = parseBaseURL(
    env("ADROUTER_INTEGRATION_API_URL") ?? options.baseURL ?? DEFAULT_BASE_URL,
  );
  const baseURLString = baseURL.toString().replace(/\/$/, "");
  const hosted = isHostedHostname(baseURL.hostname);
  if (hosted && !INTEGRATION_KEY_PATTERN.test(apiKey)) {
    throw new Error(
      "Hosted OpenCode access requires an adr_int_ integration key from the AdRouter Developers page. CLI and AdRouterAgent credentials are not accepted.",
    );
  }

  const configuredLimit =
    callMaxOutputTokens ?? options.defaultMaxOutputTokens ?? MAX_OUTPUT_TOKENS;
  const maxOutputTokens = Math.max(1, Math.min(MAX_OUTPUT_TOKENS, Math.floor(configuredLimit)));

  const headers = new Headers(options.headers);
  headers.set("accept", "application/x-ndjson, application/json");
  headers.set("authorization", `Bearer ${apiKey}`);
  headers.set("content-type", "application/json");

  return {
    apiKey,
    baseURL: baseURLString,
    hosted,
    model: env("ADROUTER_MODEL_ROUTE") ?? options.model ?? requestedModel,
    maxOutputTokens,
    fetch: options.fetch ?? globalThis.fetch,
    headers,
  };
}
