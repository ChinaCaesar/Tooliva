<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface MembershipViewModel {
  levelLabelKey: string;
  levelValueKey: string;
  expiryLabelKey: string;
  expiryDate: string;
  ctaKey: string;
}

interface StatViewModel {
  id: string;
  labelKey: string;
  value: string;
  progress: number;
  gradient: string;
}

interface QuickActionViewModel {
  id: string;
  iconUrl: string;
  labelKey: string;
  count: number;
}

defineProps<{
  membershipTitle: string;
  membership: MembershipViewModel;
  statsTitle: string;
  stats: StatViewModel[];
  quickActionsTitle: string;
  quickActions: QuickActionViewModel[];
}>();

const { t } = useI18n();
</script>

<template>
  <aside class="side-panel">
    <section class="membership-card">
      <h3 class="membership-card__title">{{ membershipTitle }}</h3>
      <div class="membership-card__row">
        <span>{{ t(membership.levelLabelKey) }}</span>
        <strong>{{ t(membership.levelValueKey) }}</strong>
      </div>
      <div class="membership-card__row">
        <span>{{ t(membership.expiryLabelKey) }}</span>
        <strong>{{ membership.expiryDate }}</strong>
      </div>
      <button type="button" class="membership-card__cta">{{ t(membership.ctaKey) }}</button>
    </section>

    <section class="common-card">
      <h3 class="common-card__title">{{ statsTitle }}</h3>
      <div v-for="item in stats" :key="item.id" class="stats-item">
        <div class="stats-item__top">
          <span>{{ t(item.labelKey) }}</span>
          <strong>{{ item.value }}</strong>
        </div>
        <div class="stats-item__track">
          <div class="stats-item__bar" :style="{ width: `${item.progress * 100}%`, background: item.gradient }" />
        </div>
      </div>
    </section>

    <section class="common-card">
      <h3 class="common-card__title">{{ quickActionsTitle }}</h3>
      <article v-for="item in quickActions" :key="item.id" class="quick-item">
        <div class="quick-item__left">
          <img :src="item.iconUrl" alt="" class="quick-item__icon" />
          <span>{{ t(item.labelKey) }}</span>
        </div>
        <strong class="quick-item__count">{{ item.count }}</strong>
      </article>
    </section>
  </aside>
</template>

<style scoped>
.side-panel { width: 280px; display: flex; flex-direction: column; gap: 24px; }
.membership-card {
  border-radius: 16px; padding: 24px; color: #fff;
  background: linear-gradient(135deg, #f59e0b 15%, #d97706 85%);
}
.membership-card__title { margin: 0 0 16px; font-size: 18px; line-height: 28px; }
.membership-card__row {
  display: flex; justify-content: space-between; margin-top: 8px; color: rgba(255, 255, 255, 0.85);
}
.membership-card__row strong { color: #fff; }
.membership-card__cta {
  margin-top: 16px; width: 100%; border: none; border-radius: 8px; padding: 10px;
  background: #fff; color: #d97706; font-weight: 500; cursor: pointer;
}
.common-card {
  border-radius: 16px; border: 1px solid #e5e7eb; background: #fff; padding: 24px;
}
.common-card__title { margin: 0; color: #111827; font-size: 16px; line-height: 24px; }
.stats-item { margin-top: 16px; }
.stats-item__top { display: flex; justify-content: space-between; color: #6b7280; }
.stats-item__top strong { color: #111827; }
.stats-item__track { margin-top: 8px; height: 8px; border-radius: 999px; background: #e5e7eb; overflow: hidden; }
.stats-item__bar { height: 100%; border-radius: 999px; }
.quick-item {
  margin-top: 12px; border-radius: 8px; background: #f9fafb; padding: 12px;
  display: flex; align-items: center; justify-content: space-between;
}
.quick-item__left { display: flex; align-items: center; gap: 12px; color: #111827; font-weight: 500; }
.quick-item__icon { width: 20px; height: 20px; }
.quick-item__count {
  min-width: 24px; padding: 0 8px; line-height: 24px; text-align: center;
  border-radius: 4px; background: #dbeafe; color: #3b82f6; font-size: 12px;
}
</style>
