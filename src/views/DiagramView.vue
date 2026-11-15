<script setup lang="ts">
import { computed, ref } from 'vue'
import StationCanvas from '../components/StationCanvas.vue'
import {
  addRow, addSection, addSignal, addSwitch, canEdit, currentStation, removeRow,
  removeSection, removeSignal, removeSwitch, state, updateRow, updateSection,
  updateSignal, updateSwitch
} from '../store'
import type { SignalKind } from '../types'

const station = computed(() => currentStation.value!)
const editable = computed(() => state.role === 'designer' && canEdit.value)

const canvasRef = ref<InstanceType<typeof StationCanvas>>()
const selected = ref<{ kind: 'switch' | 'section' | 'signal' | 'row' | null; id: string | null }>({ kind: null, id: null })

const rowForm = ref({ name: '', y: 300, main: false })
const sigKind = ref<SignalKind>('shunt')

function dragStart(kind: string, e: DragEvent, signalKind?: SignalKind) {
  if (!e.dataTransfer) return
  e.dataTransfer.setData('device-kind', kind)
  if (signalKind) e.dataTransfer.setData('signal-kind', signalKind)
  e.dataTransfer.effectAllowed = 'copy'
}

function onAddDevice(kind: 'switch' | 'section' | 'signal', rowId: string, x: number, ev: DragEvent) {
  const st = station.value
  if (kind === 'switch') {
    const sw = addSwitch(st, rowId, x)
    selected.value = { kind: 'switch', id: sw.id }
  } else if (kind === 'section') {
    const sec = addSection(st, rowId, x)
    selected.value = { kind: 'section', id: sec.id }
  } else {
    const sk = (ev.dataTransfer?.getData('signal-kind') || sigKind.value) as SignalKind
    const direction = sk === 'entry' ? 'right' : sk === 'exit' ? 'left' : 'right'
    const sig = addSignal(st, rowId, x, sk, direction)
    selected.value = { kind: 'signal', id: sig.id }
  }
}

function addTrackRow() {
  const st = station.value
  const name = rowForm.value.name.trim() || `${st.rows.length + 1}G`
  const y = rowForm.value.y || 120 + st.rows.length * 110
  addRow(st, name, Math.min(y, st.height - 40), rowForm.value.main)
  rowForm.value = { name: '', y: 300, main: false }
}

const selSwitch = computed(() =>
  selected.value.kind === 'switch' ? station.value.switches.find((s) => s.id === selected.value.id) : null)
const selSection = computed(() =>
  selected.value.kind === 'section' ? station.value.sections.find((s) => s.id === selected.value.id) : null)
const selSignal = computed(() =>
  selected.value.kind === 'signal' ? station.value.signals.find((s) => s.id === selected.value.id) : null)
const selRow = computed(() =>
  selected.value.kind === 'row' ? station.value.rows.find((r) => r.id === selected.value.id) : null)

function rowName(id: string) {
  return station.value.rows.find((r) => r.id === id)?.name ?? '—'
}

function deleteSelected() {
  const st = station.value
  const { kind, id } = selected.value
  if (!kind || !id) return
  if (kind === 'switch') removeSwitch(st, id)
  if (kind === 'section') removeSection(st, id)
  if (kind === 'signal') removeSignal(st, id)
  if (kind === 'row') {
    if (confirm('删除该股道将同时删除其上的道岔、区段和信号机，确认？')) removeRow(st, id)
  }
  selected.value = { kind: null, id: null }
}
</script>

