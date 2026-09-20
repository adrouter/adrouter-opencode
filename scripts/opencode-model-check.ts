import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Config } from "@opencode-ai/plugin";
import packageManifest from "../package.json" with { type: "json" };
import releaseManifest from "../release-manifest.json" with { type: "json" };
import { ADROUTER_CODING_MODELS } from "../src/catalog.js";
import { applyAdRouterConfig } from "../src/server.js";

interface CommandResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function run(
  command: string[],
  cwd: string,
  env: Record<string, string | undefined>,
): Promise<CommandResult> {
  const child = Bun.spawn(command, {
    cwd,
    env,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { exitCode, stderr, stdout };
}

function success(result: CommandResult, label: string): void {
  if (result.exitCode !== 0) {
    throw new Error(`${label} failed.\n${result.stdout}\n${result.stderr}`);
  }
}

async function verifyProviderExecution(
  cli: string[],
  directory: string,
  env: Record<string, string | undefined>,
  opencodeVersion: string,
): Promise<void> {
  const live = process.env.ADROUTER_SMOKE_LIVE === "true";
  if (live && !env.ADROUTER_INTEGRATION_API_KEY)
    throw new Error("The protected integration key is required for candidate acceptance.");
  let requestMethod = "";
  let requestPath = "";
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      requestMethod = request.method;
      requestPath = new URL(request.url).pathname;
      return Response.json({
        turn_id: "provider-probe",
        status: "live",
        ads: [],
        injection: { mode: "terminal_trailer", placement: "bottom" },
        settlement: { ad_subsidy: 0, cost: {} },
        usage: { input: 1, output: 1, totalTokens: 2 },
        assistant: { content: "provider-probe-ok" },
      });
    },
  });
  try {
    const result = await run(
      [
        ...cli,
        "run",
        "--model",
        "adrouter/mimo-v2.5",
        "--variant",
        "none",
        "--format",
        "json",
        "Reply with exactly: provider-probe-ok",
      ],
      directory,
      {
        ...env,
        ...(live
          ? {}
          : {
              ADROUTER_INTEGRATION_API_URL: server.url.origin,
              ADROUTER_INTEGRATION_API_KEY: `adr_int_${"A".repeat(12)}.${"B".repeat(43)}`,
            }),
      },
    );
    if (live)
      assert(
        result.exitCode === 0,
        `OpenCode ${opencodeVersion} authenticated candidate execution failed; private output suppressed.`,
      );
    else success(result, `OpenCode ${opencodeVersion} provider execution`);
    if (!live) {
      assert(
        requestMethod === "POST",
        `OpenCode ${opencodeVersion} did not POST the provider turn.`,
      );
      assert(
        requestPath === "/v1/integrations/turn",
        `OpenCode ${opencodeVersion} used the wrong provider route: ${requestPath || "none"}.`,
      );
    }
    const flags = { assistant: false, bottom: false, done: false, settlement: false, usage: false };
    const inspect = (value: unknown, key = ""): void => {
      if (typeof value === "string") {
        if (/^(text|content|delta)$/i.test(key) && value.includes("provider-probe-ok")) {
          flags.assistant = true;
        }
        return;
      }
      if (Array.isArray(value)) {
        for (const item of value) inspect(item, key);
        return;
      }
      if (!value || typeof value !== "object") return;
      const record = value as Record<string, unknown>;
      if (record.phase === "done") flags.done = true;
      if (record.settlement && typeof record.settlement === "object") flags.settlement = true;
      if (record.usage && typeof record.usage === "object") flags.usage = true;
      if (
        record.injection &&
        typeof record.injection === "object" &&
        (record.injection as Record<string, unknown>).mode === "terminal_trailer" &&
        (record.injection as Record<string, unknown>).placement === "bottom"
      ) {
        flags.bottom = true;
      }
      for (const [childKey, child] of Object.entries(record)) inspect(child, childKey);
    };
    for (const line of result.stdout.split(/\r?\n/)) {
      try {
        inspect(JSON.parse(line));
      } catch {
        // OpenCode may emit non-JSON status lines around the JSON event stream.
      }
    }
    assert(
      Object.values(flags).every(Boolean),
      `OpenCode ${opencodeVersion} omitted terminal provider metadata: ${JSON.stringify(flags)}.`,
    );
  } finally {
    server.stop(true);
  }
}

function configuredPlugins(directory: string, name: "opencode" | "tui"): string[] {
  for (const extension of ["jsonc", "json"]) {
    const file = join(directory, `${name}.${extension}`);
    if (!existsSync(file)) continue;
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { plugin?: unknown };
    return Array.isArray(parsed.plugin)
      ? parsed.plugin.filter((item): item is string => typeof item === "string")
      : [];
  }
  throw new Error(`OpenCode did not create a ${name} config file.`);
}

