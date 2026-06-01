<script setup lang="ts">

import { useI18n } from "vue-i18n";

import { Info } from "@lucide/vue";

import AiRuntimeInstallLoadingOverlay from "@/components/ai-runtime/AiRuntimeInstallLoadingOverlay.vue";

import { useAiEnhancementGuideNavigate } from "@/modules/ai-runtime/useAiEnhancementGuideNavigate";
import { useAiEnhancementPanel } from "@/modules/ai-runtime/useAiEnhancementPanel";



const { t } = useI18n();
const { openAiEnhancementGuide } = useAiEnhancementGuideNavigate();
const props = withDefaults(
  defineProps<{
    guideEntryId?: string;
  }>(),
  {
    guideEntryId: "ai-enhancement-panel-guide",
  }
);



const emit = defineEmits<{

  synced: [];

}>();



const {

  aiRuntimeStatus,

  aiRuntimeProgress,

  runtimeActionError,

  isImportingAiModel,

  aiRuntimeSimpleStatusText,

  aiRuntimeStatusText,

  aiInstallHint,

  aiRuntimeRequirementsText,

  canShowAiInstallAction,

  isLamaModelReady,

  aiModelStatusText,

  isRuntimeBusy,

  installRuntime,

  importModel

} = useAiEnhancementPanel();



async function handleInstallRuntime() {

  await installRuntime(() => emit("synced"));

}



async function handleImportModel() {

  await importModel(() => emit("synced"));

}

async function handleOpenGuide() {

  await openAiEnhancementGuide(props.guideEntryId);

}

</script>



<template>

  <div class="ai-enhancement-panel">

    <strong class="ai-enhancement-panel__title">{{ t("aiEnhancement.panelTitle") }}</strong>

    <span class="ai-enhancement-panel__runtime-status">{{ aiRuntimeSimpleStatusText }}</span>

    <p

      v-if="canShowAiInstallAction && (aiRuntimeStatus === 'READY_TO_INSTALL' || aiRuntimeStatus === 'ENV_NOT_SUPPORTED')"

      class="ai-enhancement-panel__text"

    >

      {{ aiRuntimeRequirementsText }}

    </p>

    <p v-if="canShowAiInstallAction && aiInstallHint" class="ai-enhancement-panel__text">{{ aiInstallHint }}</p>

    <AiRuntimeInstallLoadingOverlay

      v-if="isRuntimeBusy"

      inline

      :message="aiRuntimeProgress?.message || aiRuntimeStatusText"

    />

    <p class="ai-enhancement-panel__model-status">{{ aiModelStatusText }}</p>

    <p v-if="runtimeActionError" class="ai-enhancement-panel__warning">

      <Info :size="14" />

      {{ runtimeActionError }}

    </p>

    <div class="ai-enhancement-panel__actions">

      <button

        v-if="canShowAiInstallAction && (aiRuntimeStatus === 'READY_TO_INSTALL' || aiRuntimeStatus === 'ENV_NOT_SUPPORTED')"

        type="button"

        class="ai-enhancement-panel__btn"

        @click="handleInstallRuntime"

      >

        {{ t("aiEnhancement.actions.installRuntime") }}

      </button>

      <button

        v-if="aiRuntimeStatus === 'UPDATE_AVAILABLE'"

        type="button"

        class="ai-enhancement-panel__btn"

        @click="handleInstallRuntime"

      >

        {{ t("aiEnhancement.actions.upgradeRuntime") }}

      </button>

      <button v-if="aiRuntimeStatus === 'FAILED'" type="button" class="ai-enhancement-panel__btn" @click="handleInstallRuntime">

        {{ t("aiEnhancement.actions.retry") }}

      </button>

      <button

        v-if="!isLamaModelReady"

        type="button"

        class="ai-enhancement-panel__btn"

        :disabled="isImportingAiModel"

        @click="handleImportModel"

      >

        {{ isImportingAiModel ? t("aiEnhancement.actions.importingModel") : t("aiEnhancement.actions.importModel") }}

      </button>

      <button

        type="button"

        class="ai-enhancement-panel__btn ai-enhancement-panel__btn--guide"

        @click="handleOpenGuide"

      >

        {{ t("aiEnhancement.actions.viewGuide") }}

      </button>

    </div>

  </div>

</template>



<style scoped>

.ai-enhancement-panel {

  display: flex;

  flex-direction: column;

  gap: 8px;

  padding: 14px;

  border: 1px solid var(--border, #eef0f4);

  border-radius: 14px;

  background: #fafbfd;

}



.ai-enhancement-panel__title {

  font-size: 14px;

  font-weight: 600;

  color: var(--text, #1f2937);

}



.ai-enhancement-panel__runtime-status,

.ai-enhancement-panel__text,

.ai-enhancement-panel__model-status {

  margin: 0;

  color: var(--text-secondary, #4b5563);

  font-size: 13px;

  line-height: 1.5;

}



.ai-enhancement-panel__model-status {

  color: var(--text-muted, #9ca3af);

  font-size: 12px;

}



.ai-enhancement-panel__warning {

  display: flex;

  align-items: center;

  gap: 6px;

  margin: 0;

  color: var(--warning, #d97706);

  font-size: 13px;

  line-height: 1.45;

}



.ai-enhancement-panel__actions {

  display: flex;

  align-items: center;

  gap: 8px;

  flex-wrap: wrap;

}



.ai-enhancement-panel__btn {

  height: 34px;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  gap: 7px;

  padding: 0 12px;

  border: 1px solid var(--border-weak, #e7e9ee);

  border-radius: 999px;

  background: #fff;

  color: var(--text-secondary, #4b5563);

  font: inherit;

  font-size: 12px;

  font-weight: 500;

  white-space: nowrap;

  cursor: pointer;

  transition:

    background 0.15s,

    color 0.15s,

    border-color 0.15s,

    box-shadow 0.15s;

}



.ai-enhancement-panel__btn:focus-visible {

  outline: 2px solid var(--primary, #6366f1);

  outline-offset: 2px;

}



.ai-enhancement-panel__btn:hover:not(:disabled) {

  border-color: #dbeafe;

  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.06);

}



.ai-enhancement-panel__btn--guide {

  border-color: #bfdbfe;

  background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);

  color: #1d4ed8;

}



.ai-enhancement-panel__btn:disabled {

  cursor: not-allowed;

  opacity: 0.48;

}

</style>

