<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { Lock, Maximize2, Minus, ShieldCheck, Smartphone, X } from "@lucide/vue";
import { ROUTE_PATHS } from "@/config/constants";
import { useNotificationStore } from "@/stores/notification.store";

type LoginTab = "sms" | "password";

const { t } = useI18n();
const router = useRouter();
const notificationStore = useNotificationStore();

const activeTab = ref<LoginTab>("sms");
const phone = ref("");
const smsCode = ref("");
const password = ref("");
const agreed = ref(true);
const formError = ref("");

let otpHintTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

const phoneId = "login-phone";
const smsCodeId = "login-sms-code";
const passwordId = "login-password";

const isPhoneValid = computed(() => /^1\d{10}$/.test(phone.value.trim()));

const submitDisabled = computed(() => !agreed.value);

watch(activeTab, () => {
  formError.value = "";
  smsCode.value = "";
  password.value = "";
});

watch([phone, smsCode, password, agreed], () => {
  if (formError.value) {
    formError.value = "";
  }
});

function validateForm(): boolean {
  const p = phone.value.trim();
  if (!p) {
    formError.value = t("pages.login.errors.phoneRequired");
    return false;
  }
  if (!/^1\d{10}$/.test(p)) {
    formError.value = t("pages.login.errors.phoneInvalid");
    return false;
  }
  if (activeTab.value === "sms") {
    if (!smsCode.value.trim()) {
      formError.value = t("pages.login.errors.codeRequired");
      return false;
    }
  } else if (!password.value) {
    formError.value = t("pages.login.errors.passwordRequired");
    return false;
  }
  return true;
}

function onSubmit(): void {
  if (!validateForm()) {
    return;
  }
  notificationStore.showNotification({
    title: t("pages.login.submitSuccessTitle"),
    message: t("pages.login.submitSuccessMessage"),
    tone: "success",
    durationMs: 2800
  });
  router.replace(ROUTE_PATHS.home);
}

function scheduleOtpHint(): void {
  if (otpHintTimer) {
    globalThis.clearTimeout(otpHintTimer);
  }
  otpHintTimer = globalThis.setTimeout(() => {
    otpHintTimer = null;
    notificationStore.showNotification({
      title: t("pages.login.otpPlaceholderTitle"),
      message: t("pages.login.otpPlaceholderMessage"),
      tone: "info",
      durationMs: 5000
    });
  }, 400);
}

function onGetCodeClick(): void {
  scheduleOtpHint();
}

function onWeChatLogin(): void {
  notificationStore.showNotification({
    title: t("pages.login.wechatPlaceholderTitle"),
    message: t("pages.login.wechatPlaceholderMessage"),
    tone: "info",
    durationMs: 4000
  });
}

function onRegisterClick(): void {
  notificationStore.showNotification({
    title: t("pages.login.registerPlaceholderTitle"),
    message: t("pages.login.registerPlaceholderMessage"),
    tone: "info",
    durationMs: 4000
  });
}

function onPolicyClick(kind: "terms" | "privacy"): void {
  notificationStore.showNotification({
    title: kind === "terms" ? t("pages.login.termsPlaceholderTitle") : t("pages.login.privacyPlaceholderTitle"),
    message: t("pages.login.policyPlaceholderMessage"),
    tone: "info",
    durationMs: 4000
  });
}

function goSettings(): void {
  router.push(ROUTE_PATHS.settings);
}

async function minimizeWindow(): Promise<void> {
  if (!isTauri()) return;
  await getCurrentWindow().minimize();
}

async function toggleMaximizeWindow(): Promise<void> {
  if (!isTauri()) return;
  const win = getCurrentWindow();
  const maximized = await win.isMaximized();
  if (maximized) {
    await win.unmaximize();
  } else {
    await win.maximize();
  }
}

async function closeWindow(): Promise<void> {
  if (!isTauri()) return;
  await getCurrentWindow().close();
}