<template>
  <div v-if="station">
    <h2 class="page-title">
      站场图编制
      <span v-if="!editable" class="tag orange">只读模式（{{ state.role === 'designer' ? '车站已提交/发布，需退回后编辑' : '当前角色无编辑权限' }}）</span>
    </h2>

    <div class="layout">
      <!-- 设备库 -->
      <aside class="panel palette">
        <h3>设备库</h3>
        <p class="muted tip">拖动画布中设备可移位，自动吸附到最近股道中心线；双击设备改名。</p>

        <div class="pal-item" draggable="true" :class="{ off: !editable }"
             @dragstart="dragStart('switch', $event)">
          <span class="ico sw-ico">⤚</span>
          <div><b>道岔</b><div class="muted">命名如 1#、2#</div></div>
        </div>
        <div class="pal-item" draggable="true" :class="{ off: !editable }"
             @dragstart="dragStart('section', $event)">
          <span class="ico sec-ico">▬</span>
          <div><b>轨道区段</b><div class="muted">命名如 1DG，吸附中心线</div></div>
        </div>

        <div class="sig-head">信号机</div>
        <div class="pal-item" draggable="true" :class="{ off: !editable }"
             @dragstart="dragStart('signal', $event, 'entry')">
          <span class="ico sig-in">●</span>
          <div><b>进站信号机</b><div class="muted">X/S 系列，接车始端</div></div>
        </div>
        <div class="pal-item" draggable="true" :class="{ off: !editable }"
             @dragstart="dragStart('signal', $event, 'exit')">
          <span class="ico sig-out">●</span>
          <div><b>出站信号机</b><div class="muted">发车终端</div></div>
        </div>
        <div class="pal-item" draggable="true" :class="{ off: !editable }"
             @dragstart="dragStart('signal', $event, 'shunt')">
          <span class="ico sig-sh">●</span>
          <div><b>调车信号机</b><div class="muted">D 系列，调车按钮</div></div>
        </div>

        <div class="sig-head">股道</div>
        <div class="row-form">
          <input v-model="rowForm.name" placeholder="股道名，如 5G" :disabled="!editable" />
          <label class="mini">Y 坐标 <input type="number" v-model.number="rowForm.y" :disabled="!editable" /></label>
          <label class="mini ck"><input type="checkbox" v-model="rowForm.main" :disabled="!editable" /> 正线（中心线）</label>
          <button class="sm primary" :disabled="!editable" @click="addTrackRow">添加股道</button>
        </div>
      </aside>

      <!-- 画布 -->
      <section class="canvas-area">
        <StationCanvas
          ref="canvasRef"
          :station="station"
          :locked="!editable"
          @add-device="onAddDevice"
          @select="(k, id) => (selected = { kind: k, id })"
        />
      </section>

      <!-- 右侧属性/清单 -->
      <aside class="panel side">
        <h3>属性</h3>
        <div v-if="selSwitch" class="prop">
          <label>道岔名称<input v-model="selSwitch.name" :disabled="!editable" /></label>
          <label>所属股道
            <select v-model="selSwitch.rowId" :disabled="!editable">
              <option v-for="r in station.rows" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </label>
          <label>X 坐标<input type="number" v-model.number="selSwitch.x" :disabled="!editable" /></label>
          <button class="sm danger" :disabled="!editable" @click="deleteSelected">删除道岔</button>
        </div>
        <div v-else-if="selSection" class="prop">
          <label>区段名称<input v-model="selSection.name" :disabled="!editable" /></label>
          <label>所属股道
            <select v-model="selSection.rowId" :disabled="!editable">
              <option v-for="r in station.rows" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </label>
          <label>起点 X<input type="number" v-model.number="selSection.x1" :disabled="!editable" /></label>
          <label>终点 X<input type="number" v-model.number="selSection.x2" :disabled="!editable" /></label>
          <button class="sm danger" :disabled="!editable" @click="deleteSelected">删除区段</button>
        </div>
        <div v-else-if="selSignal" class="prop">
          <label>信号机名称<input v-model="selSignal.name" :disabled="!editable" /></label>
          <label>类型
            <select v-model="selSignal.kind" :disabled="!editable">
              <option value="entry">进站信号机</option>
              <option value="exit">出站信号机</option>
              <option value="shunt">调车信号机</option>
            </select>
          </label>
          <label>授权运行方向
            <select v-model="selSignal.direction" :disabled="!editable">
              <option value="right">向右（上行）</option>
              <option value="left">向左（下行）</option>
            </select>
          </label>
          <label>所属股道
            <select v-model="selSignal.rowId" :disabled="!editable">
              <option v-for="r in station.rows" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </label>
          <label>X 坐标<input type="number" v-model.number="selSignal.x" :disabled="!editable" /></label>
          <button class="sm danger" :disabled="!editable" @click="deleteSelected">删除信号机</button>
        </div>
        <div v-else-if="selRow" class="prop">
          <label>股道名称<input v-model="selRow.name" :disabled="!editable" /></label>
          <label>Y 坐标<input type="number" v-model.number="selRow.y" :disabled="!editable" /></label>
          <label class="ck"><input type="checkbox" v-model="selRow.main" :disabled="!editable" /> 正线（股道中心线）</label>
          <button class="sm danger" :disabled="!editable" @click="deleteSelected">删除股道及其设备</button>
        </div>
        <div v-else class="muted empty-mini">点击或拖入设备后在此编辑属性</div>

        <h3 class="mt">设备清单（{{ station.switches.length }}/{{ station.sections.length }}/{{ station.signals.length }}）</h3>
        <div class="dev-list scroll">
          <div v-for="s in station.switches" :key="s.id" class="dev-row"
               :class="{ on: selected.kind === 'switch' && selected.id === s.id }"
               @click="selected = { kind: 'switch', id: s.id }">
            <span class="tag gray">道岔</span>{{ s.name }}<span class="muted">{{ rowName(s.rowId) }}</span>
          </div>
          <div v-for="s in station.sections" :key="s.id" class="dev-row"
               :class="{ on: selected.kind === 'section' && selected.id === s.id }"
               @click="selected = { kind: 'section', id: s.id }">
            <span class="tag blue">区段</span>{{ s.name }}<span class="muted">{{ rowName(s.rowId) }}</span>
          </div>
          <div v-for="s in station.signals" :key="s.id" class="dev-row"
               :class="{ on: selected.kind === 'signal' && selected.id === s.id }"
               @click="selected = { kind: 'signal', id: s.id }">
            <span class="tag purple">信号机</span>{{ s.name }}
            <span class="muted">{{ { entry: '进站', exit: '出站', shunt: '调车' }[s.kind] }} · {{ s.direction === 'left' ? '←' : '→' }}</span>
          </div>
          <div v-if="!station.switches.length && !station.sections.length && !station.signals.length" class="muted empty-mini">
            暂无设备，请先添加股道并从设备库拖入
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 230px 1fr 290px;
  gap: 14px;
  height: calc(100vh - 210px);
  min-height: 480px;
}
.panel { overflow: auto; }
h3 { margin: 4px 0 10px; font-size: 15px; }
.tip { font-size: 12px; line-height: 1.5; }
.pal-item {
  display: flex; align-items: center; gap: 10px;
  border: 1px dashed var(--line);
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  cursor: grab;
  background: #fafbfd;
}
.pal-item:active { cursor: grabbing; }
.pal-item.off { opacity: 0.45; cursor: not-allowed; }
.ico { font-size: 20px; }
.sw-ico { color: var(--ink); }
.sec-ico { color: #5a7ba6; font-size: 16px; }
.sig-in { color: var(--primary); }
.sig-out { color: var(--ok); }
.sig-sh { color: var(--accent); }
.sig-head { font-weight: 700; margin: 14px 0 8px; font-size: 13px; color: #33475c; }
.row-form { display: flex; flex-direction: column; gap: 8px; }
.mini { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
.ck { flex-direction: row !important; align-items: center; }
.canvas-area { min-width: 0; }
.side { display: flex; flex-direction: column; }
.prop { display: flex; flex-direction: column; gap: 10px; }
.prop label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
.mt { margin-top: 18px; }
.empty-mini { font-size: 12px; padding: 12px 4px; }
.dev-list { max-height: 46%; overflow: auto; display: flex; flex-direction: column; gap: 4px; }
.dev-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.dev-row:hover { background: var(--band); }
.dev-row.on { background: #e6effd; }
.dev-row .muted { margin-left: auto; font-size: 11px; }
</style>
