<template>
  <AppLayout />
  <AppConfirmDialog />
  <EntitlementUpgradeDialog />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { isTauri } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { APP_DEBUG } from "@/config/constants";
import AppLayout from "@/layouts/AppLayout.vue";
import AppConfirmDialog from "@/components/dialogs/AppConfirmDialog.vue";
import EntitlementUpgradeDialog from "@/components/entitlement/EntitlementUpgradeDialog.vue";
import { startDesktopWindowLifecycle, stopDesktopWindowLifecycle } from "@/services/desktopWindowLifecycle";

async function onKeydown(event: KeyboardEvent): Promise<void> {
  if (!APP_DEBUG || !isTauri() || event.key !== "F12") return;
  event.preventDefault();
  try {
    await invoke("plugin:webview|internal_toggle_devtools", {
      label: getCurrentWebview().label,
    });
  } catch (error) {
    console.warn("[debug] toggle devtools failed", error);
  }
}

onMounted(() => {
  if (isTauri()) {
    void startDesktopWindowLifecycle();
  }
  if (!APP_DEBUG) return;
  globalThis.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  if (isTauri()) {
    void stopDesktopWindowLifecycle();
  }
  if (!APP_DEBUG) return;
  globalThis.removeEventListener("keydown", onKeydown);
});
</script>
