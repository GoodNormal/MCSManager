import { afterEach, expect, it, vi } from "vitest";
import permission from "../middleware/permission";
import { ROLE, User } from "../entity/user";
import users from "../service/user_service";
import instanceRouter from "./instance_admin_router";
import { exchangeIdentity, providerSettings } from "../service/ysu_identity";

const node = "b".repeat(32),
  instance = "a".repeat(32);
const actor = Object.assign(new User(), {
  uuid: "test-actor",
  userName: "test",
  permission: ROLE.NODE_ADMIN,
  nodeIds: [node]
});
const ctx = (props: object = {}) =>
  ({
    session: { login: true, uuid: actor.uuid, userName: "test", save: vi.fn() },
    request: { header: {} },
    query: {},
    throw(status: number) {
      throw new Error(String(status));
    },
    ...props
  }) as any;
afterEach(() => {
  users.objects.delete(actor.uuid);
  vi.unstubAllGlobals();
});

it("rejects panel administrator operations for node admins", async () => {
  users.objects.set(actor.uuid, actor);
  const c = ctx(),
    next = vi.fn();
  await permission({ level: ROLE.ADMIN, token: false, speedLimit: false })(c, next);
  expect(c.status).toBe(403);
  expect(next).not.toHaveBeenCalled();
});
it("checks a whole batch before dispatch", async () => {
  users.objects.set(actor.uuid, actor);
  const route = instanceRouter.stack.find((r) => r.path.endsWith("/multi_stop"))!;
  const next = vi.fn();
  const c = ctx({
    request: {
      header: {},
      body: [
        { daemonId: node, instanceUuid: instance },
        { daemonId: instance, instanceUuid: instance }
      ]
    }
  });
  await expect(route.stack[1](c, next)).rejects.toThrow("403");
  expect(next).not.toHaveBeenCalled();
  c.request.body.pop();
  await route.stack[1](c, next);
  expect(next).toHaveBeenCalledOnce();
});
it("expires delegated sessions and requests fresh provider authorization", async () => {
  const external = Object.assign(new User(), actor, { externalIdentity: "skin-subject" });
  users.objects.set(actor.uuid, external);
  const c = ctx();
  c.session.ysuIdentity = external.externalIdentity;
  c.session.ysuExpiresAt = Date.now() - 1;
  const next = vi.fn();
  await permission({ level: 1, token: false, speedLimit: false })(c, next);
  expect(next).not.toHaveBeenCalled();
  expect(c.session.login).toBeNull();
});
it("exchanges a code for the skin userinfo response and applies a demotion", async () => {
  const settings = providerSettings("skin", {
    YSU_PANEL_ORIGIN: "https://panel.test",
    YSU_SKIN_CLIENT_ID: "local",
    YSU_SKIN_CLIENT_SECRET: "test-secret",
    YSU_SKIN_NODE_IDS: [node, instance].join(",")
  })!;
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "fixture-access" }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sub: "7",
        ysumc_membership: { sub: "7", role: "member", department: "operations" }
      })
    });
  vi.stubGlobal("fetch", fetch);
  expect((await exchangeIdentity("skin", settings, "fixture-code", "fixture-verifier")).role).toBe(
    ROLE.USER
  );
  expect(fetch.mock.calls[1][1].headers.Authorization).toBe("Bearer fixture-access");
});
