<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";

export interface FeaturedToolCardVm {
  id: string;
  iconUrl: string;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
  actionCode: string;
}

defineProps<{
  cards: FeaturedToolCardVm[];
  ctaLabel: string;
}>();

const emit = defineEmits<{
  toolNavigate: [actionCode: string];
}>();

const { t } = useI18n();

const trackRef = ref<HTMLElement | null>(null);
let wheelEl: HTMLElement | null = null;

const DRAG_THRESHOLD_PX = 8;
/** 释放后惯性：速度乘数（px/ms → 每帧滚动量感） */
const MOMENTUM_BOOST = 18;
/** 每毫秒摩擦系数（越小停得越快） */
const MOMENTUM_FRICTION_PER_MS = 0.00235;
/** 低于此速度则结束惯性 */
const MOMENTUM_MIN_SPEED = 0.012;
/** 越界拖拽橡皮筋强度 */
const RUBBER = 0.38;

let ignoreNextClick = false;
let pointerDown = false;
let startX = 0;
let startScrollLeft = 0;
let activePointerId: number | null = null;
let maxAbsDx = 0;

let momentumRaf = 0;
let scrollVelocity = 0;
let prefersReducedMotion = false;

function maxScrollLeft(el: HTMLElement): number {
  return Math.max(0, el.scrollWidth - el.clientWidth);
}

function stopMomentum(): void {
  if (momentumRaf) {
    cancelAnimationFrame(momentumRaf);
    momentumRaf = 0;
  }
  scrollVelocity = 0;
}

function applyRubberScroll(el: HTMLElement, raw: number): void {
  const max = maxScrollLeft(el);
  if (raw < 0) {
    el.scrollLeft = raw * RUBBER;
  } else if (raw > max) {
    el.scrollLeft = max + (raw - max) * RUBBER;
  } else {
    el.scrollLeft = raw;
  }
}

function tickMomentum(now: number, el: HTMLElement, lastNow: number): void {
  const dt = Math.min(32, Math.max(1, now - lastNow));
  const max = maxScrollLeft(el);
  const friction = Math.pow(1 - MOMENTUM_FRICTION_PER_MS, dt);
  scrollVelocity *= friction;

  const next = el.scrollLeft + scrollVelocity * dt;

  if (next <= 0) {
    el.scrollLeft = 0;
    scrollVelocity = 0;
    momentumRaf = 0;
    return;
  }
  if (next >= max) {
    el.scrollLeft = max;
    scrollVelocity = 0;
    momentumRaf = 0;
    return;
  }

  el.scrollLeft = next;

  if (Math.abs(scrollVelocity) < MOMENTUM_MIN_SPEED) {
    scrollVelocity = 0;
    momentumRaf = 0;
    return;
  }

  momentumRaf = requestAnimationFrame((t) => tickMomentum(t, el, now));
}

function startMomentumFromSamples(el: HTMLElement, samples: { t: number; sl: number }[]): void {
  if (prefersReducedMotion || samples.length < 2) return;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const dt = last.t - first.t;
  if (dt < 1) return;
  const v = (last.sl - first.sl) / dt;
  if (Math.abs(v) < 0.012) return;
  stopMomentum();
  scrollVelocity = v * MOMENTUM_BOOST;
  const t0 = performance.now();
  momentumRaf = requestAnimationFrame((t) => tickMomentum(t, el, t0));
}

function handleCardClick(actionCode: string): void {
  if (ignoreNextClick) {
    ignoreNextClick = false;
    return;
  }
  emit("toolNavigate", actionCode);
}

const scrollSamples: { t: number; sl: number }[] = [];

function pushScrollSample(el: HTMLElement): void {
  const t = performance.now();
  scrollSamples.push({ t, sl: el.scrollLeft });
  while (scrollSamples.length > 6) {
    scrollSamples.shift();
  }
}

function onPointerDown(e: PointerEvent): void {
  const el = trackRef.value;
  if (!el || e.button !== 0) return;
  stopMomentum();
  pointerDown = true;
  maxAbsDx = 0;
  startX = e.clientX;
  startScrollLeft = el.scrollLeft;
  activePointerId = e.pointerId;
  scrollSamples.length = 0;
  pushScrollSample(el);
  try {
    el.setPointerCapture(e.pointerId);
  } catch {
    /* 已在 capture 等 */
  }
}