const pluginManifest = JSON.parse(
  readFileSync(
    new URL("../node_modules/@opencode-ai/plugin/package.json", import.meta.url),
    "utf8",
  ),
) as { version: string };
if (pluginManifest.version !== packageManifest.devDependencies["@opencode-ai/plugin"]) {
  throw new Error(
    `Expected OpenCode plugin ${packageManifest.devDependencies["@opencode-ai/plugin"]}, received ${pluginManifest.version}.`,
  );
}

const config: Config = {};
applyAdRouterConfig(config);
const expectedProviderPackage = `${releaseManifest.npm.package}@${releaseManifest.version}`;
assert(
  config.provider?.adrouter?.npm === expectedProviderPackage,
  `AdRouter provider package must be exact: ${expectedProviderPackage}.`,
);
const models = config.provider?.adrouter?.models ?? {};
const modelIDs = ADROUTER_CODING_MODELS.map((model) => model.id);
for (const pickerID of modelIDs) {
  const configured = models[pickerID];
  if (!configured) throw new Error(`OpenCode did not register ${pickerID}.`);
  const apiID = configured.id ?? pickerID;
  if (apiID !== pickerID) {
    throw new Error(`OpenCode resolved ${pickerID} to api.id=${apiID}.`);
  }
}

const repository = join(import.meta.dir, "..");
const localPluginURL = pathToFileURL(repository).href;
const requestedPlugin = process.env.ADROUTER_SMOKE_PLUGIN_SPEC?.trim();
const requestedOpenCode = process.env.ADROUTER_SMOKE_OPENCODE_VERSION?.trim();
const registryPlugin = process.env.ADROUTER_SMOKE_REGISTRY === "true";
const pluginSpec =
  requestedPlugin ||
  (registryPlugin ? `${releaseManifest.npm.package}@${releaseManifest.version}` : localPluginURL);
if (process.env.ADROUTER_SMOKE_LIVE === "true" && !registryPlugin)
  throw new Error("Live acceptance requires the exact registry candidate.");
const registryBackedPlugin = pluginSpec.startsWith(`${releaseManifest.npm.package}@`);
const opencodeVersions = requestedOpenCode
  ? [requestedOpenCode]
  : releaseManifest.npm.opencodeVersions;

for (const opencodeVersion of opencodeVersions) {
  const directory = mkdtempSync(join(tmpdir(), `adrouter-opencode-${opencodeVersion}-`));
  try {
    const xdg = join(directory, "xdg");
    const env: Record<string, string | undefined> = {
      ...process.env,
      XDG_CACHE_HOME: join(xdg, "cache"),
      XDG_CONFIG_HOME: join(xdg, "config"),
      XDG_DATA_HOME: join(xdg, "data"),
      XDG_STATE_HOME: join(xdg, "state"),
    };
    delete env.OPENCODE_CONFIG;
    delete env.OPENCODE_CONFIG_CONTENT;
    delete env.OPENCODE_CONFIG_DIR;
    delete env.OPENCODE_TUI_CONFIG;

    const cli = ["bunx", `opencode-ai@${opencodeVersion}`];
    const installed = await run([...cli, "plugin", "--global", pluginSpec], directory, env);
    success(installed, `OpenCode ${opencodeVersion} global plugin install`);
    assert(
      installed.stdout.includes("Detected server + tui targets"),
      `OpenCode ${opencodeVersion} did not detect both package targets.`,
    );

    const configDirectory = join(xdg, "config", "opencode");
    for (const name of ["opencode", "tui"] as const) {
      assert(
        configuredPlugins(configDirectory, name).includes(pluginSpec),
        `OpenCode ${opencodeVersion} did not add AdRouter to ${name} config.`,
      );
    }

    const listed = await run([...cli, "models", "adrouter", "--verbose"], directory, env);
    success(listed, `OpenCode ${opencodeVersion} provider model resolution`);
    for (const modelID of modelIDs) {
      assert(
        listed.stdout.includes(`adrouter/${modelID}`) &&
          listed.stdout.includes(`"id": "${modelID}"`),
        `OpenCode ${opencodeVersion} did not resolve adrouter/${modelID}.`,
      );
    }

    const auth = await run(
      [...cli, "auth", "login", "--provider", "adrouter", "--method", "__probe__"],
      directory,
      env,
    );
    const authOutput = `${auth.stdout}\n${auth.stderr}`;
    assert(auth.exitCode !== 0, "The non-secret auth probe unexpectedly succeeded.");
    assert(
      authOutput.includes('Unknown method "__probe__" for adrouter') &&
        authOutput.includes("Available: AdRouter integration API key (adr_int_)"),
      `OpenCode ${opencodeVersion} did not expose the AdRouter API-key method.\n${authOutput}`,
    );
    assert(
      !authOutput.includes('Unknown provider "adrouter"'),
      `OpenCode ${opencodeVersion} did not register the AdRouter provider.`,
    );

    if (registryBackedPlugin) {
      await verifyProviderExecution(cli, directory, env, opencodeVersion);
    }

    console.log(
      `OpenCode ${opencodeVersion} installed both AdRouter targets, recognized provider auth${registryBackedPlugin ? ", and executed the exact provider package" : ""}.`,
    );
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}
