<h1 align="center">AdRouter for OpenCode</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@adrouter/opencode"><img src="https://img.shields.io/npm/v/%40adrouter%2Fopencode/beta?label=npm%20beta" alt="npm beta version"></a>
  <a href="https://github.com/adrouter/adrouter-opencode/actions/workflows/ci.yml"><img src="https://github.com/adrouter/adrouter-opencode/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="https://github.com/adrouter/adrouter-opencode/releases"><img src="https://img.shields.io/github/v/release/adrouter/adrouter-opencode?include_prereleases&amp;label=release" alt="GitHub release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
</p>

<p align="center">
  An AdRouter provider and disclosed sponsorship footer for OpenCode.
</p>

`@adrouter/opencode` supports OpenCode `>=1.18.4 <2`. It sends text-and-tool turns to the
isolated AdRouter integration API, keeps sponsor data out of model context, and renders the returned
placement in OpenCode's `app_bottom` slot after the model turn.

Hosted integration access is separately gated. Having an AdRouterCLI or
AdRouterAgent login does not grant this API, and those clients cannot use an
OpenCode integration key.

## What the plugin adds

- six tool-capable hosted model routes under the `adrouter/` provider;
- AI SDK v3 JSON and NDJSON transport for `/v1/integrations/turn`;
- reasoning, function-tool, usage, settlement, and sponsor metadata handling;
- strict terminal stream ordering: model and tool events, footer ad, settlement,
  then completion;
- one compact, explicitly labelled Tier A/B/C footer plus deduplicated session
  savings;
- fail-closed URL, redirect, header, timeout, response-size, and protocol checks.

Sponsor copy and settlement metadata are display/accounting data only. They are
never inserted into system prompts, user or assistant messages, tool
definitions or results, generated commands, patches, or compacted context.

## Install

The package is public, while hosted integration access may remain invite-only or disabled per
developer. Choose the release channel you want to follow.

Beta channel:

```sh
opencode plugin --global @adrouter/opencode@beta
```

Latest channel:

```sh
opencode plugin --global @adrouter/opencode@latest
```

Then confirm that OpenCode can discover the provider:

```sh
opencode models adrouter
```

OpenCode activates both exported targets:

- `@adrouter/opencode/server` registers the provider, models, and auth method;
- `@adrouter/opencode/tui` renders the footer panel.

The server target binds the executable AI provider to the same exact package version. This keeps
candidate and pinned installs from falling back to an older `latest` provider artifact.

Global installation makes the provider available in every workspace. Omit
`--global` to scope the plugin to the current project. A direct `npm install`
does not activate an OpenCode plugin.

## Create the correct key

1. Sign in to the AdRouter WebUI.
2. Open the **Developers** section.
3. Confirm that an owner has enabled **Integration API access** for the account.
4. Create an integration key and copy the complete `adr_int_...` value when it
   is shown. The secret cannot be recovered later.
5. Store it with OpenCode:

```sh
opencode auth login --provider adrouter
```

The auth prompt is labelled `AdRouter integration API key (adr_int_)`.
Alternatively, use the dedicated environment variable:

```sh
export ADROUTER_INTEGRATION_API_KEY="adr_int_..."
```

Credential precedence is an OpenCode-injected provider `apiKey`, followed by
`ADROUTER_INTEGRATION_API_KEY`. The legacy `ADROUTER_API_KEY` name is rejected
with an explanatory error so a CLI or desktop credential is not accidentally
reused.

Integration keys:

- are scoped only to `/v1/integrations/turn`;
- expire after 30 days;
- are returned in full only at creation or rotation;
- keep the previous secret valid for at most ten minutes during rotation;
- stop authenticating when revoked, expired, or when the account entitlement is
  disabled.

They are **not** AdRouterCLI or AdRouterAgent credentials. Those official
clients use installation-bound authentication and their own endpoint.

## Select a model

The hosted integration catalog exposed by this plugin is:

```text
adrouter/deepseek-v4-flash
adrouter/deepseek-v4-pro
adrouter/mimo-v2.5
adrouter/mimo-v2.5-pro
adrouter/agnes-2.0-flash
adrouter/agnes-2.5-flash
```

DeepSeek exposes `none`, `medium`, and `high` reasoning variants. MiMo and
Agnes Flash expose `none` and `high`. When no variant is selected, the plugin uses the Router
default for that model: `medium` for DeepSeek, `high` for MiMo, and `none` for Agnes Flash.
Agnes 2.5 Pro and Pro Alpha remain WebUI-chat models and are not registered here until their
read/write tool-calling contract passes qualification. The
integration endpoint supports text and function tools only. Image/file prompt
parts, image tool results, attachments, and provider-executed tool approvals
are intentionally rejected even when the underlying model has vision support.

The plugin advertises each Router model's exact 524,288- or 1,048,576-token
context window and applies a conservative 4,096-token integration output cap.
Account, provider, and current platform policy may apply lower limits or model
availability.

