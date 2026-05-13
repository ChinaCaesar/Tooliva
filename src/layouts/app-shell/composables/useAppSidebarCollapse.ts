import { ref, watch, type Ref } from "vue";
import { APP_SIDEBAR_COLLAPSED_STORAGE_KEY } from "@/config/constants";

function readStored(): boolean {
  try {
    const raw = localStorage.getItem(APP_SIDEBAR_COLLAPSED_STORAGE_KEY);
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

function writeStored(collapsed: boolean): void {
  try {
    localStorage.setItem(APP_SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    /* 存储不可用时不阻断 */
  }
}

/**
 * 应用壳左侧栏折叠偏好（内存 + localStorage，失败时静默回退）。
 */
export function useAppSidebarCollapse(): {
  collapsed: Ref<boolean>;
  toggle: () => void;
  setCollapsed: (next: boolean) => void;
} {
  const collapsed = ref<boolean>(readStored());

  watch(collapsed, (v) => {
    writeStored(v);
  });

  function toggle(): void {
    collapsed.value = !collapsed.value;
  }

  function setCollapsed(next: boolean): void {
    if (collapsed.value === next) return;
    collapsed.value = next;
  }

  return { collapsed, toggle, setCollapsed };
}
