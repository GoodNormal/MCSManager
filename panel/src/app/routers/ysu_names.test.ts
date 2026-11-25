import Koa from "koa";
import Router from "@koa/router";
import koaBody from "koa-body";
import session from "koa-session";
import request from "supertest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import storage from "../common/storage/sys_storage";
import { User } from "../entity/user";
import permission from "../middleware/permission";
import users from "../service/user_service";
import router from "./ysu_auth_router";

vi.mock("../i18n", () => ({ $t: (value: string) => value }));
vi.mock("../service/operation_logger", () => ({ operationLogger: { info: vi.fn() } }));
const origin = "https://panel.test";
const subject = JSON.stringify(["feishu", "tenant", "app", "player"]);
const headers = { Origin: origin, "X-Requested-With": "XMLHttpRequest" };

function browser() {
  const app = new Koa();
  app.keys = ["fixture"];
  app.use(session(app)).use(koaBody()).use(router.routes());
  const me = new Router();
  me.get("/me", permission({ level: 10, token: false, speedLimit: false }), (ctx) => {
    ctx.body = { uuid: ctx.session!.uuid, name: ctx.session!.userName, token: ctx.session!.token };
  });
  app.use(me.routes());
  app.on("error", () => {});
  return request.agent(app.callback());
}

async function callback(agent: ReturnType<typeof browser>) {
  const start = await agent.get("/ysu-auth/feishu/login").expect(302);
  const state = new URL(start.headers.location).searchParams.get("state");
  return agent.get("/ysu-auth/feishu/callback").query({ state, code: "verified" }).expect(302);
}
beforeEach(() => {
  vi.stubEnv("YSU_PANEL_ORIGIN", origin);
  vi.stubEnv("FEISHU_TENANT_KEY", "tenant");
  vi.stubEnv("FEISHU_APP_ID", "app");
  vi.stubEnv("FEISHU_APP_SECRET", "fixture");
  vi.stubGlobal("fetch", async (url: string) => ({
    ok: true,
    json: async () =>
      url.endsWith("/token")
        ? { access_token: "fixture" }
        : { code: 0, data: { tenant_key: "tenant", open_id: "player", name: "Provider name" } }
  }));
  vi.spyOn(storage.getStorage(), "store").mockResolvedValue(undefined);
});
afterEach(() => {
  users.objects.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it.each([false, true])(
  "requires first-name selection and keeps the account across renames (legacy=%s)",
  async (legacy) => {
    if (legacy) {
      const old = Object.assign(new User(), {
        uuid: "old",
        userName: "feishu-old",
        permission: 10,
        externalIdentity: subject,
        instances: [{ daemonId: "node", instanceUuid: "instance" }]
      });
      users.objects.set(old.uuid, old);
    }
    const local = Object.assign(new User(), { uuid: "local", userName: "Owner" });
    users.objects.set(local.uuid, local);
    const agent = browser();
    expect((await callback(agent)).headers.location).toBe("/#/sso/feishu-name");
    await agent.get("/me").expect(403);
    const save = (name: string) =>
      agent.post("/ysu-auth/feishu/first-name").set(headers).send({ userName: name });
    await save("Owner").expect(500);
    await save("  ").expect(500);
    await save(" 顾梵 ").expect(200);
    const me = (await agent.get("/me").expect(200)).body;
    expect(me.name).toBe("顾梵");
    if (legacy) {
      expect(me.uuid).toBe("old");
      expect(users.getInstance("old")!.instances).toHaveLength(1);
    }
    await save("Again").expect(403);
    await agent
      .put("/ysu-auth/feishu/name")
      .query({ token: me.token })
      .set(headers)
      .send({ userName: "Player", uuid: "local" })
      .expect(200);
    expect((await callback(agent)).headers.location).toBe("/#/sso/callback");
    expect((await agent.get("/me").expect(200)).body).toMatchObject({
      name: "Player",
      uuid: me.uuid
    });
    expect(local.userName).toBe("Owner");
  }
);

it("rejects expired or disabled naming sessions and cross-origin submissions", async () => {
  const agent = browser();
  await callback(agent);
  const save = () =>
    agent.post("/ysu-auth/feishu/first-name").set(headers).send({ userName: "Player" });
  await save().set("Origin", "https://other.test").expect(403);
  const user = [...users.objects.values()][0];
  user.permission = -1;
  await save().expect(403);
  user.permission = 10;
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now + 6 * 60_000);
  await save().expect(403);
  expect(user.feishuNameChosen).toBe(false);
});

it("reserves a name across concurrent claims and rolls back a failed save", async () => {
  const a = Object.assign(new User(), {
    uuid: "a",
    userName: "first",
    externalIdentity: subject,
    permission: 10
  });
  const b = Object.assign(new User(), {
    uuid: "b",
    userName: "second",
    externalIdentity: subject,
    permission: 10
  });
  users.objects.set(a.uuid, a);
  users.objects.set(b.uuid, b);
  const claims = await Promise.allSettled([
    users.chooseFeishuName(a, "Player"),
    users.chooseFeishuName(b, "Player")
  ]);
  expect(claims.map((c) => c.status)).toEqual(["fulfilled", "rejected"]);
  vi.mocked(storage.getStorage().store).mockRejectedValueOnce(new Error("write failed"));
  await expect(users.chooseFeishuName(b, "Another")).rejects.toThrow("write failed");
  expect(b).toMatchObject({ userName: "second", feishuNameChosen: false });
});
