# Beta release runbook

## Hard prerequisites

- The canonical public repository is `adrouter/adrouter-opencode`; never push
  the parent monorepository to GitHub.
- Work from a clean clone of the public repository and merge through protected
  `main`. The complete isolated history must pass the history secret scan.
- GitHub secret scanning, private vulnerability reporting, protected `main`,
  required CI, immutable `v*` tags, and protected release environments are
  enabled.
- The npm account has 2FA enabled and read/write permission for
  `@adrouter/opencode`. Published versions and tags are never rewritten.

Repository settings, environment approvals, npm ownership, and npm trusted
publisher configuration are external gates and cannot be proven by source
control.

## Protected environments and credentials

Create two GitHub environments with a required reviewer:

- `adrouter-staging` contains only `ADROUTER_STAGING_API_KEY`, a low-quota,
  revocable AdRouter staging bearer token used by the tagged live canary.
- `npm-publish` contains `NPM_TOKEN`, a granular token with read/write access
  limited to `@adrouter/opencode`, bypass-2FA enabled, and at most a seven-day
  expiry. It is used only for dist-tag promotion and deprecation.

Do not store a DeepSeek key, GitHub personal access token, or long-lived npm
publication token in the repository. GitHub release operations use the
workflow-scoped `GITHUB_TOKEN`. Candidate publication uses npm OIDC.

The npm trusted publisher must be restricted to organization `adrouter`,
repository `adrouter-opencode`, workflow `publish.yml`, environment
`npm-publish`, and the `npm publish` action. Verify it with:

```sh
npm trust list @adrouter/opencode
```

The command requires npm browser/2FA step-up authentication. If the binding is
missing, create it only after authenticating:

```sh
npm trust github @adrouter/opencode \
  --file publish.yml \
  --repository adrouter/adrouter-opencode \
  --environment npm-publish \
  --yes
```

## Candidate and draft release

1. From a clean checkout, run `bun install --frozen-lockfile` and
   `bun run release:check`.
2. Merge the release PR only after Linux, macOS, Windows, and history-scan
   checks pass.
3. Create and push annotated tag `v0.1.0-beta.3` from the accepted merge
   commit. `release.yml` reruns every gate, performs authenticated canaries for
   both models, builds one tarball, records its commit and integrity, and
   creates a draft GitHub prerelease.
4. Approve the `adrouter-staging` deployment when GitHub pauses the tag job.

The release artifact consists of the npm tarball, `SHA256SUMS`, and
`npm-artifacts.json`. Publication workflows must download this exact artifact;
they must not rebuild it.

## npm publication and promotion

Run `Promote staged beta` with tag `v0.1.0-beta.3` in two phases:

1. `publish-candidate` publishes the recorded tarball with npm trusted
   publishing under the temporary `candidate` dist-tag and verifies registry
   integrity, provenance, commit, and metadata. It does not move `beta` or
   `latest`.
2. `finalize-release` installs the exact registry candidate on Linux, macOS,
   and Windows with OpenCode 1.18.4 and 1.18.5. Only after all six jobs pass
   does it use the short-lived `NPM_TOKEN` to move both `beta` and `latest` to
   beta.3, remove `candidate`, deprecate beta.2, and publish the GitHub
   prerelease.

Approve the `npm-publish` environment whenever either protected phase pauses.
The workflow is idempotent: it accepts an exact candidate or an already-final
release, but fails on conflicting tags, metadata, commit, or integrity.

`latest` temporarily follows `beta` because no stable version exists and
unqualified installs already resolve to a prerelease. At the first stable
`0.1.0`, move only `latest` to stable and leave `beta` on the newest accepted
beta.

## Final verification and credential cleanup

- Confirm `npm view @adrouter/opencode dist-tags --json` reports both `beta`
  and `latest` at `0.1.0-beta.3` and no `candidate` tag.
- Install `@adrouter/opencode@beta` in a clean OpenCode profile, run
  `opencode models adrouter`, and confirm the auth provider is recognized.
- Confirm npm provenance identifies the protected tag, workflow, repository,
  and commit, and the GitHub release is public and marked prerelease.
- Delete the `NPM_TOKEN` GitHub secret and revoke the npm token immediately.
- Keep the staging key only while staging canaries remain useful; rotate or
  revoke it on any suspected exposure.

## Rollback

Before final promotion, remove or replace only the `candidate` tag and deprecate
the rejected immutable version; `beta` and `latest` remain on beta.2. After
promotion, a release blocker moves `beta` and `latest` back to beta.2,
deprecates beta.3, and fixes forward as beta.4. Never overwrite, reuse, or
unpublish a version.
