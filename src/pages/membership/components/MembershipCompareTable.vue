<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { MEMBERSHIP_COMPARE_ROWS, type CompareCell } from "@/pages/membership/config/membershipPage.config";

const { t } = useI18n();

function cellText(cell: CompareCell): string {
  if (cell.kind === "text") return t(cell.key);
  if (cell.kind === "dash") return t("pages.membership.compare.dash");
  return "";
}
</script>

<template>
  <section class="m-compare" aria-labelledby="m-compare-title">
    <h2 id="m-compare-title" class="m-compare__title">{{ t("pages.membership.compare.title") }}</h2>
    <div class="m-compare__scroll">
      <table class="m-compare__table">
        <thead>
          <tr>
            <th scope="col" class="m-compare__th m-compare__th--feature">{{ t("pages.membership.compare.colFeature") }}</th>
            <th scope="col" class="m-compare__th">{{ t("pages.membership.compare.colFree") }}</th>
            <th scope="col" class="m-compare__th">{{ t("pages.membership.compare.colMember") }}</th>
            <th scope="col" class="m-compare__th">{{ t("pages.membership.compare.colLifetime") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in MEMBERSHIP_COMPARE_ROWS" :key="idx">
            <th scope="row" class="m-compare__feature">{{ t(row.featureKey) }}</th>
            <td class="m-compare__cell">
              <template v-if="row.free.kind === 'check'">
                <svg class="m-compare__icon m-compare__icon--ok" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                </svg>
                <span class="sr-only">{{ t("pages.membership.compare.included") }}</span>
              </template>
              <template v-else>
                <span class="m-compare__text">{{ cellText(row.free) }}</span>
              </template>
            </td>
            <td class="m-compare__cell">
              <template v-if="row.member.kind === 'check'">
                <svg class="m-compare__icon m-compare__icon--ok" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                </svg>
                <span class="sr-only">{{ t("pages.membership.compare.included") }}</span>
              </template>
              <template v-else>
                <span class="m-compare__text">{{ cellText(row.member) }}</span>
              </template>
            </td>
            <td class="m-compare__cell">
              <template v-if="row.lifetime.kind === 'check'">
                <svg class="m-compare__icon m-compare__icon--ok" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                </svg>
                <span class="sr-only">{{ t("pages.membership.compare.included") }}</span>
              </template>
              <template v-else>
                <span class="m-compare__text">{{ cellText(row.lifetime) }}</span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.m-compare {
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e8ecf3;
  padding: 18px 20px 20px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 8px rgba(15, 23, 42, 0.06);
}
.m-compare__title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: 0.02em;
}
.m-compare__scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.m-compare__table {
  width: 100%;
  min-width: 520px;
  border-collapse: collapse;
  font-size: 14px;
  line-height: 1.5;
}
.m-compare__th {
  text-align: left;
  padding: 10px 12px;
  background: #f1f5f9;
  color: #0f172a;
  font-weight: 600;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}
.m-compare__th--feature {
  width: 32%;
}
.m-compare__feature {
  text-align: left;
  padding: 12px;
  font-weight: 500;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}
.m-compare__cell {
  padding: 12px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  color: #475569;
}
.m-compare__text {
  display: inline-block;
  max-width: 200px;
}
.m-compare__icon {
  display: block;
}
.m-compare__icon--ok {
  color: #16a34a;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
