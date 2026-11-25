import { createHash, randomBytes } from "node:crypto";
import { ROLE } from "../entity/user";

export type Provider = "feishu" | "skin";

export function providerSettings(provider: Provider, env = process.env) {
  const origin = env.YSU_PANEL_ORIGIN;
  if (!origin || !/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin)) return;
  const feishu = provider === "feishu";
  const clientId = feishu ? env.FEISHU_APP_ID : env.YSU_SKIN_CLIENT_ID;
  const secret = feishu ? env.FEISHU_APP_SECRET : env.YSU_SKIN_CLIENT_SECRET;
  const nodeIds = (env.YSU_SKIN_NODE_IDS || "").split(",").map((v) => v.trim());
  if (
    !clientId ||
    !secret ||
    (feishu
      ? !env.FEISHU_TENANT_KEY
      : nodeIds.length !== 2 ||
        new Set(nodeIds).size !== 2 ||
        !nodeIds.every((id) => /^[a-f0-9]{32}$/i.test(id)))
  )
    return;
  return {
    clientId,
    secret,
    tenant: env.FEISHU_TENANT_KEY,
    nodeIds,
    redirect: origin + "/api/ysu-auth/" + provider + "/callback",
    authorize: feishu
      ? "https://accounts.feishu.cn/open-apis/authen/v1/authorize"
      : "https://skin.ysumc.net/api/janus/auth",
    token: feishu
      ? "https://open.feishu.cn/open-apis/authen/v2/oauth/token"
      : "https://skin.ysumc.net/api/janus/token",
    profile: feishu
      ? "https://open.feishu.cn/open-apis/authen/v1/user_info"
      : "https://skin.ysumc.net/yggc/userinfo"
  };
}

type Settings = NonNullable<ReturnType<typeof providerSettings>>;
export function resolveIdentity(provider: Provider, settings: Settings, profile: any) {
  if (provider === "feishu") {
    const p = profile?.data;
    if (
      profile?.code !== 0 ||
      !settings.tenant ||
      p?.tenant_key !== settings.tenant ||
      typeof p.open_id !== "string" ||
      !p.open_id
    )
      throw new Error("Unverified Feishu identity");
    return {
      display: typeof p.name === "string" ? p.name : "",
      subject: JSON.stringify([provider, p.tenant_key, settings.clientId, p.open_id]),
      role: ROLE.ADMIN,
      nodeIds: []
    };
  }
  const p = profile?.ysumc_membership;
  if (
    typeof profile?.sub !== "string" ||
    !/^[1-9]\d*$/.test(profile.sub) ||
    !p ||
    p.sub !== profile.sub ||
    !["normal", "member", "minister", "president", "admin", "super_admin"].includes(p.role)
  )
    throw new Error("Unverified skin membership");
  const role =
    p.role === "super_admin"
      ? ROLE.ADMIN
      : p.role === "admin" ||
        (p.role === "minister" && p.position === "minister" && p.department === "operations")
      ? ROLE.NODE_ADMIN
      : ROLE.USER;
  return {
    display: typeof profile.nickname === "string" ? profile.nickname : "",
    subject: JSON.stringify([provider, "https://skin.ysumc.net/api/janus", profile.sub]),
    role,
    nodeIds: role === ROLE.NODE_ADMIN ? settings.nodeIds : []
  };
}

const transactions = new Map<string, { provider: Provider; verifier: string; until: number }>();
export function startLogin(provider: Provider, settings: Settings) {
  const now = Date.now();
  for (const [key, tx] of transactions) if (tx.until <= now) transactions.delete(key);
  if (transactions.size >= 4096) throw new Error("Too many pending logins");
  const state = randomBytes(32).toString("hex"),
    verifier = randomBytes(32).toString("base64url");
  transactions.set(state, { provider, verifier, until: now + 5 * 60_000 });
  const url = new URL(settings.authorize);
  url.search = new URLSearchParams({
    client_id: settings.clientId,
    response_type: "code",
    redirect_uri: settings.redirect,
    state,
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    ...(provider === "skin" ? { scope: "openid profile" } : { target_tenant: settings.tenant! })
  }).toString();
  return { state, url: url.toString() };
}

export function consumeLogin(provider: Provider, state: string, sessionState: unknown) {
  const tx = transactions.get(state);
  if (!tx || sessionState !== state || tx.provider !== provider)
    throw new Error("Invalid login state");
  transactions.delete(state);
  if (tx.until <= Date.now()) throw new Error("Expired login");
  return tx.verifier;
}

export async function exchangeIdentity(
  provider: Provider,
  settings: Settings,
  code: string,
  verifier: string
) {
  const fields = {
    grant_type: "authorization_code",
    code,
    client_id: settings.clientId,
    client_secret: settings.secret,
    redirect_uri: settings.redirect,
    code_verifier: verifier
  };
  const feishu = provider === "feishu";
  const token = await fetch(settings.token, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    headers: { "Content-Type": feishu ? "application/json" : "application/x-www-form-urlencoded" },
    body: feishu ? JSON.stringify(fields) : new URLSearchParams(fields).toString()
  });
  if (!token.ok) throw new Error("Provider token exchange failed");
  const grant = (await token.json()) as { access_token?: string };
  if (typeof grant.access_token !== "string" || !grant.access_token)
    throw new Error("Missing access token");
  const response = await fetch(settings.profile, {
    signal: AbortSignal.timeout(10000),
    redirect: "error",
    headers: { Authorization: "Bearer " + grant.access_token }
  });
  if (!response.ok) throw new Error("Provider identity unavailable");
  return resolveIdentity(provider, settings, await response.json());
}
