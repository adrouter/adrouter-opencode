# @adrouter/opencode

Public beta AdRouter provider and tiered sponsorship panel for OpenCode 1.18.4
and later. The package is public; hosted staging credentials remain
invite-only.

The package adds:

- `adrouter/deepseek-v4-flash` and `adrouter/deepseek-v4-pro`
- AI SDK v3 JSON and NDJSON transport for `/v1/agent/turn`
- reasoning, tool-call, usage, injection, settlement, and ad metadata support
- a plugin-only `app_bottom` panel for Tier A, B, C, and NONE outcomes
- Tier A settlement detail and per-session cumulative savings

Sponsor data remains provider metadata. It is never inserted into prompts, model
messages, tool inputs, tool results, or assistant response text.

## Install

```sh
opencode plugin --global @adrouter/opencode@beta
```

OpenCode detects both package targets:

- `@adrouter/opencode/server` configures the provider and authentication.
- `@adrouter/opencode/tui` renders the terminal panel.

The package supports OpenCode `>=1.18.4 <2`.

Global installation is the recommended default so the provider, authentication
hook, and TUI panel are available from every workspace. To keep AdRouter scoped
to one Git worktree instead, run the command without `--global` from that
worktree. A direct `npm install` does not activate an OpenCode plugin.

## Authenticate

Store a key in OpenCode's normal credential store:

```sh
opencode auth login --provider adrouter
```

Or configure an environment key:

```sh
export ADROUTER_API_KEY="your-key"
```

Credential precedence is an OpenCode-injected `apiKey` option followed by
`ADROUTER_API_KEY`. Authentication is validated by the first provider request.

## Select a model

Select either model from OpenCode's provider/model picker:

```text
adrouter/deepseek-v4-flash
adrouter/deepseek-v4-pro
```

Both expose `none`, `medium`, and `high` reasoning variants, function tools, a
1,000,000-token context limit, and a 4,096-token output limit. Attachments are
intentionally unsupported.

## Hosted configuration

The default endpoint is:

```text
https://api-staging.adrouter.co
```

Official hosted endpoints always use live execution. A hosted endpoint rejects
`ADROUTER_RUNTIME_MODE=mock`.

## Local backend

Point the provider at a local AdRouter backend:

```sh
export ADROUTER_API_KEY="local-smoke"
export ADROUTER_API_URL="http://127.0.0.1:8787"
export ADROUTER_RUNTIME_MODE="mock"
opencode
```

Custom and local URLs default to mock mode. They may explicitly use `mock` or
`live`. Custom remote backends must use HTTPS. Plain HTTP is accepted only for
`localhost`, `127.0.0.1`, and `::1`; URL credentials, redirects, and unsupported
protocols are rejected.

## Configuration

The provider factory accepts:

```ts
import { createAdRouter } from "@adrouter/opencode"

const adrouter = createAdRouter({
  apiKey: "local-smoke",
  baseURL: "http://127.0.0.1:8787",
  runtimeMode: "mock",
  adsEnabled: true,
  minimumTier: "3",
  workspace: "my-project",
  defaultMaxOutputTokens: 4096,
})
```

Environment variables take precedence where shown:

| Setting | Precedence and default |
| --- | --- |
| API key | provider `apiKey`, then `ADROUTER_API_KEY` |
| API URL | `ADROUTER_API_URL`, provider `baseURL`, staging URL |
| routed model | `ADROUTER_MODEL_ROUTE`, provider model override, requested model |
| workspace | `ADROUTER_WORKSPACE`, provider workspace, current folder name |
| runtime mode | `ADROUTER_RUNTIME_MODE`, provider runtime mode, hosted/live or custom/mock |
| minimum tier | `ADROUTER_MIN_AD_TIER`, provider minimum tier, `"3"` |
| ad mode | `ADROUTER_AD_MODE`, provider ad mode, hosted/live or custom/mock |
| ads enabled | `ADROUTER_ADS_ENABLED`, provider option, `true` |

`ADROUTER_AD_MODE=off` is a non-overridable safety switch.
`ADROUTER_ADS_ENABLED=false` and `adsEnabled: false` also disable sponsorship.

Per-call output limits are clamped to 4,096 tokens.

Authenticated transport requests do not follow redirects and call-specific
headers cannot replace authorization, content type, or accept headers. Response
headers must arrive within 30 seconds, stream chunks within 60 seconds, error
bodies are capped at 64 KiB, JSON/total streams at 8 MiB, and NDJSON lines at
1 MiB. Protocol failures cancel the response and clear sponsor metadata.

## Privacy

By default, AdRouter sends the selected model, prompt/context required to
answer the turn, tool definitions/results, reasoning level, advertising
preferences, and only the current workspace folder name to the configured
backend. It does not send the absolute workspace path unless you explicitly set
`workspace` or `ADROUTER_WORKSPACE`.

Sponsor selection and settlement data return as provider metadata for display.
Sponsor copy is not inserted into the model context, assistant text, tools, or
tool results. See [SECURITY.md](SECURITY.md) for reporting and data-handling
guidance.

## Beta limitations and support

- Hosted access is invite-only and may be revoked during incident response.
- OpenCode `>=1.18.4 <2` is supported; attachments and provider-executed tool
  approvals are not.
- The panel uses OpenCode's `app_bottom` slot; sponsor cards are not persisted
  inline in the transcript.
- Staging availability, model inventory, and response latency are beta quality.
- File issues at <https://github.com/adrouter/adrouter-opencode/issues>. Do not
  include credentials, prompts, or private response bodies in reports.

## Panel behavior

- Tier A shows a compact line during generation and an expanded settlement card
  afterward.
- Tier B and C show the compact line.
- Tier NONE remains visible for privacy and guardrail outcomes.
- opt-out, degraded, no-inventory, and routing-failure outcomes clear any prior
  sponsor immediately.
- cumulative savings persist for the current session and are deduplicated by
  AdRouter turn ID.

OpenCode currently exposes `app_bottom` but no after-message transcript slot.
Tier A detail therefore remains in the bottom panel until the next user turn.
No OpenCode patch is required.

## Troubleshooting

- `Unknown provider "adrouter"`: the plugin is not active in the current config
  scope. Run `opencode plugin --global @adrouter/opencode@beta`, then retry the
  login command. Use `opencode models adrouter` to verify registration before
  entering a credential.
- `401` or an authentication message: set `ADROUTER_API_KEY` or run
  `opencode auth login --provider adrouter`.
- `invalid_model`: select one of the registered AdRouter model IDs or check
  `ADROUTER_MODEL_ROUTE`.
- `409` / live provider not configured: configure the upstream provider on the
  backend, or use a local backend with `ADROUTER_RUNTIME_MODE=mock`.
- `hosted_mock_not_allowed`: remove mock mode for hosted AdRouter URLs.
- `routing_failure` or `no_inventory`: the provider response continues without
  a stale sponsor and the panel clears.
- malformed or divergent NDJSON: the turn ends with a sanitized protocol error;
  previously streamed output is never silently rewritten.

## Development

```sh
bun install
bun run release:check
```

The release check runs Biome, typechecking, coverage-gated tests, build,
production/development audit policy, manifest validation, tarball inspection,
an isolated install, and root/server/TUI import smoke tests. See
[CONTRIBUTING.md](CONTRIBUTING.md) and [RELEASE.md](RELEASE.md).
