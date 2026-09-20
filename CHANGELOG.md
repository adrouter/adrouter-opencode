# Changelog

## [0.1.0-beta.17] - 2026-09-20

- Build against OpenCode SDK 1.18.31 while retaining 1.18.4 and 1.18.15 compatibility checks.
- Test packed imports against every qualified SDK and run a protected exact-registry host canary.
- Record upload attempts and acceptance on the draft release; resume matching candidates without another upload.
- Bound transient registry retries and make metadata finalization skip completed operations.
- Preserve provider APIs, integration authentication, qualified models, and the three-row sponsor panel.


## [0.1.0-beta.16] - 2026-09-13

- Surface authenticated canary stream errors directly and include bounded, non-sensitive event diagnostics when early routing metadata is absent.

## [0.1.0-beta.15] - 2026-09-13

### Added

- Reserve a permanent three-row sponsor panel; display routed ads during generation and retain them until the next stream. Preserve legacy integration compatibility and Kimi exclusion.

### Fixed

- Accept authenticated no-ad routing as a valid blank-panel canary result while still requiring
  `stream_start` metadata before model output.
- Emit the same early routing metadata carrier for negotiated JSON responses as for NDJSON streams.

## [0.1.0-beta.12] - 2026-09-12

- Generate the coding catalog from Router, adding GLM-5.3 and both Qwen 3.8 models while excluding Kimi.
- Preserve bounded cancellation cleanup, partial-output retention, output limits and exact package registration.

## 0.1.0-beta.11

- Deliver transport cancellation promptly even when underlying stream cleanup never settles; preserve existing deadlines and protocol validation.
- Add deterministic coverage for cancellation cleanup. The historical Desktop stall remains unverified, and output defaults are unchanged.

## 0.1.0-beta.10

- Prevented project configuration from replacing the exact AdRouter provider package, protected
  authentication environment, fixed model limits, or provider options while preserving safe display
  labels and provider enablement.
- Kept a total request deadline active after response headers and applied abort-aware idle limits to
  error, JSON, and NDJSON body reads so an authenticated upstream cannot hold a turn indefinitely.

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
