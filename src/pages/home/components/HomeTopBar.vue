<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { isTauri } from "@tauri-apps/api/core";
import { ROUTE_PATHS } from "@/config/constants";
import { closeWindow, minimizeWindow, toggleMaximizeWindow } from "@/utils/windowControl";

interface SearchToolItem {
  id: string;
  title: string;
  route: string;
}

const props = withDefaults(
  defineProps<{
    logoUrl: string;
    appName: string;
    tagline: string;
    searchPlaceholder: string;
    searchShortcutLabel: string;
    settingsAriaLabel: string;
    memberCtaLabel: string;
    crownIconUrl: string;
    searchTools: SearchToolItem[];
    /** 是否在顶栏右侧展示窗口控制（Tauri 桌面端）。 */
    showWindowControls?: boolean;
    isLoggedIn?: boolean;
    nicknameInitial?: string;
    userAvatarUrl?: string;
    userAvatarAriaLabel?: string;
    loginInProgress?: boolean;
  }>(),
  {
    showWindowControls: false,
    isLoggedIn: false,
    nicknameInitial: "",
    userAvatarUrl: "",
    userAvatarAriaLabel: "",
    loginInProgress: false,
  }
);

const emit = defineEmits<{
  searchSelect: [route: string];
  memberCta: [];
  userClick: [];
}>();

const { t } = useI18n();
const router = useRouter();
const searchKeyword = ref("");
const isSearchFocused = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);
const avatarLoadFailed = ref(false);

const resolvedAvatarUrl = computed(() => {
  if (!props.isLoggedIn || avatarLoadFailed.value) return "";
  return props.userAvatarUrl.trim();
});

watch(
  () => [props.userAvatarUrl, props.isLoggedIn],
  () => {
    avatarLoadFailed.value = false;
  }
);

const filteredTools = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return props.searchTools.slice(0, 6);
  }
  return props.searchTools.filter((item) => item.title.toLowerCase().includes(keyword)).slice(0, 6);
});

const shouldShowSearchResults = computed(
  () => isSearchFocused.value && searchKeyword.value.trim().length > 0 && filteredTools.value.length > 0
);

function goToSettingsPage(): void {
  router.push(ROUTE_PATHS.settings);
}

function handleSelectTool(route: string): void {
  searchKeyword.value = "";
  isSearchFocused.value = false;
  emit("searchSelect", route);
}

function handleSearchBlur(): void {
  globalThis.setTimeout(() => {
    isSearchFocused.value = false;
  }, 120);
}

function focusSearch(): void {
  searchInputRef.value?.focus();
}

function onGlobalKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
    e.preventDefault();
    focusSearch();
  }
}

onMounted(() => {
  globalThis.addEventListener("keydown", onGlobalKeydown);
});

onUnmounted(() => {
  globalThis.removeEventListener("keydown", onGlobalKeydown);
});
</script>

