<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { message } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { MEMBERSHIP_PLAN_DEFS, type MembershipPlanId } from "@/pages/membership/config/membershipPage.config";

const { t } = useI18n();

const selectedId = ref<MembershipPlanId>("monthly");

function selectPlan(id: MembershipPlanId): void {
  selectedId.value = id;
}

async function onSubscribe(planId: MembershipPlanId): Promise<void> {
  const def = MEMBERSHIP_PLAN_DEFS.find((p) => p.id === planId);
  const planLabel = def ? t(def.nameKey) : planId;
  const body = t("pages.membership.plans.subscribePlaceholder", { plan: planLabel });
  const title = t("pages.membership.plans.subscribePlaceholderTitle");
  const text = `${title}\n\n${body}`;
  if (isTauri()) {
    await message(text, { title });
  } else {
    globalThis.alert(text);
  }
}
</script>

<template>
  <section class="m-plans" aria-labelledby="m-plans-title">
    <h2 id="m-plans-title" class="m-plans__heading">{{ t("pages.membership.plans.sectionTitle") }}</h2>
    <div class="m-plans__grid">
      <div
        v-for="plan in MEMBERSHIP_PLAN_DEFS"
        :key="plan.id"
        class="m-plan-wrap"
        :class="`m-plan-wrap--${plan.variant}`"
      >
        <div
          class="m-plan"
          :class="{
            'm-plan--selected': selectedId === plan.id,
            'm-plan--featured': plan.variant === 'featured',
            'm-plan--lifetime': plan.variant === 'lifetime'
          }"
        >
          <button
            type="button"
            class="m-plan__main"
            :aria-pressed="selectedId === plan.id"
            :aria-label="t(plan.nameKey)"
            @click="selectPlan(plan.id)"
          >
            <span v-if="plan.badgeKey" class="m-plan__badge">{{ t(plan.badgeKey) }}</span>

            <div class="m-plan__head">
              <span class="m-plan__name">{{ t(plan.nameKey) }}</span>
              <span class="m-plan__subtitle">{{ t(plan.subtitleKey) }}</span>
            </div>

            <div class="m-plan__middle">
              <div class="m-plan__price-block">
                <div class="m-plan__price-row">
                  <span class="m-plan__price">{{ t(plan.priceKey) }}</span>
                  <span v-if="plan.cycleKey" class="m-plan__cycle">{{ t(plan.cycleKey) }}</span>
                </div>
                <p class="m-plan__secondary">
                  <template v-if="plan.secondaryKey">{{ t(plan.secondaryKey) }}</template>
                  <template v-else>&nbsp;</template>
                </p>
              </div>
            </div>
          </button>

          <button type="button" class="m-plan__cta" @click="onSubscribe(plan.id)">
            {{ t("pages.membership.plans.cta") }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.m-plans {
  min-width: 0;
}
.m-plans__heading {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  letter-spacing: 0;
  line-height: 1.4;
}
.m-plans__grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: stretch;
}
.m-plan-wrap {
  display: flex;
  min-width: 0;
}
.m-plan {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 260px;
  padding: 0;
  border-radius: 14px;
  border: 1px solid #eef0f4;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}
.m-plan:hover {
  border-color: #dbeafe;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}
.m-plan-wrap--lifetime .m-plan:hover {
  border-color: #fdba74;
  box-shadow: 0 10px 24px rgba(249, 115, 22, 0.08);
}
.m-plan__main {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 18px 16px 10px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  color: inherit;
  font: inherit;
  min-height: 0;
}
.m-plan__main:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}
.m-plan--selected {
  border-width: 2px;
  border-color: #6366f1;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, #ffffff 0%, #fafbfd 100%);
}
.m-plan--selected:hover {
  border-color: #6366f1;
}
.m-plan-wrap--lifetime .m-plan--selected {
  border-color: #f97316;
}
.m-plan-wrap--lifetime .m-plan {
  border-color: #fed7aa;
  background: linear-gradient(180deg, #fffbeb 0%, #ffffff 72%);
}
.m-plan__badge {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 1;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: #6366f1;
  color: #ffffff;
  letter-spacing: 0;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transform: translate(4px, -4px);
}
.m-plan-wrap--lifetime .m-plan__badge {
  background: #fff7ed;
  color: #9a3412;
  border: 1px solid #fdba74;
}
.m-plan-wrap--default .m-plan__badge {
  background: #eef2ff;
  color: #3730a3;
  border: 1px solid #e0e7ff;
}
.m-plan__head {
  /* padding-right: 76px; */
  margin-bottom: 4px;
}
.m-plan__name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  letter-spacing: 0;
  line-height: 1.3;
}
.m-plan-wrap--lifetime .m-plan__name {
  color: #9a3412;
}
.m-plan__subtitle {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.45;
  color: #6b7280;
  letter-spacing: 0;
}
.m-plan__middle {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 104px;
  padding: 8px 0 4px;
}
.m-plan__price-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.m-plan__price-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 6px;
}
.m-plan__price {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: 0;
  line-height: 1.2;
}
.m-plan-wrap--lifetime .m-plan__price {
  color: #9a3412;
}
.m-plan__cycle {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
}
.m-plan__secondary {
  margin: 0;
  min-height: 2.6em;
  font-size: 12px;
  line-height: 1.35;
  color: #6b7280;
  letter-spacing: 0;
}
.m-plan-wrap--lifetime .m-plan__secondary {
  color: #78716c;
}
.m-plan__cta {
  margin: auto 14px 14px;
  margin-top: 4px;
  align-self: stretch;
  text-align: center;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: #eef2ff;
  color: #4338ca;
  transition: background-color 0.2s ease, color 0.2s ease;
}
.m-plan__cta:hover {
  background: #e0e7ff;
}
.m-plan__cta:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}
.m-plan-wrap--lifetime .m-plan__cta {
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
}
.m-plan-wrap--lifetime .m-plan__cta:hover {
  background: #ffedd5;
}
@media (prefers-reduced-motion: reduce) {
  .m-plan {
    transition-duration: 0.01ms;
  }
}
</style>
