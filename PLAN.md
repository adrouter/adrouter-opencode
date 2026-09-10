# Plan: OpenCode Beta.9 Footer Release

## Goal

Preserve the completed beta.9 footer-release record and publish the validated provider/transport
security fixes as immutable `0.1.0-beta.10` GitHub and npm candidate artifacts, without moving npm
`beta` or `latest` and while leaving the canonical checkout clean.

## Context

- Beta.8 is the accepted immutable public beta and its provider/integration contract remains the
  baseline.
- The preserved local future-fix work contains only footer presentation, tests, and documentation.
- A brief `429 concurrency_limit` followed by a successful OpenCode retry is a pre-generation
  admission rejection, not evidence of a failed streamed turn.
- Release work starts from current protected `main`; the unrelated beta.5 stash and dirty canonical
  worktree remain untouched.
- Public beta.9 is immutable. The pre-security mixed worktree is preserved on local-only branch
  `codex/preserve-pre-security-20260811` at `98c3110`.
- Beta.10 pins protected provider configuration to the exact package and bounds post-header response
  processing without changing integration-key or model/tool contracts.

## Research Summary

- Router source rejects concurrency before inserting a reservation or beginning paid generation.
- OpenCode owns the visible retry indicator; plugin-side suppression or replay would weaken truthful
  error reporting and could create unsafe duplicate behavior.
- Existing protected workflows can stage an authenticated draft, publish with npm OIDC, and run the
  macOS/Linux/Windows OpenCode compatibility matrix.
- GitHub protected environments keep release jobs and their secrets behind configured approval
  rules; npm trusted publishing binds candidate publication to the reviewed workflow through OIDC.

## Constraints

- Preserve the provider wire contract, integration authentication, model catalog, tool mapping,
  stream ordering, settlement accounting, and sponsor isolation.
- Keep every footer row within visible terminal width and render no more than three rows.
- Add no dependencies and use Bun 1.3.14 with the existing lockfile.
- Keep the promoted beta.9 package immutable and on `beta`/`latest`; candidate publication may move
  only `candidate` to beta.10 and must not advance the accepted channels.

## Out of Scope

- Router changes, retry suppression, plugin-side automatic replay, or concurrency-policy changes.
- Unrelated UI redesign, stable `0.1.0`, beta.8 replacement, or changes to the held beta.5 stash.

## Reversibility

- Keep presentation changes isolated from provider transport and state contracts.
- Use the higher immutable beta.10 identity for security candidate work; beta.9 remains installable
  and on public channels.
- Stop before publication on any failed test, canary, package-integrity, or ownership check.

---

## Step A: Implement and test the bounded footer

### Status

`complete`

### Objective

Render disclosure/title, sanitized ad copy, and economics/URL in at most three bounded rows while
retaining current stale-state and privacy behavior.

### Tasks

- [x] Re-query current main, npm channels, unused beta.9 identity, and protected environments.
- [x] Port the preserved presentation/TUI work onto the clean current-main branch.
- [x] Cover narrow/zero widths, Unicode/control sanitization, missing fields, pending/final subsidy,
      savings deduplication, `NONE`, off, degraded, and stale-state clearing.
- [x] Add bounded 429 error regression coverage without retry logic.

### Relevant Files

- `src/presentation.ts`, `src/tui.tsx`
- `test/tui/presentation.test.ts`, `test/provider/provider.test.ts`

### Expected Changes

- modify: footer renderer, TUI slot, and focused tests
- create/delete: none

### Do Not Modify

- provider request/retry behavior, Router endpoints, credentials, model/tool contracts, or transcript

### Commands

```bash
bun run lint
bun run typecheck
bun test
bun run build
```

### Acceptance Criteria

- [x] Footer uses at most three rows and no row exceeds the renderer width.
- [x] Current subsidy and deduplicated cumulative savings appear after settlement.
- [x] Invalid/degraded state clears sponsorship and `NONE` stays compact.
- [x] A 429 remains a bounded truthful error and is never replayed by the plugin.

### Validation Results

- Clean beta.9 `bun run release:check`: passed with Bun 1.3.14 (40 tests, coverage, audits,
  package inspection, and OpenCode 1.18.4/1.18.15 discovery).

### Findings / Notes

- OpenCode's successful second attempt confirms the host retry path; no Router or provider change is
  required for this candidate.

---

## Step B: Prepare beta.9 release metadata and documentation

### Status

`complete`

### Objective

Bind the UI change to one unused immutable package/tag identity and document candidate installation
without changing accepted public channels.

### Tasks

- [x] Set package/manifest intent to beta.9 with beta.8 as the superseded release on later
      finalization.
- [x] Update changelog, README candidate installation/troubleshooting, release runbook, and plan.
- [x] Preserve the recently published README layout and existing beta/latest commands.

### Relevant Files

- `package.json`, `release-manifest.json`, `CHANGELOG.md`
- `README.md`, `RELEASE.md`, `PLAN.md`

