# Design

## Context

The panel accepts several login flows through the shared passport service. Permission middleware and public-route identity helpers also resolve panel API keys. The YSU callback already binds each provider subject to a stable user UUID. Existing Feishu records lack a name-confirmation field.

## Goals / Non-Goals

Promote the configured YSU providers and preserve local account access, API scripts, instance assignments, node pairing and skin role mapping.

## Decisions

- Show the configured YSU providers above a secondary local sign-in control. It opens the existing password and two-factor flow. Preserve the upstream SSO-only policy, local login API, session and API-key behavior.
- Use a short-lived session bound to the verified Feishu subject during onboarding. Only name selection and logout are available until completion. Require a fresh verified login when the naming transaction expires. Old Feishu sessions without a confirmed name also go through onboarding.
- Persist the chosen name and its confirmation together on the existing account UUID. Serialize name claims, validate and check collisions against all accounts, and keep repeated submissions safe. Reuse this operation in personal settings, resolve the current user by stable identity and keep audit records attributable after a rename.
- Allow users to return to the provider chooser. Keep the local option accessible if provider discovery fails.

## Risks / Trade-offs

A name claim may conflict with an existing local account. Show an actionable error and preserve both accounts and their grants. Production rollout includes a restricted data backup, source and bundle identity checks, and public panel health checks.
