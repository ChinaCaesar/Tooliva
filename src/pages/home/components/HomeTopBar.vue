<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { isTauri } from "@tauri-apps/api/core";
import { ROUTE_PATHS } from "@/config/constants";
import { HOME_ASSETS } from "@/pages/home/resources/homeAssets";
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
    searchIconUrl: string;
    searchPlaceholder: string;
    searchShortcutLabel: string;
    settingsIconUrl: string;
    settingsAriaLabel: string;
    memberCtaLabel: string;
    crownIconUrl: string;
    searchTools: SearchToolItem[];
    /** 是否在顶栏右侧展示窗口控制（Tauri 桌面端）。 */
    showWindowControls?: boolean;
  }>(),
  { showWindowControls: false }
);

const emit = defineEmits<{
  searchSelect: [route: string];
  memberCta: [];
}>();

const { t } = useI18n();
const router = useRouter();
const searchKeyword = ref("");
const isSearchFocused = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);

const filteredTools = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return props.searchTools.slice(0, 6);
  }
  return props.searchTools.filter((item) => item.title.toLowerCase().includes(keyword)).slice(0, 6);
});

const shouldShowSearchResults = computed(() => isSearchFocused.value && filteredTools.value.length > 0);

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
      <div class="home-top-bar__search">
        <img :src="searchIconUrl" alt="" class="home-top-bar__search-icon" />
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
          @click="handleSelectTool(item.route)"
        >
          {{ item.title }}
        </button>
      </div>
    </div>

    <div class="home-top-bar__actions" data-tauri-drag-region="false">
      <button type="button" class="home-top-bar__member" @click="emit('memberCta')">
        <img :src="crownIconUrl" alt="" class="home-top-bar__crown" />
        {{ memberCtaLabel }}
      </button>
      <button type="button" class="home-top-bar__setting-btn" @click="goToSettingsPage" :aria-label="settingsAriaLabel">
        <img :src="settingsIconUrl" alt="" class="home-top-bar__setting-icon" />
      </button>
      <div v-if="props.showWindowControls && isTauri()" class="home-top-bar__window-ctrl" role="group" :aria-label="t('layout.appShell.windowControlsAria')">
        <button
          type="button"
          class="home-top-bar__win-btn"
          :aria-label="t('layout.appShell.minimizeAria')"
          @click="minimizeWindow()"
        >
          <img :src="HOME_ASSETS.pubMinimize" alt="" class="home-top-bar__win-icon" />
        </button>
        <button
          type="button"
          class="home-top-bar__win-btn"
          :aria-label="t('layout.appShell.maximizeAria')"
          @click="toggleMaximizeWindow()"
        >
          <img :src="HOME_ASSETS.pubMaximize" alt="" class="home-top-bar__win-icon" />
        </button>
        <button
          type="button"
          class="home-top-bar__win-btn home-top-bar__win-btn--close"
          :aria-label="t('layout.appShell.closeAria')"
          @click="closeWindow()"
        >
          <img :src="HOME_ASSETS.pubClose" alt="" class="home-top-bar__win-icon" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.home-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
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
}
.home-top-bar__logo-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.home-top-bar__logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}
.home-top-bar__titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.home-top-bar__app-name {
  font-size: 18px;
  line-height: 24px;
  color: #111827;
}
.home-top-bar__tagline {
  font-size: 12px;
  line-height: 16px;
  color: #64748b;
}
.home-top-bar__search-wrap {
  position: relative;
  flex: 1;
  max-width: 520px;
  min-width: 0;
}
.home-top-bar__search {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
}
.home-top-bar__search-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.home-top-bar__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: #111827;
  font-size: 13px;
  line-height: 20px;
  outline: none;
}
.home-top-bar__search-input::placeholder {
  color: #9ca3af;
}
.home-top-bar__kbd {
  flex-shrink: 0;
  font-size: 11px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.home-top-bar__search-results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
  overflow: hidden;
  z-index: 90;
}
.home-top-bar__search-result {
  width: 100%;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
  color: #0f172a;
  text-align: left;
  padding: 10px 14px;
  cursor: pointer;
  transition: background-color 200ms ease;
}
.home-top-bar__search-result:last-child {
  border-bottom: none;
}
.home-top-bar__search-result:hover {
  background: #f8fafc;
}
.home-top-bar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.home-top-bar__member {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #78350f;
  cursor: pointer;
  background: linear-gradient(180deg, #fde68a 0%, #fbbf24 100%);
  box-shadow: 0 2px 8px rgba(180, 83, 9, 0.2);
  white-space: nowrap;
}
.home-top-bar__member:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}
.home-top-bar__crown {
  width: 18px;
  height: 18px;
  object-fit: contain;
}
.home-top-bar__setting-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.home-top-bar__setting-btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.home-top-bar__setting-icon {
  width: 18px;
  height: 18px;
}
.home-top-bar__window-ctrl {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
  padding-left: 8px;
  border-left: 1px solid #e5e7eb;
}
.home-top-bar__win-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}
.home-top-bar__win-btn:hover {
  background: #f1f5f9;
}
.home-top-bar__win-btn--close:hover {
  background: #fee2e2;
}
.home-top-bar__win-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
}
</style>
