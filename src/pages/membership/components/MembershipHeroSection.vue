<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { MEMBERSHIP_ASSETS } from "@/pages/membership/resources/membershipAssets";

const { t } = useI18n();

const benefitKeys = [
  "pages.membership.hero.benefit1",
  "pages.membership.hero.benefit2",
  "pages.membership.hero.benefit3",
  "pages.membership.hero.benefit4",
  "pages.membership.hero.benefit5",
  "pages.membership.hero.benefit6"
] as const;
</script>

<template>
  <section class="m-hero" aria-labelledby="m-hero-title">
    <div class="m-hero__grid">
      <div class="m-hero__copy">
        <h1 id="m-hero-title" class="m-hero__title">{{ t("pages.membership.hero.title") }}</h1>
        <p class="m-hero__subtitle">{{ t("pages.membership.hero.subtitle") }}</p>
        <ul class="m-hero__benefits">
          <li v-for="(key, idx) in benefitKeys" :key="idx" class="m-hero__benefit">
            <span class="m-hero__check" aria-hidden="true">
              <svg viewBox="0 0 24 24" class="m-hero__check-svg" width="18" height="18">
                <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
              </svg>
            </span>
            <span class="m-hero__benefit-text">{{ t(key) }}</span>
          </li>
        </ul>
      </div>

      <div class="m-hero__visual">
        <div class="m-hero__visual-frame">
          <img
            class="m-hero__illustration"
            :src="MEMBERSHIP_ASSETS.heroIllustration"
            alt=""
            width="220"
            height="220"
            decoding="async"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.m-hero {
  padding: 22px 20px 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 48%, #f1f5f9 100%);
  border: 1px solid #eef0f4;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  flex-shrink: 0;
}
.m-hero__grid {
  display: grid;
  gap: 16px 22px;
  align-items: center;
  grid-template-columns: 1fr;
}
@media (min-width: 720px) {
  .m-hero__grid {
    grid-template-columns: minmax(0, 1fr) minmax(120px, 220px);
  }
  .m-hero__copy {
    min-width: 0;
  }
  .m-hero__visual {
    justify-self: center;
    width: 100%;
    max-width: 220px;
  }
}
.m-hero__title {
  margin: 0 0 8px;
  font-size: clamp(20px, 1.8vw, 24px);
  font-weight: 700;
  letter-spacing: 0;
  color: #1f2937;
  line-height: 1.3;
}
.m-hero__subtitle {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.5;
  color: #6b7280;
  letter-spacing: 0;
}
.m-hero__benefits {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(3, auto);
  grid-auto-flow: column;
  column-gap: clamp(14px, 2.5vw, 24px);
  row-gap: 10px;
}
@media (max-width: 520px) {
  .m-hero__benefits {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    grid-auto-flow: row;
  }
}
.m-hero__benefit {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: #4b5563;
  letter-spacing: 0;
}
.m-hero__benefit-text {
  min-width: 0;
}
.m-hero__check {
  flex-shrink: 0;
  margin-top: 2px;
  color: #f97316;
}
.m-hero__check-svg {
  display: block;
}
.m-hero__visual {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}
.m-hero__visual-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 220px;
  margin: 0 auto;
  padding: 12px;
  border-radius: 16px;
  background: linear-gradient(160deg, #fafbfd 0%, #ffffff 100%);
  border: 1px solid #eef0f4;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
}
.m-hero__illustration {
  display: block;
  width: 100%;
  max-width: 196px;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 8px 20px rgba(99, 102, 241, 0.12));
}
</style>
