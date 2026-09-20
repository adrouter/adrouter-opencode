import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import packageManifest from "../package.json" with { type: "json" };
import releaseManifestJson from "../release-manifest.json" with { type: "json" };
import type { ReleasePolicyManifest } from "./release-policy.js";
import {
  promoteRelease,
  publicRegistryJSON,
  publishCandidate,
  type RegistryIO,
  type RegistryPackage,
  RegistryPendingError,
  verifyRegistryState,
} from "./release-registry.js";

const releaseManifest = releaseManifestJson as ReleasePolicyManifest;

const registry = "https://registry.npmjs.org/";

interface ArtifactRecord {
  commit: string;
  filename: string;
  integrity: string;
  name: string;
  schema: 1;
  sha256: string;
  size: number;
  tag: string;
  version: string;
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function run(command: string, args: string[], capture = false): string {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(
      output
        ? `${command} ${args.join(" ")} failed.\n${output}`
        : `${command} ${args.join(" ")} failed.`,
    );
  }
  return result.stdout ?? "";
}

function digest(path: string, algorithm: "sha256" | "sha512", encoding: "base64" | "hex") {
  return createHash(algorithm).update(readFileSync(path)).digest(encoding);
}

function packageFromTarball(path: string): typeof packageManifest {
  return JSON.parse(run("tar", ["-xOf", path, "package/package.json"], true));
}

function artifactPath(directory: string): string {
  return join(directory, "npm-artifacts.json");
}

function readArtifact(file: string): ArtifactRecord {
  const value = JSON.parse(readFileSync(file, "utf8")) as ArtifactRecord;
  assert(value.schema === 1, "Unsupported npm artifact manifest schema.");
  return value;
}

