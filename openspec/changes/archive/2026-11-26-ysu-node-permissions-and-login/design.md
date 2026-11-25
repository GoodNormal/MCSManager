## Context

The deployed panel is 10.22.1. Its level 10 role controls panel settings, accounts and nodes. Skin Janus issues subject IDs for skin UIDs. The installed sitmc-launcher Membership::describe derives the site role from the account, then resolves departmental posts from sitmc_launcher_memberships. Operations and minister have stable codes.

## Goals / Non-Goals

Delegate management of selected nodes, preserve existing local logins and expose both identity providers. Host-wide configuration, registration of new nodes and management of identities belong to superadmin. Existing multi-instance users retain each explicit assignment.

## Decisions

- Retain numeric level 10 for legacy local superadmins and level 1 for instance users. Represent node admin with a distinct intermediate level and an explicit list of daemon UUIDs. Evaluate permissions after authenticating the caller. Bind authorization to the actual target used by the handler. Check every item before dispatching a batch. Scope instance lists, node summaries, file transfers, console tickets and tasks consistently across sessions and API keys.
- Node admins operate instances on assigned nodes. Shared-host settings, arbitrary host mounts, privileged containers, node credentials and management of other accounts require superadmin. Instance users retain their individual grants. New ordinary users start with zero grants.
- Use distinct provider callbacks under /api/ysu-auth/{provider}/callback and exact configured HTTPS redirect URLs. Bind the OAuth transaction to provider and browser session with state, PKCE, expiry and single-use consumption. Key identities by provider, issuer or tenant, and stable subject. Never automatically link an external subject to a local account by display name or email. Preserve local password and 2FA login.
- For Feishu verify the configured tenant against the provider's authenticated user_info response before granting superadmin. Enable each provider only after its own configuration is complete.
- For skin, resolve the access token against the authorized MCSManager OAuth client. Extend the installed launcher plugin to expose a scoped membership response for that authenticated user via its existing Membership::describe. Bind the returned subject to the verified login subject. Site super_admin takes precedence, followed by site admin and the exact operations/minister pair. Staff names and endpoint values stay outside Git.
- Re-evaluate provider-managed grants on login and bound the lifetime of elevated sessions. A stale or unavailable membership response cannot grant new elevated access. Avoid long-lived API keys retaining expired federated privileges.
- Login buttons and labels reflect the available providers. Superadmins can assign nodes or individual instances by name in the UI, while the stored grants use immutable IDs.

## Risks / Trade-offs

The three daemons share a host. Command templates and filesystem access that would escape a selected node require global privileges. Revocation checks must cover active sessions and streaming tickets. Conflicting or absent role evidence cannot fall back to the previous elevated role.

## Migration Plan

Back up panel accounts and plugin files. Keep existing node and instance identifiers. Introduce the skin scope and confidential client, configure both provider callbacks, then verify using representative accounts. Local login remains available for recovery. No credential or production user record belongs in the fork.
