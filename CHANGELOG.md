# Changelog

## Unreleased

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
