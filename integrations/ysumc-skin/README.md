# YSUMC panel login

The `ysu-dev` branch is based on MCSManager 10.22.1. It changes the Web panel and skin integration and works with the existing 4.19.x daemons.

| Identity | Panel access |
| --- | --- |
| Existing local administrator or verified Feishu user in the configured tenant and app | Superadmin on all nodes |
| Skin super administrator | Superadmin on all nodes |
| Skin administrator or operations minister | Node admin on the two configured daemon UUIDs |
| Other enabled skin users | Their explicitly assigned instances |

Local superadmins can assign node admins in user management by selecting their nodes. Node admins can list, open, stop, restart, manage schedules and use the normal instance tools on the selected nodes. Host-level configuration, creating unrestricted processes, daemon credentials and account management require a superadmin. Instance permissions continue to use daemon and instance UUID pairs. Existing grants survive migration.

## Configure the panel

Load both files with systemd `EnvironmentFile=`. Keep them owned by root with mode 0600. Restart the Web unit after changing provider configuration. Missing configuration disables just that provider. The panel publishes enabled provider names under `/api/ysu-auth/providers`.

| File | Variables |
| --- | --- |
| `/etc/mcsm-cloud-web/feishu.env` | `FEISHU_APP_ID`, `FEISHU_APP_SECRET`, `FEISHU_TENANT_KEY` |
| `/etc/mcsm-cloud-web/skin.env` | `YSU_PANEL_ORIGIN`, `YSU_SKIN_CLIENT_ID`, `YSU_SKIN_CLIENT_SECRET`, `YSU_SKIN_NODE_IDS` |

Set the origin to the public HTTPS origin without a trailing slash. Set the node list to the two real daemon UUIDs, separated by a comma. The origin is shared by both providers. Login can create a new account with a provider-specific immutable identity. The readable name is set at first login. Assign individual instances to that account if needed. Federated accounts require a provider login every 15 minutes and cannot authenticate using panel API keys. Each login reads the current provider role and replaces earlier node grants. The time limit applies to panel requests; a previously opened long-running transfer or terminal may outlast its initiating request.

## Feishu

Use the enterprise application in the intended tenant. Find App ID and App Secret under Credentials & Basic Info. Register `https://game.ysumc.net/api/ysu-auth/feishu/callback` under Security Settings → Redirect URLs. Obtain `data.tenant_key` from the authenticated user information endpoint using a member of the intended enterprise. Limit the application's availability to the people who should administer every node. [Feishu developer console](https://open.feishu.cn/app) · [User information](https://open.feishu.cn/document/server-docs/authentication-management/login-state-management/get)

In the Feishu API Explorer, select the intended identity and call `GET /open-apis/authen/v1/user_info` with a `user_access_token`. Copy the response field `data.tenant_key` into `FEISHU_TENANT_KEY`. The panel checks this identifier against the authenticated profile at the callback. It keeps the configured identifier out of the browser authorization URL.

## Skin site

Register a dedicated confidential authorization-code client in the skin site's Passport/Janus installation with callback `https://game.ysumc.net/api/ysu-auth/skin/callback`. Use the scopes `openid profile`. The client ID must match `storage/app/mcsm-client-id` on the skin site. The ID file contains only the numeric public client ID. Install the companion patch on the site's yggdrasil-connect plugin with sitmc-launcher enabled. The patch reads the authenticated token's client and obtains current role, department and position from `Membership::describe`. Other clients continue to receive their usual profile. For checkouts with CRLF, normalize a staging copy before applying the patch and preserve the site's original file mode and ownership when installing it.

The login uses Janus authorization and token endpoints and the underlying same-site `/yggc/userinfo` resource directly. That resource authenticates the access token via the installed Janus/Yggdrasil middleware. Ordinary users, ministers of other departments and former ministers receive no automatic node grant. Site bans and incomplete identity responses deny login.
