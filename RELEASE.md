# Release runbook

## Hard prerequisites

- Release only from a clean clone of `adrouter/adrouter-opencode`; never push the parent workspace.
- Merge through protected `main` after Linux/macOS/Windows CI and the history secret scan pass.
- Keep immutable `v*` tags, secret scanning, private vulnerability reporting, and protected release
  environments enabled.
- Use Bun 1.3.14 and run `bun install --frozen-lockfile` plus `bun run release:check`.
- Never rebuild a staged artifact, overwrite a version/tag, or publish without the explicit
  `candidate` tag.

## Authentication and protected environments

Authenticate GitHub CLI in a browser session and verify canonical access:

```sh
gh auth login -h github.com -p https -w
gh auth status
gh repo view adrouter/adrouter-opencode
```

The account must be able to push branches and annotated tags, merge release PRs, dispatch workflows,
manage releases/environment secrets, and approve protected deployments. If the organization uses
SSO, authorize the GitHub CLI credential for it.

Create two GitHub environments with required reviewers:

- `adrouter-staging` contains only `ADROUTER_STAGING_INTEGRATION_API_KEY`, a low-quota revocable
  30-day staging integration credential that can run both hosted model canaries.
- `npm-publish` contains a temporary `NPM_TOKEN` only during final promotion. Use a granular token
  limited to `@adrouter/opencode`, read/write, automation/bypass-2FA enabled, and valid for no more
  than seven days.

Enter secrets through an interactive prompt or GitHub UI; never put values in chat, command
arguments, logs, source, or release notes:

```sh
gh secret set ADROUTER_STAGING_INTEGRATION_API_KEY --repo adrouter/adrouter-opencode --env adrouter-staging
gh secret set NPM_TOKEN --repo adrouter/adrouter-opencode --env npm-publish
```

The npm owner account must have 2FA and read/write ownership of `@adrouter/opencode`. Trusted
publishing must be restricted to organization `adrouter`, repository `adrouter-opencode`, workflow
`publish.yml`, and environment `npm-publish`. Candidate publication uses OIDC; the temporary token
is used only for dist-tags and optional deprecation.

Verify or create the trusted-publisher binding after npm browser/2FA authentication:

```sh
npm trust list @adrouter/opencode
npm trust github @adrouter/opencode \
  --file publish.yml \
  --repository adrouter/adrouter-opencode \
  --environment npm-publish \
  --yes
```

## Manifest channel policy

`release-manifest.json` is schema 2 and is authoritative:

- Beta: `version`, `beta`, and `latest` all identify the new beta; `githubPrerelease` is true and
  `supersedes` may identify the preceding beta.
- Stable: `latest` identifies the stable version, `beta` preserves the accepted numbered beta,
  `githubPrerelease` is false, `supersedes` is absent, and `release.soak` records the beta version,
  finalization time, and macOS/Linux/Windows GitHub Actions evidence URLs.
- `candidate` is temporary and must be absent after finalization.

The beta.9 operator exception below temporarily relaxes only that final cleanup invariant. It does
not permit candidate to point anywhere other than the exact package on both public channels.

`bun run release:policy` rejects channel mismatches. Stable additionally requires the beta tag,
at least 48 elapsed hours, all three evidence URLs, and a diff limited to release metadata and
documentation. Any runtime change requires a new unused beta and a restarted soak.

## Prepare and stage a release

1. Update `package.json`, `release-manifest.json`, `CHANGELOG.md`, public documentation, and any
   version-specific workflow/runbook text together.
2. Run:

   ```sh
   bun install --frozen-lockfile
   bun run format
   bun run release:check
   git diff --check
   ```

3. Open a release PR and merge only after all required checks pass.
4. Resolve the protected-main merge commit. Create and verify an annotated immutable tag on exactly
   that commit, then push it:

   ```sh
   git tag -a v<version> <merge-commit> -m "Release v<version>"
   git cat-file -t v<version>
   git rev-parse v<version>^{}
   git push origin v<version>
   ```

5. Approve the `adrouter-staging` deployment. `release.yml` reruns all gates, runs both authenticated
   model canaries, packs once, records the commit/checksums/integrity, and creates a draft GitHub
   release with exactly one tarball, `SHA256SUMS`, and `npm-artifacts.json`. Its prerelease state is
   selected from the manifest.
6. Inspect the tag, commit, three assets, SHA-256, npm integrity, and package metadata. Every later
   step must use this exact tarball.

## Publish candidate and finalize

Dispatch candidate publication:

```sh
gh workflow run publish.yml --repo adrouter/adrouter-opencode --ref main \
  -f tag=v<version> -f phase=publish-candidate
```

Approve `npm-publish`. The workflow verifies the exact draft assets, publishes the tarball under
`candidate` with npm OIDC/provenance, and verifies registry metadata and integrity. It does not move
`beta` or `latest`.

After candidate verification, dispatch finalization:

