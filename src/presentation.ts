import type { AdRouterAd, AdRouterProviderMetadataV1 } from "./contracts.js";
import { sanitizeText } from "./transport/parse.js";

export const ADROUTER_PALETTE = {
  dark: { label: "#8fcfff" },
  light: { label: "#1769aa" },
} as const;

function charWidth(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (/\p{Mark}/u.test(char) || code === 0x200d || (code >= 0xfe00 && code <= 0xfe0f)) return 0;
  return code >= 0x1100 &&
    (code <= 0x115f ||
      code === 0x2329 ||
      code === 0x232a ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1faff) ||
      (code >= 0x20000 && code <= 0x3fffd))
    ? 2
    : 1;
}

export function visibleWidth(value: string): number {
  return Array.from(sanitizeText(value)).reduce((width, char) => width + charWidth(char), 0);
}

export function truncateVisible(value: string, width: number): string {
  const text = sanitizeText(value);
  if (width <= 0) return "";
  if (visibleWidth(text) <= width) return text;
  if (width <= 3) return ".".repeat(width);
  const target = width - 3;
  let result = "";
  let used = 0;
  for (const char of text) {
    const next = charWidth(char);
    if (used + next > target) break;
    result += char;
    used += next;
  }
  return `${result}...`;
}

export function renderCompactAd(ad: AdRouterAd, width: number): string {
  const title = sanitizeText(ad.title);
  const body = sanitizeText(ad.body);
  const url = sanitizeText(ad.url);
  if (ad.tier === "NONE") {
    return truncateVisible(`TIER NONE: No sponsored content — ${body}`, width);
  }
  const disclosure = sanitizeText(ad.label, "Sponsored") || "Sponsored";
  const content = [title, body, url].filter(Boolean).join(" — ");
  return truncateVisible(`${disclosure} · TIER ${ad.tier}: ${content}`, width);
}

export interface AdFooterEconomics {
  currentSubsidy?: number | undefined;
  cumulativeSavings: number;
}

function displayAmount(value: number | undefined): string | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? formatSubsidy(value)
    : undefined;
}

export function renderAdFooterLines(
  ad: AdRouterAd,
  width: number,
  economics: AdFooterEconomics,
): string[] {
  const maximumWidth = Number.isFinite(width) ? Math.max(0, Math.floor(width)) : 0;
  if (maximumWidth === 0) return [];
  if (ad.tier === "NONE") return [renderCompactAd(ad, maximumWidth)];

  const disclosure = sanitizeText(ad.label, "Sponsored") || "Sponsored";
  const title = sanitizeText(ad.title, "Sponsored placement") || "Sponsored placement";
  const body = [sanitizeText(ad.body), sanitizeText(ad.cta)].filter(Boolean).join(" · ");
  const subsidy = displayAmount(economics.currentSubsidy);
  const savings = displayAmount(economics.cumulativeSavings) ?? formatSubsidy(0);
  const url = sanitizeText(ad.url);
  const economicsLine = [
    subsidy ? `subsidy $${subsidy}` : "subsidy pending",
    `saved $${savings}`,
    url,
  ]
    .filter(Boolean)
    .join(" · ");

  return [
    truncateVisible(`${disclosure} · TIER ${ad.tier}: ${title}`, maximumWidth),
    body ? truncateVisible(body, maximumWidth) : "",
    truncateVisible(economicsLine, maximumWidth),
  ].filter(Boolean);
}

export function formatSubsidy(amount: number): string {
  return amount < 0.01 ? amount.toFixed(6) : amount.toFixed(3);
}

export function extractAdRouterMetadata(value: unknown): AdRouterProviderMetadataV1 | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const candidate = record.adrouter;
  if (candidate && typeof candidate === "object") {
    const snapshot = candidate as Partial<AdRouterProviderMetadataV1>;
    if (
      snapshot.version === 1 &&
      typeof snapshot.sequence === "number" &&
      typeof snapshot.phase === "string" &&
      typeof snapshot.status === "string" &&
      Array.isArray(snapshot.ads)
    ) {
      return snapshot as AdRouterProviderMetadataV1;
    }
  }
  for (const child of Object.values(record)) {
    const found = extractAdRouterMetadata(child);
    if (found) return found;
  }
  return undefined;
}

export interface OrderedSessionMessage {
  id: string;
  role: "user" | "assistant";
  parts: Iterable<unknown>;
}

function highestMetadata(parts: Iterable<unknown>): AdRouterProviderMetadataV1 | undefined {
  let accepted: AdRouterProviderMetadataV1 | undefined;
  for (const part of parts) {
    const snapshot = extractAdRouterMetadata(part);
    if (!snapshot) continue;
    if (!accepted || snapshot.sequence > accepted.sequence) accepted = snapshot;
  }
  return accepted;
}

export class AdRouterPanelState {
  private current: AdRouterProviderMetadataV1 | undefined;
  private readonly settlements = new Map<string, number>();
  private readonly turnSnapshots = new Map<string, AdRouterProviderMetadataV1>();

  reconstruct(sessionID: string | undefined, messages: Iterable<OrderedSessionMessage>): void {
    this.current = undefined;
    this.settlements.clear();
    this.turnSnapshots.clear();
    if (!sessionID) return;
    for (const message of messages) {
      if (message.role === "user") {
        this.current = undefined;
        continue;
      }
      const accepted = highestMetadata(message.parts);
      if (!accepted?.turnId) {
        this.current = accepted;
        continue;
      }
      const prior = this.turnSnapshots.get(accepted.turnId);
      if (prior && prior.sequence > accepted.sequence) {
        this.current = prior;
        continue;
      }
      this.current = accepted;
      this.turnSnapshots.set(accepted.turnId, accepted);
      const subsidy = accepted.settlement?.ad_subsidy;
      if (typeof subsidy === "number" && Number.isFinite(subsidy)) {
        this.settlements.set(accepted.turnId, subsidy);
      } else {
        this.settlements.delete(accepted.turnId);
      }
    }
  }

  snapshot(): AdRouterProviderMetadataV1 | undefined {
    return this.current;
  }

  cumulativeSavings(): number {
    let total = 0;
    for (const amount of this.settlements.values()) total += amount;
    return total;
  }
}
