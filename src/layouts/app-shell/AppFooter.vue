<script setup lang="ts">
import HomeFooterBar from "@/pages/home/components/HomeFooterBar.vue";

defineProps<{
  versionPrefix: string;
  version: string;
  slogan: string;
}>();
</script>

<template>
  <HomeFooterBar :version-prefix="versionPrefix" :version="version" :slogan="slogan" />
</template>
