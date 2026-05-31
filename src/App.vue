<template>
  <AppLayout />
  <AppConfirmDialog />
  <EntitlementUpgradeDialog />
</template>

<script setup lang="ts">
import AppLayout from "@/layouts/AppLayout.vue";
import AppConfirmDialog from "@/components/dialogs/AppConfirmDialog.vue";
import EntitlementUpgradeDialog from "@/components/entitlement/EntitlementUpgradeDialog.vue";
</script>