function createArtifact(directoryInput: string, tag: string): void {
  const directory = resolve(directoryInput);
  const tarballs = readdirSync(directory).filter((entry) => entry.endsWith(".tgz"));
  assert(tarballs.length === 1, "Release staging must contain exactly one npm tarball.");
  const filename = tarballs[0];
  assert(filename, "Release tarball is missing.");
  const tarball = join(directory, filename);
  const packed = packageFromTarball(tarball);
  const expectedTag = `v${releaseManifest.version}`;
  assert(tag === expectedTag, `Release tag ${tag} does not match ${expectedTag}.`);
  assert(packed.name === releaseManifest.npm.package, "Packed package name differs.");
  assert(packed.version === releaseManifest.version, "Packed package version differs.");
  assert(
    packed.publishConfig.tag === releaseManifest.release.candidateTag,
    "Packed package does not default to candidate publication.",
  );

  const sha256 = digest(tarball, "sha256", "hex");
  const artifact: ArtifactRecord = {
    commit: run("git", ["rev-parse", "HEAD"], true).trim(),
    filename,
    integrity: `sha512-${digest(tarball, "sha512", "base64")}`,
    name: packed.name,
    schema: 1,
    sha256,
    size: readFileSync(tarball).byteLength,
    tag,
    version: packed.version,
  };
  writeFileSync(artifactPath(directory), `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(join(directory, "SHA256SUMS"), `${sha256}  ${filename}\n`);
  console.log(`Recorded ${filename} from ${tag} at ${artifact.commit}.`);
}

function verifyArtifact(directoryInput: string, expectedTag: string): ArtifactRecord {
  const directory = resolve(directoryInput);
  const artifact = readArtifact(artifactPath(directory));
  const tarball = join(directory, artifact.filename);
  const packed = packageFromTarball(tarball);
  const checksum = readFileSync(join(directory, "SHA256SUMS"), "utf8");
  const commit = run("git", ["rev-parse", "HEAD"], true).trim();

  assert(artifact.tag === expectedTag, "Artifact release tag differs.");
  assert(
    artifact.tag === `v${releaseManifest.version}`,
    "Artifact tag does not match release version.",
  );
  assert(artifact.commit === commit, "Artifact commit differs from the checked-out tag.");
  assert(artifact.name === releaseManifest.npm.package, "Artifact package name differs.");
  assert(artifact.version === releaseManifest.version, "Artifact version differs.");
  assert(
    artifact.filename === basename(artifact.filename),
    "Artifact filename must be a basename.",
  );
  assert(
    packed.name === artifact.name && packed.version === artifact.version,
    "Tarball metadata differs.",
  );
  assert(readFileSync(tarball).byteLength === artifact.size, "Tarball size differs.");
  assert(digest(tarball, "sha256", "hex") === artifact.sha256, "Tarball SHA-256 differs.");
  assert(
    `sha512-${digest(tarball, "sha512", "base64")}` === artifact.integrity,
    "Tarball integrity differs.",
  );
  assert(checksum === `${artifact.sha256}  ${artifact.filename}\n`, "Checksum file differs.");
  console.log(`${artifact.filename} matches tag ${expectedTag} and commit ${commit}.`);
  return artifact;
}

const registryIO: RegistryIO = {
  async tags() {
    const tags = await publicRegistryJSON<Record<string, string>>(
      `${registry}-/package/${encodeURIComponent(releaseManifest.npm.package)}/dist-tags`,
    );
    if (!tags) throw new RegistryPendingError("Public package tags are unavailable.");
    return tags;
  },
  package(version) {
    return publicRegistryJSON<RegistryPackage>(
      `${registry}${encodeURIComponent(releaseManifest.npm.package)}/${encodeURIComponent(version)}`,
    );
  },
  write(args) {
    run("npm", [...args, "--registry", registry]);
  },
};

async function verifyRegistry(file: string, state: "candidate" | "final" | "resumable") {
  await verifyRegistryState(registryIO, readArtifact(resolve(file)), releaseManifest, state);
  console.log(`Registry state ${state} verified.`);
}

async function publish(directoryInput: string, tag: string) {
  const directory = resolve(directoryInput);
  const artifact = verifyArtifact(directory, tag);
  const repository = "adrouter/adrouter-opencode";
  assert(
    process.env.GITHUB_REPOSITORY === repository && process.env.GITHUB_REF === `refs/tags/${tag}`,
    "Candidate publication requires the canonical exact-tag workflow.",
  );
  const filename = (state: string) => `npm-publication-${state}.json`;
  await publishCandidate(
    {
      ...registryIO,
      async attempted() {
        const release = JSON.parse(
          run("gh", ["release", "view", tag, "--repo", repository, "--json", "assets"], true),
        ) as { assets: Array<{ name: string }> };
        const receipts = release.assets.filter((asset) =>
          [filename("started"), filename("accepted")].includes(asset.name),
        );
        for (const receipt of receipts) {
          run("gh", [
            "release",
            "download",
            tag,
            "--repo",
            repository,
            "--pattern",
            receipt.name,
            "--dir",
            directory,
          ]);
          const recorded = JSON.parse(readFileSync(join(directory, receipt.name), "utf8"));
          assert(
            recorded.tag === tag &&
              recorded.commit === artifact.commit &&
              recorded.integrity === artifact.integrity &&
              recorded.name === artifact.name &&
              recorded.version === artifact.version,
            "Publication receipt identity differs.",
          );
        }
        return receipts.length > 0;
      },
      record(state) {
        const file = join(directory, filename(state));
        writeFileSync(
          file,
          `${JSON.stringify({ schema: 1, name: artifact.name, version: artifact.version, tag, commit: artifact.commit, integrity: artifact.integrity, state, runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT, recordedAt: new Date().toISOString() }, null, 2)}\n`,
        );
        // Write-once release assets survive job reruns and new workflow dispatches.
        run("gh", ["release", "upload", tag, file, "--repo", repository]);
      },
      publish() {
        run("npm", [
          "publish",
          join(directory, artifact.filename),
          "--tag",
          "candidate",
          "--access",
          "public",
          "--ignore-scripts",
          "--provenance",
          "--registry",
          registry,
        ]);
      },
    },
    artifact,
    releaseManifest,
  );
}

const [command, ...args] = process.argv.slice(2);
if (command === "create" && args.length === 2) {
  const [directory, tag] = args;
  assert(directory && tag, "Create arguments are missing.");
  createArtifact(directory, tag);
} else if (command === "verify" && args.length === 2) {
  const [directory, tag] = args;
  assert(directory && tag, "Verify arguments are missing.");
  verifyArtifact(directory, tag);
} else if (
  command === "registry" &&
  args.length === 2 &&
  ["candidate", "final", "resumable"].includes(args[1] ?? "")
) {
  const [artifact, state] = args;
  assert(artifact && state, "Registry arguments are missing.");
  await verifyRegistry(artifact, state as "candidate" | "final" | "resumable");
} else if (command === "publish" && args.length === 2) {
  const [directory, tag] = args;
  assert(directory && tag, "Publish arguments are missing.");
  await publish(directory, tag);
} else if (command === "promote" && args.length === 1) {
  const [artifact] = args;
  assert(artifact, "Promote artifact is missing.");
  await promoteRelease(registryIO, readArtifact(resolve(artifact)), releaseManifest);
} else {
  throw new Error(
    "Usage: bun scripts/npm-release.ts create <dir> <tag>\n" +
      "   or: bun scripts/npm-release.ts verify <dir> <tag>\n" +
      "   or: bun scripts/npm-release.ts registry <artifact.json> <candidate|final|resumable>\n" +
      "   or: bun scripts/npm-release.ts publish <dir> <tag>\n" +
      "   or: bun scripts/npm-release.ts promote <artifact.json>",
  );
}
