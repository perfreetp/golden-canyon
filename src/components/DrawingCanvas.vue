<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { WebGLRenderer, LOD0_SCALE, type RenderStats } from '@/render/renderer'
import { computeBBox } from '@/render/geometry'
import {
  makeFlowEntity,
  makeLabelEntity,
  makePolylineEntity,
  makeRectEntity,
} from '@/data/factory'
import type { Drawing, DrawingEntity, EntityKind, Vec2 } from '@/types'

const props = defineProps<{
  drawing: Drawing
  selectedId: string | null
  tool: string
}>()
const emit = defineEmits<{
  (e: 'select', id: string | null): void
  (e: 'change'): void
  (e: 'stats', s: RenderStats): void
}>()

const wrap = ref<HTMLDivElement | null>(null)
const glCanvas = ref<HTMLCanvasElement | null>(null)
const overlay = ref<HTMLCanvasElement | null>(null)
const renderer = shallowRef<WebGLRenderer | null>(null)
const dpr = Math.min(window.devicePixelRatio || 1, 2)

const stats = ref<RenderStats>({
  total: 0, culled: 0, lodHidden: 0, drawn: 0, drawCalls: 0, vertices: 0, fps: 0, lod: 1,
})
const cursorWorld = ref<Vec2 | null>(null)
const draftPoints = ref<Vec2[]>([]) // 画线过程中的节点
const spaceDown = ref(false)

const isDrawTool = computed(() => props.tool !== 'select' && props.tool !== 'pan')
const drawing = props.drawing

