<script setup lang="ts">
import { Check, ExternalLink, Minus, RefreshCw } from "@lucide/vue";
import { useI18n } from "vue-i18n";
import { useAuthEntry } from "@/auth/composables/useAuthEntry";
import { useExternalNavigate } from "@/composables/useExternalNavigate";
import { useAuthStore } from "@/stores/auth.store";
import { useMembershipPageData } from "@/pages/membership/composables/useMembershipPageData";

const { t } = useI18n();
const authStore = useAuthStore();
const { handleAuthClick } = useAuthEntry();
const { navigate } = useExternalNavigate();
const {
  loading,
  errorMessage,
  summaryTitle,
  summaryDescription,
  membershipStatusLabel,
  membershipExpiryLabel,
  memberBenefits,
  planCards,
  load,
} = useMembershipPageData();

const compareRows = [
  "imageCompress",
  "gifCompress",
  "videoToGif",
  "imageWatermarkRemoval",
  "videoWatermarkRemoval",
  "imageUpscale",
  "unlimitedBatch",
  "aiEnhanced",
  "paidRights",
] as const;

async function goPricing(logicalPath = "/pricing", entryId = "desktop-membership-page-buy"): Promise<void> {
  await navigate({
    entryId,
    logicalPath,
  });
}
</script>

