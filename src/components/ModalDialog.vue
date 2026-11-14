<script setup lang="ts">
defineProps<{ title: string; width?: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="mask" @mousedown.self="emit('close')">
      <div class="dlg panel" :style="{ width: width ?? '520px' }">
        <header>
          <b>{{ title }}</b>
          <button class="x" @click="emit('close')">×</button>
        </header>
        <div class="body">
          <slot />
        </div>
        <footer v-if="$slots.footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 28, 40, 0.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 100;
  padding-top: 8vh;
}
.dlg {
  max-height: 82vh;
  display: flex;
  flex-direction: column;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--c-border);
}
.x {
  border: none;
  font-size: 20px;
  padding: 0 6px;
  line-height: 1;
}
.body {
  padding: 16px;
  overflow: auto;
}
footer {
  padding: 10px 16px;
  border-top: 1px solid var(--c-border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
