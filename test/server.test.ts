import { describe, expect, test } from "bun:test";
import type { Config } from "@opencode-ai/plugin";
import packageManifest from "../package.json" with { type: "json" };
import serverPlugin, { applyAdRouterConfig } from "../src/server.js";

describe("OpenCode server plugin", () => {
  test("registers the nine tool-capable hosted models with endpoint-safe variants", () => {
    const config: Config = {};
    applyAdRouterConfig(config);
    const provider = config.provider?.adrouter as any;
    expect(provider.name).toBe("AdRouter");
    expect(provider.npm).toBe(`${packageManifest.name}@${packageManifest.version}`);
    expect(provider.env).toEqual(["ADROUTER_INTEGRATION_API_KEY"]);
    expect(Object.keys(provider.models)).toEqual([
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "mimo-v2.5",
      "mimo-v2.5-pro",
      "agnes-2.0-flash",
      "agnes-2.5-flash",
      "glm-5.3",
      "qwen3.8-max",
      "qwen3.8-flash",
    ]);
    expect(provider.models["deepseek-v4-flash"]).toMatchObject({
      id: "deepseek-v4-flash",
      name: "DeepSeek V4 Flash",
    });
    expect(provider.models["deepseek-v4-pro"]).toMatchObject({
      id: "deepseek-v4-pro",
      name: "DeepSeek V4 Pro",
    });
    // OpenCode 1.18.4 resolves api.id from the configured model id.
    expect(provider.models["deepseek-v4-flash"].id).toBe("deepseek-v4-flash");
    expect(provider.models["deepseek-v4-flash"].variants).toEqual({
      none: { thinkingLevel: "none" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" },
    });
    expect(provider.models["mimo-v2.5"].variants).toEqual({
      none: { thinkingLevel: "none" },
      high: { thinkingLevel: "high" },
    });
    expect(provider.models["mimo-v2.5"].attachment).toBe(false);
    expect(provider.models["agnes-2.0-flash"].limit).toEqual({ context: 524288, output: 16384 });
    expect(provider.models["kimi-k3"]).toBeUndefined();
    expect(provider.models["agnes-2.5-pro"]).toBeUndefined();
    expect(provider.models["agnes-2.5-pro-alpha"]).toBeUndefined();
  });

  test("preserves display labels and enablement without weakening the provider boundary", () => {
    const config: Config = {
      disabled_providers: ["adrouter"],
      provider: {
        adrouter: {
          name: "My Router",
          models: {
            "deepseek-v4-flash": {
              name: "My Flash",
            },
          },
        },
      },
    };
    applyAdRouterConfig(config);
    const provider = config.provider?.adrouter as any;
    expect(provider.name).toBe("My Router");
    expect(provider.npm).toBe(`${packageManifest.name}@${packageManifest.version}`);
    expect(provider.env).toEqual(["ADROUTER_INTEGRATION_API_KEY"]);
    expect(provider.options).toBeUndefined();
    expect(provider.models["deepseek-v4-flash"].name).toBe("My Flash");
    expect(provider.models["deepseek-v4-flash"].limit).toEqual({ context: 1048576, output: 16384 });
    expect(config.disabled_providers).toEqual(["adrouter"]);
  });

  test("rejects project attempts to replace protected provider fields", () => {
    for (const adrouter of [
      { npm: "file:///custom/provider.js" },
      { env: ["ATTACKER_KEY"] },
      { options: { baseURL: "http://localhost:9999" } },
      { models: { custom: { name: "Custom" } } },
      { models: { "deepseek-v4-flash": { limit: { context: 123, output: 321 } } } },
    ]) {
      const config = { provider: { adrouter } } as unknown as Config;
      expect(() => applyAdRouterConfig(config)).toThrow("protected provider configuration");
    }
  });

  test("exposes an API-key auth hook", async () => {
    const hooks = await serverPlugin.server({} as any);
    expect(hooks.auth?.provider).toBe("adrouter");
    expect(hooks.auth?.methods[0]).toMatchObject({
      type: "api",
      label: "AdRouter integration API key (adr_int_)",
    });
    const config: Config = {};
    await hooks.config?.(config);
    expect((config.provider?.adrouter?.models?.["deepseek-v4-pro"] as any).id).toBe(
      "deepseek-v4-pro",
    );
  });
});