<template>
  <header class="home-top-bar" data-tauri-drag-region="deep">
    <div class="home-top-bar__brand">
      <div class="home-top-bar__logo-wrap">
        <img :src="logoUrl" alt="" class="home-top-bar__logo" />
      </div>
      <div class="home-top-bar__titles">
        <strong class="home-top-bar__app-name">{{ appName }}</strong>
        <span class="home-top-bar__tagline">{{ tagline }}</span>
      </div>
    </div>

    <div class="home-top-bar__search-wrap" data-tauri-drag-region="false">
      <div class="home-top-bar__search" :class="{ 'is-focused': isSearchFocused }">
        <svg class="home-top-bar__search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <input
          ref="searchInputRef"
          v-model="searchKeyword"
          type="search"
          class="home-top-bar__search-input"
          :placeholder="searchPlaceholder"
          autocomplete="off"
          @focus="isSearchFocused = true"
          @blur="handleSearchBlur"
        />
        <kbd class="home-top-bar__kbd" aria-hidden="true">{{ searchShortcutLabel }}</kbd>
      </div>
      <div v-if="shouldShowSearchResults" class="home-top-bar__search-results">
        <button
          v-for="item in filteredTools"
          :key="item.id"
          type="button"
          class="home-top-bar__search-result"
          @mousedown.prevent="handleSelectTool(item.route)"
        >
          {{ item.title }}
        </button>
      </div>
    </div>

    <div class="home-top-bar__actions" data-tauri-drag-region="false">
      <button type="button" class="home-top-bar__member" @click="emit('memberCta')">
        <img :src="crownIconUrl" alt="" class="home-top-bar__crown" />
        <span>{{ memberCtaLabel }}</span>
      </button>
      <button
        type="button"
        class="home-top-bar__avatar-btn"
        :class="{
          'home-top-bar__avatar-btn--logged-in': props.isLoggedIn,
          'home-top-bar__avatar-btn--loading': props.loginInProgress,
        }"
        :aria-label="props.userAvatarAriaLabel"
        :disabled="props.loginInProgress"
        @click="emit('userClick')"
      >
        <span v-if="props.loginInProgress" class="home-top-bar__avatar-spinner" aria-hidden="true" />
        <img
          v-else-if="resolvedAvatarUrl"
          :src="resolvedAvatarUrl"
          alt=""
          class="home-top-bar__avatar-image"
          aria-hidden="true"
          @error="avatarLoadFailed = true"
        />
        <span
          v-else-if="props.isLoggedIn && props.nicknameInitial"
          class="home-top-bar__avatar-initial"
          aria-hidden="true"
        >
          {{ props.nicknameInitial }}
        </span>
        <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true" class="home-top-bar__avatar-icon">
          <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.7" />
          <path
            d="M5 20c0-3.314 3.134-6 7-6s7 2.686 7 6"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <button
        type="button"
        class="home-top-bar__icon-btn"
        :aria-label="settingsAriaLabel"
        @click="goToSettingsPage"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            stroke="currentColor"
            stroke-width="1.7"
          />
          <path
            d="M19.4 13.6a7.7 7.7 0 0 0 .1-1.6 7.7 7.7 0 0 0-.1-1.6l2.1-1.6-2-3.4-2.4 1a7.7 7.7 0 0 0-2.8-1.6L13.9 2H10.1l-.4 2.8a7.7 7.7 0 0 0-2.8 1.6l-2.4-1-2 3.4 2.1 1.6a7.7 7.7 0 0 0 0 3.2L2.5 15.2l2 3.4 2.4-1a7.7 7.7 0 0 0 2.8 1.6l.4 2.8h3.8l.4-2.8a7.7 7.7 0 0 0 2.8-1.6l2.4 1 2-3.4-2.1-1.6Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <div
        v-if="props.showWindowControls && isTauri()"
        class="home-top-bar__window-ctrl"
        role="group"
        :aria-label="t('layout.appShell.windowControlsAria')"
      >
        <button
          type="button"
          class="home-top-bar__icon-btn home-top-bar__win-btn"
          :aria-label="t('layout.appShell.minimizeAria')"
          @click="minimizeWindow()"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
        <button
          type="button"
          class="home-top-bar__icon-btn home-top-bar__win-btn"
          :aria-label="t('layout.appShell.maximizeAria')"
          @click="toggleMaximizeWindow()"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="5.5" y="5.5" width="13" height="13" rx="1.5" stroke="currentColor" stroke-width="1.6" />
          </svg>
        </button>
        <button
          type="button"
          class="home-top-bar__icon-btn home-top-bar__win-btn home-top-bar__win-btn--close"
          :aria-label="t('layout.appShell.closeAria')"
          @click="closeWindow()"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.home-top-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  background: #ffffff;
  border-bottom: 1px solid #eef0f4;
  position: relative;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
  z-index: 80;
  flex-wrap: nowrap;
}

.home-top-bar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-width: 180px;
}
.home-top-bar__logo-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.home-top-bar__logo {
  width: 38px;
  height: 38px;
  object-fit: contain;
  border-radius: 8px;
}
.home-top-bar__titles {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  line-height: 1.2;
}
.home-top-bar__app-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  letter-spacing: 0;
}
.home-top-bar__tagline {
  font-size: 11px;
  color: #9ca3af;
  letter-spacing: 0.2px;
}

