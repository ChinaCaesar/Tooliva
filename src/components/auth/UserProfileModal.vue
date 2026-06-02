<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { LogOut, User, X } from "@lucide/vue";
import { resolveMembershipTierLabel } from "@/auth/membership";
import { WEBSITE_URL } from "@/config/constants";
import { openExternalUrl } from "@/utils/openExternalUrl";
import { useAuthStore } from "@/stores/auth.store";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  logout: [];
}>();

const { t } = useI18n();
const authStore = useAuthStore();
const panelRef = ref<HTMLElement | null>(null);

const providerLabel = computed(() => {
  const provider = authStore.user?.provider;
  if (!provider) return t("auth.userProfile.unknownProvider");
  const key = `auth.provider.${provider.toLowerCase()}` as const;
  return t(key);
});

const membershipLabel = computed(() =>
  resolveMembershipTierLabel(authStore.membership, t)
);

const expiryText = computed(() => {
  const expiresAt = authStore.membership?.expiresAt;
  if (!expiresAt) {
    return t("auth.membership.noExpiry");
  }
  return t("auth.membership.expiresAt", {
    date: new Date(expiresAt).toLocaleDateString(),
  });
});

const nicknameInitial = computed(() => authStore.user?.nickname.slice(0, 1) ?? "");
const avatarLoadFailed = ref(false);
const avatarUrl = computed(() => (avatarLoadFailed.value ? "" : (authStore.user?.avatar ?? "")));
const accountEmail = computed(() => authStore.user?.email || t("auth.userProfile.notProvided"));
const accountId = computed(() => authStore.user?.id || "-");

watch(
  () => authStore.user?.avatar,
  () => {
    avatarLoadFailed.value = false;
  }
);

function onOverlayClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    emit("close");
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && props.open) {
    emit("close");
  }
}

async function onManageAccount(): Promise<void> {
  await openExternalUrl(`${WEBSITE_URL}/account`);
}

function onLogout(): void {
  emit("logout");
  emit("close");
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (authStore.isLoggedIn) {
        void authStore.refreshMembership();
      }
      globalThis.requestAnimationFrame(() => {
        panelRef.value?.focus();
      });
    }
  }
);

onMounted(() => {
  globalThis.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  globalThis.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="profile-modal">
      <div
        v-if="open"
        class="profile-modal__overlay"
        role="presentation"
        @click="onOverlayClick"
      >
        <div
          ref="panelRef"
          class="profile-modal__panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="'profile-modal-title'"
          tabindex="-1"
          @click.stop
        >
          <header class="profile-modal__header">
            <h2 id="profile-modal-title" class="profile-modal__title">
              {{ t("auth.userProfile.title") }}
            </h2>
            <button
              type="button"
              class="profile-modal__icon-btn"
              :aria-label="t('auth.userProfile.close')"
              @click="emit('close')"
            >
              <X :size="18" aria-hidden="true" />
            </button>
          </header>

          <div v-if="authStore.user" class="profile-modal__body">
            <div class="profile-modal__user">
              <div class="profile-modal__avatar" aria-hidden="true">
                <img
                  v-if="avatarUrl"
                  class="profile-modal__avatar-img"
                  :src="avatarUrl"
                  :alt="authStore.user.nickname"
                  @error="avatarLoadFailed = true"
                />
                <span v-else>{{ nicknameInitial }}</span>
              </div>
              <div class="profile-modal__info">
                <p class="profile-modal__name">{{ authStore.user.nickname }}</p>
                <p class="profile-modal__hint">
                  {{ authStore.user.email || t("auth.loggedInVia", { provider: providerLabel }) }}
                </p>
              </div>
            </div>

            <dl class="profile-modal__meta">
              <div class="profile-modal__meta-row">
                <dt>{{ t("auth.userProfile.accountIdLabel") }}</dt>
                <dd>{{ accountId }}</dd>
              </div>
              <div class="profile-modal__meta-row">
                <dt>{{ t("auth.userProfile.emailLabel") }}</dt>
                <dd>{{ accountEmail }}</dd>
              </div>
              <div class="profile-modal__meta-row">
                <dt>{{ t("auth.userProfile.providerLabel") }}</dt>
                <dd>{{ providerLabel }}</dd>
              </div>
              <div class="profile-modal__meta-row">
                <dt>{{ t("auth.userProfile.membershipLabel") }}</dt>
                <dd>{{ membershipLabel }}</dd>
              </div>
              <div v-if="authStore.membership?.isActive" class="profile-modal__meta-row">
                <dt>{{ t("auth.userProfile.expiryLabel") }}</dt>
                <dd>{{ expiryText }}</dd>
              </div>
            </dl>

          </div>

          <footer class="profile-modal__footer">
            <button
              type="button"
              class="profile-modal__btn profile-modal__btn--secondary"
              @click="onManageAccount"
            >
              <User :size="16" aria-hidden="true" />
              {{ t("auth.userProfile.manageAccount") }}
            </button>
            <button
              type="button"
              class="profile-modal__btn profile-modal__btn--danger"
              @click="onLogout"
            >
              <LogOut :size="16" aria-hidden="true" />
              {{ t("auth.logout") }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.profile-modal__overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.45);
}

.profile-modal__panel {
  width: min(100%, 400px);
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #eef0f4;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
  outline: none;
}

.profile-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid #eef0f4;
}

.profile-modal__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.profile-modal__icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 200ms ease, color 200ms ease;
}

.profile-modal__icon-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.profile-modal__icon-btn:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

.profile-modal__body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-modal__user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-modal__avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(145deg, #eef2ff 0%, #e0e7ff 55%, #c7d2fe 100%);
  border: 1px solid #e0e7ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #4338ca;
  flex-shrink: 0;
  overflow: hidden;
}

.profile-modal__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.profile-modal__info {
  min-width: 0;
  flex: 1;
}

.profile-modal__name {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-modal__hint {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.profile-modal__meta {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f5f6fa;
  border: 1px solid #eef0f4;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-modal__meta-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.profile-modal__meta-row dt {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
  flex-shrink: 0;
}

.profile-modal__meta-row dd {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  text-align: right;
  min-width: 0;
  overflow-wrap: anywhere;
}

.profile-modal__footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 18px 18px;
}

.profile-modal__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  width: 100%;
  border-radius: 999px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 200ms ease, color 200ms ease, filter 200ms ease;
}

.profile-modal__btn--secondary {
  color: #475569;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

.profile-modal__btn--secondary:hover {
  background: #f8fafc;
}

.profile-modal__btn--danger {
  color: #ffffff;
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
}

.profile-modal__btn--danger:hover {
  filter: brightness(1.04);
}

.profile-modal__btn:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

.profile-modal-enter-active,
.profile-modal-leave-active {
  transition: opacity 200ms ease;
}

.profile-modal-enter-active .profile-modal__panel,
.profile-modal-leave-active .profile-modal__panel {
  transition: transform 200ms ease, opacity 200ms ease;
}

.profile-modal-enter-from,
.profile-modal-leave-to {
  opacity: 0;
}

.profile-modal-enter-from .profile-modal__panel,
.profile-modal-leave-to .profile-modal__panel {
  transform: translateY(8px);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .profile-modal-enter-active,
  .profile-modal-leave-active,
  .profile-modal-enter-active .profile-modal__panel,
  .profile-modal-leave-active .profile-modal__panel {
    transition-duration: 0.01ms !important;
    transition-property: opacity !important;
  }

  .profile-modal-enter-from .profile-modal__panel,
  .profile-modal-leave-to .profile-modal__panel {
    transform: none !important;
  }
}
</style>
