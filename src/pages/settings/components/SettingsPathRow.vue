<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { isTauri } from "@tauri-apps/api/core";
import { message } from "@tauri-apps/plugin-dialog";
import { tauriClient } from "@/bridge/tauriClient";

const props = defineProps<{
  pathValue: string;
  emptyHintKey: string;
}>();

const emit = defineEmits<{
  change: [];
}>();

const { t } = useI18n();

async function onOpen(): Promise<void> {
  const trimmed = props.pathValue.trim();
  if (!trimmed) {
    const hint = t(props.emptyHintKey);
    if (isTauri()) await message(hint, { title: t("pages.settings.dashboard.pathHintTitle") });
    else window.alert(hint);
    return;
  }
  if (!isTauri()) {
    window.alert(t("pages.settings.path.webOpenUnavailable"));
    return;
  }
  try {
    await tauriClient.openDirectoryInFileManager({ directoryPath: trimmed });
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err);
    await message(text, { title: t("pages.settings.dashboard.pathHintTitle") });
  }
}
</script>

<template>
  <div class="path-row">
    <code class="path-row__path">{{ pathValue || $t("pages.settings.dashboard.pathNotSet") }}</code>
    <div class="path-row__actions">
      <button type="button" class="path-row__btn" @click="emit('change')">
        {{ $t("pages.settings.actions.change") }}
      </button>
      <button type="button" class="path-row__btn path-row__btn--secondary" @click="onOpen">
        {{ $t("pages.settings.dashboard.openFolder") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.path-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  width: 100%;
}
.path-row__path {
  display: block;
  font-size: 12px;
  line-height: 18px;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  word-break: break-all;
  white-space: pre-wrap;
}
.path-row__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.path-row__btn {
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  cursor: pointer;
}
.path-row__btn--secondary {
  color: #334155;
}
.path-row__btn:hover {
  background: #f8fafc;
}
.path-row__btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
</style>
