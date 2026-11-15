<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Route, SignalDevice, Station } from '../types'
import { buildTopology } from '../lib/topology'

const props = defineProps<{
  station: Station
  locked: boolean
  highlightRoute?: Route | null
  activeSwitchIds?: string[]
  activeSectionIds?: string[]
  openSignalIds?: string[]
  failTargetId?: string | null
}>()

const emit = defineEmits<{
  (e: 'add-device', kind: 'switch' | 'section' | 'signal', rowId: string, x: number, ev: DragEvent): void
  (e: 'select', kind: 'switch' | 'section' | 'signal' | 'row' | null, id: string | null): void
}>()

const wrap = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D | null = null
let raf = 0

// 视图变换
const view = { scale: 1, ox: 0, oy: 0 }
const mouse = { x: 0, y: 0, inside: false }

interface DragState {
  mode: 'move' | 'pan'
  kind?: 'switch' | 'section' | 'signal'
  id?: string
  startX: number
  startY: number
  moved: boolean
}
let drag: DragState | null = null
let panning = false
let panStart = { x: 0, y: 0, ox: 0, oy: 0 }

function toWorld(clientX: number, clientY: number) {
  const rect = canvas.value!.getBoundingClientRect()
  const sx = clientX - rect.left
  const sy = clientY - rect.top
  return { x: (sx - view.ox) / view.scale, y: (sy - view.oy) / view.scale }
}

function nearestRowY(y: number) {
  let best = props.station.rows[0]
  let d = Infinity
  for (const r of props.station.rows) {
    const dd = Math.abs(r.y - y)
    if (dd < d) { d = dd; best = r }
  }
  return best
}

// ---------- 命中检测 ----------
function hitTest(wx: number, wy: number): { kind: 'switch' | 'section' | 'signal' | 'row'; id: string } | null {
  const st = props.station
  for (const s of st.signals) {
    const row = st.rows.find((r) => r.id === s.rowId)
    if (!row) continue
    if (Math.abs(wx - s.x) <= 12 && Math.abs(wy - row.y) <= 16) return { kind: 'signal', id: s.id }
  }
  for (const s of st.switches) {
    const row = st.rows.find((r) => r.id === s.rowId)
    if (!row) continue
    if (Math.abs(wx - s.x) <= 14 && Math.abs(wy - row.y) <= 16) return { kind: 'switch', id: s.id }
  }
  for (const sec of st.sections) {
    const row = st.rows.find((r) => r.id === sec.rowId)
    if (!row) continue
    if (wx >= sec.x1 - 6 && wx <= sec.x2 + 6 && Math.abs(wy - row.y) <= 14) return { kind: 'section', id: sec.id }
  }
  for (const row of st.rows) {
    if (wx >= row.x1 && wx <= row.x2 && Math.abs(wy - row.y) <= 12) return { kind: 'row', id: row.id }
  }
  return null
}

// ---------- 鼠标交互 ----------
function onDown(e: MouseEvent) {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    panning = true
    panStart = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy }
    e.preventDefault()
    return
  }
  if (e.button !== 0 || props.locked) return
  const w = toWorld(e.clientX, e.clientY)
  const hit = hitTest(w.x, w.y)
  if (hit && hit.kind !== 'row') {
    drag = {
      mode: 'move',
      kind: hit.kind as 'switch' | 'section' | 'signal',
      id: hit.id,
      startX: e.clientX,
      startY: e.clientY,
      moved: false
    }
    emit('select', hit.kind, hit.id)
  } else if (hit?.kind === 'row') {
    emit('select', 'row', hit.id)
  } else {
    emit('select', null, null)
  }
}

