# Candidate publication authorization — 12 September 2026

The operator explicitly authorized successor candidate publication with Kimi disabled in CLI/Desktop and excluded from OpenCode. Include GLM, both Qwen models, presence gating where applicable and preserved UI/output fixes. Exact-artifact live acceptance continues on candidates; beta/latest finalization remains separately authorized. This supersedes the earlier requirement to finish Kimi qualification before these candidate publications.

## Active combined candidate instruction — 12 September 2026

The operator-authorized combined plan supersedes conflicting sequencing and migration guidance below. `adrouter` is the active GitHub organization; `adrouter-co` is backup only. Explicit release targets are `adrouter/adrouterCLI`, `adrouter/adrouterAgent`, and `adrouter/adrouter-opencode`; local remote names do not establish authority. Never enable backup release workflows.

Successor candidates must preserve existing models, Desktop appearance/timeline/approvals/streaming, output settings, limits, truncation and authentication, and include GLM-5.3, Kimi K3 (WebUI/CLI/Desktop; excluded from OpenCode), both Qwen 3.8 models, and CLI/Desktop 60-second presence gating together. Presence includes first-response waiting, fresh task/prompt-bound acknowledgement, runtime execution boundaries, cancellation, approval timer suspension, RPC/IPC and noninteractive attention-required handling. Existing streams settle without replay. Kimi tools remain gated until real continuation qualification; reasoning remains memory-only. OpenCode excludes Kimi.

### Status
`in_progress`

- [ ] Reconcile dirty files and immutable baseline candidates before scoped commits.
- [ ] Complete combined implementation and deterministic presence acceptance.
- [ ] Run owning full checks and authenticated model/surface and packaged UI acceptance.
- [ ] Recheck spending/liabilities before bounded paid tests; preserve completed owner-cap and Kimi browser-vision receipts.
- [ ] Update landing lists truthfully; deploy any changed API before matching WebUI from clean exact commits with rollback/Pages preservation plan.
- [ ] Publish unused immutable successor candidates through active protected workflows, using the same tag as input and dispatch ref; verify integrity, native checksums, provenance and installation.
- [ ] Deliver exact macOS/Windows candidates for operator acceptance. Promotion requires separate authorization.

### Validation Results
Local presence implementation, Router/WebUI checks, CLI checks and focused runtime/provider/RPC tests, Desktop full checks and real 60-second packaged macOS acceptance, OpenCode checks, and landing catalog checks passed. Full live Kimi/cross-surface acceptance and immutable successor publication remain incomplete. No release channels or hosted deployments changed. See [implementation receipt](../../docs/combined-candidate-implementation-2026-09-12.md) for exact counts, baseline identities and blockers.

# Plan: Queued OpenCode models

## Goal

After WebUI acceptance add catalog and qualified tool support; preserve output defaults, bounded streams and footer.

## Context

Approved 2026-09-11. First milestone is the live owner-only WebUI. This scope is queued until WebUI acceptance.
Baseline label: **before new models, still there. adrouterAgent UI fixes + new output limit**.
Recovery commits and original dirty-state metadata are in `../../docs/baseline-before-new-models-20260911.json`. Published candidates and deployed artifacts are distinct from these source checkpoints.

## Research Summary

Official references: https://docs.z.ai/llms.txt, https://platform.kimi.ai/docs/llms.txt, https://www.alibabacloud.com/help/en/model-studio/models. Verify exact regional prices/limits and account access before enabling selected IDs: glm-5.3, kimi-k3, qwen3.8-max, qwen3.8-flash. No replacement IDs. Context7 is not needed for the existing adapter approach.

## Constraints

