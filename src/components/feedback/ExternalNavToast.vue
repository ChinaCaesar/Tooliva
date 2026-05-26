<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useExternalNavStore } from "@/stores/externalNav.store";

const externalNavStore = useExternalNavStore();
const { visible, message } = storeToRefs(externalNavStore);
</script>

<template>
  <Teleport to="body">
    <Transition name="ext-nav-toast">
      <output
        v-if="visible"
        class="ext-nav-toast"
        aria-live="polite"
      >
        <span class="ext-nav-toast__dot" aria-hidden="true"></span>
        <span class="ext-nav-toast__text">{{ message }}</span>
      </output>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ext-nav-toast {
  position: fixed;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  z-index: 200;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.86);
  color: #ffffff;
  font-size: 13px;
  line-height: 1.4;
  letter-spacing: 0;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
  pointer-events: none;
  max-width: min(90vw, 320px);
  text-align: center;
}

.ext-nav-toast__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.24);
  animation: ext-nav-toast-pulse 1.2s ease-in-out infinite;
}

@keyframes ext-nav-toast-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.55;
    transform: scale(0.85);
  }
}

.ext-nav-toast__text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ext-nav-toast-enter-active,
.ext-nav-toast-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.33, 1, 0.68, 1);
}
.ext-nav-toast-enter-from,
.ext-nav-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

@media (prefers-reduced-motion: reduce) {
  .ext-nav-toast-enter-active,
  .ext-nav-toast-leave-active {
    transition-duration: 0.01ms !important;
    transition-property: opacity !important;
  }
  .ext-nav-toast-enter-from,
  .ext-nav-toast-leave-to {
    transform: translateX(-50%) !important;
  }
  .ext-nav-toast__dot {
    animation: none;
  }
}
</style>
