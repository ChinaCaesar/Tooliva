<script setup lang="ts">
import { useI18n } from "vue-i18n";

type TopBarVariant = "compact" | "full";
type CompactLeadingIcon = "home" | "back";

const props = withDefaults(
  defineProps<{
    variant?: TopBarVariant;
    compactLeadingIcon?: CompactLeadingIcon;
    showSettingsButton?: boolean;
    titleKey: string;
    searchPlaceholderKey?: string;
    userNameKey?: string;
    userRoleKey?: string;
    settingAriaLabelKey?: string;
  }>(),
  {
    variant: "compact",
    compactLeadingIcon: "home",
    showSettingsButton: true,
    searchPlaceholderKey: "",
    userNameKey: "",
    userRoleKey: "",
    settingAriaLabelKey: "nav.settings"
  }
);

const emit = defineEmits<{
  (event: "back-home"): void;
  (event: "open-settings"): void;
}>();

const { t } = useI18n();
</script>

<template>
  <header class="tool-top-bar" :class="`tool-top-bar--${props.variant}`">
    <button
      v-if="props.variant === 'compact'"
      type="button"
      class="compact-home-entry"
      @click="emit('back-home')"
    >
      <span class="compact-home-entry__icon-wrap" aria-hidden="true">
        <svg viewBox="0 0 24 24" class="compact-home-entry__icon">
          <path
            v-if="props.compactLeadingIcon === 'home'"
            d="M3 11.5L12 4l9 7.5v8a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 13 19.5v-3a1 1 0 0 0-1-1h0a1 1 0 0 0-1 1v3A1.5 1.5 0 0 1 9.5 21h-5A1.5 1.5 0 0 1 3 19.5z"
          />
          <path
            v-else
            d="M10.78 4.97a.75.75 0 0 1 0 1.06L5.81 11h13.44a.75.75 0 0 1 0 1.5H5.81l4.97 4.97a.75.75 0 1 1-1.06 1.06l-6.25-6.25a.75.75 0 0 1 0-1.06l6.25-6.25a.75.75 0 0 1 1.06 0"
          />
        </svg>
      </span>
      <strong class="compact-home-entry__text">{{ t(props.titleKey) }}</strong>
    </button>

    <template v-else>
      <div class="full-brand">
        <div class="full-brand__logo-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" class="full-brand__logo">
            <path
              d="M4 4.75A.75.75 0 0 1 4.75 4h14.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75H4.75A.75.75 0 0 1 4 9.25zM4 14.75a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-6.5a.75.75 0 0 1-.75-.75zM14 14.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75z"
            />
          </svg>
        </div>
        <strong class="full-brand__title">{{ t(props.titleKey) }}</strong>
      </div>

      <div class="full-search">
        <svg viewBox="0 0 24 24" class="full-search__icon" aria-hidden="true">
          <path
            d="M10 3a7 7 0 1 1 4.392 12.45l4.579 4.578a1 1 0 1 1-1.414 1.415l-4.579-4.579A7 7 0 0 1 10 3m0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10"
          />
        </svg>
        <span class="full-search__placeholder">{{ t(props.searchPlaceholderKey) }}</span>
      </div>

      <div class="full-profile">
        <div class="full-profile__avatar" aria-hidden="true"></div>
        <div class="full-profile__text">
          <span class="full-profile__name">{{ t(props.userNameKey) }}</span>
          <span class="full-profile__role">{{ t(props.userRoleKey) }}</span>
        </div>
      </div>
    </template>

    <button
      v-if="props.showSettingsButton"
      type="button"
      class="setting-btn"
      :aria-label="t(props.settingAriaLabelKey)"
      @click="emit('open-settings')"
    >
      <svg viewBox="0 0 24 24" class="setting-btn__icon" aria-hidden="true">
        <path
          d="M10.325 4.317a1.724 1.724 0 0 1 3.35 0l.231 1.02a1.724 1.724 0 0 0 2.591 1.06l.9-.52a1.724 1.724 0 0 1 2.37.632l.105.182a1.724 1.724 0 0 1-.632 2.37l-.9.519a1.724 1.724 0 0 0 0 2.985l.9.52a1.724 1.724 0 0 1 .632 2.37l-.105.182a1.724 1.724 0 0 1-2.37.632l-.9-.52a1.724 1.724 0 0 0-2.591 1.06l-.231 1.02a1.724 1.724 0 0 1-3.35 0l-.231-1.02a1.724 1.724 0 0 0-2.591-1.06l-.9.52a1.724 1.724 0 0 1-2.37-.632l-.105-.182a1.724 1.724 0 0 1 .632-2.37l.9-.52a1.724 1.724 0 0 0 0-2.985l-.9-.52a1.724 1.724 0 0 1-.632-2.37l.105-.181a1.724 1.724 0 0 1 2.37-.633l.9.52a1.724 1.724 0 0 0 2.591-1.06zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"
        />
      </svg>
    </button>
  </header>
</template>

<style scoped>
.tool-top-bar {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 80;
}
.tool-top-bar--compact {
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
}
.tool-top-bar--full {
  gap: 20px;
  padding: 16px 24px;
}
.compact-home-entry {
  border: none;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.compact-home-entry__icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0f766e 15%, #0891b2 85%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.compact-home-entry__icon {
  width: 22px;
  height: 22px;
  fill: #fff;
}
.compact-home-entry__text {
  font-size: 24px;
  line-height: 32px;
  color: #0f172a;
}
.full-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.full-brand__logo-wrap {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6 15%, #1e40af 85%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.full-brand__logo {
  width: 24px;
  height: 24px;
  fill: #fff;
}
.full-brand__title {
  color: #111827;
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
}
.full-search {
  flex: 1;
  max-width: 400px;
  min-width: 220px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
}
.full-search__icon {
  width: 20px;
  height: 20px;
  fill: #9ca3af;
}
.full-search__placeholder {
  color: #9ca3af;
  line-height: 20px;
}
.full-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}
.full-profile__avatar {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: linear-gradient(135deg, #3b82f6 15%, #1e40af 85%);
}
.full-profile__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.full-profile__name {
  color: #111827;
  font-weight: 500;
  line-height: 20px;
}
.full-profile__role {
  color: #6b7280;
  font-size: 12px;
  line-height: 16px;
}
.setting-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  background: #f8fafc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 200ms ease, background-color 200ms ease;
}
.setting-btn:hover {
  border-color: #94a3b8;
  background: #f1f5f9;
}
.setting-btn__icon {
  width: 20px;
  height: 20px;
  fill: #64748b;
}
@media (max-width: 992px) {
  .tool-top-bar--full {
    flex-wrap: wrap;
  }
  .full-search {
    order: 3;
    max-width: none;
    width: 100%;
  }
}
</style>