- Add to existing behavior; preserve all unfinished work below, Desktop UI fixes and output limits.
- Provider keys remain backend-only: ZAI_API_KEY, MOONSHOT_API_KEY, QWEN_API_KEY.
- Keep catalog schema 2 and existing thinking vocabulary compatible with current clients.
- Kimi continuation is memory-only; hold Kimi if compliant continuation is infeasible.
- Preserve owner-only access, account spending limits and other existing account caps. New accounts default to 16384; owner at least 16384.
- Live acceptance costs at most US$1 aggregate, including earlier tests, retries and unresolved liabilities. Permanently raise only owner daily/monthly caps to at least US$5, preserving higher values; this does not raise the test ceiling.
- Sponsor metadata never enters model/tool context. No automatic replay after partial output.
- No new dependencies or unrelated redesign. All deploy inputs must be clean and committed.

## Out of Scope

Public-channel promotion, replacement of existing candidate features, unrelated UI redesign and destructive database resets.

## Reversibility

Existing tags remain immutable. Checkpoints preserve source without changing working trees. Deploy API before Pages from exact commits; record immutable rollback artifacts. Database/account rollback requires deliberate review.

---

## Step A: Preserve and prepare

### Status

`done`

### Tasks

- [x] Preserve original source in recovery checkpoint commits.
- [x] Retain existing plan contents without replacement.

### Acceptance Criteria

- [x] Existing tags and working source are preserved.

### Validation Results

- Repository status and checkpoint creation: passed; no working-tree reset.

---

## Step B: Implement scoped additions

### Status

`todo`

### Tasks

- [ ] After WebUI acceptance add catalog and qualified tool support; preserve output defaults, bounded streams and footer.
- [ ] Record official provider capabilities, admission ceilings and pricing evidence before enablement.
- [ ] Keep live deployment held until keys and preflight evidence are available.

### Relevant Files

- Source, tests, configuration and release inputs owned by `adrouter_release/adrouter-opencode`.

### Expected Changes

- Modify only scoped source, tests and documented configuration; regenerate catalog outputs using owning generators.

### Do Not Modify

- Existing immutable tags, private credentials, unrelated working changes, generated artifacts by hand.

### Acceptance Criteria

- [ ] Scoped behavior works and existing behavior remains covered.
- [ ] For CLI/Agent: after 60 seconds thinking/reading, fresh Enter clears the gate; current stream continues but interactions and new tool/model/delegation rounds wait. Repeat each minute. Headless CLI reports attention-required. Enter never grants another approval.
- [ ] Provider vision is distinguished from client attachment support.

### Validation Results

- Implementation and hosted acceptance: not run.

---

## Step C: Final verification and cleanup

### Status

`todo`

### Tasks

- [ ] Run relevant checks and review final diff for unintended changes.
- [ ] Remove temporary debugging changes and update developer configuration documentation.
- [ ] Record test results, remaining blockers and exact source/deployment receipts.

### Commands

```sh
bun run lint && bun run typecheck && bun test && bun run build && bun run release:policy
```

### Acceptance Criteria

- [ ] Relevant tests pass; unavailable database/native/live checks are explicitly recorded.
- [ ] API/WebUI release uses clean exact commits and validated artifacts, with no unintended Pages auto-deploy.

### Validation Results

- Checks: not run for these additions.

## Follow-up Work

Client candidates and landing updates follow successful WebUI acceptance. Physical Desktop acceptance remains separate from automated checks.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-09-11 | WebUI first; preserve existing plans and candidates | Explicit user instruction | Later surfaces remain queued |
| 2026-09-11 | Backend-only direct international PAYG keys | Approved provider choice | No browser secrets |

---

## Preserved earlier plan and unfinished work

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

`complete`

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
- [x] Push a protected PR, merge after Linux/macOS/Windows CI and secret scanning, and tag the exact
      merge commit as annotated `v0.1.0-beta.10`.
- [x] Approve staging, verify the immutable draft, dispatch `publish-candidate`, approve npm OIDC
      publication, and verify public integrity/provenance.
- [x] Confirm npm `candidate` is beta.10 while `beta`/`latest` remain beta.9 and leave the checkout
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
- [x] Protected multi-platform CI passes.
- [x] `v0.1.0-beta.10`, GitHub assets, and npm provenance identify one exact commit/artifact.
- [x] npm `candidate` resolves to beta.10 while `beta`/`latest` remain beta.9.
- [x] Candidate source was clean at handoff and the preservation branch/stash remains recoverable;
      later governance-only audit edits are separate.

