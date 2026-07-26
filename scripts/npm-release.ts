import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import packageManifest from "../package.json" with { type: "json" };
import releaseManifest from "../release-manifest.json" with { type: "json" };

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

interface RegistryPackage {
  deprecated?: string;
  dist?: {
    attestations?: { provenance?: { predicateType?: string } };
    integrity?: string;
  };
  gitHead?: string;
  name?: string;
  repository?: { type?: string; url?: string } | string;
  version?: string;
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

function npmJson(args: string[]): unknown {
  const output = run(
    "npm",
    [...args, "--json", "--registry", registry, "--min-release-age=0"],
    true,
  ).trim();
  return output ? JSON.parse(output) : null;
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

function registryTags(): Record<string, string> {
  return npmJson(["view", releaseManifest.npm.package, "dist-tags"]) as Record<string, string>;
}

function registryPackage(version: string): RegistryPackage {
  return npmJson(["view", `${releaseManifest.npm.package}@${version}`]) as RegistryPackage;
}

function verifyRegistry(artifactFile: string, state: "candidate" | "final" | "resumable"): void {
  const artifact = readArtifact(resolve(artifactFile));
  const remote = registryPackage(artifact.version);
  const tags = registryTags();
  const candidate = releaseManifest.release.candidateTag;
  const finalMatches = Object.entries(releaseManifest.release.finalTags).every(
    ([tag, version]) => tags[tag] === version,
  );
  const candidateMatches = tags[candidate] === artifact.version;

  assert(
    remote.name === artifact.name && remote.version === artifact.version,
    "Registry metadata differs.",
  );
  assert(remote.dist?.integrity === artifact.integrity, "Registry tarball integrity differs.");
  assert(remote.gitHead === artifact.commit, "Registry gitHead differs from the release commit.");
  assert(
    remote.dist?.attestations?.provenance?.predicateType === "https://slsa.dev/provenance/v1",
    "Registry provenance attestation is missing.",
  );
  if (state === "candidate") assert(candidateMatches, "Candidate tag does not target the release.");
  if (state === "final") {
    assert(finalMatches, "Final beta/latest tags do not target the release.");
    assert(tags[candidate] === undefined, "Candidate tag remains after promotion.");
    const superseded = registryPackage(releaseManifest.release.supersedes);
    assert(
      superseded.deprecated?.includes(artifact.version),
      `Superseded ${releaseManifest.release.supersedes} is not deprecated.`,
    );
  }
  if (state === "resumable") {
    assert(candidateMatches || finalMatches, "Release is neither a candidate nor finalized.");
  }
  console.log(`${artifact.name}@${artifact.version} matches registry state ${state}.`);
}

function promote(artifactFile: string): void {
  const artifact = readArtifact(resolve(artifactFile));
  verifyRegistry(artifactFile, "resumable");
  const before = registryTags();
  for (const [tag, version] of Object.entries(releaseManifest.release.finalTags)) {
    if (before[tag] === version) continue;
    run("npm", ["dist-tag", "add", `${artifact.name}@${version}`, tag, "--registry", registry]);
  }
  const current = registryTags();
  if (current[releaseManifest.release.candidateTag] !== undefined) {
    assert(
      current[releaseManifest.release.candidateTag] === artifact.version,
      "Candidate tag points to a conflicting version.",
    );
    run("npm", [
      "dist-tag",
      "rm",
      artifact.name,
      releaseManifest.release.candidateTag,
      "--registry",
      registry,
    ]);
  }
  run("npm", [
    "deprecate",
    `${artifact.name}@${releaseManifest.release.supersedes}`,
    `Superseded by ${artifact.name}@${artifact.version}; install @beta.`,
    "--registry",
    registry,
  ]);
  verifyRegistry(artifactFile, "final");
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
  verifyRegistry(artifact, state as "candidate" | "final" | "resumable");
} else if (command === "promote" && args.length === 1) {
  const [artifact] = args;
  assert(artifact, "Promote artifact is missing.");
  promote(artifact);
} else {
  throw new Error(
    "Usage: bun scripts/npm-release.ts create <dir> <tag>\n" +
      "   or: bun scripts/npm-release.ts verify <dir> <tag>\n" +
      "   or: bun scripts/npm-release.ts registry <artifact.json> <candidate|final|resumable>\n" +
      "   or: bun scripts/npm-release.ts promote <artifact.json>",
  );
}
