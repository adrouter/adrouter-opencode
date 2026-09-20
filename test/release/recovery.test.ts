import { describe, expect, test } from "bun:test";
import type { ReleasePolicyManifest } from "../../scripts/release-policy.js";
import {
  type ArtifactIdentity,
  deprecationMessage,
  type PublicationIO,
  promoteRelease,
  publicRegistryJSON,
  publishCandidate,
  type RegistryPackage,
  RegistryPendingError,
  retryRegistry,
  verifyIdentity,
  verifyRegistryState,
} from "../../scripts/release-registry.js";

const artifact: ArtifactIdentity = {
  name: "@adrouter/opencode",
  version: "0.1.0-beta.17",
  integrity: "sha512-test",
  commit: "commit",
};
const policy: ReleasePolicyManifest = {
  schema: 2,
  version: artifact.version,
  release: {
    candidateTag: "candidate",
    finalTags: { beta: artifact.version, latest: artifact.version },
    githubPrerelease: true,
    supersedes: "0.1.0-beta.16",
  },
  npm: { package: artifact.name, opencodeVersions: ["1.18.4", "1.18.31"] },
};
const metadata = (): RegistryPackage => ({
  name: artifact.name,
  version: artifact.version,
  gitHead: artifact.commit,
  repository: "git+https://github.com/adrouter/adrouter-opencode.git",
  dist: {
    integrity: artifact.integrity,
    attestations: { provenance: { predicateType: "https://slsa.dev/provenance/v1" } },
  },
});
function fixture() {
  const state = {
    tags: { beta: "0.1.0-beta.16", latest: "0.1.0-beta.16" } as Record<string, string>,
    remote: null as RegistryPackage | null,
    attempted: false,
    deprecated: "",
    calls: [] as string[],
  };
  const io: PublicationIO = {
    async tags() {
      return { ...state.tags };
    },
    async package(version) {
      return version === artifact.version ? state.remote : { deprecated: state.deprecated };
    },
    async attempted() {
      return state.attempted;
    },
    record(status) {
      state.calls.push(status);
      state.attempted = true;
    },
    publish() {
      state.calls.push("publish");
      state.remote = metadata();
      state.tags.candidate = artifact.version;
    },
    write(args) {
      state.calls.push(args.join(" "));
      if (args[0] === "deprecate") state.deprecated = args[2] ?? "";
      else if (args[1] === "rm") delete state.tags.candidate;
      else state.tags[args[3] ?? ""] = (args[2] ?? "").slice((args[2] ?? "").lastIndexOf("@") + 1);
    },
  };
  return { state, io };
}

describe("candidate upload recovery", () => {
  test("records intent before upload and acceptance afterward; keeps public channels", async () => {
    const { state, io } = fixture();
    await publishCandidate(io, artifact, policy);
    expect(state.calls).toEqual(["started", "publish", "accepted"]);
    expect(state.tags).toEqual({
      beta: "0.1.0-beta.16",
      latest: "0.1.0-beta.16",
      candidate: artifact.version,
    });
    await publishCandidate(io, artifact, policy);
    expect(state.calls).toEqual(["started", "publish", "accepted"]);
  });
  test("resumes matching publication even if acceptance recording was interrupted", async () => {
    const { state, io } = fixture();
    state.remote = metadata();
    state.tags.candidate = artifact.version;
    state.attempted = true;
    await publishCandidate(io, artifact, policy);
    expect(state.calls).toEqual([]);
  });
  test("refuses an uncertain or accepted-but-invisible upload", async () => {
    const { state, io } = fixture();
    state.attempted = true;
    await expect(publishCandidate(io, artifact, policy)).rejects.toThrow("already attempted");
    expect(state.calls).toEqual([]);
  });
  test("a failed receipt prevents upload", async () => {
    const { state, io } = fixture();
    io.record = () => {
      throw new Error("receipt unavailable");
    };
    await expect(publishCandidate(io, artifact, policy)).rejects.toThrow("receipt unavailable");
    expect(state.calls).toEqual([]);
  });
  test("authorization failure leaves the receipt and never retries upload", async () => {
    const { state, io } = fixture();
    io.publish = () => {
      state.calls.push("publish");
      throw new Error("E403");
    };
    await expect(publishCandidate(io, artifact, policy)).rejects.toThrow("E403");
    await expect(publishCandidate(io, artifact, policy)).rejects.toThrow("already attempted");
    expect(state.calls).toEqual(["started", "publish"]);
  });
  test("refuses mismatched integrity and conflicting aliases without writes", async () => {
    const { state, io } = fixture();
    state.remote = { ...metadata(), dist: { integrity: "wrong" } };
    state.tags.candidate = artifact.version;
    await expect(publishCandidate(io, artifact, policy)).rejects.toThrow("integrity");
    state.remote = null;
    state.tags.candidate = "0.1.0-beta.99";
    await expect(publishCandidate(io, artifact, policy)).rejects.toThrow("conflicting");
    expect(state.calls).toEqual([]);
  });
  test("does not upload when alias exists but package metadata is missing", async () => {
    const { state, io } = fixture();
    state.tags.candidate = artifact.version;
    await expect(publishCandidate(io, artifact, policy)).rejects.toThrow("do not upload again");
    expect(state.calls).toEqual([]);
  });
  test("identity check includes source, repository and provenance", () => {
    expect(() => verifyIdentity({ ...metadata(), gitHead: "wrong" }, artifact)).toThrow("gitHead");
    expect(() =>
      verifyIdentity({ ...metadata(), repository: "https://example.org" }, artifact),
    ).toThrow("repository");
    expect(() =>
      verifyIdentity({ ...metadata(), dist: { integrity: artifact.integrity } }, artifact),
    ).toThrow("provenance");
  });
});