### Expected Changes

- modify: version/release metadata and public documentation
- create/delete: none

### Do Not Modify

- `bun.lock`, workflow authentication, npm tokens, protected environments, or accepted beta.8 assets

### Commands

```bash
bun run release:policy
bun run package:check
git diff --check
```

### Acceptance Criteria

- [x] Package and manifest identify beta.9 and exact candidate/finalization intent.
- [x] README keeps `@beta`/`@latest` and adds a clearly marked `@candidate` command.
- [x] Release documentation records beta.9 promotion and the retained-candidate cleanup exception.

### Validation Results

- Release policy, package inspection, docs checks, and complete release gate passed locally.

### Findings / Notes

- Beta.9 npm version, Git tag, and GitHub release were unused at preflight.

---

## Step C: Final verification and cleanup

### Status

`complete`

### Objective

Validate, merge, stage, publish, and independently verify the exact beta.9 candidate.

### Tasks

- [x] Run the full release gate and review the complete clean diff.
- [x] Merge through protected linear `main`, tag the exact squash commit, and approve staging.
- [x] Verify the three immutable draft assets, publish npm `candidate`, and pass every registry job.
- [x] Promote the exact package to npm `beta`/`latest` and publish the GitHub prerelease after live
      Windows acceptance and explicit operator authorization.
- [x] Re-query anonymous npm/GitHub state and record the candidate-cleanup exception.

### Relevant Files

- `.github/workflows/`, `scripts/`, release metadata and documentation listed above

### Expected Changes

- remote: protected PR merge, immutable `v0.1.0-beta.9`, draft GitHub release, npm `candidate`
- local: no generated release output committed

### Do Not Modify

- npm `beta`/`latest`, beta.8 release/tag/assets, Router, hosted database, or environment secrets

### Commands

```bash
bun run release:check
git diff --check
git status --short --branch
```

### Acceptance Criteria

- [x] Local release gate and all protected CI/staging/registry jobs pass.
- [x] npm `beta`, `latest`, and retained `candidate` resolve to beta.9 with exact staged integrity.
- [x] GitHub beta.9 is a public prerelease retaining the original three assets.
- [x] No package version, Git tag, or release asset was replaced.

### Validation Results

- Candidate workflow `31374665139`: passed the complete macOS/Linux/Windows registry matrix.
- Finalization workflow `31383566436`: passed release integrity and all six OpenCode/OS registry
  jobs; npm moved `beta` and `latest` to beta.9 before returning `403` for candidate deletion.
- The verified draft was then published unchanged as the beta.9 GitHub prerelease under the
  explicit operator override.

### Findings / Notes

- npm denied only the DELETE request for `candidate`; the alias remains on the same immutable beta.9
  package and does not change `beta`/`latest` behavior. Beta.8 deprecation was skipped.

---

## Step D: Security-only beta.10 candidate

### Status

`in_progress`

### Objective

Extract, verify, merge, tag, and publish the provider-boundary and bounded-response fixes as one
immutable beta.10 candidate while preserving unrelated local presentation work.

### Tasks

- [x] Preserve the original mixed tree at local commit `98c3110` and create
      `codex/security-beta10` from current `origin/main`.
- [x] Port only `src/server.ts`, provider/transport parsing, and focused security tests; exclude
      pre-existing presentation/TUI work.
- [x] Prepare unused beta.10 package, manifest, changelog, README, runbook, and plan metadata.
- [x] Run Bun 1.3.14 formatting, full release checks, package inspection, and final diff review.
- [ ] Push a protected PR, merge after Linux/macOS/Windows CI and secret scanning, and tag the exact
      merge commit as annotated `v0.1.0-beta.10`.
- [ ] Approve staging, verify the immutable draft, dispatch `publish-candidate`, approve npm OIDC
      publication, and verify public integrity/provenance.
- [ ] Confirm npm `candidate` is beta.10 while `beta`/`latest` remain beta.9 and leave the checkout
      clean.

### Relevant Files

- `src/server.ts`, `src/provider.ts`, `src/transport/parse.ts`
- `test/provider/security.test.ts`, `test/server.test.ts`
- `package.json`, `release-manifest.json`, `CHANGELOG.md`, `README.md`, `RELEASE.md`, `PLAN.md`

### Expected Changes

- modify: protected provider merge, bounded response timers/readers, focused tests, and beta.10 metadata
- create: protected beta.10 PR/merge/tag/GitHub/npm candidate state
- delete: no user work, accepted channel, prior artifact, or tag

### Do Not Modify

- sponsor/footer presentation, model catalog, auth key scope, Router state, or unrelated README content
- npm `beta`/`latest`, beta.9 assets/tags, hosted secrets, or generated local release output

### Commands

```bash
bun install --frozen-lockfile
bun run format
bun run release:check
git diff --check
git status --short --branch
```

