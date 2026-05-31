import { computed, ref } from "vue";
import { tauriClient, type AiModelStatusPayload } from "@/bridge/tauriClient";

const modelStatus = ref<AiModelStatusPayload | null>(null);
const isRefreshing = ref(false);
const error = ref("");

export function useAiModel() {
  const isModelReady = computed(() => Boolean(modelStatus.value?.downloaded));
  const modelsRoot = computed(() => modelStatus.value?.modelsRoot || "");
  const modelPath = computed(() => modelStatus.value?.modelPath || "");

  async function refresh(): Promise<AiModelStatusPayload> {
    isRefreshing.value = true;
    error.value = "";
    try {
      const next = await tauriClient.getAiModelStatus();
      modelStatus.value = next;
      return next;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      isRefreshing.value = false;
    }
  }

  async function importModel(filePath: string): Promise<void> {
    error.value = "";
    await tauriClient.importAiModel(filePath);
    await refresh();
  }

  async function removeModel(): Promise<void> {
    error.value = "";
    await tauriClient.removeAiModel();
    await refresh();
  }

  return {
    modelStatus,
    isRefreshing,
    error,
    isModelReady,
    modelsRoot,
    modelPath,
    refresh,
    importModel,
    removeModel
  };
}