function onPointerMove(e: PointerEvent): void {
  if (!pointerDown || e.pointerId !== activePointerId) return;
  const el = trackRef.value;
  if (!el) return;
  const dx = e.clientX - startX;
  maxAbsDx = Math.max(maxAbsDx, Math.abs(dx));
  if (maxAbsDx > DRAG_THRESHOLD_PX) {
    applyRubberScroll(el, startScrollLeft - dx);
    pushScrollSample(el);
  }
}

function onPointerUp(e: PointerEvent): void {
  if (!pointerDown || e.pointerId !== activePointerId) return;
  pointerDown = false;
  activePointerId = null;
  if (maxAbsDx > DRAG_THRESHOLD_PX) {
    ignoreNextClick = true;
  }
  const el = trackRef.value;
  if (el) {
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
    const max = maxScrollLeft(el);
    if (el.scrollLeft < 0) el.scrollLeft = 0;
    if (el.scrollLeft > max) el.scrollLeft = max;
    if (maxAbsDx > DRAG_THRESHOLD_PX) {
      startMomentumFromSamples(el, scrollSamples);
    }
  }
  scrollSamples.length = 0;
}

function onPointerCancel(e: PointerEvent): void {
  stopMomentum();
  onPointerUp(e);
}

function onWheel(e: WheelEvent): void {
  const el = trackRef.value;
  if (!el || el.scrollWidth <= el.clientWidth + 1) return;
  stopMomentum();
  const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (delta === 0) return;
  el.scrollLeft += delta;
  e.preventDefault();
}

onMounted(() => {
  prefersReducedMotion =
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
  wheelEl = trackRef.value;
  wheelEl?.addEventListener("wheel", onWheel, { passive: false });
});

onUnmounted(() => {
  stopMomentum();
  wheelEl?.removeEventListener("wheel", onWheel);
  wheelEl = null;
});
</script>

<template>
  <section class="featured-row" aria-label="featured tools">
    <div
      ref="trackRef"
      class="featured-row__track"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <button
        v-for="card in cards"
        :key="card.id"
        type="button"
        class="feat-card"
        @click="handleCardClick(card.actionCode)"
      >
        <div class="feat-card__icon-wrap" :style="{ background: card.gradient }">
          <img :src="card.iconUrl" alt="" class="feat-card__icon-img" />
        </div>
        <h3 class="feat-card__title">{{ t(card.titleKey) }}</h3>
        <p class="feat-card__desc">{{ t(card.descriptionKey) }}</p>
        <span class="feat-card__cta">
          <span>{{ ctaLabel }}</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14m-5-6 6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.featured-row {
  width: 100%;
  min-width: 0;
  /* 为子级 hover 上浮 + 阴影留出绘制空间，避免被父级裁剪 */
  margin-top: -4px;
  margin-bottom: -8px;
  padding-top: 4px;
  padding-bottom: 8px;
}

.featured-row__track {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 12px;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: visible;
  overscroll-behavior-x: contain;
  /* 上：translateY(-2px) + 阴影；左右：大阴影；下：阴影下垂 */
  padding: 14px 12px 22px;
  margin: -14px -12px -22px;
  box-sizing: border-box;
  cursor: grab;
  scrollbar-width: none;
  touch-action: pan-x;
}
.featured-row__track:active {
  cursor: grabbing;
}
.featured-row__track::-webkit-scrollbar {
  display: none;
}

.feat-card {
  position: relative;
  flex: 0 0 auto;
  width: 168px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  background: #ffffff;
  padding: 18px 16px 16px;
  cursor: pointer;
  min-height: 198px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  will-change: transform;
}
.feat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  border-color: #dbeafe;
}
.feat-card:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .feat-card {
    transition: border-color 180ms ease, box-shadow 180ms ease;
  }
  .feat-card:hover {
    transform: none;
  }
}

.feat-card__icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
.feat-card__icon-img {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 12px;
}
.feat-card__title {
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 600;
  color: #1f2937;
  letter-spacing: 0;
}
.feat-card__desc {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: #9aa1ad;
  white-space: pre-line;
}
.feat-card__cta {
  margin-top: auto;
  padding-top: 14px;
  font-size: 12px;
  font-weight: 500;
  color: #6366f1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.feat-card__cta svg {
  width: 14px;
  height: 14px;
}
</style>
