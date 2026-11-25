# Tasks

## 1. Provider access

- [x] 1.1 Present configured providers first and move the existing local password form behind the secondary login control. Keep its original two-factor and authorization behavior.
- [x] 1.2 Verify provider-first presentation, secondary login and return navigation, discovery failure and upstream SSO-only behavior with focused frontend tests.

## 2. Feishu names

- [x] 2.1 Implement scoped onboarding and durable name selection for new and legacy Feishu accounts, including concurrent collisions, expired transactions, disabled accounts, retries and current-session renames. Run the affected panel cases together.
- [x] 2.2 Add the first-login form and personal-settings rename action with localized validation. Run frontend type checking, the build and the named frontend cases once for the completed changes.

## 3. Release

- [ ] 3.1 Update provider documentation and the maintained fork PR, record targeted evidence, build the panel and frontend, and deploy with a backup and a rollback path. Verify the running release and public authentication endpoints.
