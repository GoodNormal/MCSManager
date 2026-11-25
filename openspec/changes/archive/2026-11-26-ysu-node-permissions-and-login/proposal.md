## Why

The panel currently treats node administration and panel administration as one privilege. YSUMC needs delegated operation of its nodes and two separately trusted login providers, while preserving existing instance assignments.

## What Changes

- Introduce superadmin, node-scoped admin and instance-scoped user. Existing local administrators keep their existing access. Each explicit instance grant remains independent.
- Offer Feishu and YSUMC skin login alongside existing local login. A verified login from the configured MC高校锦标赛 Feishu enterprise grants superadmin.
- Extend the skin integration to return authoritative site role, department and position to its registered MCSManager client. Map skin super administrators to superadmin, and skin administrators and operations ministers to admin on the configured YSUMC and 公益服 node IDs. Other enabled skin users receive explicit instance access only.

## Capabilities

### New Capabilities

- `scoped-node-administration` — resource-scoped authorization and node visibility.
- `ysu-provider-login` — provider-specific authentication, skin membership exchange and role mapping.

### Modified Capabilities

None. Existing local login and instance assignments retain their contracts.

## Impact

Changes affect panel authorization, identity storage, frontend login and management views, and the skin site membership plugin integration. Provider secrets and production node mappings are supplied by the operator. The fork tracks the deployed upstream release on ysu-dev.
