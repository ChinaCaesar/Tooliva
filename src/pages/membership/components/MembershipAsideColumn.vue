<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { MEMBERSHIP_FAQ_ORDER, type MembershipFaqId } from "@/pages/membership/config/membershipPage.config";
import { useExternalNavigate } from "@/composables/useExternalNavigate";

const { t } = useI18n();
const { navigate } = useExternalNavigate();

async function onViewAllFaq(): Promise<void> {
  await navigate({
    entryId: "membership-faq-view-all",
    logicalPath: "/pricing#faq"
  });
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
  </div>
</template>

<style scoped>
.m-aside {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;
}
.m-aside__card {
  padding: 16px 18px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #eef0f4;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
}
.m-aside__card-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  letter-spacing: 0;
  line-height: 1.4;
}
.m-aside__faq {
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
}
.m-aside__faq-item + .m-aside__faq-item {
  border-top: 1px solid #eef0f4;
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
  color: #4b5563;
  letter-spacing: 0;
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
  color: #c7cad1;
  transition: transform 0.2s ease;
}
.m-aside__details[open] .m-aside__chev {
  transform: rotate(90deg);
}
.m-aside__answer {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
  letter-spacing: 0;
}
.m-aside__linklike {
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  color: #f97316;
  cursor: pointer;
  text-decoration: underline;
}
.m-aside__linklike:hover {
  color: #ea580c;
}
.m-aside__linklike:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
  border-radius: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .m-aside__chev {
    transition-duration: 0.01ms;
  }
}
</style>
