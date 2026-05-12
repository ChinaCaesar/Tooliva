<script setup lang="ts">
import { useRouter } from "vue-router";
import { ROUTE_PATHS } from "@/config/constants";

const router = useRouter();

/**
 * 返回首页，统一会员页返回入口。
 */
function goBackHome(): void {
  router.push(ROUTE_PATHS.home);
}
</script>

<template>
  <section class="membership-page">
    <div class="membership-page__inner panel">
      <button type="button" class="back-btn" @click="goBackHome">
        {{ $t("common.backToHome") }}
      </button>
      <h1>{{ $t("pages.membership.title") }}</h1>
      <p>{{ $t("pages.membership.description") }}</p>
    </div>
  </section>
</template>

<style scoped>
.membership-page {
  flex: 1;
  min-height: 0;
  padding: 16px;
  overflow: auto;
}
.membership-page__inner {
  max-width: 720px;
}
.back-btn {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  color: #374151;
  padding: 6px 12px;
  cursor: pointer;
  margin-bottom: 12px;
}
</style>
