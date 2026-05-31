<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{
  message?: string;
  title?: string;
  inline?: boolean;
}>();

const { t } = useI18n();
</script>

<template>
  <div
    :class="inline ? 'ai-runtime-loading ai-runtime-loading--inline' : 'ai-runtime-loading'"
    role="status"
    aria-live="polite"
  >
    <div class="ai-runtime-loading__panel">
      <span class="ai-runtime-loading__spinner" aria-hidden="true" />
      <strong v-if="title" class="ai-runtime-loading__title">{{ title }}</strong>
      <span v-if="message" class="ai-runtime-loading__message">{{ message }}</span>
      <span class="ai-runtime-loading__hint">{{ t("aiEnhancement.overlay.patienceHint") }}</span>
    </div>
  </div>
</template>

<style scoped>
.ai-runtime-loading {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(3px);
}

.ai-runtime-loading--inline {
  position: static;
  inset: auto;
  z-index: auto;
  padding: 0;
  background: transparent;
  backdrop-filter: none;
  justify-content: flex-start;
}

.ai-runtime-loading__panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: min(560px, calc(100vw - 48px));
  padding: 18px;
  border-radius: 10px;
  border: 1px solid var(--border, #eef0f4);
  background: #fff;
  box-shadow: 0 18px 48px rgba(16, 25, 54, 0.18);
}

.ai-runtime-loading--inline .ai-runtime-loading__panel {
  width: 100%;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.ai-runtime-loading__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e7e9ee;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: ai-runtime-loading-spin 0.75s linear infinite;
}

.ai-runtime-loading--inline .ai-runtime-loading__spinner {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.ai-runtime-loading__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #1f2937);
}

.ai-runtime-loading__message {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary, #4b5563);
}

.ai-runtime-loading__hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted, #9ca3af);
}

@keyframes ai-runtime-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ai-runtime-loading__spinner {
    animation: none;
    border-top-color: #6366f1;
  }
}
</style>
