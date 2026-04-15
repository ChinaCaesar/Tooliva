import { defineStore } from "pinia";
import { getRegisteredTools } from "@/modules/tools/registry";
import type { ToolMeta } from "@/types/tool";

interface ToolState {
  tools: ToolMeta[];
}

export const useToolStore = defineStore("tools", {
  state: (): ToolState => ({
    tools: getRegisteredTools()
  }),
  getters: {
    enabledTools: (state): ToolMeta[] => state.tools.filter((tool) => tool.enabled)
  }
});
