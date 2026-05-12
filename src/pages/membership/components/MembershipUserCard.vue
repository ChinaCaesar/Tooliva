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
  padding: 18px 20px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e8ecf3;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 8px rgba(15, 23, 42, 0.06);
}
.m-user__row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}
.m-user__avatar {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(145deg, #dbeafe 0%, #bfdbfe 55%, #93c5fd 100%);
  border: 2px solid #e0f2fe;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}
.m-user__copy {
  min-width: 0;
  flex: 1;
  text-align: left;
}
.m-user__title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 0.02em;
  line-height: 1.3;
}
.m-user__hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #64748b;
  letter-spacing: 0.01em;
}
.m-user__btn {
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: #3b82f6;
  color: #ffffff;
  transition: background-color 0.2s ease;
}
.m-user__btn:hover {
  background: #2563eb;
}
.m-user__btn:focus-visible {
  outline: 2px solid #1d4ed8;
  outline-offset: 2px;
}
</style>
