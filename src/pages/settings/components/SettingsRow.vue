<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    /** 块级布局：右侧控件占满宽度（用于路径行）。 */
    variant?: "default" | "block";
  }>(),
  { variant: "default" }
);
</script>

<template>
  <div class="settings-row" :class="{ 'settings-row--block': props.variant === 'block' }">
    <div class="settings-row__text">
      <h3 class="settings-row__title">{{ title }}</h3>
      <p v-if="description" class="settings-row__desc">{{ description }}</p>
    </div>
    <div class="settings-row__control">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}
.settings-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.settings-row:first-child {
  padding-top: 0;
}
.settings-row__text {
  min-width: 0;
  flex: 1;
}
.settings-row__title {
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  color: #111827;
}
.settings-row__desc {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: #64748b;
}
.settings-row__control {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.settings-row--block {
  flex-direction: column;
  align-items: stretch;
}
.settings-row--block .settings-row__control {
  width: 100%;
  justify-content: flex-end;
}
</style>
