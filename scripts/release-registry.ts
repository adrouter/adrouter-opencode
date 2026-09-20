import type { ReleasePolicyManifest } from "./release-policy.js";

export interface ArtifactIdentity {
  name: string;
  version: string;
  integrity: string;
  commit: string;
}

export interface RegistryPackage {
  deprecated?: string;
  dist?: {
    attestations?: { provenance?: { predicateType?: string } };
    integrity?: string;
  };
  gitHead?: string;
  name?: string;
  repository?: { url?: string } | string;
  version?: string;
}

export interface RegistryIO {
  package(version: string): Promise<RegistryPackage | null>;
  tags(): Promise<Record<string, string>>;
  write(args: string[]): void;
}

export class RegistryPendingError extends Error {}

export async function retryRegistry<T>(
  action: () => Promise<T>,
  timing = {
    now: Date.now,
    sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  },
): Promise<T> {
  const deadline = timing.now() + 600_000;
  let delay = 5_000;
  for (;;) {
    try {
      return await action();
    } catch (error) {
      if (!(error instanceof RegistryPendingError)) throw error;
      const remaining = deadline - timing.now();
      if (remaining <= 0) throw error;
      await timing.sleep(Math.min(delay, remaining));
      if (timing.now() >= deadline) throw error;
      delay = Math.min(delay * 2, 30_000);
    }
  }
}

export function assertCandidate(tags: Record<string, string>, expected: string): void {
  if (tags.candidate !== undefined && tags.candidate !== expected) {
    throw new Error("Candidate tag points to a conflicting version.");
  }
}

export function verifyIdentity(remote: RegistryPackage, artifact: ArtifactIdentity): void {
  if (remote.name !== artifact.name || remote.version !== artifact.version) {
    throw new Error("Registry metadata differs.");
  }
  if (remote.dist?.integrity !== artifact.integrity) {
    throw new Error("Registry tarball integrity differs.");
  }
  if (remote.gitHead !== undefined && remote.gitHead !== artifact.commit) {
    throw new Error("Registry gitHead differs from the release commit.");
  }
  const repository =
    typeof remote.repository === "string" ? remote.repository : remote.repository?.url;
  if (
    repository?.replace(/^git\+/, "").replace(/\.git$/, "") !==
    "https://github.com/adrouter/adrouter-opencode"
  ) {
    throw new Error("Registry repository differs.");
  }
  if (remote.dist?.attestations?.provenance?.predicateType !== "https://slsa.dev/provenance/v1") {
    throw new RegistryPendingError("Registry provenance attestation is not visible yet.");
  }
}

export function deprecationMessage(artifact: ArtifactIdentity): string {
  const channel = /-beta\.\d+$/.test(artifact.version) ? "beta" : "latest";
  return `Superseded by ${artifact.name}@${artifact.version}; install @${channel}.`;
}

export async function verifyRegistryState(
  io: RegistryIO,
  artifact: ArtifactIdentity,
  policy: ReleasePolicyManifest,
  state: "candidate" | "final" | "resumable",
): Promise<void> {
  await retryRegistry(async () => {
    const tags = await io.tags();
    assertCandidate(tags, artifact.version);
    const remote = await io.package(artifact.version);
    if (!remote) throw new RegistryPendingError("Published version is not visible yet.");
    verifyIdentity(remote, artifact);
    const finalMatches = Object.entries(policy.release.finalTags).every(
      ([tag, version]) => tags[tag] === version,
    );
    if (state === "candidate" && tags.candidate !== artifact.version) {
      throw new RegistryPendingError("Candidate alias is not visible yet.");
    }
    if (state === "resumable" && tags.candidate !== artifact.version && !finalMatches) {
      throw new Error("Release is neither a candidate nor finalized.");
    }
    if (state === "final") {
      if (!finalMatches || tags.candidate !== undefined)
        throw new Error("Final npm tags do not match the release manifest.");
      if (policy.release.supersedes) {
        const previous = await io.package(policy.release.supersedes);
        if (previous?.deprecated !== deprecationMessage(artifact)) {
          throw new Error("Superseded version does not have the exact deprecation message.");
        }
      }
    }
  });
}

export interface PublicationIO extends RegistryIO {
  attempted(): Promise<boolean>;
  record(state: "started" | "accepted"): void;
  publish(): void;
}

export async function publishCandidate(
  io: PublicationIO,
  artifact: ArtifactIdentity,
  policy: ReleasePolicyManifest,
): Promise<void> {
  const tags = await retryRegistry(() => io.tags());
  assertCandidate(tags, artifact.version);
  const remote = await retryRegistry(() => io.package(artifact.version));
  if (remote) {
    // Even a matching version without its candidate alias must never be uploaded again.
    await verifyRegistryState(io, artifact, policy, "candidate");
    return;
  }
  if (await io.attempted()) {
    throw new Error(
      "A publication was already attempted but is not visible. Do not upload again; inspect the recorded attempt and npm processing state.",
    );
  }
  if (tags.candidate !== undefined)
    throw new Error("Candidate exists without visible package metadata; do not upload again.");
  io.record("started"); // Must persist remotely before npm can receive any bytes.
  io.publish(); // Any failed or uncertain outcome leaves the started receipt in place.
  io.record("accepted");
  await verifyRegistryState(io, artifact, policy, "candidate");
}

export async function promoteRelease(
  io: RegistryIO,
  artifact: ArtifactIdentity,
  policy: ReleasePolicyManifest,
): Promise<void> {
  await verifyRegistryState(io, artifact, policy, "resumable");
  for (const [tag, version] of Object.entries(policy.release.finalTags)) {
    const current = await io.tags();
    assertCandidate(current, artifact.version);
    if (current[tag] !== version) io.write(["dist-tag", "add", `${artifact.name}@${version}`, tag]);
  }
  const current = await io.tags();
  assertCandidate(current, artifact.version);
  if (
    !Object.entries(policy.release.finalTags).every(([tag, version]) => current[tag] === version)
  ) {
    throw new Error("Final aliases must be verified before candidate cleanup.");
  }
  if (current.candidate !== undefined) io.write(["dist-tag", "rm", artifact.name, "candidate"]);
  if (policy.release.supersedes) {
    const previous = await io.package(policy.release.supersedes);
    if (!previous) throw new Error("Superseded package metadata is unavailable.");
    const message = deprecationMessage(artifact);
    if (previous.deprecated !== message)
      io.write(["deprecate", `${artifact.name}@${policy.release.supersedes}`, message]);
  }
  await verifyRegistryState(io, artifact, policy, "final");
}

// Anonymous reads distinguish a missing public version from an authenticated npm command failure.
export async function publicRegistryJSON<T>(url: string): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new RegistryPendingError("Public registry connection failed.");
  }
  if (response.status === 404) return null;
  if (response.status === 429 || response.status >= 500)
    throw new RegistryPendingError(`Public registry temporarily unavailable (${response.status}).`);
  if (!response.ok) throw new Error(`Public registry request rejected (${response.status}).`);
  return (await response.json()) as T;
}
