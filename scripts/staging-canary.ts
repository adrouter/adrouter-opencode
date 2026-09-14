import type { LanguageModelV3CallOptions } from "@ai-sdk/provider";
import { AdRouterPanelState, renderCompactAd } from "../src/presentation.js";
import { createAdRouter } from "../src/provider.js";

const apiKey = process.env.ADROUTER_INTEGRATION_API_KEY?.trim();
if (!apiKey) {
  throw new Error("ADROUTER_INTEGRATION_API_KEY is required for the staging canary.");
}

const call: LanguageModelV3CallOptions = {
  prompt: [{ role: "user", content: [{ type: "text", text: "Reply with exactly: canary-ok" }] }],
  maxOutputTokens: 64,
};

for (const modelID of ["deepseek-v4-flash", "deepseek-v4-pro"]) {
  const { stream } = await createAdRouter({ apiKey }).languageModel(modelID).doStream(call);
  let assistantText = "";
  let modelOutputStarted = false;
  let earlyRoutingObserved = false;
  let finalProviderMetadata: unknown;
  const observedParts: string[] = [];
  const reader = stream.getReader();
  for (;;) {
    const item = await reader.read();
    if (item.done) break;
    const part = item.value;
    if (observedParts.length < 24) observedParts.push(part.type);
    if (part.type === "error") {
      throw part.error instanceof Error ? part.error : new Error(String(part.error));
    }
    if (part.type === "text-delta") {
      modelOutputStarted = true;
      assistantText += part.delta;
    } else if (part.type === "reasoning-delta" || part.type === "tool-call") {
      modelOutputStarted = true;
    }
    const providerMetadata = "providerMetadata" in part ? part.providerMetadata : undefined;
    const routed = providerMetadata?.adrouter as
      | { phase?: string; ads?: unknown[]; injection?: { mode?: string } }
      | undefined;
    if (routed?.phase === "routed") {
      if (modelOutputStarted) throw new Error(`${modelID}: routed ad arrived after model output.`);
      if (routed.injection?.mode !== "stream_start") {
        throw new Error(`${modelID}: routed metadata did not declare stream_start delivery.`);
      }
      earlyRoutingObserved = true;
    }
    if (providerMetadata) finalProviderMetadata = providerMetadata;
  }
  if (!earlyRoutingObserved) {
    const finalPhase =
      (finalProviderMetadata as { adrouter?: { phase?: string } } | undefined)?.adrouter?.phase ??
      "missing";
    throw new Error(
      `${modelID}: no early routing metadata was observed (final phase: ${finalPhase}; parts: ${observedParts.join(",") || "none"}).`,
    );
  }
  const metadata = (finalProviderMetadata as { adrouter?: unknown } | undefined)?.adrouter as
    | {
        phase?: string;
        ads?: Array<Parameters<typeof renderCompactAd>[0]>;
        settlement?: unknown;
        usage?: { totalTokens?: number };
      }
    | undefined;
  if (metadata?.phase !== "done") throw new Error(`${modelID}: missing terminal done metadata.`);
  if (!metadata.usage?.totalTokens) throw new Error(`${modelID}: missing usage.`);
  if (!metadata.settlement) throw new Error(`${modelID}: missing settlement.`);
  for (const ad of metadata.ads ?? []) {
    if (assistantText.includes(ad.title) || assistantText.includes(ad.body)) {
      throw new Error(`${modelID}: sponsor content leaked into assistant text.`);
    }
  }

  const panel = new AdRouterPanelState();
  panel.reconstruct("canary", [
    {
      id: `${modelID}-assistant`,
      role: "assistant",
      parts: [{ metadata: { adrouter: metadata } }],
    },
  ]);
  const ad = panel.snapshot()?.ads[0];
  if (ad && !renderCompactAd(ad, 120)) throw new Error(`${modelID}: TUI rendering failed.`);
  if (!ad && panel.snapshot()?.ads.length !== 0) {
    throw new Error(`${modelID}: no-ad result did not preserve an empty panel state.`);
  }
  console.log(`${modelID}: staging canary passed.`);
}
