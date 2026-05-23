import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth.store";
import { useNotificationStore } from "@/stores/notification.store";

const profileModalOpen = ref(false);
const loginInProgress = ref(false);

export function useAuthEntry(): {
  profileModalOpen: typeof profileModalOpen;
  loginInProgress: typeof loginInProgress;
  handleAuthClick: () => Promise<void>;
  openProfileModal: () => void;
  closeProfileModal: () => void;
} {
  const authStore = useAuthStore();
  const notificationStore = useNotificationStore();
  const { t } = useI18n();

  async function handleAuthClick(): Promise<void> {
    if (loginInProgress.value) {
      return;
    }

    if (authStore.isLoggedIn) {
      profileModalOpen.value = true;
      return;
    }

    loginInProgress.value = true;
    try {
      await authStore.startDesktopLogin();
    } catch {
      notificationStore.showNotification({
        title: t("auth.websiteLoginFailedTitle"),
        message: t("auth.websiteLoginFailedMessage"),
        tone: "error",
        durationMs: 5000,
      });
    } finally {
      loginInProgress.value = false;
    }
  }

  function openProfileModal(): void {
    if (authStore.isLoggedIn) {
      profileModalOpen.value = true;
    }
  }

  function closeProfileModal(): void {
    profileModalOpen.value = false;
  }

  return {
    profileModalOpen,
    loginInProgress,
    handleAuthClick,
    openProfileModal,
    closeProfileModal,
  };
}
