<script setup lang="ts">
import { computed } from "vue";
import type { ThemeMode } from "@/types/settings";

const props = defineProps<{
  modelValue: ThemeMode;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ThemeMode];
}>();

const options = computed(() =>
  (
    [
      { value: "system" as const, labelKey: "pages.settings.dashboard.themeFollowSystem" },
      { value: "light" as const, labelKey: "pages.settings.dashboard.themeLight" },
      { value: "dark" as const, labelKey: "pages.settings.dashboard.themeDark" }
    ] as const
).map((o) => ({ ...o }))
);

function select(v: ThemeMode): void {
  emit("update:modelValue", v);
}
</script>

<template>
  <div class="theme-seg" role="radiogroup">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="theme-seg__btn"
      :class="{ 'theme-seg__btn--active': props.modelValue === opt.value }"
      role="radio"
      :aria-checked="props.modelValue === opt.value"
      @click="select(opt.value)"
    >
      {{ $t(opt.labelKey) }}
    </button>
  </div>
</template>

<style scoped>
.theme-seg {
  display: inline-flex;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  background: #f9fafb;
}
.theme-seg__btn {
  border: none;
  background: transparent;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  min-width: 72px;
}
.theme-seg__btn:hover {
  background: rgba(37, 99, 235, 0.06);
  color: #1d4ed8;
}
.theme-seg__btn--active {
  background: #ffffff;
  color: #1d4ed8;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.2);
}
.theme-seg__btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  z-index: 1;
}
</style>
