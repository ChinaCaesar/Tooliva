import { createI18n } from "vue-i18n";
import { DEFAULT_LANGUAGE } from "@/config/constants";
import { zhCN } from "@/i18n/locales/zh-CN";
import { enUS } from "@/i18n/locales/en-US";

export const messages = {
  "zh-CN": zhCN,
  "en-US": enUS
} as const;

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LANGUAGE,
  fallbackLocale: "en-US",
  messages
});
