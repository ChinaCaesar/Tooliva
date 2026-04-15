<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface FooterLinkViewModel {
  id: string;
  iconUrl: string;
  labelKey: string;
}

defineProps<{
  copyrightText: string;
  versionPrefix: string;
  version: string;
  links: FooterLinkViewModel[];
}>();

const { t } = useI18n();
</script>

<template>
  <footer class="home-footer">
    <p class="home-footer__copyright">{{ copyrightText }} {{ versionPrefix }} {{ version }}</p>
    <div v-if="links.length > 0" class="home-footer__links">
      <button v-for="item in links" :key="item.id" type="button" class="home-footer__link-btn">
        <img :src="item.iconUrl" alt="" class="home-footer__icon" />
        <span>{{ t(item.labelKey) }}</span>
      </button>
    </div>
  </footer>
</template>

<style scoped>
.home-footer {
  margin-top: 24px;
  border-top: 1px solid #e5e7eb;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.home-footer__copyright { margin: 0; color: #9ca3af; }
.home-footer__links { display: flex; align-items: center; gap: 12px; }
.home-footer__link-btn {
  border: none; background: transparent; color: #6b7280; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px; padding: 0;
}
.home-footer__icon { width: 16px; height: 16px; }
</style>