function onMove(e: MouseEvent) {
  const rect = canvas.value!.getBoundingClientRect()
  mouse.x = e.clientX - rect.left
  mouse.y = e.clientY - rect.top
  mouse.inside = true

  if (panning) {
    view.ox = panStart.ox + (e.clientX - panStart.x)
    view.oy = panStart.oy + (e.clientY - panStart.y)
    return
  }
  if (!drag || props.locked) return
  const d = drag
  const w = toWorld(e.clientX, e.clientY)
  if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) > 3) d.moved = true
  const st = props.station
  const row = nearestRowY(w.y) // 吸附到最近股道中心线
  const cx = Math.max(30, Math.min(st.width - 30, Math.round(w.x)))

  if (d.kind === 'switch') {
    const sw = st.switches.find((s) => s.id === d.id)!
    sw.x = cx
    sw.rowId = row.id
  } else if (d.kind === 'signal') {
    const sig = st.signals.find((s) => s.id === d.id)!
    sig.x = cx
    sig.rowId = row.id
  } else if (d.kind === 'section') {
    const sec = st.sections.find((s) => s.id === d.id)!
    const width = sec.x2 - sec.x1
    const center = Math.max(30 + width / 2, Math.min(st.width - 30 - width / 2, cx))
    sec.x1 = Math.round(center - width / 2)
    sec.x2 = Math.round(center + width / 2)
    sec.rowId = row.id
  }
}

function onUp() {
  panning = false
  drag = null
}

function onLeave() {
  mouse.inside = false
  panning = false
  drag = null
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const rect = canvas.value!.getBoundingClientRect()
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
  const ns = Math.max(0.35, Math.min(2.4, view.scale * factor))
  // 以鼠标为锚点缩放
  view.ox = sx - ((sx - view.ox) / view.scale) * ns
  view.oy = sy - ((sy - view.oy) / view.scale) * ns
  view.scale = ns
}

function onDblClick(e: MouseEvent) {
  if (props.locked) return
  const w = toWorld(e.clientX, e.clientY)
  const hit = hitTest(w.x, w.y)
  if (!hit || hit.kind === 'row') return
  const st = props.station
  let name = ''
  if (hit.kind === 'switch') name = st.switches.find((s) => s.id === hit.id)?.name ?? ''
  if (hit.kind === 'section') name = st.sections.find((s) => s.id === hit.id)?.name ?? ''
  if (hit.kind === 'signal') name = st.signals.find((s) => s.id === hit.id)?.name ?? ''
  const next = prompt('修改设备名称：', name)
  if (next == null) return
  const trimmed = next.trim()
  if (!trimmed) return
  if (hit.kind === 'switch') Object.assign(st.switches.find((s) => s.id === hit.id)!, { name: trimmed })
  if (hit.kind === 'section') Object.assign(st.sections.find((s) => s.id === hit.id)!, { name: trimmed })
  if (hit.kind === 'signal') Object.assign(st.signals.find((s) => s.id === hit.id)!, { name: trimmed })
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  if (props.locked) return
  const kind = e.dataTransfer?.getData('device-kind') as 'switch' | 'section' | 'signal' | ''
  if (!kind || props.station.rows.length === 0) return
  const w = toWorld(e.clientX, e.clientY)
  const row = nearestRowY(w.y)
  const x = Math.max(30, Math.min(props.station.width - 30, Math.round(w.x)))
  emit('add-device', kind, row.id, x, e)
}

function onDragOver(e: DragEvent) {
  if (!props.locked) e.preventDefault()
}

