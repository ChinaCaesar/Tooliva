<script setup lang="ts">
import { useRouter } from "vue-router";
import { ROUTE_PATHS } from "@/config/constants";

defineProps<{
  logoUrl: string;
  appName: string;
  searchIconUrl: string;
  searchPlaceholder: string;
  avatarUrl: string;
  userName: string;
  userRole: string;
  settingsIconUrl: string;
}>();

const router = useRouter();

/**
 * 跳转到会员页面，后续可在此增加埋点上报。
 */
function goToMembershipPage(): void {
  router.push(ROUTE_PATHS.membership);
}

/**
 * 跳转到设置页面，后续可在此增加权限校验。
 */
function goToSettingsPage(): void {
  router.push(ROUTE_PATHS.settings);
}
</script>

<template>
  <header class="home-top-bar">
    <div class="home-top-bar__brand">
      <div class="home-top-bar__logo-wrap">
        <img :src="logoUrl" alt="" class="home-top-bar__logo" />
      </div>
      <strong class="home-top-bar__app-name">{{ appName }}</strong>
    </div>

    <div class="home-top-bar__search">
      <img :src="searchIconUrl" alt="" class="home-top-bar__search-icon" />
      <span class="home-top-bar__search-placeholder">{{ searchPlaceholder }}</span>
    </div>

    <div class="home-top-bar__user">
      <button type="button" class="home-top-bar__user-entry" @click="goToMembershipPage">
        <img :src="avatarUrl" alt="" class="home-top-bar__avatar" />
        <div class="home-top-bar__user-info">
          <div class="home-top-bar__user-name">{{ userName }}</div>
          <div class="home-top-bar__user-role">{{ userRole }}</div>
        </div>
      </button>
      <button type="button" class="home-top-bar__setting-btn" @click="goToSettingsPage">
        <img :src="settingsIconUrl" alt="" class="home-top-bar__setting-icon" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.home-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}
.home-top-bar__brand { display: flex; align-items: center; gap: 12px; }
.home-top-bar__logo-wrap {
  width: 40px; height: 40px; border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6 15%, #1e40af 85%);
  display: flex; align-items: center; justify-content: center;
}
.home-top-bar__logo { width: 24px; height: 24px; }
.home-top-bar__app-name { font-size: 24px; color: #111827; }
.home-top-bar__search {
  flex: 1; max-width: 400px; min-width: 220px;
  border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;
  display: flex; align-items: center; gap: 12px; padding: 11px 16px;
}
.home-top-bar__search-icon { width: 20px; height: 20px; }
.home-top-bar__search-placeholder { color: #9ca3af; }
.home-top-bar__user { display: flex; align-items: center; gap: 12px; }
.home-top-bar__user-entry {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}
.home-top-bar__avatar { width: 44px; height: 44px; }
.home-top-bar__user-info { text-align: left; }
.home-top-bar__user-name { color: #111827; font-weight: 500; line-height: 20px; }
.home-top-bar__user-role { color: #6b7280; font-size: 12px; line-height: 16px; }
.home-top-bar__setting-btn {
  width: 40px; height: 40px; border-radius: 8px; border: 1px solid #e5e7eb;
  background: #f9fafb; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
}
.home-top-bar__setting-icon { width: 20px; height: 20px; }
</style>
