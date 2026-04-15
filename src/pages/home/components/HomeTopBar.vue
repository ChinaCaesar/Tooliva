<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { ROUTE_PATHS } from "@/config/constants";

interface SearchToolItem {
  id: string;
  title: string;
  route: string;
}

const props = defineProps<{
  logoUrl: string;
  appName: string;
  searchIconUrl: string;
  searchPlaceholder: string;
  settingsIconUrl: string;
  searchTools: SearchToolItem[];
}>();

const emit = defineEmits<{
  searchSelect: [route: string];
}>();

const router = useRouter();
const searchKeyword = ref("");
const isSearchFocused = ref(false);

/**
 * 基于关键字执行工具名模糊匹配，返回前 6 条候选结果。
 */
const filteredTools = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return props.searchTools.slice(0, 6);
  }
  return props.searchTools
    .filter((item) => item.title.toLowerCase().includes(keyword))
    .slice(0, 6);
});

/**
 * 控制搜索结果面板展示，避免空数据时出现空白浮层。
 */
const shouldShowSearchResults = computed(() => isSearchFocused.value && filteredTools.value.length > 0);

/**
 * 跳转到设置页面，后续可在此增加权限校验。
 */
function goToSettingsPage(): void {
  router.push(ROUTE_PATHS.settings);
}

/**
 * 选择搜索结果后通知父组件执行页面跳转。
 */
function handleSelectTool(route: string): void {
  searchKeyword.value = "";
  isSearchFocused.value = false;
  emit("searchSelect", route);
}

/**
 * 输入框失焦时延迟关闭，确保点击结果项能够触发。
 */
function handleSearchBlur(): void {
  globalThis.setTimeout(() => {
    isSearchFocused.value = false;
  }, 120);
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

    <div class="home-top-bar__search-wrap">
      <div class="home-top-bar__search">
        <img :src="searchIconUrl" alt="" class="home-top-bar__search-icon" />
        <input
          v-model="searchKeyword"
          type="text"
          class="home-top-bar__search-input"
          :placeholder="searchPlaceholder"
          @focus="isSearchFocused = true"
          @blur="handleSearchBlur"
        />
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

    <button type="button" class="home-top-bar__setting-btn" @click="goToSettingsPage" :aria-label="appName + ' settings'">
      <img :src="settingsIconUrl" alt="" class="home-top-bar__setting-icon" />
    </button>
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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 80;
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
.home-top-bar__search-wrap {
  position: relative;
  flex: 1;
  max-width: 400px;
  min-width: 220px;
}
.home-top-bar__search-input {
  width: 100%;
  border: none;
  background: transparent;
  color: #111827;
  font-size: 14px;
  line-height: 20px;
  outline: none;
}
.home-top-bar__search-input::placeholder { color: #9ca3af; }
.home-top-bar__search-icon { width: 20px; height: 20px; }
.home-top-bar__search-results {
  position: absolute;
  top: calc(100% + 8px);
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
.home-top-bar__search-result:last-child { border-bottom: none; }
.home-top-bar__search-result:hover { background: #f8fafc; }
.home-top-bar__setting-btn {
  width: 40px; height: 40px; border-radius: 8px; border: 1px solid #e5e7eb;
  background: #f9fafb; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
}
.home-top-bar__setting-icon { width: 20px; height: 20px; }
</style>