// ---------- 绘制 ----------
function draw() {
  const c = canvas.value
  const g = ctx
  if (!c || !g) return
  const dpr = window.devicePixelRatio || 1
  const w = c.clientWidth
  const h = c.clientHeight
  if (c.width !== w * dpr || c.height !== h * dpr) {
    c.width = w * dpr
    c.height = h * dpr
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.clearRect(0, 0, w, h)
  g.save()
  g.translate(view.ox, view.oy)
  g.scale(view.scale, view.scale)

  const st = props.station
  drawGrid(g, w, h)

  // 高亮进路的区段集合
  const hlSections = new Set<string>()
  const hlSwitches = new Set<string>()
  if (props.highlightRoute) {
    props.highlightRoute.sectionOrder.forEach((id) => hlSections.add(id))
    props.highlightRoute.switchReqs.forEach((r) => hlSwitches.add(r.switchId))
  }
  ;(props.activeSectionIds ?? []).forEach((id) => hlSections.add(id))
  ;(props.activeSwitchIds ?? []).forEach((id) => hlSwitches.add(id))

  // 股道
  for (const row of st.rows) {
    g.strokeStyle = row.main ? '#1a2735' : '#5a6b7d'
    g.lineWidth = row.main ? 3 : 2
    g.beginPath()
    g.moveTo(row.x1, row.y)
    g.lineTo(row.x2, row.y)
    g.stroke()
    // 名称
    g.fillStyle = '#7a8898'
    g.font = '12px sans-serif'
    g.textAlign = 'left'
    g.fillText(row.name + (row.main ? '（正线·中心线）' : ''), row.x1, row.y - 14)
  }

  // 渡线（对齐道岔之间）
  const topo = buildTopology(st)
  for (const edge of topo.edges) {
    if (!edge.slip) continue
    const a = topo.nodes.get(edge.a)!
    const b = topo.nodes.get(edge.b)!
    g.strokeStyle = '#5a6b7d'
    g.lineWidth = 2
    g.setLineDash([6, 4])
    g.beginPath()
    g.moveTo(a.x, a.y)
    g.lineTo(b.x, b.y)
    g.stroke()
    g.setLineDash([])
  }

  // 区段
  for (const sec of st.sections) {
    const row = st.rows.find((r) => r.id === sec.rowId)
    if (!row) continue
    const active = hlSections.has(sec.id)
    const failed = props.failTargetId === sec.id
    g.lineWidth = active ? 9 : 7
    g.strokeStyle = failed ? '#d63031' : active ? '#ffb020' : sec.blocked ? '#b04a4a' : '#9fb2c6'
    g.lineCap = 'butt'
    g.beginPath()
    g.moveTo(sec.x1, row.y)
    g.lineTo(sec.x2, row.y)
    g.stroke()
    g.lineCap = 'butt'
    g.fillStyle = failed ? '#d63031' : '#33475c'
    g.font = '11px sans-serif'
    g.textAlign = 'center'
    g.fillText(sec.name + (sec.blocked ? '（封锁）' : ''), (sec.x1 + sec.x2) / 2, row.y + 24)
  }

  // 道岔
  for (const sw of st.switches) {
    const row = st.rows.find((r) => r.id === sw.rowId)
    if (!row) continue
    const active = hlSwitches.has(sw.id)
    const failed = props.failTargetId === sw.id
    drawSwitch(g, sw.x, row.y, active, failed, !!st.sections.length)
    g.fillStyle = failed ? '#d63031' : '#1c2733'
    g.font = 'bold 12px sans-serif'
    g.textAlign = 'center'
    g.fillText(sw.name, sw.x, row.y - 20)
  }

  // 信号机
  for (const sig of st.signals) {
    const row = st.rows.find((r) => r.id === sig.rowId)
    if (!row) continue
    const open = props.openSignalIds?.includes(sig.id)
    const failed = props.failTargetId === sig.id
    drawSignal(g, sig, row.y, !!open, failed)
  }

  // 画布边界
  g.strokeStyle = '#c8d2de'
  g.lineWidth = 1
  g.setLineDash([4, 4])
  g.strokeRect(0, 0, st.width, st.height)
  g.setLineDash([])

  g.restore()
  raf = requestAnimationFrame(draw)
}

function drawGrid(g: CanvasRenderingContext2D, vw: number, vh: number) {
  g.fillStyle = '#fbfcfe'
  g.fillRect(-view.ox / view.scale, -view.oy / view.scale, vw / view.scale, vh / view.scale)
  g.strokeStyle = '#eef2f7'
  g.lineWidth = 1 / view.scale
  const step = 40
  const x0 = Math.floor(-view.ox / view.scale / step) * step
  const y0 = Math.floor(-view.oy / view.scale / step) * step
  for (let x = x0; x < x0 + vw / view.scale + step; x += step) {
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + vh / view.scale + step); g.stroke()
  }
  for (let y = y0; y < y0 + vh / view.scale + step; y += step) {
    g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + vw / view.scale + step, y); g.stroke()
  }
}

