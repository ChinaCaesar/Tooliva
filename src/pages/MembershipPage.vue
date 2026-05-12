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
  <section class="m-page">
    <div class="m-page__layout">
      <div class="m-page__main">
        <MembershipHeroSection class="m-page__block" />

        <MembershipPlanGrid class="m-page__block m-page__block--plans" />

        <MembershipCompareTable class="m-page__block" />
      </div>

      <aside class="m-page__aside-col" :aria-label="t('pages.membership.aside.ariaLabel')">
        <MembershipUserCard class="m-page__aside-block" @login="onLoginClick" />
        <div class="m-page__aside-body">
          <MembershipAsideColumn />
        </div>
      </aside>
    </div>
    <!-- 底栏标语由 AppShellLayout 的 AppFooter 统一展示，此处不再重复。 -->
  </section>
</template>

<style scoped>
.m-page {
  --m-gap: 18px;
  --m-gap-wide: 20px;
  --m-pad-x: 20px;
  --m-pad-y: 20px;
  --m-radius: 12px;
  --m-card-border: #e8ecf3;
  --m-card-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 8px rgba(15, 23, 42, 0.06);

  flex: 1;
  min-height: 0;
  padding: var(--m-pad-y) var(--m-pad-x);
  overflow: auto;
  background: #f8fafc;
}
.m-page__layout {
  display: flex;
  flex-direction: column;
  gap: var(--m-gap);
  max-width: 1280px;
  margin: 0 auto;
  align-items: stretch;
}
.m-page__main {
  display: flex;
  flex-direction: column;
  gap: var(--m-gap);
  min-width: 0;
}
.m-page__aside-col {
  display: flex;
  flex-direction: column;
  gap: var(--m-gap);
  min-width: 0;
}
@media (min-width: 1100px) {
  .m-page__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: var(--m-gap-wide);
    align-items: stretch;
  }
  .m-page__main {
    min-width: 0;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--m-gap);
  }
  .m-page__aside-col {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--m-gap);
  }
}
.m-page__aside-block {
  flex-shrink: 0;
}
.m-page__aside-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.m-page__block {
  margin: 0;
}
.m-page__block--plans {
  padding: 20px 22px 22px;
  border-radius: var(--m-radius);
  border: 1px solid var(--m-card-border);
  box-shadow: var(--m-card-shadow);
  background: #ffffff;
}
</style>
