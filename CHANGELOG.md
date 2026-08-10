# Changelog

## 0.1.0-beta.9

- Expanded the disclosed footer to at most three terminal-width-bounded rows for placement title,
  sanitized copy/CTA, and current-turn subsidy plus deduplicated session savings and URL.
- Prioritized subsidy and savings ahead of the URL at narrow widths while retaining compact NONE,
  off, degraded, and stale-state behavior.
- Documented `429 concurrency_limit` as a truthful transient pre-generation admission response and
  added regression coverage proving the plugin reports it once without internal replay.

## 0.1.0-beta.8

- Accepted long OpenCode system prompts under the Router's global request budget and surfaced
  bounded validation codes/paths when a request is rejected.
- Applied each model's advertised reasoning default when OpenCode omits a variant.
- Limited the coding provider to the six models that currently pass tool-calling qualification;
  Agnes 2.5 Pro and Pro Alpha remain WebUI-chat-only until qualified.

## 0.1.0-beta.7

- Bound OpenCode's registered AI provider to the plugin's own exact package version so candidate
  installs cannot silently execute an older `latest` provider artifact.
- Added a registry-backed OpenCode execution probe that asserts `POST /v1/integrations/turn`,
  terminal-bottom metadata, settlement, usage, and assistant output across the release matrix.
- Replaced the rejected beta.6 candidate without moving the public `beta` or `latest` channels.

## 0.1.0-beta.6

- Migrated the provider from the official-client `/v1/agent/turn` contract to the isolated
  `/v1/integrations/turn` terminal-footer contract.
- Added dedicated `adr_int_` credential validation and `ADROUTER_INTEGRATION_API_KEY`/
  `ADROUTER_INTEGRATION_API_URL` configuration, with explicit CLI and desktop separation.
- Enforced model/tool events followed by one bottom footer ad, settlement, and completion;
  malformed or reordered streams now fail closed.
- Registered the eight hosted text-and-tools model routes with their supported reasoning variants
  and exact Router context windows.
- Documented the separately gated integration entitlement, 30-day key lifecycle, and 25% subsidy
  multiplier for lower-certainty footer delivery.
- Rejected before channel promotion because OpenCode resolved the unversioned provider package to
  public beta.4 and therefore called the machine-auth endpoint.

## 0.1.0-beta.4

- Unified Tier A, B, and C sponsorships into the same compact OpenCode bottom-panel presentation.
- Removed the duplicate settled Tier A card while retaining deduplicated cumulative session savings.
- Added manifest-driven beta/stable release policy, optional superseded-version deprecation, dynamic
  OpenCode registry matrices, and a 48-hour cross-platform stable-readiness gate.
- Documented the first-stable channel transition: `latest` moves to stable while `beta` remains on
  the accepted beta.

## 0.1.0-beta.3

- Made global OpenCode installation the default documented setup and clarified
  that provider discovery requires the plugin in the active config scope.
- Added real OpenCode installer, model-registration, and non-secret auth-hook
  regression checks for OpenCode 1.18.4 and 1.18.5.
- Added candidate-first npm publication, cross-platform registry verification,
  explicit `beta`/`latest` promotion, and exact GitHub artifact verification.
- Removed the one-time npm bootstrap workflow after trusted publishing setup.
- Made release checksum files portable after download and replaced the
  deprecated release action with the GitHub CLI.

## 0.1.0-beta.2

- Omit local-only execution overrides from hosted AdRouter requests.

## 0.1.0-beta.1

- First public OpenCode beta with DeepSeek V4 Flash and Pro model registration.
- Added fail-closed URL, redirect, header, timeout, size, and sponsor-metadata
  protections.
- Rebuilt TUI sponsor and settlement state deterministically from ordered
  session messages.
- Added Bun 1.3.14 tooling, Biome 2.5.5, cross-platform CI, protected release
  and npm publishing workflows, staging canaries, package inspection, and
  release documentation.
- Pinned the OpenTUI build chain to patched `brace-expansion@5.0.8` and made
  complete-history secret scanning self-contained and checksum-verified.

Hosted staging access remains invite-only.