### Validation Results

- Bun 1.3.14: frozen install and formatting pass; `bun run release:check` passes lint, typecheck,
  release policy, 42 tests with 97.7% line coverage, build, dependency audit, package inspection,
  and OpenCode 1.18.4/1.18.15 install/model/auth compatibility probes.
- Authenticated tagged staging, full release checks, immutable artifact verification, and draft
  release: passed on attempt 4; run `31442667976`.
- Trusted candidate publication and Ubuntu/macOS/Windows registry installs for OpenCode `1.18.4`
  and `1.18.15`: passed; run `31616217105`.
- npm `candidate=0.1.0-beta.10`; exact integrity
  `sha512-Zcfbx2IhUi7zVNWpL4kaGQCTvYEPqdorQRHsCNSUT63x+Bnx2zZwzSRz5EOcPAFlB3sNuc97dRNr4EwVh++YKw==`;
  `beta`/`latest` remain beta.9.

### Findings / Notes

- Staging attempts 1-3 failed closed before artifact creation because the protected integration
  credential was invalid. The workflow consumes GitHub secret
  `ADROUTER_STAGING_INTEGRATION_API_KEY` as runtime `ADROUTER_INTEGRATION_API_KEY`; after that exact
  handoff was corrected, attempt 4 passed without changing tagged source.
- Broader authenticated integration acceptance and final channel promotion remain later explicit
  gates. Candidate finalization was not dispatched.

---

## Follow-up Work

- Complete broader authenticated integration acceptance across the supported host/version matrix,
  covering key isolation, eight-model parity, tools/streaming, footer cleanup, bounded recovery,
  and no replay after partial paid output.
- Decide beta.10 finalization separately. Do not move `beta`/`latest`, remove `candidate`, or publish
  the draft release without explicit authorization and the repository acceptance gates.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-08-08 | Reject beta.6 and fix provider version binding in beta.7/beta.8. | Unversioned provider resolution crossed into an older machine-auth package. | Later candidates retain exact package/provider identity. |
| 2026-08-10 | Treat the observed 429 as a truthful transient admission response. | Router rejects it before reservation/generation and OpenCode already retries successfully. | Add coverage/docs; do not suppress or replay in the plugin. |
| 2026-08-10 | Publish footer changes as beta.9 candidate only. | Beta.8 is accepted and immutable, while candidate testing must not disturb public channels. | Create a new npm candidate and draft GitHub release; defer finalization. |
| 2026-08-10 | Promote beta.9 after live Windows acceptance and retain its candidate alias. | npm accepted `beta`/`latest` but denied only candidate deletion; the alias points to the identical immutable package. | Publish the verified GitHub prerelease unchanged, skip beta.8 deprecation, and defer cleanup until suitable npm authorization exists. |
| 2026-08-11 | Extract a security-only beta.10 candidate from current remote main. | The aggregate local tree also contained unrelated footer/presentation work. | Preserve all original bytes locally while publishing only the validated provider/transport fixes. |
| 2026-08-13 | Complete beta.10 candidate publication after authenticated staging passed. | Exact tagged staging and all six registry smokes passed with the correctly named protected-secret handoff. | Beta.10 is on `candidate`; beta.9 remains on `beta`/`latest`, and finalization stays separate. |


---

## Streaming-fix candidate beta.11 — verified 2026-09-10

### Status
`complete` (candidate only; public-channel finalization pending)

