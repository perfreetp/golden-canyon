<template>
  <svg
    :viewBox="`0 0 ${W} ${H}`"
    class="echo-svg"
    :style="{ background: pal.bg }"
    @pointermove="onMove"
    @pointerup="dragging = null"
    @pointerleave="dragging = null"
  >
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" :fill="pal.flow" />
      </marker>
    </defs>

    <!-- 探头扇形 -->
    <path :d="sectorPath" :fill="pal.sector" :stroke="pal.sectorEdge" stroke-width="1" />
    <circle :cx="W / 2" cy="18" r="10" :fill="pal.sectorEdge" />

    <!-- 腔室轮廓 -->
    <path
      v-for="c in chambers"
      :key="c.key"
      :d="c.path"
      :fill="chamberColor(c)"
      fill-opacity="0.22"
      :stroke="chamberColor(c)"
      :stroke-width="lineWidth"
      stroke-linejoin="round"
    />

    <!-- 瓣膜 -->
    <line
      v-for="v in view.valves"
      :key="v.key"
      :x1="v.x1" :y1="v.y1" :x2="v.x2" :y2="v.y2"
      :stroke="pal.valve" :stroke-width="lineWidth + 1.5" stroke-linecap="round"
    />

    <!-- 血流方向 -->
    <line
      v-for="f in view.flows"
      :key="f.key"
      :x1="f.x1" :y1="f.y1" :x2="f.x2" :y2="f.y2"
      :stroke="pal.flow" :stroke-width="lineWidth" stroke-dasharray="6 4"
      marker-end="url(#arrow)"
    />

    <!-- 标注引线与文字 -->
    <g v-for="a in view.annotations" :key="a.id">
      <line
        :x1="a.anchor.x" :y1="a.anchor.y" :x2="a.x" :y2="a.y - 4"
        :stroke="isHighlighted(a) ? '#ff3b30' : pal.leader" stroke-width="1" stroke-dasharray="3 2"
      />
      <circle :cx="a.anchor.x" :cy="a.anchor.y" r="2.2" :fill="pal.leader" />
      <text
        :x="a.x" :y="a.y"
        :fill="isHighlighted(a) ? '#ff3b30' : pal.text"
        font-size="12"
        class="ann-text"
        :class="{ editable: editable, selected: selectedAnn === a.id }"
        @pointerdown.stop="editable && startDrag(a, $event)"
        @click.stop="$emit('select-ann', a)"
      >{{ a.text }}</text>
      <text v-if="a.locked" :x="a.x + lockOffset(a)" :y="a.y" font-size="10" fill="#f0a94e">🔒</text>
    </g>

    <!-- 图名 -->
    <text :x="10" :y="H - 10" :fill="pal.text" font-size="11" opacity="0.7">
      {{ view.viewName }} · #{{ view.index + 1 }}
    </text>
  </svg>
</template>

<script setup>
import { ref, computed } from 'vue'
import { PALETTES, CANVAS_W as W, CANVAS_H as H } from '../generator'
import { textBBox } from '../qc'

const props = defineProps({
  view: { type: Object, required: true },
  palette: { type: String, default: 'standard' },
  lineWidth: { type: Number, default: 2 },
  probeAngle: { type: Number, default: 0 },
  editable: { type: Boolean, default: false },
  selectedAnn: { type: String, default: '' },
  highlightTargets: { type: Array, default: () => [] } // 质控高亮的 targetKey
})
const emit = defineEmits(['select-ann', 'move-ann'])

const pal = computed(() => PALETTES[props.palette] || PALETTES.standard)
const chambers = computed(() => props.view.chambers)

function chamberColor(c) {
  const arr = pal.value.chambers
  return arr[c.colorIdx % arr.length]
}

// 探头扇形（顶部探头，向下张开 80°）
const sectorPath = computed(() => {
  const cx = W / 2, cy = 18, r = 620
  const a0 = (50 * Math.PI) / 180, a1 = (130 * Math.PI) / 180
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0)
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 0 ${x1} ${y1} Z`
})

function isHighlighted(a) {
  return props.highlightTargets.includes(a.targetKey)
}

function lockOffset(a) {
  return textBBox(a).w + 3
}

// 拖拽编辑标注位置（教研员）
const dragging = ref(null)
function startDrag(a, e) {
  dragging.value = a
  emit('select-ann', a)
  e.target.setPointerCapture?.(e.pointerId)
}
function onMove(e) {
  if (!dragging.value || !props.editable) return
  const svg = e.currentTarget
  const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse())
  emit('move-ann', { ann: dragging.value, x: Math.round(pt.x), y: Math.round(pt.y) })
}
</script>

<style scoped>
.echo-svg {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 6px;
  user-select: none;
}
.ann-text.editable { cursor: move; }
.ann-text.selected { text-decoration: underline; }
</style>