## Endpoint and footer contract

The default API origin is:

```text
https://api-staging.adrouter.co
```

The provider posts only the selected model, reasoning level, output limit, and
the model conversation/tool context to `/v1/integrations/turn`. It does not send
workspace names, advertising controls, sponsor metadata from earlier turns, or
local runtime overrides.

For NDJSON, the accepted order is:

```text
thinking/text/tool_call ...
ad (injection.mode=terminal_trailer, placement=bottom)
settlement
done
```

Duplicate ads, output after the ad, settlement before the ad, missing terminal
events, and divergent authoritative snapshots fail closed and clear sponsor
state. JSON responses must contain the equivalent terminal placement,
settlement, and usage data.

The footer integration receives 25% of the normal computed sponsorship subsidy.
This lower rate reflects weaker delivery certainty in a third-party host. It is
recorded by the Router as an integration delivery class; the plugin does not
calculate or increase it locally.

## Local development backend

Custom remote origins must use HTTPS. Plain HTTP is accepted only for
`localhost`, `127.0.0.1`, and `::1`. URL credentials and authenticated redirects
are rejected.

```sh
export ADROUTER_INTEGRATION_API_KEY="local-test-key"
export ADROUTER_INTEGRATION_API_URL="http://127.0.0.1:8787"
opencode
```

Loopback development accepts a non-production test key shape so mocked transport
tests can run without copying a hosted credential. A real local service profile
still validates the key against its local database.

## Programmatic configuration

```ts
import { createAdRouter } from "@adrouter/opencode"

const adrouter = createAdRouter({
  apiKey: "local-test-key",
  baseURL: "http://127.0.0.1:8787",
  model: "deepseek-v4-flash",
  defaultMaxOutputTokens: 4096,
})
```

| Setting | Precedence and default |
| --- | --- |
| integration key | provider `apiKey`, then `ADROUTER_INTEGRATION_API_KEY` |
| API origin | `ADROUTER_INTEGRATION_API_URL`, provider `baseURL`, staging origin |
| routed model | `ADROUTER_MODEL_ROUTE`, provider `model`, requested model |
| output limit | call limit, provider default, 4,096; always clamped to 4,096 |

Call-specific headers cannot replace authorization, content type, or accept
headers. Response headers must arrive within 30 seconds, stream chunks within
60 seconds, error bodies are capped at 64 KiB, complete responses at 8 MiB,
and individual NDJSON lines at 1 MiB.

## Footer behavior

- Tier A, B, and C share one `Sponsored · TIER …` footer shape.
- Tier NONE remains visible for a privacy or guardrail outcome.
- Degraded, malformed, aborted, or incomplete turns clear stale sponsorship.
- Session savings are deduplicated by AdRouter turn ID.
- A new user message clears the prior visible placement.

OpenCode currently provides `app_bottom`, not an after-message transcript slot.
The placement therefore stays in the bottom panel and never becomes assistant
text.

## Privacy and limitations

The integration sends the conversation and tool data required to answer the
turn to the configured Router. Do not submit secrets or data you are not
authorized to process. Sponsor selection and settlement return only as provider
metadata for the footer and session accounting.

Hosted staging availability, model inventory, entitlements, and latency remain
pre-release quality. File issues at
<https://github.com/adrouter/adrouter-opencode/issues> without including keys,
prompts, private response bodies, or local paths. See [SECURITY.md](SECURITY.md).

## Troubleshooting

- `Unknown provider "adrouter"`: activate the plugin in the current config
  scope, then run `opencode models adrouter` before entering a key.
- integration authentication is not configured: set
  `ADROUTER_INTEGRATION_API_KEY` or use OpenCode auth login.
- hosted access requires an `adr_int_` key: create a Developers integration key;
  do not paste an AdRouterCLI, AdRouterAgent, access, or refresh token.
- `403 integration_access_required`: an owner must enable the account's
  integration entitlement; developer access is also required.
- `invalid_model`: select a registered model and confirm its current account
  availability.
- `409 live_not_enabled`: the selected upstream provider is not enabled on that
  Router environment.
- malformed or out-of-order NDJSON: the turn ends with a sanitized protocol
  error; prior streamed output is not silently rewritten and sponsor state is
  cleared.

## Documentation

- [Security policy](SECURITY.md)
- [Support](SUPPORT.md)
- [Changelog](CHANGELOG.md)
- [Release procedure](RELEASE.md)
- [GitHub releases](https://github.com/adrouter/adrouter-opencode/releases)

## Development and contributing

Use Bun 1.3.14 and keep `bun.lock` authoritative:

```sh
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
```

The full `bun run release:check` additionally runs formatting, coverage,
auditing, package inspection, isolated imports, and OpenCode registry checks.
It is a release-readiness command, not a publication command. See
[CONTRIBUTING.md](CONTRIBUTING.md) and [RELEASE.md](RELEASE.md).

## License

AdRouter for OpenCode is released under the [MIT License](LICENSE).
