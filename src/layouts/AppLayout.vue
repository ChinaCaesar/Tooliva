<template>
  <div class="layout">
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  background: #f4f7fb;
}

.content {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

.content :deep(.panel) {
  margin: 24px;
}
</style>
