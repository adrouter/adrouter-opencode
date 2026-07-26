import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import manifest from "../package.json" with { type: "json" };

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
assert(manifest.version === "0.1.0-beta.2", "Unexpected package version.");
assert(manifest.main === "./dist/index.js", "Legacy main must point to the root provider.");
assert(manifest.packageManager === "bun@1.3.14", "Bun must be pinned.");
assert(manifest.publishConfig.tag === "beta", "Publication must use the beta tag.");
assert(manifest.publishConfig.access === "public", "Scoped package must be public.");
assert(manifest.files.includes("src"), "Published source maps require src/.");

const directory = mkdtempSync(join(tmpdir(), "adrouter-package-check-"));
try {
  await run(["bun", "pm", "pack", "--destination", directory], `${import.meta.dir}/..`);
  const tarballName = readdirSync(directory).find((entry) => entry.endsWith(".tgz"));
  assert(tarballName, "Package tarball was not created.");
  const tarball = join(directory, tarballName);

  const listing = await run(["tar", "-tzf", tarball], directory);
  for (const forbidden of ["package/test/", ".env", "package-lock.json", "node_modules/", ".tgz"]) {
    assert(!listing.includes(forbidden), `Packed artifact contains forbidden path: ${forbidden}`);
  }
  for (const required of [
    "package/dist/index.js",
    "package/src/index.ts",
    "package/LICENSE",
    "package/SECURITY.md",
    "package/RELEASE.md",
  ]) {
    assert(listing.includes(required), `Packed artifact is missing ${required}.`);
  }

  const installDirectory = join(directory, "consumer");
  mkdirSync(installDirectory);
  await Bun.write(
    join(installDirectory, "package.json"),
    `${JSON.stringify(
      {
        private: true,
        type: "module",
        dependencies: {
          "@adrouter/opencode": `file:${tarball}`,
          "@opencode-ai/plugin": "1.18.4",
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
      "await import('@adrouter/opencode'); await import('@adrouter/opencode/server'); await import('@adrouter/opencode/tui')",
    ],
    installDirectory,
  );

  const packedManifest = JSON.parse(
    readFileSync(join(installDirectory, "node_modules/@adrouter/opencode/package.json"), "utf8"),
  );
  assert(basename(packedManifest.main) === "index.js", "Installed legacy main is incorrect.");
} finally {
  rmSync(directory, { force: true, recursive: true });
}
