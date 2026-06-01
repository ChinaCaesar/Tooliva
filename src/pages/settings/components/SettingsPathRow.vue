<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { isTauri } from "@tauri-apps/api/core";
import { tauriClient } from "@/bridge/tauriClient";
import { showAppAlert } from "@/utils/appDialog";

const props = withDefaults(
  defineProps<{
    pathValue: string;
    emptyHintKey: string;
    changeLabelKey?: string;
    changeDisabled?: boolean;
    openPath?: string;
    aiOpenTarget?: "runtime" | "models";
    mode?: "default" | "simple";
  }>(),
  {
    changeLabelKey: "pages.settings.actions.change",
    changeDisabled: false,
    openPath: undefined,
    aiOpenTarget: undefined,
    mode: "default"
  }
);

const emit = defineEmits<{
  change: [];
}>();

const { t } = useI18n();

async function onOpen(): Promise<void> {
  if (!isTauri()) {
    await showAppAlert({
      title: t("pages.settings.dashboard.pathHintTitle"),
      message: t("pages.settings.path.webOpenUnavailable")
    });
    return;
  }
  if (props.aiOpenTarget) {
    try {
      await tauriClient.openLocalAiRuntimeDirectory(props.aiOpenTarget);
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      await showAppAlert({
        title: t("pages.settings.dashboard.pathHintTitle"),
        message: text
      });
    }
    return;
  }
  const trimmed = (props.openPath ?? props.pathValue).trim();
  if (!trimmed) {
    await showAppAlert({
      title: t("pages.settings.dashboard.pathHintTitle"),
      message: t(props.emptyHintKey)
    });
    return;
  }
  try {
    await tauriClient.openDirectoryInFileManager({ directoryPath: trimmed });
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err);
    await showAppAlert({
      title: t("pages.settings.dashboard.pathHintTitle"),
      message: text
    });
  }
}
</script>

<template>
  <div class="path-row" :class="{ 'path-row--simple': mode === 'simple' }">
    <div v-if="mode !== 'simple'" class="path-row__panel">
      <span class="path-row__label">{{ $t("pages.settings.dashboard.openFolder") }}</span>
      <code class="path-row__path">{{ pathValue || $t("pages.settings.dashboard.pathNotSet") }}</code>
    </div>
    <div v-else class="path-row__simple-field">
      <input
        class="path-row__input"
        type="text"
        :value="pathValue || $t('pages.settings.dashboard.pathNotSet')"
        readonly
      />
    </div>
    <div class="path-row__actions">
      <button type="button" class="path-row__btn" :disabled="changeDisabled" @click="emit('change')">
        {{ $t(changeLabelKey) }}
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
  gap: 12px;
  width: 100%;
}
.path-row--simple {
  gap: 10px;
}
.path-row__panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #dbe7ff;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(239, 246, 255, 0.92) 0%, rgba(248, 250, 252, 0.96) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
.path-row__simple-field {
  width: 100%;
}
.path-row__input {
  width: 100%;
  min-height: 40px;
  border: 1px solid #dbe1ea;
  border-radius: 10px;
  background: #f8fafc;
  color: #334155;
  padding: 0 12px;
  font-size: 13px;
  line-height: 40px;
  outline: none;
}
.path-row__label {
  font-size: 11px;
  line-height: 16px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}
.path-row__path {
  display: block;
  font-size: 12px;
  line-height: 20px;
  color: #334155;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(191, 219, 254, 0.95);
  border-radius: 12px;
  padding: 12px 14px;
  word-break: break-all;
  white-space: pre-wrap;
  box-shadow: 0 10px 30px rgba(148, 163, 184, 0.08);
}
.path-row__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
}
.path-row__btn {
  min-height: 34px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 14px;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.path-row__btn--secondary {
  color: #334155;
}
.path-row__btn:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
}
.path-row__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.path-row__btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.path-row--simple .path-row__actions {
  justify-content: flex-end;
}
</style>
