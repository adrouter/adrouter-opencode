# Beta release runbook

## Hard prerequisites

- The public repository is `adrouter/adrouter-opencode`; never push the parent
  monorepository.
- The public branch was created with
  `git subtree split --prefix=adrouter_release/adrouter-opencode` and its full
  isolated history passed a secret scan.
- GitHub secret scanning, private vulnerability reporting, protected `main`,
  required CI, protected `v*` tags, and required reviewers on the
  `npm-publish` environment are enabled.
- Ownership of the `@adrouter` npm organization is verified and every
  publisher has 2FA enabled.
- The version is new and immutable. Never overwrite or reuse a published
  version.

Repository settings and npm ownership are external gates and cannot be proven
by source control.

## Candidate

1. Run `bun install --frozen-lockfile` and `bun run release:check`.
2. Confirm the development audit has no high/critical findings. For beta.2 the
   accepted development-only low finding is `GHSA-4x5r-pxfx-6jf8` through the
   pinned OpenCode/OpenTUI toolchain. The OpenTUI build chain is overridden to
   patched `brace-expansion@5.0.8` for `GHSA-mh99-v99m-4gvg`; the production
   dependency audit is clean.
3. Create and push an immutable protected `v0.1.0-beta.2` tag from the accepted
   commit. `release.yml` reruns all gates, validates OpenCode 1.18.4 model IDs,
   runs authenticated staging canaries for both models, and creates a draft
   GitHub prerelease with a tarball and SHA-256 checksum.

## npm publication

Use the trusted-publishing workflow `.github/workflows/publish.yml` with the
immutable release tag. It publishes with:

```sh
npm publish --tag beta --access public --provenance
```

The npm trusted publisher is restricted to organization `adrouter`, repository
`adrouter-opencode`, workflow `publish.yml`, and environment `npm-publish`.
The workflow has `id-token: write` and stores no npm credential.

The initial `0.1.0-beta.2` publication used a short-lived bootstrap token. The
GitHub environment secret was deleted after publication; do not restore the
bootstrap workflow or store a replacement npm token.

## Registry and rollout verification

Before publishing the GitHub prerelease:

- verify `npm view @adrouter/opencode dist-tags --json` reports `beta` at the
  intended version. npm automatically assigned `latest` on the first
  publication and returned HTTP 400 when its authenticated CLI attempted to
  remove that tag; the prerelease version remains explicit in SemVer;
- verify npm provenance points to the release repository, workflow, tag, and
  commit;
- install `@adrouter/opencode@beta` in a clean OpenCode 1.18.4 profile and
  authenticate;
- run an owner canary and a 24-hour soak before issuing other beta credentials.

Monitor authentication failures, `invalid_model`, 409/5xx responses, protocol
errors, routing failures, settlement mismatches, latency, and spend.

## Rollback

Revoke beta credentials or traffic, remove the `beta` dist-tag, deprecate the
faulty immutable version, and fix forward as `0.1.0-beta.3`. Never overwrite a
published version.
