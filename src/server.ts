import { readFileSync } from "node:fs";
import type { Config, Plugin, PluginModule } from "@opencode-ai/plugin";
import { ADROUTER_CODING_MODELS, type AdRouterThinkingLevel } from "./catalog.js";
import { MAX_OUTPUT_TOKENS } from "./transport/config.js";

function providerPackageSpec(): string {
  const manifest = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { name?: unknown; version?: unknown };
  if (manifest.name !== "@adrouter/opencode" || typeof manifest.version !== "string") {
    throw new Error("The AdRouter package identity is invalid.");
  }
  return `${manifest.name}@${manifest.version}`;
}

const PROVIDER_PACKAGE_SPEC = providerPackageSpec();
const PROVIDER_ENV = ["ADROUTER_INTEGRATION_API_KEY"] as const;
const ALLOWED_PROVIDER_FIELDS = new Set(["id", "name", "npm", "env", "models"]);

function protectedConfigError(): Error {
  return new Error(
    "AdRouter protected provider configuration cannot be overridden by project settings.",
  );
}

function sameStringArray(value: unknown, expected: readonly string[]): boolean {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((entry, index) => entry === expected[index])
  );
}

function model(
  id: string,
  name: string,
  levels: readonly AdRouterThinkingLevel[],
  context: number,
) {
  const variants = Object.fromEntries(
    levels.map((thinkingLevel) => [thinkingLevel, { thinkingLevel }]),
  );
  return {
    id,
    name,
    attachment: false,
    reasoning: true,
    temperature: false,
    tool_call: true,
    limit: { context, output: MAX_OUTPUT_TOKENS },
    modalities: { input: ["text"], output: ["text"] },
    variants,
  };
}

export function applyAdRouterConfig(config: Config): void {
  const current = config.provider?.adrouter;
  const defaultModels = Object.fromEntries(
    ADROUTER_CODING_MODELS.map((entry) => [
      entry.id,
      model(entry.id, entry.name, entry.thinkingLevels, entry.contextWindow),
    ]),
  );
  const defaults = {
    id: "adrouter",
    name: "AdRouter",
    npm: PROVIDER_PACKAGE_SPEC,
    env: [...PROVIDER_ENV],
    models: defaultModels,
  };
  if (!current) {
    config.provider = { ...config.provider, adrouter: defaults } as NonNullable<Config["provider"]>;
    return;
  }

  const configuredProvider = current as unknown as Record<string, unknown>;
  if (
    Object.keys(configuredProvider).some((key) => !ALLOWED_PROVIDER_FIELDS.has(key)) ||
    (configuredProvider.id !== undefined && configuredProvider.id !== "adrouter") ||
    (configuredProvider.npm !== undefined && configuredProvider.npm !== PROVIDER_PACKAGE_SPEC) ||
    (configuredProvider.env !== undefined && !sameStringArray(configuredProvider.env, PROVIDER_ENV))
  ) {
    throw protectedConfigError();
  }

  const mergedModels: Record<string, unknown> = { ...defaults.models };
  for (const [id, configured] of Object.entries(current.models ?? {})) {
    const fallback = defaults.models[id];
    if (
      !fallback ||
      !configured ||
      typeof configured !== "object" ||
      Array.isArray(configured) ||
      Object.keys(configured).some((key) => key !== "name") ||
      (configured.name !== undefined && typeof configured.name !== "string")
    ) {
      throw protectedConfigError();
    }
    mergedModels[id] = {
      ...fallback,
      ...(configured.name === undefined ? {} : { name: configured.name }),
    };
  }

  if (configuredProvider.name !== undefined && typeof configuredProvider.name !== "string") {
    throw protectedConfigError();
  }

  config.provider = {
    ...config.provider,
    adrouter: {
      ...defaults,
      ...(current.name === undefined ? {} : { name: current.name }),
      models: mergedModels,
    },
  } as NonNullable<Config["provider"]>;
}

const server: Plugin = async () => ({
  config: async (config) => {
    applyAdRouterConfig(config);
  },
  auth: {
    provider: "adrouter",
    methods: [{ type: "api", label: "AdRouter integration API key (adr_int_)" }],
  },
});

const plugin: PluginModule & { id: string } = {
  id: "adrouter",
  server,
};

export default plugin;
