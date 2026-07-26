# AdRouter OpenCode first-beta implementation record

Target: `@adrouter/opencode@0.1.0-beta.2`. The immutable beta.1 candidate was
rejected by its staging canary before publication.

## Implemented

- [x] Backend model slugs are both picker IDs and OpenCode 1.18.4 effective
  `api.id` values; display names remain separate.
- [x] HTTPS/loopback URL policy, no URL credentials, hosted live enforcement,
  manual redirects, protected authenticated headers, and basename-only default
  workspace metadata.
- [x] 30-second response-header, 60-second stream-idle, 64-KiB error,
  8-MiB response, and 1-MiB NDJSON-line protections with reader cancellation
  and sponsor clearing on protocol errors.
- [x] Sponsor display fields are sanitized and bounded.
- [x] TUI state is reconstructed from ordered session messages, accepts only
  the highest sequence per assistant message/turn, clears on a newest user
  message, and deduplicates cumulative settlement by turn.
- [x] Public beta package metadata, source-inclusive source maps, Bun 1.3.14,
  Biome 2.5.5, package inspection, isolated imports, audits, CI, tag release,
  staging canary, one-time bootstrap publication, and trusted OIDC publication
  workflow.
- [x] Security, contribution, privacy, beta limitation, release, rollback, and
  parent pre-beta decision documentation.

## Current local evidence

- `bun run lint`: passed.
- `bun run typecheck`: passed.
- `bun run test:coverage`: 24 passed; 95.86% lines and 93.63% functions.
- `bun run build`: passed.
- `bun scripts/opencode-model-check.ts`: passed against the real OpenCode
  1.18.4 CLI with both effective `api.id` values.
- Production dependency audit: no known vulnerabilities.
- Development audit: no high/critical findings. The accepted low finding
  `GHSA-4x5r-pxfx-6jf8` is documented in `RELEASE.md`.
- Package manifest/content validation, isolated tarball install, and
  root/server/TUI import smoke: passed.

## Completed external release gates

The first beta completed these external gates:

- create and configure the public GitHub repository, secret scanning, private
  vulnerability reporting, protected `main`, required CI, protected `v*` tags,
  and required reviewers for `npm-publish`;
- scan the complete subtree-split history for secrets before any public push;
- verify `@adrouter` npm organization ownership and publisher 2FA;
- run authenticated staging canaries for both models from the protected tag;
- bootstrap the package with a one-time granular token, configure the trusted
  publisher, delete the GitHub token secret, and verify registry provenance;
- install from a clean registry profile and verify root/server/TUI imports in
  an OpenCode peer environment.

The GitHub prerelease remains draft during the owner canary and 24-hour soak.
Inspect monitoring before publishing the prerelease or issuing more beta
credentials.