- Published `@adrouter/opencode@0.1.0-beta.11` to `candidate`; beta/latest remain `0.1.0-beta.9`. GitHub release remains draft under the configured candidate-only workflow.
- Immutable tag `v0.1.0-beta.11`, source `be990f30c8a77cb6f0115e9566fb87d53cc28f0d`, original repository `adrouter/adrouter-opencode`; PR #17 merged and reviewed tree parity verified.
- Release input: clean isolated checkout `../release-streaming-20260910/adrouter-opencode` at that source. Canonical dirty source/governance files and parked stash remain preserved; backup repositories received no pushes.
- Bun 1.3.14 frozen installation and full clean-tree `release:check` passed, including 43 tests, lint, types, build, package/policy/audit and both supported OpenCode install/discovery checks.
- Merged CI: https://github.com/adrouter/adrouter-opencode/actions/runs/34481534756
- Staging: https://github.com/adrouter/adrouter-opencode/actions/runs/34481909777 (initial invalid integration key failed closed; operator corrected protected secret; retry passed both bounded model canaries before packing).
- Publishing: https://github.com/adrouter/adrouter-opencode/actions/runs/34490746841 — passed all macOS/Linux/Windows × OpenCode 1.18.4/1.18.15 registry checks.
- Downloaded three-asset draft verified against exact tag/source; registry integrity independently matched. Tarball SHA256 `43c48a387a5d39e1eec33e16b3d16b3a795589026239f51f6f798bdeb935637a`; npm integrity `sha512-Akor8winbaMjDanrN6E+fwDjFj8TrzQthcFhppZaPF9bbOB4wFvcfH8GhIoXQumjKDesS6IkeyntvT6FhvGJwQ==`.
- Fix is bounded cancellation cleanup; existing authoritative done-marker handling retained. Historical Desktop incident remains unverified. No output-default or provider-maximum changes.
- Cross-client hosted canary reservation totaled US$0.04, including a conservative reservation for the rejected first attempt; exact billed usage was not independently queried. No new incident reproductions.

### Remaining acceptance
Run an authenticated turn through the exact installed registry candidate, including output/footer/settlement/usage evidence, before separately authorized beta/latest finalization. Finalization also requires valid protected dist-tag credentials and approvals. No finalization or superseded-version deprecation was performed in this workstream.


---

# Plan: Effective output defaults — 11 September 2026

## Goal
Raise applicable effective defaults to 16,384 while preserving account caps and model maxima.

## Context
Raise conservative request and registration output cap to 16,384; preserve smaller explicit limits and test streaming/recovery.
Source work is authorized before existing candidate promotion; published versions remain immutable.

## Research Summary
Current source distinguishes request defaults from model maxima. Supabase changelog and migration documentation checked 2026-09-11: no applicable breaking change for ALTER COLUMN SET DEFAULT.

## Constraints
Preserve unrelated edits, existing account rows, explicit request limits, pricing, and provider maxima. No new dependencies or live mutations.

## Out of Scope
Candidate promotion, new provider support, live account migration, hosted deployment and successor publication.

## Reversibility
Keep edits scoped. New-account migration changes only the column default; reverting it requires a new migration, not historical edits.

## Step A: Implement and cover the default behavior

### Status
`done`

### Tasks
- [x] Implement or verify this repository's default path.
- [x] Add focused boundary and recovery coverage; preserve existing tests.
- [x] Update current documentation and generated metadata through existing tooling.

### Acceptance Criteria
- [x] Omitted limits fit permitted caps; explicit limits retain validation.
- [x] Model maxima and existing account policies remain unchanged.

### Validation Results
Local checks passed; commands, counts and unavailable database checks are recorded in [implementation and rollout evidence](../../router/docs/output-defaults-16384.md). No hosted inference or deployment was performed.

## Step B: Final verification and cleanup

### Status
`done`

### Tasks
- [x] Run owning-project checks and review the final diff.
- [x] Record source SHAs, test results, limitations and deployment/account-policy follow-up.

### Acceptance Criteria
- [x] Checks pass or unavailable checks have documented blockers.
- [x] Local changes are clearly distinguished from published/deployed state.

### Validation Results
Local checks passed; commands, counts and unavailable database checks are recorded in [implementation and rollout evidence](../../router/docs/output-defaults-16384.md). No hosted inference or deployment was performed.

### Findings / Notes

Source changes are complete and locally checked. Database pgTAP/lint/advisor/local-service execution remains unavailable because Docker is stopped and no PostgreSQL server is installed. The pre-existing discarded-provider-finish-reason gap prevents claiming token-truncation acceptance. OpenCode sends an explicit limit, so existing lower-cap accounts need a smaller call/provider setting or separately approved policy updates. These are rollout limitations, not evidence that the new defaults shipped.