onUnmounted(() => {
  if (otpHintTimer) {
    globalThis.clearTimeout(otpHintTimer);
  }
});
</script>

<template>
  <div class="login-page">
    <header class="login-page__chrome" :aria-label="t('pages.login.chromeAria')">
      <div class="login-page__chrome-spacer" />
      <div class="login-page__chrome-actions">
        <button type="button" class="login-page__icon-btn" :aria-label="t('nav.settings')" @click="goSettings">
          <svg class="login-page__gear" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.4-1.06-.73-1.69-.98l-.38-2.65A.488.488 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.63c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.63c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.31.61.22l2.49-1c.52.4 1.06.74 1.69.99l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.63z"
            />
          </svg>
        </button>
        <div class="login-page__window-controls" :aria-label="t('layout.appShell.windowControlsAria')">
          <button type="button" class="login-page__win-btn" :aria-label="t('layout.appShell.minimizeAria')" @click="minimizeWindow">
            <Minus :size="16" stroke-width="2" aria-hidden="true" />
          </button>
          <button type="button" class="login-page__win-btn" :aria-label="t('layout.appShell.maximizeAria')" @click="toggleMaximizeWindow">
            <Maximize2 :size="14" stroke-width="2" aria-hidden="true" />
          </button>
          <button type="button" class="login-page__win-btn login-page__win-btn--close" :aria-label="t('layout.appShell.closeAria')" @click="closeWindow">
            <X :size="16" stroke-width="2" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>

    <div class="login-page__split">
      <aside class="login-page__brand" aria-hidden="true" />

      <section class="login-page__right" aria-labelledby="login-card-title">
        <div class="login-card">
          <header class="login-card__header">
            <h2 id="login-card-title" class="login-card__title">{{ t("pages.login.cardTitle") }}</h2>
            <p class="login-card__subtitle">{{ t("pages.login.cardSubtitle") }}</p>
          </header>

          <div class="login-card__tabs" role="tablist" :aria-label="t('pages.login.tabsAria')">
            <button
              id="tab-sms"
              type="button"
              role="tab"
              class="login-card__tab"
              :class="{ 'login-card__tab--active': activeTab === 'sms' }"
              :aria-selected="activeTab === 'sms'"
              :tabindex="activeTab === 'sms' ? 0 : -1"
              @click="activeTab = 'sms'"
            >
              {{ t("pages.login.tabSms") }}
            </button>
            <button
              id="tab-password"
              type="button"
              role="tab"
              class="login-card__tab"
              :class="{ 'login-card__tab--active': activeTab === 'password' }"
              :aria-selected="activeTab === 'password'"
              :tabindex="activeTab === 'password' ? 0 : -1"
              @click="activeTab = 'password'"
            >
              {{ t("pages.login.tabPassword") }}
            </button>
          </div>

          <div class="login-card__panels">
            <div v-show="activeTab === 'sms'" role="tabpanel" aria-labelledby="tab-sms" class="login-card__panel">
              <div class="login-field">
                <label class="sr-only" :for="phoneId">{{ t("pages.login.phoneLabel") }}</label>
                <div class="login-field__control" :class="{ 'login-field__control--error': !!formError }">
                  <Smartphone class="login-field__icon" :size="20" stroke-width="2" aria-hidden="true" />
                  <input
                    :id="phoneId"
                    v-model="phone"
                    class="login-field__input"
                    type="tel"
                    inputmode="numeric"
                    autocomplete="tel"
                    maxlength="11"
                    :placeholder="t('pages.login.phonePlaceholder')"
                    :aria-invalid="!!formError || (!!phone && !isPhoneValid)"
                    :aria-describedby="formError ? 'login-form-error' : undefined"
                  />
                </div>
              </div>
              <div class="login-field login-field--code">
                <label class="sr-only" :for="smsCodeId">{{ t("pages.login.codeLabel") }}</label>
                <div class="login-field__control login-field__control--grow">
                  <ShieldCheck class="login-field__icon" :size="20" stroke-width="2" aria-hidden="true" />
                  <input
                    :id="smsCodeId"
                    v-model="smsCode"
                    class="login-field__input"
                    type="text"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    :placeholder="t('pages.login.codePlaceholder')"
                    :aria-describedby="formError ? 'login-form-error' : undefined"
                  />
                </div>
                <button type="button" class="login-card__text-btn" @click="onGetCodeClick">
                  {{ t("pages.login.getCode") }}
                </button>
              </div>
            </div>

            <div v-show="activeTab === 'password'" role="tabpanel" aria-labelledby="tab-password" class="login-card__panel">
              <div class="login-field">
                <label class="sr-only" :for="`${phoneId}-pw`">{{ t("pages.login.phoneLabel") }}</label>
                <div class="login-field__control" :class="{ 'login-field__control--error': !!formError }">
                  <Smartphone class="login-field__icon" :size="20" stroke-width="2" aria-hidden="true" />
                  <input
                    :id="`${phoneId}-pw`"
                    v-model="phone"
                    class="login-field__input"
                    type="tel"
                    inputmode="numeric"
                    autocomplete="tel"
                    maxlength="11"
                    :placeholder="t('pages.login.phonePlaceholder')"
                  />
                </div>
              </div>
              <div class="login-field">
                <label class="sr-only" :for="passwordId">{{ t("pages.login.passwordLabel") }}</label>
                <div class="login-field__control">
                  <Lock class="login-field__icon" :size="20" stroke-width="2" aria-hidden="true" />
                  <input
                    :id="passwordId"
                    v-model="password"
                    class="login-field__input"
                    type="password"
                    autocomplete="current-password"
                    :placeholder="t('pages.login.passwordPlaceholder')"
                  />
                </div>
              </div>
            </div>
          </div>

          <p v-if="formError" id="login-form-error" class="login-card__error" role="alert">
            {{ formError }}
          </p>

          <label class="login-card__agree">
            <input
              v-model="agreed"
              type="checkbox"
              class="login-card__checkbox"
              :aria-describedby="'login-agree-hint'"
            />
            <span class="login-card__agree-text">
              {{ t("pages.login.agreePrefix") }}
              <button type="button" class="login-card__link" @click="onPolicyClick('terms')">《{{ t("pages.login.terms") }}》</button>
              {{ t("pages.login.agreeMid") }}
              <button type="button" class="login-card__link" @click="onPolicyClick('privacy')">《{{ t("pages.login.privacy") }}》</button>
            </span>
          </label>
          <p id="login-agree-hint" class="login-card__agree-hint">{{ t("pages.login.agreeHint") }}</p>

          <button
            type="button"
            class="login-card__submit"
            :disabled="submitDisabled"
            :aria-disabled="submitDisabled"
            @click="onSubmit"
          >
            {{ t("pages.login.submit") }}
          </button>

          <div class="login-card__divider">
            <span>{{ t("pages.login.otherMethods") }}</span>
          </div>

          <button type="button" class="login-card__wechat" @click="onWeChatLogin">
            <span class="login-card__wechat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path
                  fill="#07c160"
                  d="M8.5 14a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6zm6.5 0a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6zM12 2C6.8 2 2.5 5.6 2.5 10c0 2.2 1.2 4.1 3 5.4L5 19l3.7-1.8c1 .3 2.1.5 3.3.5 5.2 0 9.5-3.6 9.5-8S17.2 2 12 2z"
                />
              </svg>
            </span>
            {{ t("pages.login.wechatLogin") }}
          </button>

          <p class="login-card__register">
            {{ t("pages.login.noAccount") }}
            <button type="button" class="login-card__link" @click="onRegisterClick">{{ t("pages.login.registerNow") }}</button>
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  --login-primary: #2b66ff;
  --login-text: #0f172a;
  --login-muted: #475569;
  --login-border: #e2e8f0;
  --login-bg: #f4f7fb;
  --login-card-bg: #ffffff;
  --login-radius-lg: 16px;
  --login-radius-md: 12px;
  --login-shadow: 0 20px 56px rgba(15, 23, 42, 0.1);

  min-height: 100vh;
  min-height: 100dvh;
  height: 100%;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  color: var(--login-text);
  background: var(--login-bg);
  color-scheme: light;
  letter-spacing: 0.02em;
  font-size: 15px;
  line-height: 1.55;
}

