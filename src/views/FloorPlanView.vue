<template>
  <div class="floor-page">
    <div class="card floor-card">
      <div class="card-h">
        <span>中心分层平面图</span>
        <span class="pill">{{ elementCount }} 个要素</span>
        <span class="pill">视口外裁剪 · OffscreenCanvas 瓦片 512px</span>
        <div style="flex:1"></div>
        <div class="zoom-group">
          <button v-for="(z, i) in zoomLabels" :key="i" class="btn sm" :class="{ primary: state.zoomIndex === i }" @click="setZoom(i)">
            {{ z }}
          </button>
          <button class="btn sm" @click="fitAll">⤢ 全览</button>
        </div>
      </div>
      <div class="card-b canvas-wrap" ref="wrapRef">
        <canvas ref="canvasRef" class="floor-canvas"></canvas>
        <canvas ref="miniRef" class="minimap" width="200" height="139"></canvas>
        <div class="layer-panel card">
          <div class="card-h" style="padding:10px 14px">图层开关</div>
          <div class="card-b" style="padding:8px 14px">
            <label v-for="l in toggleLayers" :key="l.key" class="layer-row">
              <span class="switch">
                <input type="checkbox" :checked="state.layers[l.key]" @change="toggleLayer(l.key)" />
                <i></i>
              </span>
              <span>{{ l.label }}</span>
              <i class="dot" :style="{ background: l.color }"></i>
            </label>
          </div>
        </div>
        <div class="legend">
          <span><i style="background:#9fb3c8"></i>空闲</span>
          <span><i style="background:#f5222d"></i>使用中</span>
          <span><i style="background:#1677ff"></i>已预约</span>
          <span><i style="background:#722ed1"></i>洗消中</span>
          <span><i style="background:#fa8c16"></i>维护</span>
          <span><i style="background:#52c41a"></i>可用</span>
        </div>
      </div>
    </div>

    <div v-if="selected" class="card popup" :style="popupStyle">
      <div class="card-h">
        <span>{{ selected.name }} <small class="muted" v-if="selected.meta?.code">（{{ selected.meta.code }}）</small></span>
        <button class="btn sm" @click="closePopup">✕</button>
      </div>
      <div class="card-b">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
          <span class="tag" :class="selected.status">{{ statusText(selected.status) }}</span>
          <span class="muted" style="font-size:12px">坐标 {{ Math.round(selected.x) }}, {{ Math.round(selected.y) }}</span>
        </div>

        <!-- 镜位/检查间：当天排程 -->
        <template v-if="roomConfig">
          <div class="timeline scroll-x">
            <table>
              <thead>
                <tr><th>时段</th><th>患者</th><th>项目</th><th>医师</th><th>镜体</th><th>状态</th><th>优先级</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in timeline" :key="row.slot" :class="{ now: row.slot === currentSlot }">
                  <td>{{ slotLabel(row.slot) }}</td>
                  <td v-if="row.items.length">
                    <div v-for="a in row.items" :key="a.id">
                      {{ maskName(a.patientName) }} <small class="muted">{{ a.patientNo }}</small>
                    </div>
                  </td>
                  <td v-else class="muted">—</td>
                  <td>
                    <div v-for="a in row.items" :key="a.id">{{ a.procName }}</div>
                    <span v-if="!row.items.length" class="muted">—</span>
                  </td>
                  <td>
                    <div v-for="a in row.items" :key="a.id">{{ doctorName(a.doctorId) }}</div>
                    <span v-if="!row.items.length" class="muted">—</span>
                  </td>
                  <td>
                    <div v-for="a in row.items" :key="a.id">{{ scopeCode(a.scopeId) }}</div>
                    <span v-if="!row.items.length" class="muted">—</span>
                  </td>
                  <td>
                    <span v-for="a in row.items" :key="a.id" class="tag" :class="a.status">{{ apptStatusText(a.status) }}</span>
                    <span v-if="!row.items.length" class="muted">—</span>
                  </td>
                  <td>
                    <span v-for="a in row.items" :key="a.id" class="tag" :class="a.priority">{{ priorityText(a.priority) }}</span>
                    <span v-if="!row.items.length" class="muted">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="margin-top:10px;display:flex;gap:8px">
            <router-link class="btn sm primary" :to="`/scheduling?room=${roomConfig.code}`">前往排程工作台</router-link>
            <router-link class="btn sm" to="/rooms">检查间容量配置</router-link>
          </div>
        </template>

        <!-- 复苏床 -->
        <template v-else-if="selected.type === 'recoveryBed'">
          <p v-if="selected.meta?.patientNo" style="margin:0 0 8px">占用患者编号：<b>{{ selected.meta.patientNo }}</b></p>
          <p v-else class="muted" style="margin:0">当前无复苏患者，平均复苏观察 25 分钟。</p>
        </template>

        <!-- 洗消工位 -->
        <template v-else-if="selected.type === 'washStation'">
          <p style="margin:0">洗消流程：床侧预处理 → 测漏 → 清洗漂洗 → 高水平消毒 → 终末漂洗 → 干燥储存</p>
          <p v-if="selected.meta?.scopeCode" style="margin:8px 0 0">正在处理：<b>{{ selected.meta.scopeCode }}</b></p>
        </template>

        <!-- 镜柜 -->
        <template v-else-if="selected.type === 'scopeCabinet'">
          <p style="margin:0 0 6px">储镜柜编号 {{ selected.id }}</p>
          <p class="muted" style="margin:0">在柜镜体 {{ cabinetScopes.length }} 条
            <span v-if="cabinetScopes.length">：{{ cabinetScopes.map(s => s.code).join('、') }}</span>
          </p>
        </template>

        <template v-else>
          <p class="muted" style="margin:0">要素类型：{{ selected.type }}，归属 {{ selected.zoneId || '公共区' }}</p>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useStore } from '../store/store.js'
