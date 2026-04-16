<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNotificationStore } from "@/stores/notification.store";

const notificationStore = useNotificationStore();
const { items } = storeToRefs(notificationStore);

/**
 * 关闭单条通知，允许用户提前收起提示。
 */
function closeNotification(notificationId: string): void {
  notificationStore.removeNotification(notificationId);
}
</script>

<template>
  <Teleport to="body">
    <div class="notification-layer" aria-live="polite" aria-atomic="true">
      <TransitionGroup name="notification">
        <article
          v-for="item in items"
          :key="item.id"
          class="notification-card"
          :class="`notification-card--${item.tone}`"
        >
          <div class="notification-card__body">
            <strong class="notification-card__title">{{ item.title }}</strong>
            <p class="notification-card__message">{{ item.message }}</p>
            <div v-if="item.highlights.length > 0" class="notification-card__highlights">
              <span
                v-for="highlight in item.highlights"
                :key="highlight.id"
                class="notification-highlight"
                :class="`notification-highlight--${highlight.tone || item.tone}`"
              >
                <span class="notification-highlight__label">{{ highlight.label }}</span>
                <strong class="notification-highlight__value">{{ highlight.value }}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            class="notification-card__close"
            aria-label="Close notification"
            @click="closeNotification(item.id)"
          >
            ×
          </button>
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.notification-layer {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}

.notification-card {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(14px);
  padding: 14px 14px 12px;
}

.notification-card--success {
  border-color: #bbf7d0;
}

.notification-card--warning {
  border-color: #fed7aa;
}

.notification-card--error {
  border-color: #fecaca;
}

.notification-card--info {
  border-color: #bfdbfe;
}

.notification-card__body {
  min-width: 0;
  flex: 1;
}

.notification-card__title {
  display: block;
  color: #0f172a;
  font-size: 14px;
  line-height: 20px;
}

.notification-card__message {
  margin: 6px 0 0;
  color: #334155;
  font-size: 13px;
  line-height: 20px;
  word-break: break-word;
}

.notification-card__highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.notification-highlight {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.notification-highlight__label {
  color: #64748b;
  font-size: 12px;
  line-height: 16px;
}

.notification-highlight__value {
  font-size: 12px;
  line-height: 16px;
}

.notification-highlight--success {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.notification-highlight--success .notification-highlight__value {
  color: #166534;
}

.notification-highlight--warning {
  border-color: #fed7aa;
  background: #fff7ed;
}

.notification-highlight--warning .notification-highlight__value {
  color: #c2410c;
}

.notification-highlight--error {
  border-color: #fecaca;
  background: #fef2f2;
}

.notification-highlight--error .notification-highlight__value {
  color: #b91c1c;
}

.notification-highlight--info {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.notification-highlight--info .notification-highlight__value {
  color: #1d4ed8;
}

.notification-card__close {
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 20px;
  line-height: 20px;
  padding: 0;
}

.notification-card__close:hover {
  color: #0f172a;
}

.notification-card__close:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
  border-radius: 6px;
}

.notification-enter-active,
.notification-leave-active {
  transition: all 220ms ease;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 768px) {
  .notification-layer {
    top: 12px;
    right: 12px;
    width: min(360px, calc(100vw - 24px));
  }
}
</style>