:global(html.theme-dark) .login-page {
  --login-text: #0f172a;
  --login-muted: #475569;
  --login-border: #e2e8f0;
  --login-bg: #f4f7fb;
  --login-card-bg: #ffffff;
  color-scheme: light;
  background: var(--login-bg);
  color: var(--login-text);
}

.login-page__chrome {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 12px clamp(16px, 3vw, 28px) 8px;
  flex-shrink: 0;
  z-index: 2;
}

.login-page__chrome-spacer {
  flex: 1;
}

.login-page__chrome-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-page__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #475569;
  cursor: pointer;
}

.login-page__icon-btn:hover {
  background: rgba(43, 102, 255, 0.08);
  color: var(--login-primary);
}

.login-page__icon-btn:focus-visible {
  outline: 2px solid var(--login-primary);
  outline-offset: 2px;
}

.login-page__gear {
  width: 22px;
  height: 22px;
}

.login-page__window-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.login-page__win-btn {
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.login-page__win-btn:hover {
  background: #e2e8f0;
  color: #334155;
}

.login-page__win-btn--close:hover {
  background: #ef4444;
  color: #fff;
}

.login-page__win-btn:focus-visible {
  outline: 2px solid var(--login-primary);
  outline-offset: 1px;
}

.login-page__split {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 1.18fr);
  grid-template-rows: 1fr;
  gap: 0;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  align-items: stretch;
}

