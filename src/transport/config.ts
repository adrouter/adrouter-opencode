import type { AdRouterProviderOptions } from "../contracts.js";

export const DEFAULT_BASE_URL = "https://api-staging.adrouter.co";
export const MAX_OUTPUT_TOKENS = 4096;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export interface ResolvedAdRouterConfig {
  apiKey: string;
  baseURL: string;
  hosted: boolean;
  model: string;
  workspace: string;
  adMode: string;
  runtimeMode: "mock" | "live";
  adsEnabled: boolean;
  minimumTier: string;
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

function enabled(value: string | undefined): boolean {
  return value?.toLowerCase() !== "false";
}

export function resolveConfig(
  requestedModel: string,
  options: AdRouterProviderOptions,
  callMaxOutputTokens?: number,
): ResolvedAdRouterConfig {
  const apiKey = options.apiKey?.trim() || env("ADROUTER_API_KEY");
  if (!apiKey) {
    throw new Error(
      "AdRouter authentication is not configured. Set ADROUTER_API_KEY or run `opencode auth login --provider adrouter`.",
    );
  }

  const baseURL = parseBaseURL(env("ADROUTER_API_URL") ?? options.baseURL ?? DEFAULT_BASE_URL);
  const baseURLString = baseURL.toString().replace(/\/$/, "");
  const hosted = isHostedHostname(baseURL.hostname);
  let configuredRuntime = (env("ADROUTER_RUNTIME_MODE") ?? options.runtimeMode)?.toLowerCase();
  if (configuredRuntime && !["auto", "mock", "live"].includes(configuredRuntime)) {
    throw new Error("ADROUTER_RUNTIME_MODE must be auto, mock, or live.");
  }
  if (hosted && configuredRuntime === "mock") {
    throw new Error("AdRouter hosted URLs only support live runtime mode.");
  }
  if (!configuredRuntime || configuredRuntime === "auto") {
    configuredRuntime = hosted ? "live" : "mock";
  }

  const environmentAdMode = env("ADROUTER_AD_MODE");
  const forcedOff = environmentAdMode?.toLowerCase() === "off";
  const adsEnabled =
    !forcedOff && enabled(env("ADROUTER_ADS_ENABLED")) && options.adsEnabled !== false;
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
    workspace:
      env("ADROUTER_WORKSPACE") ??
      options.workspace ??
      (typeof process === "undefined"
        ? "."
        : process
            .cwd()
            .replace(/[\\/]+$/, "")
            .split(/[\\/]/)
            .pop() || "."),
    adMode: forcedOff ? "off" : (environmentAdMode ?? options.adMode ?? (hosted ? "live" : "mock")),
    runtimeMode: hosted ? "live" : (configuredRuntime as "mock" | "live"),
    adsEnabled,
    minimumTier: String(env("ADROUTER_MIN_AD_TIER") ?? options.minimumTier ?? "3"),
    maxOutputTokens,
    fetch: options.fetch ?? globalThis.fetch,
    headers,
  };
}
