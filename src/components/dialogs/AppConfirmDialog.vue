<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { AlertCircle, AlertTriangle, X } from "@lucide/vue";
import { useAppConfirmDialogStore } from "@/stores/appConfirmDialog.store";

const dialogStore = useAppConfirmDialogStore();
const panelRef = ref<HTMLElement | null>(null);

function closeOnOverlay(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    dialogStore.close();
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && dialogStore.open) {
    dialogStore.close();
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
    <Transition name="app-confirm-modal">
      <div
        v-if="dialogStore.open"
        class="app-confirm-modal__overlay"
        role="presentation"
        @click="closeOnOverlay"
      >
        <div
          ref="panelRef"
          class="app-confirm-modal__panel"
          :class="[
            `app-confirm-modal__panel--${dialogStore.tone}`,
            { 'app-confirm-modal__panel--alert': dialogStore.mode === 'alert' }
          ]"
          :role="dialogStore.mode === 'confirm' ? 'alertdialog' : 'dialog'"
          aria-modal="true"
          aria-labelledby="app-confirm-modal-title"
          aria-describedby="app-confirm-modal-message"
          tabindex="-1"
          @click.stop
        >
          <header class="app-confirm-modal__header">
            <div class="app-confirm-modal__title-wrap">
              <span class="app-confirm-modal__icon" :class="`app-confirm-modal__icon--${dialogStore.tone}`" aria-hidden="true">
                <AlertTriangle v-if="dialogStore.tone === 'warning'" :size="16" />
                <AlertCircle v-else :size="16" />
              </span>
              <h2 id="app-confirm-modal-title" class="app-confirm-modal__title">
                {{ dialogStore.title }}
              </h2>
            </div>
            <button
              type="button"
              class="app-confirm-modal__icon-btn"
              :aria-label="dialogStore.mode === 'confirm' ? dialogStore.cancelLabel : dialogStore.confirmLabel"
              @click="dialogStore.close"
            >
              <X :size="16" aria-hidden="true" />
            </button>
          </header>

          <div class="app-confirm-modal__body">
            <p id="app-confirm-modal-message" class="app-confirm-modal__message">
              {{ dialogStore.message }}
            </p>
          </div>

          <footer class="app-confirm-modal__footer">
            <button
              v-if="dialogStore.mode === 'confirm'"
              type="button"
              class="app-confirm-modal__btn app-confirm-modal__btn--secondary"
              @click="dialogStore.cancel"
            >
              {{ dialogStore.cancelLabel }}
            </button>
            <button
              type="button"
              class="app-confirm-modal__btn"
              :class="dialogStore.mode === 'confirm' ? 'app-confirm-modal__btn--primary' : 'app-confirm-modal__btn--info'"
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
.app-confirm-modal__overlay {
  position: fixed;
  inset: 0;
  z-index: 140;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background:
    radial-gradient(circle at top, rgba(99, 102, 241, 0.12), transparent 34%),
    rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(10px);
}

.app-confirm-modal__panel {
  width: min(100%, 440px);
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%);
  box-shadow:
    0 22px 44px rgba(15, 23, 42, 0.16),
    0 8px 18px rgba(15, 23, 42, 0.08);
  outline: none;
}

.app-confirm-modal__panel--alert {
  width: min(100%, 420px);
}

.app-confirm-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 14px;
}

.app-confirm-modal__title-wrap {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.app-confirm-modal__icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.app-confirm-modal__icon--warning {
  color: #ea580c;
  background: linear-gradient(135deg, #ffedd5 0%, #fdba74 100%);
  border: 1px solid rgba(251, 146, 60, 0.45);
}

.app-confirm-modal__icon--info {
  color: #1d4ed8;
  background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%);
  border: 1px solid rgba(96, 165, 250, 0.45);
}

.app-confirm-modal__title {
  margin: 0;
  color: #0f172a;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.35;
}

.app-confirm-modal__icon-btn {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: none;
  border-radius: 10px;
  color: #64748b;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.app-confirm-modal__icon-btn:hover {
  background: rgba(148, 163, 184, 0.12);
  color: #0f172a;
}

.app-confirm-modal__icon-btn:active {
  transform: scale(0.96);
}

.app-confirm-modal__icon-btn:focus-visible,
.app-confirm-modal__btn:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

.app-confirm-modal__body {
  padding: 0 20px 12px;
}

.app-confirm-modal__message {
  margin: 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.65;
}

.app-confirm-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px 20px;
}

.app-confirm-modal__btn {
  min-width: 116px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 160ms ease, background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.app-confirm-modal__btn--secondary {
  color: #475569;
  background: rgba(255, 255, 255, 0.96);
  border-color: #dbe3ee;
}

.app-confirm-modal__btn--secondary:hover {
  background: #f8fafc;
  color: #1e293b;
}

.app-confirm-modal__btn--primary {
  color: #ffffff;
  background: linear-gradient(135deg, #fbb054 0%, #f78c2c 100%);
  box-shadow: 0 6px 16px rgba(243, 132, 30, 0.24);
}

.app-confirm-modal__btn--primary:hover {
  filter: brightness(1.03);
}

.app-confirm-modal__btn--info {
  color: #ffffff;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.24);
}

.app-confirm-modal__btn--info:hover {
  filter: brightness(1.03);
}

.app-confirm-modal-enter-active,
.app-confirm-modal-leave-active {
  transition: opacity 180ms ease;
}

.app-confirm-modal-enter-active .app-confirm-modal__panel,
.app-confirm-modal-leave-active .app-confirm-modal__panel {
  transition: transform 180ms ease, opacity 180ms ease;
}

.app-confirm-modal-enter-from,
.app-confirm-modal-leave-to {
  opacity: 0;
}

.app-confirm-modal-enter-from .app-confirm-modal__panel,
.app-confirm-modal-leave-to .app-confirm-modal__panel {
  transform: translateY(10px) scale(0.985);
  opacity: 0;
}

@media (max-width: 640px) {
  .app-confirm-modal__overlay {
    align-items: flex-end;
    padding: 12px;
  }

  .app-confirm-modal__panel {
    width: 100%;
    border-radius: 20px 20px 18px 18px;
  }

  .app-confirm-modal__footer {
    flex-direction: column-reverse;
  }

  .app-confirm-modal__btn {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-confirm-modal-enter-active,
  .app-confirm-modal-leave-active,
  .app-confirm-modal-enter-active .app-confirm-modal__panel,
  .app-confirm-modal-leave-active .app-confirm-modal__panel {
    transition-duration: 0.01ms !important;
    transition-property: opacity !important;
  }

  .app-confirm-modal-enter-from .app-confirm-modal__panel,
  .app-confirm-modal-leave-to .app-confirm-modal__panel {
    transform: none !important;
  }
}
</style>
