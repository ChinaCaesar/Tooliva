import { useExternalNavigate } from "@/composables/useExternalNavigate";

const AI_ENHANCEMENT_GUIDE_PATH = "/ai-enhancement-guide";

export function useAiEnhancementGuideNavigate() {
  const { navigate } = useExternalNavigate();

  async function openAiEnhancementGuide(entryId: string): Promise<void> {
    await navigate({
      entryId,
      logicalPath: AI_ENHANCEMENT_GUIDE_PATH,
    });
  }

  return {
    openAiEnhancementGuide,
  };
}
