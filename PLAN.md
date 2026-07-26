# AdRouter OpenCode first-beta implementation record

Target: `@adrouter/opencode@0.1.0-beta.3`. Beta.3 supersedes the published
beta.2 package and closes the plugin-installation/provider-discovery gap.

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
- [x] Global OpenCode installation guidance and real 1.18.4/1.18.5 installer,
  model, and non-secret provider-auth regression checks.
- [x] Candidate-first npm publication, exact draft artifact verification,
  cross-platform registry installation, and resumable `beta`/`latest`
  promotion.

## Current local evidence

- `bun run lint`: passed.
- `bun run typecheck`: passed.
- `bun run test:coverage`: 24 passed; 95.86% lines and 93.63% functions.
- `bun run build`: passed.
- `bun scripts/opencode-model-check.ts`: passed against the real OpenCode
  1.18.4 and 1.18.5 CLIs for global installation, both effective `api.id`
  values, and provider-auth discovery.
- Production dependency audit: no known vulnerabilities.
- Development audit: no high/critical findings. The accepted low finding
  `GHSA-4x5r-pxfx-6jf8` is documented in `RELEASE.md`.
- Package manifest/content validation, immutable artifact/checksum round trip,
  isolated tarball install, and root/server/TUI import smoke: passed.

## External beta.3 release gates

The first beta completed the repository and npm ownership gates. Beta.3 still
requires:

- create the separate `adrouter-staging` environment and re-enter its staging
  bearer token;
- add a new seven-day `NPM_TOKEN` to `npm-publish` for dist-tag/deprecation
  operations, then delete and revoke it after release;
- complete npm browser/2FA step-up and verify the `publish.yml` trusted
  publisher binding;
- merge the public release PR, tag `v0.1.0-beta.3`, approve the protected
  workflows, and inspect monitoring before issuing more beta credentials.