Before dispatching finalization, install the exact registry candidate through OpenCode and complete
one authenticated staging turn. The turn must finish with assistant output, terminal-bottom
metadata, settlement, and usage, and it must not reach machine auth. A failure leaves `beta` and
`latest` unchanged and requires a new immutable candidate.

```sh
gh workflow run publish.yml --repo adrouter/adrouter-opencode --ref main \
  -f tag=v<version> -f phase=finalize-release
```

Approve each protected pause only after the preceding gates are green. The workflow installs the
registry candidate anonymously on Linux, macOS, and Windows for every OpenCode version listed in
the manifest. It then applies exactly the manifest's final tags, removes `candidate`, optionally
deprecates `supersedes`, and publishes GitHub with the manifest's prerelease state.

The workflow is resumable only when tag, commit, artifact, integrity, and registry metadata are
exact. Fix workflow defects through protected `main`; never retag or rebuild.

## Beta.9 public release, cleanup, and stable 0.1.0

Beta.6 was rejected before channel promotion because its unversioned provider registration resolved
public beta.4 at execution time. Keep beta.6 immutable and deprecated; never promote or rebuild it.

Beta.9 is the accepted public beta on both `beta` and `latest`. Its finalization passed the complete
release-integrity and macOS/Linux/Windows OpenCode registry matrix. npm accepted both public tag
writes but returned `403` for deletion of `candidate`, so the operator-authorized recovery published
the unchanged GitHub prerelease while retaining `candidate` on the same immutable beta.9 package and
skipping beta.8 deprecation. Candidate cleanup remains required before the stable soak verifier; it
must not rebuild, retag, or replace beta.9.

Start or restart the stable clock only after the retained beta.9 candidate alias is removed. For at
least 48 hours after cleanup:

- retain successful anonymous packaged-user workflow evidence for macOS, Linux, and Windows;
- keep both authenticated model canaries green;
- verify an installed interactive session renders settled Tier A exactly like Tier B/C, uses at
  most three bounded rows, and shows current subsidy plus deduplicated savings;
- treat any install, privacy, routing, settlement, or display regression as release-blocking.

At or after the 48-hour point, dispatch the non-mutating published-channel verifier and approve its
`adrouter-staging` canary job:

```sh
gh workflow run soak.yml --repo adrouter/adrouter-opencode --ref main \
  -f version=0.1.0-beta.9 -f channel=beta
```

Record its successful run URL for the `darwin`, `linux`, and `windows` cohort evidence fields. The
same run is valid for all three fields because its required matrix contains every supported OS and
OpenCode version plus both authenticated canaries.

After a clean soak, the stable PR may modify only `package.json`, `release-manifest.json`,
`CHANGELOG.md`, `README.md`, `SECURITY.md`, `RELEASE.md`, and `PLAN.md`. Set `version=0.1.0`,
`latest=0.1.0`, `beta=0.1.0-beta.9`, remove `supersedes`, set `githubPrerelease=false`, and record
the authenticated soak evidence. Source, tests, scripts, workflows, and dependencies must remain
identical to beta.9. Publish stable through the same candidate and finalization phases.

## Independent verification and cleanup

Use an anonymous npm configuration for registry checks:

```sh
env -u NODE_AUTH_TOKEN -u NPM_TOKEN \
  NPM_CONFIG_USERCONFIG=/tmp/adrouter-empty-npmrc \
  NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
  ADROUTER_SMOKE_REGISTRY=true \
  bun run plugin:check
```

Verify public state:

```sh
npm view @adrouter/opencode dist-tags --json
npm view @adrouter/opencode@<version> dist.integrity dist.attestations --json
gh release view v<version> --repo adrouter/adrouter-opencode \
  --json isDraft,isPrerelease,url,assets,tagName
```

The smoke test must import the root/server/TUI targets, discover all six tool-capable AdRouter models,
and recognize the `AdRouter integration API key (adr_int_)` auth method without
`Unknown provider "adrouter"`.

After each successful beta or stable release, delete the GitHub secret and revoke the corresponding
npm token in the npm UI. Deleting the GitHub secret does not revoke the registry token:

```sh
gh secret delete NPM_TOKEN --repo adrouter/adrouter-opencode --env npm-publish
```

Keep the staging key only while canaries remain useful; rotate or revoke it after suspected exposure.

## Recovery

- Before final promotion, leave `beta`/`latest` unchanged, remove or replace only `candidate`,
  deprecate the rejected immutable version, and fix forward.
- Beta.6 is rejected; never overwrite it.
- If beta.9 develops a defect, preserve its immutable artifacts and fix forward through beta.10;
  never overwrite beta.9.
- If stable 0.1.0 is invalid after beta.9 finalization, move `latest` back to beta.9, deprecate
  0.1.0, and fix forward through
  `0.1.1-beta.1` followed by `0.1.1`.
- Never overwrite, reuse, move, or unpublish an immutable version or Git tag.
