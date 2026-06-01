import { getActivePinia } from "pinia";
import { i18n } from "@/i18n";
import { useAppConfirmDialogStore, type AppDialogTone } from "@/stores/appConfirmDialog.store";

interface ShowAppAlertOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: AppDialogTone;
}

interface ShowAppConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: AppDialogTone;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureFallbackDialogStyles(): void {
  if (document.getElementById("tooliva-dialog-fallback-style")) return;

  const style = document.createElement("style");
  style.id = "tooliva-dialog-fallback-style";
  style.textContent = `
    .tooliva-dialog-fallback__overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background:
        radial-gradient(circle at top, rgba(59, 130, 246, 0.12), transparent 34%),
        rgba(15, 23, 42, 0.56);
      backdrop-filter: blur(10px);
    }
    .tooliva-dialog-fallback__panel {
      width: min(100%, 440px);
      overflow: hidden;
      border-radius: 20px;
      border: 1px solid rgba(226, 232, 240, 0.9);
      background:
        linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%);
      box-shadow:
        0 22px 44px rgba(15, 23, 42, 0.16),
        0 8px 18px rgba(15, 23, 42, 0.08);
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      color: #0f172a;
    }
    .tooliva-dialog-fallback__header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 18px 20px 14px;
    }
    .tooliva-dialog-fallback__icon {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      font-size: 15px;
      font-weight: 700;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
    }
    .tooliva-dialog-fallback__icon--warning {
      color: #ea580c;
      background: linear-gradient(135deg, #ffedd5 0%, #fdba74 100%);
      border: 1px solid rgba(251, 146, 60, 0.45);
    }
    .tooliva-dialog-fallback__icon--info {
      color: #1d4ed8;
      background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%);
      border: 1px solid rgba(96, 165, 250, 0.45);
    }
    .tooliva-dialog-fallback__title {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      line-height: 1.35;
    }
    .tooliva-dialog-fallback__body {
      margin: 0;
      padding: 0 20px 12px;
      color: #475569;
      font-size: 14px;
      line-height: 1.65;
      white-space: pre-wrap;
    }
    .tooliva-dialog-fallback__footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px 20px;
    }
    .tooliva-dialog-fallback__btn {
      min-width: 116px;
      height: 40px;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .tooliva-dialog-fallback__btn--secondary {
      color: #475569;
      background: rgba(255, 255, 255, 0.96);
      border-color: #dbe3ee;
    }
    .tooliva-dialog-fallback__btn--primary {
      color: #ffffff;
      background: linear-gradient(135deg, #fbb054 0%, #f78c2c 100%);
      box-shadow: 0 6px 16px rgba(243, 132, 30, 0.24);
    }
    .tooliva-dialog-fallback__btn--info {
      color: #ffffff;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.24);
    }
  `;
  document.head.appendChild(style);
}

function showFallbackDialog(options: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone: AppDialogTone;
  mode: "alert" | "confirm";
}): Promise<boolean> {
  if (typeof document === "undefined") {
    return Promise.resolve(options.mode === "alert");
  }

  ensureFallbackDialogStyles();

  return new Promise<boolean>((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "tooliva-dialog-fallback__overlay";

    const panel = document.createElement("div");
    panel.className = "tooliva-dialog-fallback__panel";
    panel.setAttribute("role", options.mode === "confirm" ? "alertdialog" : "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.tabIndex = -1;

    panel.innerHTML = `
      <div class="tooliva-dialog-fallback__header">
        <span class="tooliva-dialog-fallback__icon tooliva-dialog-fallback__icon--${options.tone}">${options.tone === "warning" ? "!" : "i"}</span>
        <h2 class="tooliva-dialog-fallback__title">${escapeHtml(options.title)}</h2>
      </div>
      <p class="tooliva-dialog-fallback__body">${escapeHtml(options.message)}</p>
      <div class="tooliva-dialog-fallback__footer"></div>
    `;

    const footer = panel.querySelector(".tooliva-dialog-fallback__footer") as HTMLDivElement;
    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = `tooliva-dialog-fallback__btn ${
      options.mode === "confirm" ? "tooliva-dialog-fallback__btn--primary" : "tooliva-dialog-fallback__btn--info"
    }`;
    confirmButton.textContent = options.confirmLabel;

    let cancelButton: HTMLButtonElement | null = null;
    if (options.mode === "confirm" && options.cancelLabel) {
      cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "tooliva-dialog-fallback__btn tooliva-dialog-fallback__btn--secondary";
      cancelButton.textContent = options.cancelLabel;
      footer.appendChild(cancelButton);
    }
    footer.appendChild(confirmButton);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function cleanup(result: boolean): void {
      overlay.remove();
      document.removeEventListener("keydown", onKeydown, true);
      resolve(result);
    }

    function onKeydown(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cleanup(options.mode === "alert");
    }

    overlay.addEventListener("click", (event) => {
      if (event.target !== overlay) return;
      cleanup(options.mode === "alert");
    });
    confirmButton.addEventListener("click", () => cleanup(true));
    cancelButton?.addEventListener("click", () => cleanup(false));
    document.addEventListener("keydown", onKeydown, true);
    globalThis.requestAnimationFrame(() => confirmButton.focus());
  });
}

export async function showAppAlert(options: ShowAppAlertOptions): Promise<void> {
  const confirmLabel = options.confirmLabel ?? i18n.global.t("common.ok");

  if (!getActivePinia()) {
    await showFallbackDialog({
      title: options.title,
      message: options.message,
      confirmLabel,
      tone: options.tone ?? "info",
      mode: "alert"
    });
    return;
  }

  await useAppConfirmDialogStore().alert({
    title: options.title,
    message: options.message,
    confirmLabel,
    tone: options.tone ?? "info"
  });
}

export async function showAppConfirm(options: ShowAppConfirmOptions): Promise<boolean> {
  if (!getActivePinia()) {
    return showFallbackDialog({
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel,
      cancelLabel: options.cancelLabel,
      tone: options.tone ?? "warning",
      mode: "confirm"
    });
  }

  return useAppConfirmDialogStore().show({
    title: options.title,
    message: options.message,
    confirmLabel: options.confirmLabel,
    cancelLabel: options.cancelLabel,
    tone: options.tone ?? "warning",
    mode: "confirm"
  });
}
