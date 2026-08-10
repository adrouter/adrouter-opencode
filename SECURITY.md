# Security policy

## Supported versions

Security fixes are provided for the actively supported public channels. Beta.9 is supported through
`beta`, `latest`, and the temporarily retained `candidate` alias; beta.8 is superseded.
Published npm versions are immutable; fixes use a new version rather than replacing an artifact.

## Reporting

Use GitHub private vulnerability reporting for
`adrouter/adrouter-opencode`. Do not open a public issue containing API keys,
prompts, private response bodies, local paths, or exploit details.

## Backend and credentials

The hosted service currently uses `https://api-staging.adrouter.co` and requires an invited
integration entitlement and a dedicated `adr_int_` key, including when the package reaches stable `0.1.0`. The key is scoped to the
integration endpoint and must not be reused with AdRouterCLI or AdRouterAgent; their machine credentials are likewise invalid here.
Custom remote backends must use HTTPS. HTTP is accepted only for
loopback development. Never put credentials in a backend URL, source file,
issue, screenshot, or log.

Authenticated requests reject redirects and ignore call-level attempts to
replace authorization, content type, or accept headers. Response limits and
timeouts fail closed and clear sponsor metadata.

The OpenCode server target and executable provider must resolve to the same exact package version.
A version mismatch is release-blocking because it can cross the integration/machine-auth boundary.

## Privacy

The provider sends model conversation context and tool data needed to complete
the requested turn. It does not send workspace names, client advertising
preferences, or sponsor metadata from prior messages. Sponsor data remains
display-only provider metadata and is not added to model context or tool data.

The integration endpoint is text-and-tools only. Image/file prompt parts and
non-text tool results are rejected before transmission. The Router emits a
terminal footer placement after model/tool output; out-of-order or incomplete
responses fail closed and clear sponsor state.
