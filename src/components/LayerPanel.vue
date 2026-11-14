<script setup lang="ts">
import { computed } from 'vue'
import type { Drawing, LayerKey } from '@/types'
import { LAYER_DEFS, LAYER_ORDER } from '@/render/layers'

const props = defineProps<{ drawing: Drawing }>()
const emit = defineEmits<{ (e: 'change'): void }>()

const usableLayers = LAYER_ORDER.filter((k) => k !== 'dirt-clean')

const counts = computed(() => {
  const m = new Map<LayerKey, number>()
  for (const e of props.drawing.entities) m.set(e.layer, (m.get(e.layer) ?? 0) + 1)
  return m
})

function toggle(key: LayerKey) {
  props.drawing.layerState[key].visible = !props.drawing.layerState[key].visible
  emit('change')
}
function onOpacity(key: LayerKey, v: number) {
  props.drawing.layerState[key].opacity = v
  emit('change')
}
function swatch(c: [number, number, number, number]) {
  return `rgba(${c.map((v, i) => (i < 3 ? Math.round(v * 255) : v)).join(',')})`
}
</script>

<template>
  <div class="layers">
    <div class="head-row">
      <b>图层控制</b>
      <span class="muted">点击眼睛单独开关</span>
    </div>
    <div v-for="key in usableLayers" :key="key" class="layer-row">
      <button class="eye" :title="drawing.layerState[key].visible ? '隐藏图层' : '显示图层'" @click="toggle(key)">
        {{ drawing.layerState[key].visible ? '👁' : '🚫' }}
      </button>
      <span class="swatch" :style="{ background: swatch(LAYER_DEFS[key].stroke) }" />
      <span class="name">{{ LAYER_DEFS[key].name }}</span>
      <span class="tag">{{ counts.get(key) ?? 0 }}</span>
      <input
        class="opacity"
        type="range"
        min="0.15"
        max="1"
        step="0.05"
        :value="drawing.layerState[key].opacity"
        :disabled="!drawing.layerState[key].visible"
        @input="onOpacity(key, Number(($event.target as HTMLInputElement).value))"
      />
    </div>
  </div>
</template>

<style scoped>
.layers {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.head-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}
.layer-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 4px;
  border-radius: 5px;
  font-size: 13px;
}
.layer-row:hover {
  background: #f2f6fb;
}
.eye {
  border: none;
  background: none;
  padding: 2px 4px;
  font-size: 14px;
}
.swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.25);
  flex-shrink: 0;
}
.name {
  flex: 1;
}
.opacity {
  width: 64px;
  padding: 0;
}
</style>