.home-top-bar__search-wrap {
  position: relative;
  flex: 1;
  max-width: 560px;
  min-width: 0;
  margin: 0 auto;
}
.home-top-bar__search {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 0 12px 0 14px;
  border-radius: 999px;
  background: #f5f6fa;
  border: 1px solid transparent;
  transition: border-color 180ms ease, background 180ms ease;
}
.home-top-bar__search.is-focused {
  background: #ffffff;
  border-color: #c7d2fe;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.home-top-bar__search-icon {
  width: 16px;
  height: 16px;
  color: #9ca3af;
  flex-shrink: 0;
}
.home-top-bar__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: #1f2937;
  font-size: 13px;
  line-height: 20px;
  outline: none;
  padding: 0;
}
.home-top-bar__search-input::-webkit-search-cancel-button {
  appearance: none;
}
.home-top-bar__search-input::placeholder {
  color: #b3b8c2;
}
.home-top-bar__kbd {
  flex-shrink: 0;
  font-size: 11px;
  line-height: 1;
  padding: 3px 7px;
  border-radius: 5px;
  background: #ffffff;
  color: #9ca3af;
  border: 1px solid #e7e9ee;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  letter-spacing: 0.5px;
}

.home-top-bar__search-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  border: 1px solid #eef0f4;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  z-index: 90;
  padding: 6px;
}
.home-top-bar__search-result {
  width: 100%;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #1f2937;
  text-align: left;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 160ms ease;
}
.home-top-bar__search-result:hover {
  background: #f5f6fa;
}

.home-top-bar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.home-top-bar__member {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 999px;
  padding: 8px 18px 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  background: linear-gradient(135deg, #fbb054 0%, #f78c2c 100%);
  box-shadow: 0 4px 12px rgba(243, 132, 30, 0.25);
  white-space: nowrap;
  transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
  height: 36px;
}
.home-top-bar__member:hover {
  filter: brightness(1.04);
  box-shadow: 0 6px 16px rgba(243, 132, 30, 0.32);
}
.home-top-bar__member:active {
  transform: translateY(1px);
}
.home-top-bar__member:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}
.home-top-bar__crown {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.home-top-bar__avatar-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #e7e9ee;
  background: #f5f6fa;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  flex-shrink: 0;
  transition:
    background-color 200ms ease,
    border-color 200ms ease,
    color 200ms ease;
}

.home-top-bar__avatar-btn:hover:not(:disabled) {
  background: #eef2ff;
  border-color: #c7d2fe;
  color: #4338ca;
}

.home-top-bar__avatar-btn:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

.home-top-bar__avatar-btn:disabled {
  cursor: default;
  opacity: 0.75;
}

.home-top-bar__avatar-btn--logged-in {
  background: linear-gradient(145deg, #eef2ff 0%, #e0e7ff 55%, #c7d2fe 100%);
  border-color: #e0e7ff;
  color: #4338ca;
}

.home-top-bar__avatar-icon {
  width: 18px;
  height: 18px;
}

.home-top-bar__avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.home-top-bar__avatar-initial {
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.home-top-bar__avatar-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #c7d2fe;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: home-top-bar-spin 0.7s linear infinite;
}

@keyframes home-top-bar-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-top-bar__avatar-spinner {
    animation: none;
    border-top-color: #6366f1;
  }
}

.home-top-bar__icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  transition: background-color 160ms ease, color 160ms ease;
}
.home-top-bar__icon-btn svg {
  width: 18px;
  height: 18px;
}
.home-top-bar__icon-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}
.home-top-bar__icon-btn:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

.home-top-bar__window-ctrl {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 2px;
  padding-left: 6px;
  border-left: 1px solid #eef0f4;
}
.home-top-bar__win-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px;
}
.home-top-bar__win-btn svg {
  width: 14px;
  height: 14px;
}
.home-top-bar__win-btn--close:hover {
  background: #fee2e2;
  color: #dc2626;
}

@media (max-width: 960px) {
  .home-top-bar__tagline {
    display: none;
  }
  .home-top-bar__brand {
    min-width: auto;
  }
}
@media (max-width: 720px) {
  .home-top-bar__member span {
    display: none;
  }
  .home-top-bar__member {
    padding: 8px 12px;
  }
}
</style>
