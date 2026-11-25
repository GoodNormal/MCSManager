<script setup lang="ts">
import FeishuNameForm from "@/components/FeishuNameForm.vue";
import { router } from "@/config/router";
import { t } from "@/lang/i18n";
</script>

<template>
  <section class="name-card">
    <a-card>
      <a-typography-title :level="3">{{ t("TXT_CODE_YSU_CHOOSE_NAME") }}</a-typography-title>
      <p>{{ t("TXT_CODE_YSU_NAME_HELP") }}</p>
      <FeishuNameForm @saved="router.replace('/sso/callback')" />
      <a-button block type="link" class="mt-12" href="/api/ysu-auth/feishu/login">
        {{ t("TXT_CODE_YSU_RESTART_LOGIN") }}
      </a-button>
    </a-card>
  </section>
</template>

<style scoped>
.name-card {
  width: min(100%, 440px);
  margin: 48px auto;
  padding: 0 12px;
}
</style>
