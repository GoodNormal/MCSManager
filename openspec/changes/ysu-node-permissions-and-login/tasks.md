## 1. Scope and migration

- [ ] 1.1 Preserve legacy local accounts and explicit instance assignments. Add node-admin grants and superadmin-only editing.
- [ ] 1.2 Apply the resource checks to lists, instance operations, batches, consoles, transfer tickets and management APIs. Keep host-wide authority with superadmin.
- [ ] 1.3 Expose roles and node assignments in the relevant frontend views.

## 2. Authentication and skin membership

- [ ] 2.1 Implement provider-specific login and callback flows, session binding, stable external subjects and expiry.
- [ ] 2.2 Extend the skin plugin with authenticated client-scoped access to current site role, department and position.
- [ ] 2.3 Implement the Feishu tenant check and skin entitlement mapping, including demotion, blocked users and session refresh.
- [ ] 2.4 Add both provider choices to login and document the secrets file and callbacks.

## 3. Verification and delivery

- [ ] 3.1 Run targeted authorization, migration, callback and skin membership cases, including cross-node requests, provider errors and role removal.
- [ ] 3.2 Build the affected packages, publish the fork changes on ysu-dev, and report verified login state separately for each provider.
