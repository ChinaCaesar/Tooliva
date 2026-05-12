<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { Headphones } from "@lucide/vue";
import { message } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { MEMBERSHIP_FAQ_ORDER, type MembershipFaqId } from "@/pages/membership/config/membershipPage.config";

const { t } = useI18n();

async function onViewAllFaq(): Promise<void> {
  const title = t("pages.membership.aside.faqTitle");
  const body = t("pages.membership.faqViewAllPlaceholder");
  if (isTauri()) {
    await message(body, { title });
  } else {
    globalThis.alert(`${title}\n\n${body}`);
  }
}

function faqQKey(id: MembershipFaqId): string {
  return `pages.membership.faq.${id}.q`;
}
function faqAKey(id: MembershipFaqId): string {
  return `pages.membership.faq.${id}.a`;
}
</script>

<template>
  <div class="m-aside">
    <div class="m-aside__card m-aside__card--tint">
      <div class="m-aside__icon-wrap m-aside__icon-wrap--blue" aria-hidden="true">
        <svg class="m-aside__svg" viewBox="0 0 24 24" width="22" height="22">
          <path
            fill="currentColor"
            d="M12 1L3 5v6c0 5.25 3.75 10.25 9 11 5.25-.75 9-5.75 9-11V5l-9-4zm0 4.18l6 2.67V11c0 4.52-3.13 8.73-6 9.81-2.87-1.08-6-5.29-6-9.81V7.85l6-2.67zM11 10h2v5h-2v-5zm0-3h2v2h-2V7z"
          />
        </svg>
      </div>
      <h3 class="m-aside__card-title">{{ t("pages.membership.aside.paymentTitle") }}</h3>
      <p class="m-aside__card-body">{{ t("pages.membership.aside.paymentBody") }}</p>
    </div>

    <div class="m-aside__card">
      <h3 class="m-aside__card-title">{{ t("pages.membership.aside.faqTitle") }}</h3>
      <ul class="m-aside__faq">
        <li v-for="id in MEMBERSHIP_FAQ_ORDER" :key="id" class="m-aside__faq-item">
          <details class="m-aside__details">
            <summary class="m-aside__summary">
              <span class="m-aside__summary-text">{{ t(faqQKey(id)) }}</span>
              <svg class="m-aside__chev" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
              </svg>
            </summary>
            <p class="m-aside__answer">{{ t(faqAKey(id)) }}</p>
          </details>
        </li>
      </ul>
      <button type="button" class="m-aside__linklike" @click="onViewAllFaq">
        {{ t("pages.membership.aside.faqViewAll") }}
      </button>
    </div>

    <div class="m-aside__card m-aside__card--tint">
      <div class="m-aside__contact-head">
        <div class="m-aside__icon-wrap m-aside__icon-wrap--muted" aria-hidden="true">
          <Headphones class="m-aside__lucide" :size="22" :stroke-width="2" />
        </div>
        <h3 class="m-aside__card-title m-aside__card-title--inline">{{ t("pages.membership.aside.contactTitle") }}</h3>
      </div>
      <p class="m-aside__card-body">{{ t("pages.membership.aside.contactHours") }}</p>
      <p class="m-aside__card-body m-aside__email">
        <span>{{ t("pages.membership.aside.contactEmailLabel") }}</span>
        <a class="m-aside__mailto" :href="`mailto:${t('pages.membership.aside.contactEmail')}`">{{
          t("pages.membership.aside.contactEmail")
        }}</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.m-aside {
  display: flex;
  flex-direction: column;
  gap: 18px;
  flex: 1;
  min-height: 0;
}
.m-aside__card {
  padding: 18px 20px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e8ecf3;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 8px rgba(15, 23, 42, 0.06);
}
.m-aside__card--tint {
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 72%);
}
.m-aside__icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}
.m-aside__icon-wrap--blue {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}
.m-aside__icon-wrap--muted {
  background: #f1f5f9;
  color: #475569;
}
.m-aside__contact-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.m-aside__contact-head .m-aside__icon-wrap {
  margin-bottom: 0;
}
.m-aside__card-title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}
.m-aside__card-title--inline {
  margin: 0;
}
.m-aside__card-body {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.55;
  color: #64748b;
}
.m-aside__email {
  margin-bottom: 0;
}
.m-aside__mailto {
  color: #2563eb;
  text-decoration: none;
}
.m-aside__mailto:hover {
  text-decoration: underline;
}
.m-aside__lucide {
  display: block;
  color: inherit;
}
.m-aside__faq {
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
}
.m-aside__faq-item + .m-aside__faq-item {
  border-top: 1px solid #f1f5f9;
}
.m-aside__details {
  padding: 8px 0;
}
.m-aside__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  list-style: none;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}
.m-aside__summary::-webkit-details-marker {
  display: none;
}
.m-aside__summary-text {
  flex: 1;
  min-width: 0;
}
.m-aside__chev {
  flex-shrink: 0;
  color: #94a3b8;
  transition: transform 0.2s ease;
}
.m-aside__details[open] .m-aside__chev {
  transform: rotate(90deg);
}
.m-aside__answer {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: #64748b;
}
.m-aside__linklike {
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  color: #2563eb;
  cursor: pointer;
  text-decoration: underline;
}
.m-aside__linklike:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  border-radius: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .m-aside__chev {
    transition-duration: 0.01ms;
  }
}
</style>