.login-page__brand {
  min-width: 0;
  min-height: 0;
  height: 100%;
  align-self: stretch;
  overflow: hidden;
  background: url("/resources/login/publicity1.jpg") center / cover no-repeat;
}

.login-page__right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(20px, 4vh, 48px) clamp(24px, 5vw, 72px);
  min-width: 0;
  min-height: 0;
}

.login-card {
  width: 100%;
  max-width: 520px;
  background: var(--login-card-bg);
  border-radius: var(--login-radius-lg);
  box-shadow: var(--login-shadow);
  padding: clamp(28px, 3.5vh, 40px) clamp(28px, 4vw, 40px) clamp(28px, 3vh, 36px);
  box-sizing: border-box;
}

.login-card__header {
  margin-bottom: clamp(18px, 2.5vh, 26px);
}

.login-card__title {
  margin: 0 0 8px;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.35;
}

.login-card__subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--login-muted);
  letter-spacing: 0.02em;
  line-height: 1.55;
}

.login-card__tabs {
  display: flex;
  gap: 28px;
  border-bottom: 1px solid var(--login-border);
  margin-bottom: clamp(18px, 2.5vh, 24px);
}

.login-card__tab {
  position: relative;
  padding: 0 0 12px;
  border: none;
  background: none;
  font: inherit;
  font-size: 0.98rem;
  font-weight: 500;
  color: var(--login-muted);
  cursor: pointer;
  letter-spacing: 0.04em;
}

.login-card__tab--active {
  color: var(--login-text);
  font-weight: 600;
}

.login-card__tab--active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 3px;
  border-radius: 999px;
  background: var(--login-primary);
}

.login-card__tab:focus-visible {
  outline: 2px solid var(--login-primary);
  outline-offset: 4px;
  border-radius: 4px;
}

.login-card__panels {
  min-height: 132px;
}

