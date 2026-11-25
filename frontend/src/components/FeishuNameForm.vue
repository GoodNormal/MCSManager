<script setup lang="ts">
import { t } from "@/lang/i18n";
import { chooseFeishuName, renameFeishuAccount } from "@/services/apis";
import { ref } from "vue";

const props = defineProps<{ currentName?: string }>();
const emit = defineEmits<{ (event: "saved", name: string): void }>();
const name = ref(props.currentName ?? "");
const error = ref("");
const busy = ref(false);
const save = async () => {
  const submittedName = name.value.trim();
  if (busy.value || !submittedName) return;
  busy.value = true;
  error.value = "";
  try {
    const request = props.currentName === undefined ? chooseFeishuName() : renameFeishuAccount();
    const result = await request.execute({
      data: { userName: submittedName },
      forceRequest: true
    });
    if (!result.value) throw new Error(t("TXT_CODE_YSU_NAME_EXPIRED"));
    emit("saved", typeof result.value === "string" ? result.value : submittedName);
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <div class="feishu-name-form">
    <label for="feishu-account-name">{{ t("TXT_CODE_YSU_ACCOUNT_NAME") }}</label>
    <a-input
      id="feishu-account-name"
      v-model:value="name"
      :disabled="busy"
      :maxlength="64"
      autocomplete="off"
      @press-enter.prevent="save"
    />
    <div v-if="error" role="alert">
      <a-typography-text type="danger">{{ error }}</a-typography-text>
    </div>
    <a-button type="primary" :loading="busy" :disabled="!name.trim()" @click="save">
      {{
        currentName === undefined ? t("TXT_CODE_YSU_SAVE_AND_ENTER") : t("TXT_CODE_YSU_SAVE_NAME")
      }}
    </a-button>
  </div>
</template>

<style scoped>
.feishu-name-form {
  display: grid;
  gap: 10px;
}
</style>
