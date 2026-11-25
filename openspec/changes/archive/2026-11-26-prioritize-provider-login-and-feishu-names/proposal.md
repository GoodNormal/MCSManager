# Proposal

## Why

Players can currently sign in through the old panel login. A newly provisioned Feishu administrator sees a generated name with an identity suffix in the panel and has no dedicated way to choose a readable name.

## What Changes

- Offer Feishu and YSUMC skin sign-in first on desktop and mobile. Put the existing password form and its two-factor step behind a secondary login control.
- Require new Feishu players and existing Feishu accounts with generated names to choose their own name before entering the panel. Provide a rename action in personal settings.
- Preserve the existing local login API, active sessions, instance grants and panel API key integrations.

## Capabilities

### Modified Capabilities

- `ysu-provider-login` covers primary and secondary sign-in entry points and self-service Feishu naming.

## Impact

The Web backend, login page and personal settings are affected.
