# Plan: OpenCode Beta.9 Footer Candidate

## Goal

Publish `@adrouter/opencode@0.1.0-beta.9` under npm `candidate` with a bounded three-row footer that
shows current subsidy and cumulative savings, while leaving accepted `beta`/`latest` on beta.8.

## Context

- Beta.8 is the accepted immutable public beta and its provider/integration contract remains the
  baseline.
- The preserved local future-fix work contains only footer presentation, tests, and documentation.
- A brief `429 concurrency_limit` followed by a successful OpenCode retry is a pre-generation
  admission rejection, not evidence of a failed streamed turn.
- Release work starts from current protected `main`; the unrelated beta.5 stash and dirty canonical
  worktree remain untouched.

## Research Summary

- Router source rejects concurrency before inserting a reservation or beginning paid generation.
- OpenCode owns the visible retry indicator; plugin-side suppression or replay would weaken truthful
  error reporting and could create unsafe duplicate behavior.
- Existing protected workflows can stage an authenticated draft, publish with npm OIDC, and run the
  macOS/Linux/Windows OpenCode compatibility matrix.

## Constraints

- Preserve the provider wire contract, integration authentication, model catalog, tool mapping,
  stream ordering, settlement accounting, and sponsor isolation.
- Keep every footer row within visible terminal width and render no more than three rows.
- Add no dependencies and use Bun 1.3.14 with the existing lockfile.
- Publish only npm `candidate`; do not move `beta`/`latest` or finalize the GitHub draft.

## Out of Scope

- Router changes, retry suppression, plugin-side automatic replay, or concurrency-policy changes.
- Unrelated UI redesign, stable `0.1.0`, beta.8 replacement, or changes to the held beta.5 stash.

## Reversibility

- Keep presentation changes isolated from provider transport and state contracts.
- Use the higher immutable beta.9 identity; beta.8 remains installable and on public channels.
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
- [x] Release documentation leaves beta.8 public until separate finalization.

### Validation Results

- Release policy, package inspection, docs checks, and complete release gate passed locally.

### Findings / Notes

- Beta.9 npm version, Git tag, and GitHub release were unused at preflight.

---

## Step C: Final verification and cleanup

### Status

`in_progress`

### Objective

Validate, merge, stage, publish, and independently verify the exact beta.9 candidate.

### Tasks

- [x] Run the full release gate and review the complete clean diff.
- [ ] Merge through protected linear `main`, tag the exact squash commit, and approve staging.
- [ ] Verify the three immutable draft assets, publish npm `candidate`, and pass every registry job.
- [ ] Re-query anonymous npm/GitHub state and record evidence without finalizing.

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

- [ ] Local release gate and all protected CI/staging/registry jobs pass.
- [ ] npm `candidate` resolves to beta.9 with exact staged tarball integrity.
- [ ] npm `beta`/`latest` remain beta.8 and GitHub beta.9 remains draft.
- [ ] Temporary release clones/output are cleaned after evidence is recorded.

### Validation Results

- Not run.

### Findings / Notes

- Candidate publication uses configured OIDC and existing protected environments; no new auth setup
  is expected.

---

## Follow-up Work

- Perform interactive candidate acceptance before any later beta/latest finalization.
- Restart the stable soak clock from beta.9 only after separate finalization authorization.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-08-08 | Reject beta.6 and fix provider version binding in beta.7/beta.8. | Unversioned provider resolution crossed into an older machine-auth package. | Later candidates retain exact package/provider identity. |
| 2026-08-10 | Treat the observed 429 as a truthful transient admission response. | Router rejects it before reservation/generation and OpenCode already retries successfully. | Add coverage/docs; do not suppress or replay in the plugin. |
| 2026-08-10 | Publish footer changes as beta.9 candidate only. | Beta.8 is accepted and immutable, while candidate testing must not disturb public channels. | Create a new npm candidate and draft GitHub release; defer finalization. |