describe("registry read retry policy", () => {
  test("retries delayed visibility with bounded exponential backoff", async () => {
    let now = 0;
    let attempts = 0;
    const waits: number[] = [];
    const value = await retryRegistry(
      async () => {
        if (++attempts < 5) throw new RegistryPendingError("pending");
        return "visible";
      },
      {
        now: () => now,
        sleep: async (ms) => {
          waits.push(ms);
          now += ms;
        },
      },
    );
    expect(value).toBe("visible");
    expect(waits).toEqual([5000, 10000, 20000, 30000]);
  });
  test("stops at ten minutes", async () => {
    let now = 0;
    await expect(
      retryRegistry(
        async () => {
          throw new RegistryPendingError("pending");
        },
        {
          now: () => now,
          sleep: async (ms) => {
            now += ms;
          },
        },
      ),
    ).rejects.toThrow("pending");
    expect(now).toBe(600000);
  });
  test("does not retry authorization or integrity errors", async () => {
    for (const message of ["E401", "E403", "integrity differs"]) {
      let calls = 0;
      await expect(
        retryRegistry(async () => {
          calls++;
          throw new Error(message);
        }),
      ).rejects.toThrow(message);
      expect(calls).toBe(1);
    }
  });
});

describe("promotion reconciliation", () => {
  test("resumes partial promotion and skips identical deprecation", async () => {
    const { state, io } = fixture();
    state.remote = metadata();
    state.tags.candidate = artifact.version;
    state.tags.beta = artifact.version;
    state.deprecated = deprecationMessage(artifact);
    await promoteRelease(io, artifact, policy);
    expect(state.calls).toEqual([
      `dist-tag add ${artifact.name}@${artifact.version} latest`,
      `dist-tag rm ${artifact.name} candidate`,
    ]);
    await promoteRelease(io, artifact, policy);
    expect(state.calls).toHaveLength(2);
  });
  test("writes only a differing full deprecation message", async () => {
    const { state, io } = fixture();
    state.remote = metadata();
    state.tags = { ...policy.release.finalTags };
    state.deprecated = `temporary ${artifact.version}`;
    await expect(verifyRegistryState(io, artifact, policy, "final")).rejects.toThrow(
      "exact deprecation",
    );
    await promoteRelease(io, artifact, policy);
    expect(state.calls).toEqual([
      `deprecate ${artifact.name}@0.1.0-beta.16 ${deprecationMessage(artifact)}`,
    ]);
  });
  test("conflicting candidate prevents every mutation even when final aliases match", async () => {
    const { state, io } = fixture();
    state.remote = metadata();
    state.tags = { ...policy.release.finalTags, candidate: "0.1.0-beta.99" };
    await expect(promoteRelease(io, artifact, policy)).rejects.toThrow("conflicting");
    expect(state.calls).toEqual([]);
  });
  test("auth failure stops remaining metadata writes", async () => {
    const { state, io } = fixture();
    state.remote = metadata();
    state.tags.candidate = artifact.version;
    io.write = () => {
      state.calls.push("failed write");
      throw new Error("E401");
    };
    await expect(promoteRelease(io, artifact, policy)).rejects.toThrow("E401");
    expect(state.calls).toEqual(["failed write"]);
    expect(state.tags.candidate).toBe(artifact.version);
  });
});

test("public registry distinguishes missing versions, auth rejection and transient status", async () => {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const status = Number(new URL(request.url).pathname.slice(1));
      return new Response("{}", { status });
    },
  });
  try {
    expect(await publicRegistryJSON(`${server.url}404`)).toBeNull();
    for (const status of [401, 403]) {
      await expect(publicRegistryJSON(`${server.url}${status}`)).rejects.toThrow(
        `rejected (${status})`,
      );
    }
    for (const status of [429, 503]) {
      await expect(publicRegistryJSON(`${server.url}${status}`)).rejects.toBeInstanceOf(
        RegistryPendingError,
      );
    }
  } finally {
    server.stop(true);
  }
});
