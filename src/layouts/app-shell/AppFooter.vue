<script setup lang="ts">
import HomeFooterBar from "@/pages/home/components/HomeFooterBar.vue";

defineProps<{
  versionPrefix: string;
  version: string;
  slogan: string;
  heartIconUrl: string;
}>();
</script>

<template>
  <HomeFooterBar
    :version-prefix="versionPrefix"
    :version="version"
    :slogan="slogan"
    :heart-icon-url="heartIconUrl"
  />
</template>