## Follow-up Work
Separate approval for live migration/deployment and successor publication. Existing-account update must use explicit selection, aggregate impact review, audit and verification; it is not part of the default-only migration.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-09-11 | 16,384 supersedes 8,192; fit omitted values to account/model/platform caps | Operator-approved plan | Existing lower caps continue to work without account updates |
| 2026-09-11 | Source preparation precedes candidate promotions | Operator instruction | No changes to published versions or channels |


# Plan: Truncation safety and Fly rollout — 11 September 2026

## Goal and constraints
Preserve completion reasons, block incomplete tools, retain settled usage and partial text, then deploy the exact clean Router commit to existing Fly staging. No Pages push/deploy, hosted migration/account update, client publication, or automatic paid replay. Preserve unrelated changes.

## Step A: Completion handling
### Status
`done`
- [x] Implement provider completion validation and backward-compatible terminal errors.
- [x] Verify local client recovery and usage retention.

## Step B: Final verification and cleanup
### Status
`review`
- [ ] Run owning-project checks and synthetic truncation/accounting tests.
- [ ] Review diff, update evidence, and record remaining gaps.
- [ ] Router only: clean exact-SHA deployment, preserve Pages, verify health and reconcile budget before canaries.

## Decision Log
| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-09-11 | Fix truncation before existing Fly API rollout | Explicit operator request | Database migration and client publication remain pending |

Validation and deployment preflight: [Router evidence](../../router/docs/output-defaults-16384.md). Local suites passed. Hosted deployment is pending local database bootstrap/reset permission and remaining acceptance gates; no live requests made.


## Four-model completion — 12 September 2026

### Status

`in_progress`

The current instruction supersedes earlier five-model scope and temporary-budget holds. Preserve **before new models, still there. adrouterAgent UI fixes + new output limit** and all unfinished work above. Selected additions are GLM-5.3, Kimi K3, Qwen 3.8 Max and Qwen 3.8 Flash.

- [ ] Reconcile candidate source with preserved pending changes, including Desktop appearance/timeline/approvals and output limits.
- [ ] Audit owner-only daily/monthly caps at least US$5, preserving higher limits and all other accounts/platform limits. Enforce US$1 aggregate test exposure including earlier tests and unresolved liabilities.
- [ ] Reject GLM Flash before reservation; retain historical accounting/database compatibility. Include recovery liabilities in spending summaries without concurrency occupancy.
- [ ] Complete four-model streaming/thinking/tools/accounting/cancellation/forced-truncation acceptance. Qualify Kimi image upload/follow-up/reload before enabling vision.
- [ ] Regenerate canonical client contracts; implement memory-only Kimi tool continuation, reset/exclusion coverage, and authenticated transport acceptance on every client.
- [ ] Verify CLI/Desktop 60-second presence gating including first-response wait, fresh Enter, repeated timing, continued stream reception, blocked execution and separate permission approval; headless attention-required status.
- [ ] After functional acceptance update desktop/mobile landing lists; run owning checks, contract compatibility and packaged Desktop acceptance.
- [ ] Prepare rollback artifacts; deploy clean exact-commit API before WebUI; publish immutable successor candidates only after checks and authenticated acceptance. Keep beta/latest separate.

### Validation Results

Implementation underway. No new hosted inference, account mutation, deployment or publication has occurred in this continuation. Pending checks are not passes.

### Local implementation receipt — four-model continuation

Partial implementation only; rollout remains `in_progress`. Router now omits GLM Flash from runnable catalogs and WebUI fallback. Historical types, pricing and database compatibility remain intact. Regression coverage rejects GLM Flash before a database connection/reservation. Account summaries include recovery liabilities in held spending, with concurrency unchanged; WebUI labels these outstanding reservations.

