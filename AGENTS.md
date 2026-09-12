# AdRouter OpenCode repository instructions

## Active release authority

`adrouter` is active; `adrouter-co` is backup only. This supersedes conflicting migration guidance while preserving historical receipts. Explicit client release targets are `adrouter/adrouterCLI`, `adrouter/adrouterAgent`, and `adrouter/adrouter-opencode`. Do not infer authority from local remote names or enable backup release workflows. Combined successor candidates include new models, preserved UI/output improvements, and CLI/Desktop presence gating before acceptance; promotion remains separately authorized.

## Repository boundary and release-state source

This independent repository owns `@adrouter/opencode` and uses Bun. Its GitHub repository is
`adrouter/adrouter-opencode`; never combine its lockfile, Git history, or release state with CLI or
Desktop.

The substantial user-owned, unreleased installation-auth work remains parked in `stash@{0}` as
`clean-slate-2026-08-02`; do not apply, drop, rewrite, publish, or treat that snapshot as accepted.

Do not keep volatile versions or npm aliases in this governance file. Read `../../docs/state.md`
and the newest workspace parity report, then re-query npm and GitHub before a current claim. Keep
the checkout, protected source commit, immutable tag, draft assets, npm `candidate`, and public
`beta`/`latest` distinct. Earlier rejected versions remain immutable and must never be rebuilt or
retagged; fix forward. Release mutations require explicit user authorization.

## Source map and toolchain

- `src/server.ts` — OpenCode provider/model registration.
- `src/provider.ts`, `src/contracts.ts`, and `src/transport/` — AI SDK provider, prompt/tool mapping,
  configuration, JSON/NDJSON parsing, and transport protections.
- `src/tui.tsx` and `src/presentation.ts` — display-only bottom panel and cumulative savings.
- `test/`, `scripts/`, and `.github/workflows/` — provider/auth/transport/TUI/release coverage and
  candidate/promotion automation.
- `release-manifest.json` — candidate/final-channel intent, not evidence of publication.
- `dist/`, coverage, tarballs, isolated installs, and acceptance output are generated.

Use Bun 1.3.14 and `bun.lock`; do not add npm, pnpm, or Yarn lockfiles. Preserve OpenCode
`>=1.18.4 <2`, strict TypeScript, AI SDK provider v3, SolidJS/OpenTUI, the `adrouter` IDs, and root,
`./server`, and `./tui` exports.

## Public versus local state

The provider retains the twelve Router catalog descriptors, excludes Kimi, and registers the nine tool-qualified IDs with generated model-specific
context/input/output tuples while preserving the integration route's conservative request policy.
Its registered provider package must bind itself to the exact package version. The integration path
remains text/tool-only even when another platform's model descriptor accepts images.

## Protected candidate rules

- Local source or a package manifest never proves the deployed integration contract; authenticated
  staging canaries must pass with the exact tagged source before artifacts are created.
- The protected GitHub secret is `ADROUTER_STAGING_INTEGRATION_API_KEY`; the workflow maps it to
  runtime `ADROUTER_INTEGRATION_API_KEY`. Verify only the name and mapping, never the value. Invalid
  integration authentication must fail closed before artifact creation or publication.
- Pass the same immutable tag as both workflow input and dispatch ref. Do not substitute the
  default branch or weaken an exact-tag environment policy.
- Candidate publication, host/version registry smokes, and public-channel finalization are separate
  gates. Never move `beta`/`latest` or finalize a draft without a separate explicit request.
- Resume after an npm propagation race only if the exact expected integrity and `candidate` alias
  already match. Otherwise stop and fix forward.
- The complete clean-tree `release:check` remains a release gate. Local unit, type, lint, build, and
  release-policy checks do not authorize publication by themselves.

## Product and security invariants

- Sponsor/settlement information is provider display metadata only. Never put it in prompts,
  assistant text, tool definitions/results, commands, edits, or compacted context.
- Keep the Tier A/B/C bottom panel to at most three width-bounded rows, prioritize current subsidy
  and deduplicated cumulative savings before the URL, and retain stale-state clearing plus compact
  off/degraded/NONE outcomes.
- Hosted origins must use live execution. Custom remote URLs require HTTPS and HTTP is loopback-only.
  Reject credentialed URLs, authenticated redirects, protected-header overrides, oversized bodies
  or lines, idle streams, malformed events, and divergent final snapshots.
- Preserve native conversation/tool mapping while rejecting unsupported attachments, non-function
  tools, and provider-executed tool approvals. Never log/persist credentials or private response
  bodies.

## Verification and releases

During dirty local source work, use focused non-formatting checks first:

```sh
bun run lint
bun run typecheck
bun test
bun run build
bun run release:policy
```

Do not run hosted canaries, acceptance upload, release soak, tag/publish commands, dist-tag
operations, or repository-visibility changes without explicit authorization. Run the full
`bun run release:check` only from a clean release-input tree when release readiness is actually in
scope. Only a clean, committed, exact candidate with Router conformance, package inspection,
cross-host acceptance, and separate release authorization may be tagged or published. Versions
and tags are immutable; fix forward. Never change protected environments or remote secrets
without explicit authorization.
