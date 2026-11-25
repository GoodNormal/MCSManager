// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import { beforeEach, expect, it, vi } from "vitest";
import LoginCard from "@/widgets/LoginCard.vue";
import FeishuNameForm from "@/components/FeishuNameForm.vue";
import zhCN from "../../../../languages/zh_CN.json";

const api = vi.hoisted(() => ({
  providers: vi.fn(),
  sso: vi.fn(),
  login: vi.fn(),
  choose: vi.fn(),
  rename: vi.fn()
}));
vi.mock("@/services/apis", () => ({
  loginPageInfo: () => ({ execute: vi.fn(), state: ref({}) }),
  ysuLoginProviders: () => {
    const state = ref<string[]>([]);
    return {
      state,
      execute: async () => {
        state.value = await api.providers();
      }
    };
  },
  ssoConfig: () => ({ execute: api.sso }),
  loginUser: () => ({ execute: api.login }),
  chooseFeishuName: () => ({ execute: api.choose }),
  renameFeishuAccount: () => ({ execute: api.rename })
}));
vi.mock("@/config/router", () => ({ router: { currentRoute: { value: { query: {} } } } }));
vi.mock("@/lang/i18n", () => ({ t: (key: string) => key }));
vi.mock("@/tools/validator", () => ({ reportErrorMsg: vi.fn() }));
vi.mock("@/tools/common", () => ({ sleep: vi.fn() }));
vi.mock("@/stores/useAppStateStore", () => ({
  useAppStateStore: () => ({
    state: { isInstall: true },
    isAdmin: ref(false),
    updateUserInfo: vi.fn()
  })
}));

const options = {
  global: {
    stubs: {
      CardPanel: { template: '<div><slot name="body"/></div>' },
      AButton: { template: '<button><slot name="icon"/><slot/></button>' },
      AInput: {
        props: ["value"],
        emits: ["update:value"],
        template: '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />'
      },
      ASpace: { template: "<div><slot/></div>" },
      ATypographyTitle: { template: "<h3><slot/></h3>" },
      ATypographyParagraph: { template: "<p><slot/></p>" },
      ATypographyText: { template: "<span><slot/></span>" }
    }
  }
};
beforeEach(() => {
  vi.resetAllMocks();
  api.providers.mockResolvedValue(["feishu", "skin"]);
  api.sso.mockResolvedValue({ value: null });
});

it("shows provider links first and opens the existing password and two-factor flow", async () => {
  api.login.mockResolvedValue({ value: "NEED_2FA" });
  const w = mount(LoginCard, options);
  await flushPromises();
  expect(w.findAll("[href]").map((el) => el.attributes("href"))).toEqual([
    "/api/ysu-auth/feishu/login",
    "/api/ysu-auth/skin/login"
  ]);
  const providers = w.findAll("button[href]");
  expect(providers[0].text()).toBe("TXT_CODE_YSU_FEISHU_LOGIN");
  expect(zhCN.TXT_CODE_YSU_FEISHU_LOGIN).toBe("飞书登录");
  const logos = providers.map((button) => button.get("img[alt='']").attributes("src"));
  expect(logos[0]).toContain("feishu.png");
  expect(logos[1]).toContain("ysumc-skin.svg");
  expect(w.find("input").exists()).toBe(false);
  await w
    .findAll("button")
    .find((b) => b.text() === "TXT_CODE_YSU_LOCAL_LOGIN")!
    .trigger("click");
  await w.get('input[name="mcsm-name-input"]').setValue("local");
  await w.get('input[name="mcsm-pw-input"]').setValue("fixture");
  await w
    .findAll("button")
    .find((b) => b.text() === "TXT_CODE_d2c1a316")!
    .trigger("click");
  await flushPromises();
  expect(w.find('input[name="mcsm-pw-2fa"]').exists()).toBe(true);
  await w
    .findAll("button")
    .find((b) => b.text() === "TXT_CODE_YSU_BACK_TO_LOGIN")!
    .trigger("click");
  expect(w.find("input").exists()).toBe(false);
});

it("keeps local sign-in reachable after discovery fails and respects upstream SSO-only mode", async () => {
  api.providers.mockRejectedValue(new Error("unavailable"));
  const w = mount(LoginCard, options);
  await flushPromises();
  expect(w.text()).toContain("TXT_CODE_YSU_LOCAL_LOGIN");
  api.sso.mockResolvedValue({ value: { enabled: true, onlyMode: true } });
  const only = mount(LoginCard, options);
  await flushPromises();
  expect(only.text()).not.toContain("TXT_CODE_YSU_LOCAL_LOGIN");
});

it.each([undefined, "Previous"])(
  "saves a chosen name and displays actionable conflicts (current=%s)",
  async (currentName) => {
    const fn = currentName ? api.rename : api.choose;
    fn.mockRejectedValueOnce(new Error("Already in use")).mockResolvedValueOnce({
      value: currentName ? "Next" : true
    });
    const w = mount(FeishuNameForm, { ...options, props: { currentName } });
    await w.get("input").setValue("Next");
    await w.get("button").trigger("click");
    await flushPromises();
    expect(w.get('[role="alert"]').text()).toBe("Already in use");
    await w.get("button").trigger("click");
    await flushPromises();
    expect(w.emitted("saved")).toEqual([["Next"]]);
  }
);