Router, CLI and Desktop catalog digest: `sha256:6c48a4b0142dbc8a19813799c146a6bb5f828ebc3240471ce94313091b805bf3`. CLI/Desktop generators retain all twelve catalog descriptors; the nine tool-capable models are selectable, while Kimi tools remain gated. CLI documentation now distinguishes the 16,384 default from maximum limits.

Validation: Router backend typecheck/full test suite/build passed; WebUI typecheck, 88 tests, 10 hosted-build checks and build passed (three wallet tests rerun after the label change). CLI full `npm run check` passed. Desktop typecheck, 174 unit tests, 13 integration tests, catalog and public checks passed; source parity regenerated through its script. Earlier stale expectations, formatting and plan-path failures were corrected. The aggregate Desktop npm check invoked Node 24 through npm's script PATH, so it is not a valid pinned-Node full-check receipt; direct unit/integration tests were rerun with the shell's Node 25.9.0. Packaged/native acceptance and launcher verification remain pending.

Candidate tags were fetched read-only: CLI beta.24 and OpenCode beta.11 exist on github-legacy, not current origin; Desktop beta.21 exists on origin. Desktop timeline/provider/bounded-response source matches beta.21; CLI retains its additional incomplete-tool rejection. Release metadata reconciliation and complete combined-baseline approval/appearance/output acceptance remain pending. No tags were changed.

No new paid inference (US$0 additional), account mutation, deployment, release commit, publication or promotion occurred. Prior spending/liabilities were not re-queried. Owner permanent US$5 caps, Kimi vision/tool continuation and persistence exclusions, presence prompts, OpenCode catalog/runtime extension, authenticated four-model acceptance, landing updates, packaged Desktop acceptance and immutable successor releases remain unfinished. No authentication/provider checks were attempted in this continuation and none are marked passed.


### Continued implementation and hosted owner receipt — 12 September 2026

Owner permanent daily/monthly limits are verified at 5,000,000 microusd with audit action `raise_owner_permanent_allowance_20260912`; other two accounts remain 500,000 daily/5,000,000 monthly, output 4,096/concurrency 1. Owner output 16,384/concurrency 1 preserved. Applied from clean Router commit `3f8614d`; no API/Pages deployment. The SQL preserves higher limits and changes only the unique owner.

Live Kimi vision provider qualification passed with finish `stop`, 132 input/46 output tokens and 1,086 microusd settled cost. Source is committed at `295942e` after adding a conservative aggregate ceiling and stdin argument handling. Initial SSH attempt found an idle VM; a readiness request woke it. The next attempt failed argument validation before inference; the corrected invocation passed. These were operational failures, not provider authentication failures. Browser upload/follow-up/reload are still pending and vision remains gated.

Conservative exposure after the test: all ledger usage 367,852 plus all recovery holds 22,369 plus the earlier uncorrelated 40,000 allocation = 430,221 microusd, below the 1,000,000 test ceiling. No active reservations; no liabilities released. New-model-specific cumulative exposure is 28,509 microusd using the prior recorded 27,423 total.

CLI/Desktop now have working-source memory-only Kimi continuation using nonserialized object-keyed state. Reasoning is excluded from emitted messages/events and injected only into outgoing context; model changes, reloads and incomplete streams discard continuation. Desktop transport regression and helper tests pass (14 tests); CLI provider/helper suite passes (38 tests). Tool capability stays gated pending live tool-round qualification and session-lifecycle acceptance.

OpenCode now generates its catalog from Router, retaining all twelve descriptors and selecting the nine tool-qualified models. It remains text/tool-only. Catalog check, typecheck, lint, 50 tests and build passed; Kimi host-lifecycle continuation remains unfinished.

Presence prompts, full authenticated cross-client matrix, browser vision acceptance, complete candidate-baseline reconciliation, packaged Desktop acceptance and successor publication remain unfinished. No candidate tags, beta/latest aliases, existing artifacts or serving API/Pages were changed. Do not publish this partial state.

### Operator scope correction

Kimi K3 is explicitly excluded from OpenCode supported/registered models for now, even if Router later qualifies its tool capability. Preserve its canonical descriptor for catalog compatibility only. OpenCode remains text/tool-only.