function redrawOverlay() {
  const cv = overlay.value
  const r = renderer.value
  if (!cv || !r) return
  const ctx = cv.getContext('2d')!
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, cv.width, cv.height)
  ctx.scale(dpr, dpr)

  // 已确认标注
  for (const { e, screen } of r.visibleLabels()) {
    const cssX = screen.x / dpr
    const cssY = screen.y / dpr
    const fontSize = Math.max(11, Math.min(22, e.label!.heightMm * r.camera.view.scale / dpr))
    ctx.font = `600 ${fontSize}px "Microsoft YaHei", sans-serif`
    const text = e.label!.text
    const w = ctx.measureText(text).width
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillRect(cssX - 4, cssY - fontSize - 3, w + 8, fontSize + 6)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.strokeRect(cssX - 4, cssY - fontSize - 3, w + 8, fontSize + 6)
    ctx.fillStyle = '#222'
    ctx.fillText(text, cssX, cssY - 5)
  }

  // 绘制中的折线预览
  if (draftPoints.value.length && cursorWorld.value) {
    const pts = [...draftPoints.value, cursorWorld.value]
    ctx.lineWidth = 2.5
    ctx.strokeStyle = props.tool === 'flow-dirt' ? '#bf2f24' : props.tool === 'flow-clean' ? '#1a8c3f' : '#444'
    ctx.beginPath()
    pts.forEach((p, i) => {
      const s = r.camera.worldToScreen(p.x, p.y)
      if (i === 0) ctx.moveTo(s.x / dpr, s.y / dpr)
      else ctx.lineTo(s.x / dpr, s.y / dpr)
    })
    ctx.stroke()
    ctx.fillStyle = ctx.strokeStyle
    for (const p of draftPoints.value) {
      const s = r.camera.worldToScreen(p.x, p.y)
      ctx.beginPath()
      ctx.arc(s.x / dpr, s.y / dpr, 3.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function cssToWorld(e: MouseEvent): Vec2 {
  const rect = glCanvas.value!.getBoundingClientRect()
  return renderer.value!.screenToWorld((e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr)
}

function defaultSize(tool: string): { w: number; h: number } {
  switch (tool) {
    case 'wash-sink':
    case 'disinfect-tank':
      return { w: 1200, h: 800 }
    case 'dry-bench':
      return { w: 1600, h: 800 }
    case 'scope-cabinet':
      return { w: 1800, h: 600 }
    case 'dirt-zone':
      return { w: 2000, h: 3000 }
    default:
      return { w: 1000, h: 1000 }
  }
}

function kindOfTool(tool: string): EntityKind {
  const map: Record<string, EntityKind> = {
    'wash-sink': 'wash-sink',
    'disinfect-tank': 'disinfect-tank',
    'dry-bench': 'dry-bench',
    'scope-cabinet': 'scope-cabinet',
    'dirt-zone': 'dirt-zone',
  }
  return map[tool]
}

function placeDevice(w: Vec2) {
  const { w: ww, h: hh } = defaultSize(props.tool)
  const entity = makeRectEntity({ kind: kindOfTool(props.tool), cx: w.x, cy: w.y, w: ww, h: hh })
  drawing.entities.push(entity)
  renderer.value?.rebuildIndex()
  emit('select', entity.id)
  emit('change')
}

function finishLine() {
  if (draftPoints.value.length < 2) {
    draftPoints.value = []
    redrawOverlay()
    return
  }
  let entity: DrawingEntity
  if (props.tool === 'flow-clean' || props.tool === 'flow-dirt') {
    entity = makeFlowEntity({
      flowType: props.tool === 'flow-dirt' ? 'dirt' : 'clean',
      points: draftPoints.value,
    })
  } else if (props.tool === 'wall' || props.tool === 'door') {
    entity = makePolylineEntity(props.tool as EntityKind, draftPoints.value, false)
  } else {
    entity = makePolylineEntity('room-outline', draftPoints.value, true)
  }
  drawing.entities.push(entity)
  renderer.value?.rebuildIndex()
  draftPoints.value = []
  emit('select', entity.id)
  emit('change')
}

// ---- 鼠标交互 ----
let panning = false
let lastMouse = { x: 0, y: 0 }
let moved = false

function onMouseDown(e: MouseEvent) {
  const r = renderer.value!
  lastMouse = { x: e.clientX, y: e.clientY }
  moved = false
  if (e.button === 1 || props.tool === 'pan' || spaceDown.value) {
    panning = true
    return
  }
  if (e.button !== 0) return
  const w = cssToWorld(e)

  if (props.tool === 'label') {
    const text = window.prompt('输入标注文字：', '标注')
    if (text) {
      const entity = makeLabelEntity(text, w)
      drawing.entities.push(entity)
      r.rebuildIndex()
      emit('change')
    }
    return
  }

  if (['flow-clean', 'flow-dirt', 'wall', 'door', 'room-outline'].includes(props.tool)) {
    draftPoints.value.push(w)
    redrawOverlay()
    return
  }

  if (isDrawTool.value) {
    placeDevice(w)
    return
  }

  // 选择工具
  const rect = glCanvas.value!.getBoundingClientRect()
  const hit = r.pick(e.clientX - rect.left, e.clientY - rect.top, dpr)
  emit('select', hit ? hit.id : null)
}

function onMouseMove(e: MouseEvent) {
  const r = renderer.value!
  const dx = e.clientX - lastMouse.x
  const dy = e.clientY - lastMouse.y
  if (Math.abs(dx) + Math.abs(dy) > 2) moved = true
  cursorWorld.value = cssToWorld(e)

  if (panning) {
    r.camera.pan(dx * dpr, dy * dpr)
    r.invalidate()
    lastMouse = { x: e.clientX, y: e.clientY }
    return
  }

  if (props.tool === 'select' && !moved) {
    const rect = glCanvas.value!.getBoundingClientRect()
    const hit = r.pick(e.clientX - rect.left, e.clientY - rect.top, dpr)
    r.setHover(hit ? hit.id : null)
  }
  if (draftPoints.value.length) redrawOverlay()
  lastMouse = { x: e.clientX, y: e.clientY }
}

function onMouseUp() {
  panning = false
}

function onDblClick() {
  if (draftPoints.value.length) finishLine()
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const rect = glCanvas.value!.getBoundingClientRect()
  const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18
  renderer.value!.camera.zoomAt((e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr, factor)
  renderer.value!.invalidate()
}

function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return !!t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)
}

function onKeyDown(e: KeyboardEvent) {
  if (isTypingTarget(e)) return
  if (e.code === 'Space') {
    spaceDown.value = true
    e.preventDefault()
  }
  if (e.code === 'Enter' && draftPoints.value.length) finishLine()
  if (e.code === 'Escape') {
    draftPoints.value = []
    emit('select', null)
    redrawOverlay()
  }
  // 选择模式下方向键微调：100mm，Shift 加速 500mm；R 旋转 90°
  if (props.selectedId && props.tool === 'select') {
    const step = e.shiftKey ? 500 : 100
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      thisNudge(-step, 0)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      thisNudge(step, 0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      thisNudge(0, step)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      thisNudge(0, -step)
    } else if (e.key.toLowerCase() === 'r') {
      rotateSelected()
    }
  }
  if (e.code === 'Delete' || e.code === 'Backspace') {
    if (props.selectedId && props.tool === 'select') {
      const target = drawing.entities.find((x) => x.id === props.selectedId)
      if (target && !target.locked && confirm('确认删除选中图元？')) {
        drawing.entities = drawing.entities.filter((x) => x.id !== props.selectedId)
        renderer.value?.rebuildIndex()
        emit('select', null)
        emit('change')
      }
    }
  }
}

function thisNudge(dx: number, dy: number) {
  const e = drawing.entities.find((x) => x.id === props.selectedId)
  if (!e || e.locked) return
  if (e.geom) {
    e.geom.cx += dx
    e.geom.cy += dy
  } else if (e.label) {
    e.label.at.x += dx
    e.label.at.y += dy
  } else if (e.flow || e.polyline) {
    const pts = e.flow?.points ?? e.polyline!
    for (const p of pts) {
      p.x += dx
      p.y += dy
    }
  }
  e.bbox = computeBBox(e)
  e.updatedAt = Date.now()
  renderer.value?.rebuildIndex()
  emit('change')
}

function rotateSelected() {
  const e = drawing.entities.find((x) => x.id === props.selectedId)
  if (!e?.geom || e.locked) return
  const g = e.geom
  const oldW = g.w
  g.w = g.h
  g.h = oldW
  g.rotation += Math.PI / 2
  e.bbox = computeBBox(e)
  e.updatedAt = Date.now()
  renderer.value?.rebuildIndex()
  emit('change')
}
function onKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') spaceDown.value = false
}

function resize() {
  const el = wrap.value
  const r = renderer.value
  if (!el || !r) return
  const w = el.clientWidth
  const h = el.clientHeight
  r.resize(w, h, dpr)
  if (overlay.value) {
    overlay.value.style.width = `${w}px`
    overlay.value.style.height = `${h}px`
    overlay.value.width = Math.round(w * dpr)
    overlay.value.height = Math.round(h * dpr)
  }
  redrawOverlay()
}

let ro: ResizeObserver | null = null

onMounted(() => {
  const r = new WebGLRenderer(glCanvas.value!, (s) => {
    stats.value = s
    emit('stats', s)
  })
  renderer.value = r
  r.onFrame = () => redrawOverlay()
  r.setDrawing(drawing)
  resize()
  // 首次进入自动框选房间范围
  r.camera.frameRect(drawing.entities[0]?.bbox ?? { x: 0, y: 0, w: 12000, h: 7000 })
  r.start()
  // Vue 3.4+ 模板 wheel 事件默认 passive，这里手动注册以支持 preventDefault
  glCanvas.value!.addEventListener('wheel', onWheel, { passive: false })
  ro = new ResizeObserver(resize)
  ro.observe(wrap.value!)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  glCanvas.value?.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  renderer.value?.dispose()
})

watch(
  () => props.drawing.id,
  () => {
    renderer.value?.setDrawing(props.drawing)
    renderer.value?.camera.frameRect(props.drawing.entities[0]?.bbox ?? { x: 0, y: 0, w: 12000, h: 7000 })
    draftPoints.value = []
  },
)

watch(
  () => props.selectedId,
  (id) => renderer.value?.setSelected(id),
)

// 图层开关/图元属性变化后由父组件调用
defineExpose({
  refresh() {
    const r = renderer.value
    if (!r) return
    r.rebuildIndex()
    redrawOverlay()
  },
  frameAll() {
    const r = renderer.value
    if (!r) return
    const b = drawing.entities[0]?.bbox ?? { x: 0, y: 0, w: 12000, h: 7000 }
    r.camera.frameRect(b)
    r.invalidate()
  },
  zoom(factor: number) {
    const r = renderer.value!
    r.camera.zoomAt(r.camera.width / 2, r.camera.height / 2, factor)
    r.invalidate()
  },
  getCrossingCount: () => renderer.value?.getCrossingCount() ?? 0,
  nudgeSelected: (dx: number, dy: number) => thisNudge(dx, dy),
  /** 选中设备旋转 90° */
  rotateSelected,
  redraw: () => redrawOverlay(),
})
</script>

<template>
  <div ref="wrap" class="canvas-wrap" :class="{ cross: isDrawTool || tool === 'pan' }">
    <canvas
      ref="glCanvas"
      class="gl"
      :style="{ cursor: tool === 'pan' || spaceDown ? 'grab' : isDrawTool ? 'crosshair' : 'default' }"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @dblclick="onDblClick"
      @contextmenu.prevent
    />
    <canvas ref="overlay" class="overlay" />
    <div class="hud">
      <span>缩放 {{ (renderer?.camera.view.scale ?? 0).toFixed(4) }} px/mm</span>
      <span :class="['tag', stats.lod === 0 ? 'warn' : 'ok']">
        {{ stats.lod === 0 ? `低倍概览：仅房间轮廓/主干流线（阈值 ${LOD0_SCALE}）` : '细节层级' }}
      </span>
      <span>图元 {{ stats.total }}｜绘制 {{ stats.drawn }}｜裁剪 {{ stats.culled }}｜LOD 隐藏 {{ stats.lodHidden }}</span>
      <span>draw calls {{ stats.drawCalls }}｜顶点 {{ stats.vertices }}</span>
      <span>{{ stats.fps }} FPS</span>
    </div>
    <div v-if="cursorWorld" class="coord">
      世界坐标 X {{ cursorWorld.x.toFixed(0) }} / Y {{ cursorWorld.y.toFixed(0) }} mm
    </div>
    <div v-if="draftPoints.length" class="hint">
      已取 {{ draftPoints.length }} 点：单击加点，双击或 Enter 完成，Esc 取消
    </div>
  </div>
</template>

<style scoped>
.canvas-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #fbfbfa;
}
.gl,
.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.overlay {
  pointer-events: none;
}
.hud {
  position: absolute;
  left: 10px;
  top: 10px;
  display: flex;
  gap: 12px;
  align-items: center;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--c-text-2);
  pointer-events: none;
}
.coord {
  position: absolute;
  right: 10px;
  bottom: 10px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 12px;
  font-family: Consolas, monospace;
  pointer-events: none;
}
.hint {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  background: #2b3a4f;
  color: #fff;
  border-radius: 14px;
  padding: 6px 18px;
  font-size: 12.5px;
  pointer-events: none;
}
</style>
