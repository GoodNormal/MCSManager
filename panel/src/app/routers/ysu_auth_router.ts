import Router from "@koa/router";
import { createHash, randomBytes } from "node:crypto";
import { Mutex } from "async-mutex";
import type Koa from "koa";
import { ROLE, User } from "../entity/user";
import { $t } from "../i18n";
import permission from "../middleware/permission";
import { checkBanIp, isAjax, loginSuccess } from "../service/passport_service";
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
function completeLogin(ctx: Koa.ParameterizedContext, user: User, provider: Provider) {
  loginSuccess(ctx, user.userName, user.externalIdentity);
  operationLogger.info("user_login", {
    operator_name: user.userName,
    operator_ip: ctx.ip,
    login_method: provider,
    login_result: true
  });
}

function recordNameChange(ctx: Koa.ParameterizedContext, user: User, oldName: string) {
  operationLogger.info("user_config_change", {
    operator_ip: ctx.ip,
    operator_name: user.userName,
    target_user_name: user.userName,
    config_before: { uuid: user.uuid, userName: oldName },
    config_after: { uuid: user.uuid, userName: user.userName }
  });
}
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
      if (provider === "feishu" && !user.feishuNameChosen) {
        // koa-session accepts plain data in its setter and wraps it in a fresh Session.
        Object.assign(ctx, {
          session: {
            feishuNaming: {
              uuid: user.uuid,
              subject: identity.subject,
              until: Date.now() + 5 * 60_000
            }
          }
        });
        ctx.redirect("/#/sso/feishu-name");
        return;
      }
      completeLogin(ctx, user, provider);
      ctx.redirect("/#/sso/callback");
    } catch {
      ctx.redirect("/#/login?sso_error=sso_auth_failed");
    }
  });
}

router.post("/feishu/first-name", async (ctx) => {
  ctx.set("Cache-Control", "no-store");
  if (!isAjax(ctx) || ctx.get("Origin") !== process.env.YSU_PANEL_ORIGIN)
    return ctx.throw(403, $t("TXT_CODE_permission.forbidden") as string);
  await provisioning.runExclusive(async () => {
    const ticket = ctx.session?.feishuNaming;
    const user = ticket && users.getInstance(ticket.uuid);
    if (
      !user ||
      !user.isFeishuAccount ||
      user.externalIdentity !== ticket.subject ||
      Date.now() >= ticket.until ||
      user.feishuNameChosen ||
      user.permission < 0
    )
      return ctx.throw(403, $t("TXT_CODE_YSU_NAME_EXPIRED") as string);
    const previous = user.userName;
    await users.chooseFeishuName(user, ctx.request.body?.userName);
    recordNameChange(ctx, user, previous);
    completeLogin(ctx, user, "feishu");
    ctx.body = true;
  });
});

router.put("/feishu/name", permission({ level: ROLE.USER }), async (ctx) => {
  await provisioning.runExclusive(async () => {
    const user = users.getInstance(ctx.session?.uuid);
    if (
      ctx.query.apikey ||
      ctx.get("x-request-api-key") ||
      !user?.isFeishuAccount ||
      !user.feishuNameChosen ||
      !ctx.session?.login ||
      ctx.session.ysuIdentity !== user.externalIdentity ||
      !(ctx.session.ysuExpiresAt > Date.now()) ||
      user.permission < 0
    )
      return ctx.throw(403, $t("TXT_CODE_permission.forbidden") as string);
    const previous = user.userName;
    await users.chooseFeishuName(user, ctx.request.body?.userName);
    ctx.session.userName = user.userName;
    recordNameChange(ctx, user, previous);
    ctx.body = user.userName;
  });
});
export default router;