.login-card__panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.login-field--code {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.login-field__control--grow {
  flex: 1;
  min-width: 0;
}

.login-field {
  width: 100%;
}

.login-field__control {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  min-height: 52px;
  height: auto;
  border: 1px solid var(--login-border);
  border-radius: var(--login-radius-md);
  background: #fafbfc;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.login-field__control:focus-within {
  border-color: rgba(43, 102, 255, 0.55);
  box-shadow: 0 0 0 3px rgba(43, 102, 255, 0.12);
}

.login-field__control--error {
  border-color: #f97316;
}

.login-field__icon {
  flex-shrink: 0;
  color: #94a3b8;
}

.login-field__input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  color: var(--login-text);
  outline: none;
}

.login-field__input::placeholder {
  color: #94a3b8;
  letter-spacing: 0.03em;
}

.login-card__text-btn {
  flex-shrink: 0;
  align-self: center;
  border: none;
  background: none;
  color: var(--login-primary);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  padding: 8px 4px;
  white-space: nowrap;
}

.login-card__text-btn:hover {
  text-decoration: underline;
}

.login-card__text-btn:focus-visible {
  outline: 2px solid var(--login-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

.login-card__error {
  margin: 0 0 10px;
  font-size: 0.88rem;
  color: #ea580c;
  letter-spacing: 0.02em;
}

.login-card__agree {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 6px 0 4px;
  cursor: pointer;
  font-size: 0.82rem;
  color: #475569;
  line-height: 1.55;
  letter-spacing: 0.03em;
}

.login-card__checkbox {
  flex-shrink: 0;
  margin-top: 4px;
  width: 18px;
  height: 18px;
  accent-color: var(--login-primary);
  cursor: pointer;
}

.login-card__checkbox:focus-visible {
  outline: 2px solid var(--login-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

.login-card__agree-text {
  user-select: none;
}

.login-card__link {
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  font: inherit;
  font-size: inherit;
  color: var(--login-primary);
  font-weight: 600;
  cursor: pointer;
  letter-spacing: inherit;
}

.login-card__link:hover {
  text-decoration: underline;
}

.login-card__link:focus-visible {
  outline: 2px solid var(--login-primary);
  outline-offset: 2px;
  border-radius: 2px;
}

.login-card__agree-hint {
  margin: 0 0 16px;
  font-size: 0.8125rem;
  color: #64748b;
  letter-spacing: 0.02em;
  line-height: 1.5;
}

.login-card__submit {
  width: 100%;
  min-height: 52px;
  height: auto;
  border: none;
  border-radius: var(--login-radius-md);
  background: var(--login-primary);
  color: #ffffff;
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(43, 102, 255, 0.35);
  transition: filter 0.2s ease, box-shadow 0.2s ease;
}

.login-card__submit:hover:not(:disabled) {
  filter: brightness(1.05);
}

.login-card__submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.login-card__submit:focus-visible:not(:disabled) {
  outline: 2px solid #1e40af;
  outline-offset: 3px;
}

.login-card__divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0 16px;
  color: #64748b;
  font-size: 0.875rem;
  letter-spacing: 0.04em;
}

.login-card__divider::before,
.login-card__divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--login-border);
}

.login-card__wechat {
  width: 100%;
  min-height: 52px;
  height: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid var(--login-border);
  border-radius: var(--login-radius-md);
  background: #fff;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: #334155;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.login-card__wechat:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.login-card__wechat:focus-visible {
  outline: 2px solid var(--login-primary);
  outline-offset: 2px;
}

.login-card__register {
  margin: 22px 0 0;
  text-align: center;
  font-size: 0.9rem;
  color: var(--login-muted);
  letter-spacing: 0.02em;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .login-field__control,
  .login-card__submit,
  .login-card__wechat {
    transition: none;
  }
}

@media (max-width: 960px) {
  .login-page__split {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(200px, 32vh) 1fr;
  }

  .login-page__brand {
    min-height: 0;
    height: 100%;
  }

  .login-page__right {
    padding: 20px clamp(16px, 5vw, 28px) clamp(24px, 6vh, 40px);
  }

  .login-card {
    max-width: 100%;
  }
}
</style>
