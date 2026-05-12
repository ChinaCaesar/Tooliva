<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { Crown } from "@lucide/vue";

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

      <div class="m-hero__visual" aria-hidden="true">
        <div class="m-hero__visual-bg" aria-hidden="true">
          <Crown class="m-hero__crown" :size="112" :stroke-width="1.25" aria-hidden="true" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.m-hero {
  padding: 22px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 52%, #e0f2fe 100%);
  border: 1px solid #e8ecf3;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 8px rgba(15, 23, 42, 0.06);
}
.m-hero__grid {
  display: grid;
  gap: 18px 24px;
  align-items: center;
  grid-template-columns: 1fr;
}
@media (min-width: 720px) {
  .m-hero__grid {
    grid-template-columns: minmax(0, 1fr) minmax(140px, 220px);
    grid-template-rows: auto;
    align-items: center;
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
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #0f172a;
  line-height: 1.25;
}
.m-hero__subtitle {
  margin: 0 0 18px;
  font-size: 15px;
  line-height: 1.6;
  color: #475569;
  letter-spacing: 0.01em;
}
.m-hero__benefits {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(3, auto);
  grid-auto-flow: column;
  column-gap: clamp(16px, 3vw, 28px);
  row-gap: 12px;
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
  font-size: 14px;
  line-height: 1.5;
  color: #334155;
  letter-spacing: 0.01em;
}
.m-hero__benefit-text {
  min-width: 0;
}
.m-hero__check {
  flex-shrink: 0;
  margin-top: 2px;
  color: #16a34a;
}
.m-hero__check-svg {
  display: block;
}
.m-hero__visual {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
}
.m-hero__visual-bg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 220px;
  aspect-ratio: 1;
  margin: 0 auto;
  border-radius: 16px;
  background: radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.35), transparent 55%),
    radial-gradient(circle at 70% 60%, rgba(96, 165, 250, 0.45), transparent 50%), linear-gradient(160deg, #dbeafe, #eff6ff);
  border: 1px solid #bfdbfe;
  color: #2563eb;
}
.m-hero__crown {
  opacity: 0.95;
  filter: drop-shadow(0 8px 24px rgba(37, 99, 235, 0.25));
}
</style>