import { FloorCanvas, ZOOM_LABELS } from '../canvas/FloorCanvas.js'
import { slotLabel } from '../utils/time.js'
import { statusText, apptStatusText, priorityText } from '../utils/format.js'
import { maskName } from '../utils/rng.js'

const store = useStore()
const { state, raw, roomTimeline, alertElementMap, onElementStatusChange } = store
const canvasRef = ref(null)
const miniRef = ref(null)
const wrapRef = ref(null)
const zoomLabels = ZOOM_LABELS
const toggleLayers = [
  { key: 'device', label: '设备层', color: '#8ca6c2' },
  { key: 'schedule', label: '排程层', color: '#1677ff' },
  { key: 'alert', label: '告警层', color: '#f5222d' }
]
const selected = ref(null)
const popupPos = reactive({ x: 120, y: 120 })

let floor = null
const elementCount = computed(() => state.layout.elements.length)
const currentSlot = computed(() => Math.max(0, Math.floor((state.nowMin - 8 * 60) / 30)))

const scheduleIndexRef = computed(() => store.scheduleIndex.value)
const alertsRef = computed(() => alertElementMap.value)

onMounted(async () => {
  // 等待模板 ref 稳定挂载后再初始化画布控制器
  for (let i = 0; i < 10 && !canvasRef.value; i++) await nextTick()
  if (!canvasRef.value) return
  floor = new FloorCanvas(canvasRef.value, {
    elements: raw.layout.elements,
    byId: raw.layout.byId,
    layersActive: raw.layers,
    getZoom: () => raw.zoomIndex,
    onZoom: (i) => { raw.zoomIndex = i },
    onSelect: (el) => {
      selected.value = el
      if (el) {
        // 弹窗固定在右侧面板区，避免遮挡画布中心
        popupPos.x = Math.max(12, window.innerWidth - 660)
        popupPos.y = 80
      }
    },
    getAlerts: () => alertsRef.value,
    scheduleIndex: () => scheduleIndexRef.value,
    onStatusChange: onElementStatusChange,
    getMinimap: () => miniRef.value
  })
})

onUnmounted(() => floor?.destroy())

watch(() => state.layers, () => {
  // 设备/建筑切换不影响瓦片内容本身（瓦片按层拆分），排程层开关只需刷新；无需重建
}, { deep: true })

// 排程变化后丢弃排程层瓦片缓存
watch(() => state.appointments.map((a) => `${a.id}:${a.slot}:${a.roomId}:${a.status}`).join('|'), () => {
  floor?.invalidateSchedule()
})

function setZoom(i) { floor?.setZoom(i) }
function fitAll() { floor?.fitView(0) }
function toggleLayer(key) { raw.layers[key] = !raw.layers[key] }
function closePopup() { selected.value = null; floor.selectedId = null }

const roomConfig = computed(() => {
  if (!selected.value) return null
  const byCode = state.roomConfigs.find((r) => r.id === selected.value.id)
  if (byCode) return byCode
  if (selected.value.roomId) return state.roomConfigs.find((r) => r.id === selected.value.roomId) || null
  return null
})

const timeline = computed(() => {
  if (!roomConfig.value) return []
  return roomTimeline(roomConfig.value.id)
})

const cabinetScopes = computed(() => {
  if (!selected.value) return []
  return state.scopes.filter((s) => s.cabinetId === selected.value.id)
})

const popupStyle = computed(() => ({ left: popupPos.x + 'px', top: popupPos.y + 'px' }))

function doctorName(id) { return state.doctors.find((d) => d.id === id)?.name || '—' }
function scopeCode(id) { return state.scopes.find((s) => s.id === id)?.code || '—' }
</script>

<style scoped>
.floor-page { position: relative; height: 100%; display: flex; flex-direction: column; }
.floor-card { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.canvas-wrap { flex: 1; position: relative; padding: 0; overflow: hidden; min-height: 480px; }
.floor-canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
.zoom-group { display: flex; gap: 6px; }
.layer-panel { position: absolute; left: 14px; top: 14px; width: 190px; }
.layer-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; }
.layer-row .dot { width: 10px; height: 10px; border-radius: 50%; margin-left: auto; }
.legend {
  position: absolute; left: 14px; bottom: 12px; background: rgba(255,255,255,.92);
  border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; display: flex; gap: 14px; font-size: 12px;
}
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 4px; }
.minimap {
  position: absolute; right: 14px; bottom: 12px; border: 1px solid var(--border);
  border-radius: 8px; background: #dfe7f0; cursor: pointer;
}
.popup {
  position: fixed; width: min(620px, 92vw); max-height: 78vh; overflow: auto; z-index: 40;
}
.timeline tr.now td { background: #fffbe6; }
</style>
