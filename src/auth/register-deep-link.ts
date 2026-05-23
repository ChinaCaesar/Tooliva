import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { isTauri } from '@tauri-apps/api/core';
import { parseAuthCallbackUrl } from '@/auth/deep-link';
import { useAuthStore } from '@/stores/auth.store';

let registered = false;
let callbackQueue: Promise<void> = Promise.resolve();

function enqueueAuthCallback(url: string): void {
  callbackQueue = callbackQueue
    .then(async () => {
      const authStore = useAuthStore();
      await authStore.handleAuthCallback(url);
    })
    .catch(() => {
      /* 单次失败不阻断后续队列 */
    });
}

function dispatchAuthUrls(urls: string[]): void {
  const seen = new Set<string>();

  for (const url of urls) {
    if (!url.startsWith('tooliva://auth/callback')) {
      continue;
    }

    const parsed = parseAuthCallbackUrl(url);
    const dedupeKey = parsed ? `${parsed.state}:${parsed.code}` : url;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    enqueueAuthCallback(url);
  }
}

export async function registerAuthDeepLinkListener(): Promise<void> {
  if (!isTauri() || registered) {
    return;
  }

  registered = true;

  const startUrls = await getCurrent();
  if (startUrls?.length) {
    dispatchAuthUrls(startUrls);
  }

  await onOpenUrl((urls) => {
    dispatchAuthUrls(urls);
  });
}
