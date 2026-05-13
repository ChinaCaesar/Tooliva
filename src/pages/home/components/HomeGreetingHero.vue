<script setup lang="ts">

defineProps<{

  title: string;

  subtitle: string;

  waveIconUrl?: string;

  illustrationUrl?: string;

}>();

</script>



<template>

  <section class="greeting-hero">

    <div class="greeting-hero__text">

      <h1 class="greeting-hero__title">

        <span>{{ title }}</span>

        <img

          v-if="waveIconUrl"

          :src="waveIconUrl"

          alt=""

          class="greeting-hero__wave"

          aria-hidden="true"

        />

      </h1>

      <p class="greeting-hero__subtitle">{{ subtitle }}</p>

    </div>

    <img

      v-if="illustrationUrl"

      :src="illustrationUrl"

      alt=""

      class="greeting-hero__illustration"

      aria-hidden="true"

    />

  </section>

</template>



<style scoped>

.greeting-hero {

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 16px;

  min-height: 96px;

}

.greeting-hero__text {

  flex: 1;

  min-width: 0;

  display: flex;

  flex-direction: column;

  gap: 6px;

}

.greeting-hero__title {

  margin: 0;

  font-size: clamp(20px, 1.8vw, 24px);

  line-height: 1.25;

  font-weight: 700;

  color: #1f2937;

  letter-spacing: 0;

  display: inline-flex;

  align-items: center;

  gap: 8px;

}

.greeting-hero__wave {

  width: clamp(22px, 2vw, 28px);

  height: clamp(22px, 2vw, 28px);

  object-fit: contain;

  flex-shrink: 0;

  display: inline-block;

  vertical-align: middle;

  animation: greeting-wave 2.6s ease-in-out 0.4s 2;

  transform-origin: 70% 80%;

}

@keyframes greeting-wave {

  0%, 100% { transform: rotate(0deg); }

  20% { transform: rotate(14deg); }

  40% { transform: rotate(-8deg); }

  60% { transform: rotate(14deg); }

  80% { transform: rotate(-4deg); }

}

@media (prefers-reduced-motion: reduce) {

  .greeting-hero__wave {

    animation: none;

  }

}

.greeting-hero__subtitle {

  margin: 0;

  font-size: clamp(12px, 1vw, 13px);

  line-height: 1.5;

  color: #9aa1ad;

  letter-spacing: 0;

}

.greeting-hero__illustration {

  height: clamp(86px, 10vw, 112px);

  width: auto;

  flex-shrink: 0;

  object-fit: contain;

  pointer-events: none;

  user-select: none;

  filter: drop-shadow(0 8px 20px rgba(99, 102, 241, 0.14));
  position: relative;
  bottom: -30%;
  /* 添加上下移动动画 transform: translateY(-30%); */
  animation: floating 3s ease-in-out infinite;

}

@keyframes floating {

  0% { transform: translateY(-6px); }

  50% { transform: translateY(6px); }

  100% { transform: translateY(-6px); }

} 

@media (max-width: 640px) {

  .greeting-hero__illustration {

    display: none;

  }

}

</style>