### Acceptance Criteria

- [x] The security branch contains no unrelated presentation/TUI work.
- [x] Provider identity cannot be overridden and response handling remains bounded/fail-closed.
- [x] The local full release check passes.
- [ ] Protected multi-platform CI passes.
- [ ] `v0.1.0-beta.10`, GitHub assets, and npm provenance identify one exact commit/artifact.
- [ ] npm `candidate` resolves to beta.10 while `beta`/`latest` remain beta.9.
- [ ] The canonical directory is clean and the preservation branch remains recoverable.

### Validation Results

- Bun 1.3.14: frozen install and formatting pass; `bun run release:check` passes lint, typecheck,
  release policy, 42 tests with 97.7% line coverage, build, dependency audit, package inspection,
  and OpenCode 1.18.4/1.18.15 install/model/auth compatibility probes.
- Protected CI/candidate workflows: not run.

### Findings / Notes

- Authenticated hosted candidate acceptance and final channel promotion remain later explicit gates.

---

## Follow-up Work

- Remove the retained `candidate` alias and apply beta.8 deprecation only after npm cleanup
  authorization is available; neither is required for beta/latest installation.
- Start the stable soak clock only after candidate cleanup so the published-channel verifier retains
  its normal invariant.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-08-08 | Reject beta.6 and fix provider version binding in beta.7/beta.8. | Unversioned provider resolution crossed into an older machine-auth package. | Later candidates retain exact package/provider identity. |
| 2026-08-10 | Treat the observed 429 as a truthful transient admission response. | Router rejects it before reservation/generation and OpenCode already retries successfully. | Add coverage/docs; do not suppress or replay in the plugin. |
| 2026-08-10 | Publish footer changes as beta.9 candidate only. | Beta.8 is accepted and immutable, while candidate testing must not disturb public channels. | Create a new npm candidate and draft GitHub release; defer finalization. |
| 2026-08-10 | Promote beta.9 after live Windows acceptance and retain its candidate alias. | npm accepted `beta`/`latest` but denied only candidate deletion; the alias points to the identical immutable package. | Publish the verified GitHub prerelease unchanged, skip beta.8 deprecation, and defer cleanup until suitable npm authorization exists. |
| 2026-08-11 | Extract a security-only beta.10 candidate from current remote main. | The aggregate local tree also contained unrelated footer/presentation work. | Preserve all original bytes locally while publishing only the validated provider/transport fixes. |


# Streaming-reliability candidate 0.1.0-beta.11 — 10 September 2026

## Goal
Publish the demonstrated local stream-handling corrections as 0.1.0-beta.11 on npm candidate through adrouter/adrouter-opencode. Preserve beta/latest and all previous immutable versions.

## Context and constraints
This isolated checkout starts from original-repository main. Original dirty checkout, unrelated governance/GitLab changes and parked work remain untouched. Only streaming fixes/tests and release metadata are included. No new dependencies, API/IPC/state changes, account-policy changes, limit increases or Router deployment. Historical Desktop incident remains unverified (0/3 hosted reproduction attempts, $0).

## Step A: Prepare and validate
### Status
`in_progress`
- [x] Verify version/tag unused and copy reviewed fixes.
- [x] Update current release metadata while preserving historical evidence.
- [ ] Run full platform release gates and review diff.
### Validation Results
Pending for this exact release version; previous source regression evidence is recorded in workspace docs/streaming-and-model-limits-2026-09-10.md.

## Step B: Review, stage and publish candidate
### Status
`todo`
- [ ] Commit clean inputs; open PR against original main; require CI and normal protected review/merge.
- [ ] Verify authentication and exact-tag protected rules; stage and verify immutable artifacts from merged SHA.
- [ ] Publish only candidate with matching workflow ref/tag; verify required registry smoke checks.
### Validation Results
Not run.

## Step C: Final verification and cleanup
### Status
`todo`
- [ ] Independently compare npm integrity and staged artifacts; record SHA, tag, checksums and workflow URLs.
- [ ] Verify beta/latest unchanged and preserve unrelated work.
### Validation Results
Not run.

## Follow-up Work
After all three client candidates verify, append the workspace roadmap TODO to double 4096 output defaults to 8192; no limit changes in this release. Physical acceptance and final beta/latest promotion require separate authorization.

## Decision Log
| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-09-10 | New immutable 0.1.0-beta.11 on existing candidate channel | Approved release plan; published versions cannot be modified |
| 2026-09-10 | Original adrouter repository; adrouter-co backup only | Existing protected workflows and user-selected release destination |

### Beta.11 local gate results
Bun 1.3.14 frozen install and full release:check passed: lint, typecheck, release policy, 43 tests with coverage, build, audit, package inspection, and OpenCode 1.18.4/1.18.15 installation/provider-auth discovery. Original working tree and stash remain untouched. Hosted staging canaries and registry candidate matrix are pending; no live requests have been sent.