function drawSwitch(g: CanvasRenderingContext2D, x: number, y: number, active: boolean, failed: boolean, _hasSec: boolean) {
  g.save()
  g.translate(x, y)
  g.strokeStyle = failed ? '#d63031' : active ? '#e67e22' : '#1c2733'
  g.fillStyle = '#fff'
  g.lineWidth = 2.5
  g.beginPath()
  g.arc(0, 0, 7, 0, Math.PI * 2)
  g.fill()
  g.stroke()
  // 道岔岔尖三角
  g.fillStyle = failed ? '#d63031' : active ? '#e67e22' : '#1c2733'
  g.beginPath()
  g.moveTo(7, 0)
  g.lineTo(15, -7)
  g.lineTo(15, 7)
  g.closePath()
  g.fill()
  if (active) {
    g.strokeStyle = 'rgba(230,126,34,0.35)'
    g.lineWidth = 2
    g.beginPath(); g.arc(0, 0, 13, 0, Math.PI * 2); g.stroke()
  }
  g.restore()
}

function drawSignal(g: CanvasRenderingContext2D, sig: SignalDevice, y: number, open: boolean, failed: boolean) {
  g.save()
  g.translate(sig.x, y)
  const dirSign = sig.direction === 'right' ? 1 : -1
  // 机柱
  g.strokeStyle = '#33475c'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(0, -22)
  g.stroke()
  // 灯箱
  const colors = sig.kind === 'shunt'
    ? (open ? ['#e8e8e8', '#3fd17a'] : ['#d63031', '#e8e8e8'])
    : (open ? ['#e8e8e8', '#3fd17a', '#e8e8e8'] : ['#d63031', '#e8e8e8', '#e8e8e8'])
  const boxW = 16
  const boxH = sig.kind === 'shunt' ? 20 : 28
  g.fillStyle = failed ? '#7a2020' : '#2b3a4c'
  g.fillRect(dirSign * 6 - boxW / 2 + (dirSign > 0 ? 4 : -4), -boxH - 24, boxW, boxH)
  const cx = dirSign * 6 + (dirSign > 0 ? 4 : -4)
  const nLights = sig.kind === 'shunt' ? 2 : 3
  for (let i = 0; i < nLights; i++) {
    const ly = -boxH - 24 + boxH / (nLights + 1) * (i + 1)
    g.fillStyle = colors[i]
    g.beginPath(); g.arc(cx, ly, 4.2, 0, Math.PI * 2); g.fill()
  }
  g.fillStyle = failed ? '#d63031' : '#1c2733'
  g.font = 'bold 11px sans-serif'
  g.textAlign = 'center'
  g.fillText(sig.name + (open ? '（开放）' : ''), 0, -boxH - 32)
  g.restore()
}

function resetView() {
  view.scale = 1
  view.ox = 12
  view.oy = 24
}

defineExpose({ resetView })

onMounted(() => {
  ctx = canvas.value!.getContext('2d')
  resetView()
  raf = requestAnimationFrame(draw)
  window.addEventListener('mouseup', onUp)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('mouseup', onUp)
})

watch(() => props.station.id, () => resetView())
</script>

<template>
  <div ref="wrap" class="canvas-wrap">
    <canvas
      ref="canvas"
      class="canvas"
      :class="{ grabbing: panning }"
      @mousedown="onDown"
      @mousemove="onMove"
      @mouseleave="onLeave"
      @wheel="onWheel"
      @dblclick="onDblClick"
      @drop="onDrop"
      @dragover="onDragOver"
    />
    <div class="canvas-hint">
      滚轮缩放 · Alt/中键拖动平移 · 设备可直接拖拽（自动吸附股道中心线）· 双击改名 · 从左侧设备库拖入新设备
    </div>
  </div>
</template>

<style scoped>
.canvas-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  background: #fbfcfe;
}
.canvas { width: 100%; height: 100%; display: block; cursor: crosshair; }
.canvas.grabbing { cursor: grabbing; }
.canvas-hint {
  position: absolute;
  left: 10px;
  bottom: 8px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--muted);
  pointer-events: none;
}
</style>
