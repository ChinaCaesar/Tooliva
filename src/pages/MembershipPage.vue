<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { ROUTE_PATHS } from "@/config/constants";
import MembershipHeroSection from "@/pages/membership/components/MembershipHeroSection.vue";
import MembershipUserCard from "@/pages/membership/components/MembershipUserCard.vue";
import MembershipPlanGrid from "@/pages/membership/components/MembershipPlanGrid.vue";
import MembershipCompareTable from "@/pages/membership/components/MembershipCompareTable.vue";
import MembershipAsideColumn from "@/pages/membership/components/MembershipAsideColumn.vue";

const { t } = useI18n();
const router = useRouter();

function onLoginClick(): void {
  router.push(ROUTE_PATHS.login);
}
</script>

<template>
  <div class="membership-page">
    <div class="membership-page__body">
      <main class="membership-page__main">
        <div class="membership-page__scroll">
          <MembershipHeroSection />

          <div class="membership-card membership-card--plans">
            <MembershipPlanGrid />
          </div>

          <MembershipCompareTable />
        </div>
      </main>

      <aside class="membership-page__sidebar" :aria-label="t('pages.membership.aside.ariaLabel')">
        <div class="membership-page__sidebar-scroll">
          <MembershipUserCard @login="onLoginClick" />
          <MembershipAsideColumn />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.membership-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  background: #f5f6fa;
}

.membership-page__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 14px;
  padding: 14px 18px 4px;
  overflow: hidden;
}

.membership-page__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.membership-page__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  scrollbar-width: thin;
  scrollbar-color: #d6d9e0 transparent;
}
.membership-page__scroll::-webkit-scrollbar {
  width: 6px;
}
.membership-page__scroll::-webkit-scrollbar-thumb {
  background: #d6d9e0;
  border-radius: 3px;
}

.membership-card {
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #eef0f4;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  flex-shrink: 0;
}
.membership-card--plans {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}

.membership-page__sidebar {
  width: 300px;
  flex-shrink: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.membership-page__sidebar-scroll {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: #d6d9e0 transparent;
}
.membership-page__sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}
.membership-page__sidebar-scroll::-webkit-scrollbar-thumb {
  background: #d6d9e0;
  border-radius: 3px;
}

@media (max-width: 1080px) {
  .membership-page__sidebar {
    width: 280px;
  }
}

@media (max-width: 900px) {
  .membership-page__body {
    flex-direction: column;
    overflow-y: auto;
  }
  .membership-page__main,
  .membership-page__sidebar {
    width: 100%;
  }
  .membership-page__scroll,
  .membership-page__sidebar-scroll {
    overflow: visible;
    flex: none;
  }
}
</style>
