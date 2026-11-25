import { describe, expect, it } from "vitest";
import { consumeLogin, providerSettings, resolveIdentity, startLogin } from "./ysu_identity";
import { User, ROLE } from "../entity/user";
import { isHaveInstance } from "./permission_service";

const a = "a".repeat(32),
  b = "b".repeat(32),
  other = "c".repeat(32);
const env = {
  YSU_PANEL_ORIGIN: "https://panel.test",
  FEISHU_TENANT_KEY: "tenant",
  FEISHU_APP_ID: "app",
  FEISHU_APP_SECRET: "secret",
  YSU_SKIN_CLIENT_ID: "11",
  YSU_SKIN_CLIENT_SECRET: "secret",
  YSU_SKIN_NODE_IDS: a + "," + b
};
const skin = providerSettings("skin", env)!,
  feishu = providerSettings("feishu", env)!;
describe("YSU identity and grants", () => {
  it.each([
    ["super_admin", null, 10],
    ["admin", null, 5],
    ["minister", "operations", 5],
    ["minister", "building", 1],
    ["member", "operations", 1],
    ["normal", null, 1]
  ])("maps %s in %s to %s", (role, department, level) => {
    const result = resolveIdentity("skin", skin, {
      sub: "42",
      ysumc_membership: { sub: "42", role, department, position: role }
    });
    expect(result.role).toBe(level);
    expect(result.nodeIds).toEqual(level === 5 ? [a, b] : []);
  });
  it("requires a matching verified subject and current department claim", () => {
    expect(() => resolveIdentity("skin", skin, { sub: "42" })).toThrow();
    expect(() =>
      resolveIdentity("skin", skin, { sub: "42", ysumc_membership: { sub: "41", role: "admin" } })
    ).toThrow();
  });
  it("restricts Feishu to its configured enterprise and app", () => {
    const profile = { code: 0, data: { tenant_key: "tenant", open_id: "member" } };
    expect(resolveIdentity("feishu", feishu, profile).role).toBe(10);
    expect(() =>
      resolveIdentity("feishu", feishu, { code: 0, data: { tenant_key: "other", open_id: "x" } })
    ).toThrow();
    expect(providerSettings("feishu", { ...env, FEISHU_TENANT_KEY: "" })).toBeUndefined();
  });
  it("binds PKCE state to the provider and session and consumes it once", () => {
    const { state, url } = startLogin("skin", skin);
    expect(new URL(url).searchParams.get("code_challenge_method")).toBe("S256");
    expect(() => consumeLogin("feishu", state, state)).toThrow();
    expect(() => consumeLogin("skin", state, "other")).toThrow();
    expect(consumeLogin("skin", state, state)).toHaveLength(43);
    expect(() => consumeLogin("skin", state, state)).toThrow();
  });
  it.each(["  ", "t-example", "u-example", "a-example", env.FEISHU_APP_ID, env.FEISHU_APP_SECRET])(
    "disables Feishu for an invalid tenant setting (%s) and still enables skin login",
    (value) => {
      const config = { ...env, FEISHU_TENANT_KEY: value };
      expect(providerSettings("feishu", config)).toBeUndefined();
      expect(providerSettings("skin", config)).toBeDefined();
    }
  );
  it("keeps Feishu tenant validation on the server and sends only OAuth parameters", () => {
    const { state, url } = startLogin("feishu", feishu);
    const params = new URL(url).searchParams;
    expect([...params.keys()].sort()).toEqual([
      "client_id",
      "code_challenge",
      "code_challenge_method",
      "redirect_uri",
      "response_type",
      "state"
    ]);
    expect(params.get("client_id")).toBe(env.FEISHU_APP_ID);
    expect(params.get("redirect_uri")).toBe(feishu.redirect);
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("state")).toBe(state);
    expect(consumeLogin("feishu", state, state)).toHaveLength(43);
  });
  it("enforces both dimensions of explicit grants and excludes the host console", () => {
    const user = new User();
    user.permission = ROLE.NODE_ADMIN;
    user.nodeIds = [a, b];
    expect(isHaveInstance(user, b, other)).toBe(true);
    expect(isHaveInstance(user, other, a)).toBe(false);
    expect(isHaveInstance(user, b, "global0001")).toBe(false);
    user.permission = ROLE.USER;
    user.instances = [{ daemonId: a, instanceUuid: b }];
    expect(isHaveInstance(user, a, b)).toBe(true);
    expect(isHaveInstance(user, b, b)).toBe(false);
    user.permission = ROLE.BAN;
    expect(isHaveInstance(user, a, b)).toBe(false);
  });
});
