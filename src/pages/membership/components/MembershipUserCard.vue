<script setup lang="ts">
import { useI18n } from "vue-i18n";

const emit = defineEmits<{
  login: [];
}>();
const { t } = useI18n();
</script>

<template>
  <section class="m-user" aria-label="membership-user">
    <div class="m-user__row">
      <div class="m-user__avatar" aria-hidden="true" />
      <div class="m-user__copy">
        <p class="m-user__title">{{ t("pages.membership.userCard.notLoggedIn") }}</p>
        <p class="m-user__hint">{{ t("pages.membership.userCard.syncHint") }}</p>
      </div>
    </div>
    <button type="button" class="m-user__btn" @click="emit('login')">
      {{ t("pages.membership.userCard.loginCta") }}
    </button>
  </section>
</template>

<style scoped>
.m-user {
  padding: 16px 18px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #eef0f4;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  flex-shrink: 0;
}
.m-user__row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.m-user__avatar {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(145deg, #eef2ff 0%, #e0e7ff 55%, #c7d2fe 100%);
  border: 1px solid #e0e7ff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}
.m-user__copy {
  min-width: 0;
  flex: 1;
  text-align: left;
}
.m-user__title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  letter-spacing: 0;
  line-height: 1.35;
}
.m-user__hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #6b7280;
  letter-spacing: 0;
}
.m-user__btn {
  width: 100%;
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: #ffffff;
  background: linear-gradient(135deg, #fbb054 0%, #f78c2c 100%);
  box-shadow: 0 4px 12px rgba(243, 132, 30, 0.25);
  transition:
    filter 0.2s ease,
    box-shadow 0.2s ease;
}
.m-user__btn:hover {
  filter: brightness(1.03);
  box-shadow: 0 6px 14px rgba(243, 132, 30, 0.28);
}
.m-user__btn:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}
</style>
