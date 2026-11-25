## 1. Scope and migration

- [x] 1.1 Preserve legacy local accounts and explicit instance assignments. Add node-admin grants and superadmin-only editing.
- [x] 1.2 Apply the resource checks to lists, instance operations, batches, consoles, transfer tickets and management APIs. Keep host-wide authority with superadmin.
- [x] 1.3 Expose roles and node assignments in the relevant frontend views.

## 2. Authentication and skin membership

- [x] 2.1 Implement provider-specific login and callback flows, session binding, stable external subjects and expiry.
- [x] 2.2 Extend the skin plugin with authenticated client-scoped access to current site role, department and position.
- [x] 2.3 Implement the Feishu tenant check and skin entitlement mapping, including demotion, blocked users and session refresh.
- [x] 2.4 Add both provider choices to login and document the secrets file and callbacks.

## 3. Verification and delivery

- [x] 3.1 Run targeted authorization, migration, callback and skin membership cases, including cross-node requests, provider errors and role removal.
- [x] 3.2 Build the affected packages, publish the fork changes on ysu-dev, and report verified login state separately for each provider.

## Delivery evidence

- Panel production build and frontend type-check / production build passed.
- 14 named panel tests passed. The PHP fixture passed three membership cases against the installed skin plugin.
- The public panel advertised both providers. Each flow redirected to its registered provider with a matching HTTPS callback and S256 PKCE. A callback without browser state was rejected.
- Feishu accepted the configured application credentials. The skin site registered a dedicated confidential client. A real end-user grant requires that user to complete provider consent.
- The deployed Web process retained the three local daemon connections and all 20 pre-existing accounts. Review is on GoodNormal/MCSManager pull request 1.