<template>
  <div class="membership-page">
    <section class="membership-summary">
      <div class="membership-summary__header">
        <div>
          <h2 class="membership-summary__title">{{ summaryTitle }}</h2>
          <p class="membership-summary__desc">{{ summaryDescription }}</p>
        </div>
        <button type="button" class="membership-summary__refresh" :disabled="loading" @click="load">
          <RefreshCw :size="16" :class="{ 'membership-summary__spin': loading }" />
          <span>{{ t("pages.membershipDesktop.refresh") }}</span>
        </button>
      </div>

      <div class="membership-summary__meta">
        <div class="membership-meta-card">
          <span class="membership-meta-card__label">{{ t("pages.membershipDesktop.statusLabel") }}</span>
          <strong class="membership-meta-card__value">{{ membershipStatusLabel }}</strong>
        </div>
        <div class="membership-meta-card">
          <span class="membership-meta-card__label">{{ t("pages.membershipDesktop.expiryLabel") }}</span>
          <strong class="membership-meta-card__value">{{ membershipExpiryLabel }}</strong>
        </div>
        <div class="membership-meta-card membership-meta-card--cta">
          <span class="membership-meta-card__label">{{ t("pages.membershipDesktop.purchaseLabel") }}</span>
          <button type="button" class="membership-meta-card__button" @click="goPricing()">
            <span>{{ t("pages.membershipDesktop.buyNow") }}</span>
            <ExternalLink :size="16" />
          </button>
        </div>
      </div>

      <p v-if="errorMessage" class="membership-summary__error">{{ errorMessage }}</p>

      <ul class="membership-summary__notes">
        <li v-for="item in memberBenefits" :key="item">{{ item }}</li>
      </ul>

      <div v-if="!authStore.isLoggedIn" class="membership-summary__login">
        <p>{{ t("pages.membershipDesktop.loginHint") }}</p>
        <button type="button" class="membership-summary__login-btn" @click="handleAuthClick">
          {{ t("pages.membershipDesktop.loginCta") }}
        </button>
      </div>
    </section>

    <section class="membership-plans">
      <div class="membership-section__head">
        <div>
          <h2 class="membership-section__title">{{ t("pages.membershipDesktop.planSectionTitle") }}</h2>
          <p class="membership-section__subtitle">{{ t("pages.membershipDesktop.planSectionSubtitle") }}</p>
        </div>
      </div>

      <div class="membership-plan-grid">
        <article
          v-for="plan in planCards"
          :key="plan.planCode"
          class="membership-plan-card"
          :class="{
            'membership-plan-card--current': plan.isCurrent,
            'membership-plan-card--disabled': !plan.canPurchase,
          }"
        >
          <div class="membership-plan-card__top">
            <span v-if="plan.badge" class="membership-plan-card__badge">{{ plan.badge }}</span>
            <h3 class="membership-plan-card__title">{{ plan.title }}</h3>
            <p class="membership-plan-card__subtitle">{{ plan.subtitle }}</p>
          </div>

          <div class="membership-plan-card__price">
            <strong>{{ plan.price }}</strong>
            <span>{{ plan.cycle }}</span>
          </div>

          <ul class="membership-plan-card__features">
            <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
          </ul>

          <p class="membership-plan-card__reason">{{ plan.reason }}</p>

          <button
            type="button"
            class="membership-plan-card__button"
            :class="{ 'membership-plan-card__button--disabled': plan.isCurrent || !plan.canPurchase }"
            :disabled="plan.isCurrent || !plan.canPurchase"
            :title="plan.reason"
            @click="!plan.isCurrent && plan.canPurchase && goPricing('/pricing', plan.buttonEntryId)"
          >
            {{ plan.isCurrent ? t("pages.membershipDesktop.plans.currentPlan") : t("pages.membershipDesktop.buyNow") }}
          </button>
        </article>
      </div>
    </section>

    <section class="membership-compare">
      <div class="membership-section__head">
        <div>
          <h2 class="membership-section__title">{{ t("pages.membershipDesktop.compareTitle") }}</h2>
          <p class="membership-section__subtitle">{{ t("pages.membershipDesktop.compareSubtitle") }}</p>
        </div>
      </div>

      <div class="membership-compare__scroll">
        <table class="membership-compare__table">
          <thead>
            <tr>
              <th scope="col">{{ t("pages.membershipDesktop.compareHeaders.feature") }}</th>
              <th scope="col">{{ t("pages.membershipDesktop.compareHeaders.free") }}</th>
              <th scope="col">{{ t("pages.membershipDesktop.compareHeaders.paid") }}</th>
              <th scope="col">{{ t("pages.membershipDesktop.compareHeaders.cycle") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in compareRows" :key="row">
              <th scope="row">{{ t(`pages.membershipDesktop.compareRows.${row}.name`) }}</th>
              <td>
                <Check
                  v-if="t(`pages.membershipDesktop.compareRows.${row}.free`) === 'true'"
                  class="membership-compare__icon membership-compare__icon--yes"
                  :size="18"
                />
                <Minus
                  v-else-if="t(`pages.membershipDesktop.compareRows.${row}.free`) === 'false'"
                  class="membership-compare__icon membership-compare__icon--no"
                  :size="18"
                />
                <span v-else>{{ t(`pages.membershipDesktop.compareRows.${row}.free`) }}</span>
              </td>
              <td>
                <Check class="membership-compare__icon membership-compare__icon--yes" :size="18" />
              </td>
              <td>{{ t(`pages.membershipDesktop.compareRows.${row}.cycle`) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.membership-page {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.membership-summary,
.membership-plans,
.membership-compare {
  border-radius: 16px;
  border: 1px solid #e9edf3;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  padding: 22px 24px;
}

.membership-summary__header,
.membership-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.membership-summary__title,
.membership-section__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.membership-summary__desc,
.membership-section__subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: #64748b;
}

.membership-summary__refresh,
.membership-section__link {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  border-radius: 999px;
  padding: 9px 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 600;
}

.membership-summary__spin {
  animation: membership-spin 1s linear infinite;
}

.membership-summary__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.membership-meta-card {
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.membership-meta-card__label {
  font-size: 12px;
  color: #64748b;
}

.membership-meta-card__value {
  font-size: 18px;
  color: #1f2937;
}

.membership-meta-card__button,
.membership-summary__login-btn,
.membership-plan-card__button {
  border: none;
  border-radius: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #fbb054 0%, #f78c2c 100%);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
  cursor: pointer;
}

.membership-summary__error {
  margin: 16px 0 0;
  color: #b91c1c;
  font-size: 13px;
}

.membership-summary__notes {
  margin: 16px 0 0;
  padding: 14px 16px;
  list-style: none;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  display: grid;
  gap: 8px;
}

.membership-summary__notes li {
  position: relative;
  padding-left: 14px;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
}

.membership-summary__notes li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 9px;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #f78c2c;
}

.membership-summary__login {
  margin-top: 16px;
  padding: 16px;
  border-radius: 14px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.membership-summary__login p {
  margin: 0;
  color: #9a3412;
  font-size: 13px;
}

.membership-plan-card__features {
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}

.membership-plan-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.membership-plan-card {
  border-radius: 16px;
  border: 1px solid #edf2f7;
  background: #fbfdff;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.membership-plan-card--current {
  border-color: #f6ad55;
  background: linear-gradient(180deg, #fffaf0 0%, #ffffff 100%);
}

.membership-plan-card--disabled {
  border-color: #e2e8f0;
  background: #f8fafc;
}

.membership-plan-card__badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 11px;
  font-weight: 700;
}

.membership-plan-card__title {
  margin: 10px 0 0;
  font-size: 17px;
  line-height: 1.3;
  color: #1f2937;
  overflow-wrap: anywhere;
}

.membership-plan-card__subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.membership-plan-card__price {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.membership-plan-card__price strong {
  font-size: 26px;
  line-height: 1.1;
  color: #111827;
  overflow-wrap: anywhere;
}

.membership-plan-card__price span {
  color: #64748b;
  font-size: 13px;
  padding-bottom: 3px;
}

.membership-plan-card__features {
  display: grid;
  gap: 8px;
}

.membership-plan-card__features li {
  font-size: 13px;
  color: #334155;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.membership-plan-card__reason {
  margin: 0;
  min-height: 38px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.membership-plan-card__button--disabled {
  background: #e2e8f0;
  color: #64748b;
  cursor: not-allowed;
}

.membership-compare__scroll {
  margin-top: 18px;
  overflow-x: auto;
  border: 1px solid #edf2f7;
  border-radius: 14px;
}

.membership-compare__table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  font-size: 13px;
}

.membership-compare__table th,
.membership-compare__table td {
  padding: 14px 16px;
  border-bottom: 1px solid #edf2f7;
  text-align: left;
  color: #475569;
}

.membership-compare__table thead th {
  background: #f8fafc;
  color: #1f2937;
  font-weight: 700;
}

.membership-compare__table tbody th {
  color: #1f2937;
  font-weight: 600;
}

.membership-compare__table tbody tr:last-child th,
.membership-compare__table tbody tr:last-child td {
  border-bottom: none;
}

.membership-compare__icon {
  display: block;
}

.membership-compare__icon--yes {
  color: #16a34a;
}

.membership-compare__icon--no {
  color: #94a3b8;
}

@keyframes membership-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1080px) {
  .membership-summary__meta {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .membership-summary,
  .membership-plans,
  .membership-compare {
    padding: 18px;
  }

  .membership-summary__header,
  .membership-section__head,
  .membership-summary__login {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
