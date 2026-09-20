import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import manifest from "../package.json" with { type: "json" };
import releaseManifest from "../release-manifest.json" with { type: "json" };
import { assertReleasePolicy } from "./release-policy.js";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function run(command: string[], cwd: string): Promise<string> {
  const child = Bun.spawn(command, { cwd, stdin: "ignore", stdout: "pipe", stderr: "inherit" });
  const output = await new Response(child.stdout).text();
  const exitCode = await child.exited;
  if (exitCode !== 0) throw new Error(`${command.join(" ")} failed with exit code ${exitCode}.`);
  return output.trim();
}

assert(manifest.name === "@adrouter/opencode", "Unexpected package name.");
assertReleasePolicy(releaseManifest, manifest);
assert(manifest.main === "./dist/index.js", "Legacy main must point to the root provider.");
assert(manifest.packageManager === "bun@1.3.14", "Bun must be pinned.");
assert(
  manifest.publishConfig.tag === releaseManifest.release.candidateTag,
  "Publication must use the candidate tag.",
);
assert(manifest.publishConfig.access === "public", "Scoped package must be public.");
assert(manifest.files.includes("src"), "Published source maps require src/.");

const releaseWorkflow = readFileSync(
  join(import.meta.dir, "../.github/workflows/release.yml"),
  "utf8",
);
const publishWorkflow = readFileSync(
  join(import.meta.dir, "../.github/workflows/publish.yml"),
  "utf8",
);
const soakWorkflow = readFileSync(join(import.meta.dir, "../.github/workflows/soak.yml"), "utf8");
assert(
  releaseWorkflow.includes("release.githubPrerelease"),
  "Tag staging must use manifest prerelease state.",
);
assert(
  publishWorkflow.includes("fromJSON(needs.release-metadata.outputs.opencode-versions)"),
  "Registry matrix must use manifest OpenCode versions.",
);
assert(
  publishWorkflow.includes("release.supersedes ?? ''"),
  "GitHub superseded-release handling must be optional.",
);
assert(
  soakWorkflow.includes("scripts/verify-channel.ts") && soakWorkflow.includes("staging-canary.ts"),
  "Stable soak workflow must verify the public package and authenticated canaries.",
);
for (const workflow of [releaseWorkflow, soakWorkflow]) {
  assert(
    workflow.includes(
      "ADROUTER_INTEGRATION_API_KEY: $" + "{{ secrets.ADROUTER_STAGING_INTEGRATION_API_KEY }}",
    ),
    "Authenticated canaries must use the integration-specific environment secret.",
  );
  assert(
    !workflow.includes("ADROUTER_STAGING_API_KEY") && !workflow.includes("ADROUTER_API_KEY:"),
    "Authenticated canaries must not use a general Router API key name.",
  );
}
const registryInstallJob = publishWorkflow
  .split("\n  registry-install:")[1]
  ?.split("\n  finalize-npm:")[0];
assert(registryInstallJob, "Candidate registry-install job is missing.");
assert(
  !registryInstallJob.includes("inputs.phase == 'finalize-release'"),
  "Anonymous registry installation must run for candidate publication as well as finalization.",
);
assert(
  !/0\.1\.0-beta\.\d+/.test(`${releaseWorkflow}\n${publishWorkflow}`),
  "Protected release workflows must not hardcode a numbered beta.",
);

const directory = mkdtempSync(join(tmpdir(), "adrouter-package-check-"));
try {
  await run(["bun", "pm", "pack", "--destination", directory], `${import.meta.dir}/..`);
  const tarballName = readdirSync(directory).find((entry) => entry.endsWith(".tgz"));
  assert(tarballName, "Package tarball was not created.");
  const tarball = join(directory, tarballName);

  const releaseTag = `v${releaseManifest.version}`;
  await run(
    ["bun", "scripts/npm-release.ts", "create", directory, releaseTag],
    `${import.meta.dir}/..`,
  );
  await run(
    ["bun", "scripts/npm-release.ts", "verify", directory, releaseTag],
    `${import.meta.dir}/..`,
  );

  const listing = await run(["tar", "-tzf", tarball], directory);
  for (const forbidden of ["package/test/", ".env", "package-lock.json", "node_modules/", ".tgz"]) {
    assert(!listing.includes(forbidden), `Packed artifact contains forbidden path: ${forbidden}`);
  }
  for (const required of [
    "package/dist/index.js",
    "package/src/index.ts",
    "package/LICENSE",
    "package/release-manifest.json",
    "package/SECURITY.md",
    "package/RELEASE.md",
  ]) {
    assert(listing.includes(required), `Packed artifact is missing ${required}.`);
  }

  for (const opencodeVersion of releaseManifest.npm.opencodeVersions) {
    const installDirectory = join(directory, `consumer-${opencodeVersion}`);
    mkdirSync(installDirectory);
    await Bun.write(
      join(installDirectory, "package.json"),
      `${JSON.stringify(
        {
          private: true,
          type: "module",
          dependencies: {
            "@adrouter/opencode": `file:${tarball}`,
            "@opencode-ai/plugin": opencodeVersion,
            "@opentui/core": "0.4.5",
            "@opentui/solid": "0.4.5",
            "solid-js": "1.9.12",
          },
        },
        null,
        2,
      )}\n`,
    );
    await run(["bun", "install", "--ignore-scripts"], installDirectory);
    await run(
      [
        "bun",
        "-e",
        `await import('@adrouter/opencode'); const server = await import('@adrouter/opencode/server'); await import('@adrouter/opencode/tui'); const config = {}; server.applyAdRouterConfig(config); if (config.provider?.adrouter?.npm !== ${JSON.stringify(`${manifest.name}@${manifest.version}`)}) throw new Error('Packed provider package is not exact')`,
      ],
      installDirectory,
    );

    const packedManifest = JSON.parse(
      readFileSync(join(installDirectory, "node_modules/@adrouter/opencode/package.json"), "utf8"),
    );
    assert(basename(packedManifest.main) === "index.js", "Installed legacy main is incorrect.");
  }
} finally {
  rmSync(directory, { force: true, recursive: true });
}
