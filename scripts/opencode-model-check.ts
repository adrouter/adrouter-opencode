import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Config } from "@opencode-ai/plugin";
import releaseManifest from "../release-manifest.json" with { type: "json" };
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
if (pluginManifest.version !== "1.18.4") {
  throw new Error(`Expected OpenCode plugin 1.18.4, received ${pluginManifest.version}.`);
}

const config: Config = {};
applyAdRouterConfig(config);
const models = config.provider?.adrouter?.models ?? {};
for (const pickerID of ["deepseek-v4-flash", "deepseek-v4-pro"]) {
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
    for (const modelID of ["deepseek-v4-flash", "deepseek-v4-pro"]) {
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
        authOutput.includes("Available: AdRouter API key"),
      `OpenCode ${opencodeVersion} did not expose the AdRouter API-key method.\n${authOutput}`,
    );
    assert(
      !authOutput.includes('Unknown provider "adrouter"'),
      `OpenCode ${opencodeVersion} did not register the AdRouter provider.`,
    );

    console.log(
      `OpenCode ${opencodeVersion} installed both AdRouter targets and recognized provider auth.`,
    );
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}
