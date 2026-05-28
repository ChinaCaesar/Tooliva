<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { Crown, X } from "@lucide/vue";
import { useEntitlementUpgradeDialogStore } from "@/stores/entitlement-upgrade-dialog.store";

const dialogStore = useEntitlementUpgradeDialogStore();
const panelRef = ref<HTMLElement | null>(null);

function closeOnOverlay(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    dialogStore.cancel();
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && dialogStore.open) {
    dialogStore.cancel();
  }
}

watch(
  () => dialogStore.open,
  (open) => {
    if (!open) return;
    globalThis.requestAnimationFrame(() => {
      panelRef.value?.focus();
    });
  }
);

onMounted(() => {
  globalThis.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  globalThis.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="upgrade-modal">
      <div
        v-if="dialogStore.open"
        class="upgrade-modal__overlay"
        role="presentation"
        @click="closeOnOverlay"
      >
        <div
          ref="panelRef"
          class="upgrade-modal__panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="'entitlement-upgrade-title'"
          tabindex="-1"
          @click.stop
        >
          <header class="upgrade-modal__header">
            <div class="upgrade-modal__title-wrap">
              <span class="upgrade-modal__icon" aria-hidden="true">
                <Crown :size="16" />
              </span>
              <h2 id="entitlement-upgrade-title" class="upgrade-modal__title">
                {{ dialogStore.title }}
              </h2>
            </div>
            <button type="button" class="upgrade-modal__icon-btn" @click="dialogStore.cancel">
              <X :size="16" aria-hidden="true" />
            </button>
          </header>
          <div class="upgrade-modal__body">
            <p class="upgrade-modal__message">{{ dialogStore.message }}</p>
          </div>
          <footer class="upgrade-modal__footer">
            <button
              type="button"
              class="upgrade-modal__btn upgrade-modal__btn--secondary"
              @click="dialogStore.cancel"
            >
              {{ dialogStore.cancelLabel }}
            </button>
            <button
              type="button"
              class="upgrade-modal__btn upgrade-modal__btn--primary"
              @click="dialogStore.confirm"
            >
              {{ dialogStore.confirmLabel }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.upgrade-modal__overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.45);
}

.upgrade-modal__panel {
  width: min(100%, 420px);
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #eef0f4;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
  outline: none;
}

.upgrade-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid #eef0f4;
}

.upgrade-modal__title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.upgrade-modal__icon {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #f59e0b;
  background: #fff7ed;
  border: 1px solid #fed7aa;
}

.upgrade-modal__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.upgrade-modal__icon-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  color: #6b7280;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.upgrade-modal__icon-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.upgrade-modal__icon-btn:focus-visible,
.upgrade-modal__btn:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

.upgrade-modal__body {
  padding: 16px 18px 8px;
}

.upgrade-modal__message {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #4b5563;
}

.upgrade-modal__footer {
  padding: 14px 18px 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.upgrade-modal__btn {
  min-width: 104px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.upgrade-modal__btn--secondary {
  color: #4b5563;
  background: #ffffff;
  border-color: #e5e7eb;
}

.upgrade-modal__btn--secondary:hover {
  background: #f8fafc;
}

.upgrade-modal__btn--primary {
  color: #ffffff;
  background: linear-gradient(135deg, #fbb054 0%, #f78c2c 100%);
  box-shadow: 0 4px 12px rgba(243, 132, 30, 0.25);
}

.upgrade-modal__btn--primary:hover {
  filter: brightness(1.03);
}

.upgrade-modal-enter-active,
.upgrade-modal-leave-active {
  transition: opacity 200ms ease;
}

.upgrade-modal-enter-active .upgrade-modal__panel,
.upgrade-modal-leave-active .upgrade-modal__panel {
  transition: transform 200ms ease, opacity 200ms ease;
}

.upgrade-modal-enter-from,
.upgrade-modal-leave-to {
  opacity: 0;
}

.upgrade-modal-enter-from .upgrade-modal__panel,
.upgrade-modal-leave-to .upgrade-modal__panel {
  transform: translateY(8px);
  opacity: 0;
}
</style>
