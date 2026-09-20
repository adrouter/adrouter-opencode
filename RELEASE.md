# Release runbook

The beta.17 input targets OpenCode 1.18.31 and retains 1.18.4/1.18.15 compatibility.
Public beta/latest remain beta.16 until separately authorized promotion. A manifest describes intent;
query npm and GitHub for actual publication state.

## Prepare clean exact source

Use Bun 1.3.14 and bun.lock. Preserve unrelated work and the parked installation-auth experiment.
Run lint, typecheck, tests, build and release:policy while editing. From clean committed input run
`bun install --frozen-lockfile` and `bun run release:check`. Merge through protected main after
Linux/macOS/Windows CI and history scanning pass. Preserve linear history with a supported merge
method; do not change repository protections.

Confirm the next version and Git tag are unused. Tag the exact accepted main commit with an annotated
immutable v-prefixed version and push only that tag. A consumed version/tag is never replaced.
Tag staging uses the protected adrouter-staging environment, reruns release checks and authenticated
canaries, and records the tarball, SHA256SUMS and npm-artifacts.json on a draft GitHub prerelease.
Inspect source SHA, package contents, checksums and integrity before publication. All later operations
use the same staged tarball; never rebuild a replacement release artifact.

## Authentication by operation

Candidate publishing uses npm OIDC, with `id-token: write`, canonical repository
`adrouter/adrouter-opencode`, workflow `publish.yml`, and environment `npm-publish`. Inspect the
exact tagged workflow and trusted publisher configuration when diagnosing authentication. Candidate
publication does not require NPM_TOKEN or npm whoami. npm whoami cannot validate OIDC.

The staging credential is only ADROUTER_STAGING_INTEGRATION_API_KEY, mapped to
ADROUTER_INTEGRATION_API_KEY. Inspect names/mappings, never values. Authentication failures stop
before artifact creation or publication. Live checks must use the dedicated integration route.

Later metadata finalization uses npm-publish's NPM_TOKEN. It needs package metadata-write access,
valid owner/scope/expiry/IP constraints and compatible 2FA policy. A stage-only token can qualify
for metadata but cannot directly publish new versions. Organization access is not package access.
Secret presence/timestamps, npm whoami and publish dry runs do not establish write authority.
Local npm login does not update CI credentials. Do not change credentials or account policy without
specific authority, or replace a failed OIDC workflow with local publishing.

## Publish candidate

Use the same immutable tag as input and dispatch ref (substitute the actual release version):

```sh
gh workflow run publish.yml --repo adrouter/adrouter-opencode \
  --ref v0.1.0-beta.17 -f tag=v0.1.0-beta.17 -f phase=publish-candidate
```

The publisher verifies exact assets, rejects conflicting candidates, and records write-once
npm-publication-started.json before upload, followed by npm-publication-accepted.json after npm
accepts it. These operational receipts are additional draft-release assets, not replacements for
the immutable artifact manifest or checksums. The workflow uses OIDC and explicit --tag candidate.

Already-published versions skip upload only after identity, integrity, source when present,
provenance and candidate alias match. If an attempt receipt exists but the version is invisible,
stop uploads and investigate npm processing. If the upload outcome is uncertain, do not retry it.
Read-only registry verification retries transient visibility/network failures with bounded backoff
for at most ten minutes. Authorization failures and integrity/alias conflicts fail immediately.
After visibility timeout, leave the release pending; do not publish it again or rebuild it.

Candidate checks include anonymous exact-version imports/discovery/execution on Linux, macOS and
Windows for every manifest host version, followed by a protected authenticated exact-candidate run
through the SDK-pinned OpenCode host. Logs expose pass/fail metadata only, not credentials, model
responses or sponsor copy. Record separate interactive footer acceptance honestly; unit/mounted
renderer coverage is not a claim about a physical interactive session.

Keep candidate through acceptance. Successful candidate completion leaves beta/latest unchanged
and the OpenCode GitHub release draft. An npm candidate is published and installable; npm staged
publishing is a separate unpublished stage requiring maintainer 2FA approval. Do not request a
stage-approval command unless an actual verified matching stage exists.

## Separately authorized finalization

After candidate acceptance, dispatch phase=finalize-release using the same exact tag for input/ref.
The protected workflow verifies registry integrity and the platform matrix before metadata writes.
It rejects candidate conflicts, skips correct final aliases, verifies final aliases before removing
a matching candidate, skips absent candidate cleanup, and compares complete deprecation wording.
The manifest's optional supersedes field controls deprecation; ordinary compatibility candidates
need not deprecate a working public version. Never change correct text temporarily to force a write.
After final verification the workflow publishes the GitHub prerelease. Stable releases retain the
release-policy requirement for a 48-hour accepted-beta soak and platform evidence.

## Operator handoff and recovery

After an actual authorization failure stop writes and diagnose the exact failed operation. A 404
alone is not proof of token insufficiency. Re-query integrity and partial-success state before any
retry. Keep working protected finalizers; do not rerun completed writes or unpublish packages.

If interaction is required, provide the operator the exact package, directory, action, commands and
expected result. Do not automatically open a browser/terminal, read npm credentials, or request a
token/OTP in chat. The operator runs browser authentication in their own terminal when needed:

```sh
cd /Users/ahmadzuhri/antigravity/3days/adrouter_release/adrouter-opencode
npm login --auth-type=web --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm dist-tag ls @adrouter/opencode --registry=https://registry.npmjs.org/
```

Only when replacing a confirmed-invalid metadata credential is authorized, the operator enters the
value at the interactive prompt for `gh secret set NPM_TOKEN --env npm-publish -R adrouter/adrouter-opencode`.
A browser login does not repair that secret. Give a manual cleanup command only when promotion is
authorized, cleanup is due, and candidate matches the intended release. Skip absent tags and stop on
conflicts. Account/trust/token governance and stage approval may require interactive proof even
when a token can perform ordinary metadata writes.

Verify final aliases, candidate state, exact configured deprecations, artifact integrity/provenance
and GitHub draft/prerelease state independently. Retain receipts. Revoke temporary credentials only
after their authorized operations and verification are complete; never change secrets automatically.

References: [npm tokens](https://docs.npmjs.com/about-access-tokens/),
[trusted publishing](https://docs.npmjs.com/trusted-publishers/),
[dist-tags](https://docs.npmjs.com/cli/v12/commands/npm-dist-tag/),
[staged publishing](https://docs.npmjs.com/staged-publishing/).
