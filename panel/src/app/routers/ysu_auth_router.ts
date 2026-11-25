import Router from "@koa/router";
import { createHash, randomBytes } from "node:crypto";
import { Mutex } from "async-mutex";
import { checkBanIp, loginSuccess } from "../service/passport_service";
import users from "../service/user_service";
import {
  consumeLogin,
  exchangeIdentity,
  providerSettings,
  startLogin,
  type Provider
} from "../service/ysu_identity";
import { operationLogger } from "../service/operation_logger";

const router = new Router({ prefix: "/ysu-auth" });
const provisioning = new Mutex();
const providers: Provider[] = ["feishu", "skin"];
router.get("/providers", (ctx) => {
  ctx.body = providers.filter((p) => !!providerSettings(p));
});

for (const provider of providers) {
  router.get("/" + provider + "/login", (ctx) => {
    const settings = providerSettings(provider);
    if (!settings || !ctx.session) return ctx.throw(503);
    const tx = startLogin(provider, settings);
    ctx.session.ysuState = tx.state;
    ctx.set("Cache-Control", "no-store");
    ctx.redirect(tx.url);
  });

  router.get("/" + provider + "/callback", async (ctx) => {
    ctx.set("Cache-Control", "no-store");
    ctx.set("Referrer-Policy", "no-referrer");
    try {
      const settings = providerSettings(provider);
      if (!settings || !ctx.session || !checkBanIp(ctx)) throw new Error("Login unavailable");
      const verifier = consumeLogin(provider, String(ctx.query.state), ctx.session.ysuState);
      delete ctx.session.ysuState;
      const code = ctx.query.code;
      if (typeof code !== "string" || !code) throw new Error("Missing code");
      const identity = await exchangeIdentity(provider, settings, code, verifier);
      const user = await provisioning.runExclusive(async () => {
        const existing = [...users.objects.values()].find(
          (u) => u.externalIdentity === identity.subject
        );
        if (!existing) {
          const display = identity.display.replace(/[^\p{L}\p{N}_-]+/gu, "").slice(0, 28);
          const suffix = createHash("sha256").update(identity.subject).digest("hex").slice(0, 18);
          const userName = [provider, display, suffix].filter(Boolean).join("-");
          if (users.existUserName(userName)) throw new Error("Identity name conflict");
          return users.create(
            {
              userName,
              passWord: randomBytes(40).toString("hex"),
              permission: identity.role,
              nodeIds: identity.nodeIds,
              isInit: true
            },
            identity.subject
          );
        }
        if (existing.permission < 0) throw new Error("Account disabled");
        await users.edit(existing.uuid, { permission: identity.role, nodeIds: identity.nodeIds });
        return existing;
      });
      loginSuccess(ctx, user.userName, identity.subject);
      operationLogger.info("user_login", {
        operator_name: user.userName,
        operator_ip: ctx.ip,
        login_method: provider,
        login_result: true
      });
      ctx.redirect("/#/sso/callback");
    } catch {
      ctx.redirect("/#/login?sso_error=sso_auth_failed");
    }
  });
}
export default router;
