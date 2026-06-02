<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { resolveMembershipTierLabel } from '@/auth/membership';
import { useAuthStore } from '@/stores/auth.store';

const emit = defineEmits<{
  login: [];
  logout: [];
  openProfile: [];
}>();

const { t } = useI18n();
const authStore = useAuthStore();
const avatarLoadFailed = ref(false);
const avatarUrl = computed(() => (avatarLoadFailed.value ? '' : (authStore.user?.avatar ?? '')));

watch(
  () => authStore.user?.avatar,
  () => {
    avatarLoadFailed.value = false;
  },
);

const providerLabel = computed(() => {
  const provider = authStore.user?.provider;
  if (!provider) return '';
  const key = `auth.provider.${provider.toLowerCase()}` as const;
  return t(key);
});

const membershipLabel = computed(() =>
  resolveMembershipTierLabel(authStore.membership, t)
);

const expiryText = computed(() => {
  const expiresAt = authStore.membership?.expiresAt;
  if (!expiresAt) {
    return t('auth.membership.noExpiry');
  }
  return t('auth.membership.expiresAt', {
    date: new Date(expiresAt).toLocaleDateString(),
  });
});
</script>

<template>
  <section class="m-user" aria-label="membership-user">
    <template v-if="authStore.isLoggedIn && authStore.user">
      <button type="button" class="m-user__row m-user__row--clickable" @click="emit('openProfile')">
        <div class="m-user__avatar m-user__avatar--logged-in" aria-hidden="true">
          <img
            v-if="avatarUrl"
            class="m-user__avatar-img"
            :src="avatarUrl"
            :alt="authStore.user.nickname"
            @error="avatarLoadFailed = true"
          />
          <span v-else>{{ authStore.user.nickname.slice(0, 1) }}</span>
        </div>
        <div class="m-user__copy">
          <p class="m-user__title">{{ authStore.user.nickname }}</p>
          <p class="m-user__hint">
            {{ t('auth.loggedInVia', { provider: providerLabel }) }}
          </p>
          <p class="m-user__meta">
            {{ membershipLabel }}
            <span v-if="authStore.membership?.isActive"> · {{ expiryText }}</span>
          </p>
        </div>
      </button>
      <button type="button" class="m-user__btn m-user__btn--secondary" @click="emit('logout')">
        {{ t('auth.logout') }}
      </button>
    </template>

    <template v-else>
      <div class="m-user__row">
        <div class="m-user__avatar" aria-hidden="true" />
        <div class="m-user__copy">
          <p class="m-user__title">{{ t('pages.membership.userCard.notLoggedIn') }}</p>
          <p class="m-user__hint">{{ t('pages.membership.userCard.syncHint') }}</p>
        </div>
      </div>
      <button type="button" class="m-user__btn" @click="emit('login')">
        {{ t('pages.membership.userCard.loginCta') }}
      </button>
    </template>
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
.m-user__row--clickable {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  text-align: left;
  border-radius: 10px;
  transition: background-color 200ms ease;
}
.m-user__row--clickable:hover {
  background: #f5f6fa;
}
.m-user__row--clickable:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}
.m-user__avatar {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(145deg, #eef2ff 0%, #e0e7ff 55%, #c7d2fe 100%);
  border: 1px solid #e0e7ff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
  overflow: hidden;
}
.m-user__avatar--logged-in {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #4338ca;
}
.m-user__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
.m-user__meta {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: #6366f1;
  font-weight: 500;
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
.m-user__btn--secondary {
  color: #475569;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: none;
}
.m-user__btn:hover {
  filter: brightness(1.03);
  box-shadow: 0 6px 14px rgba(243, 132, 30, 0.28);
}
.m-user__btn--secondary:hover {
  background: #f8fafc;
  box-shadow: none;
}
.m-user__btn:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}
</style>
