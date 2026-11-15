<template>
  <div class="painter">
    <!-- 左:打样单列表 + 导入 -->
    <section class="panel orders">
      <h3>打样单</h3>
      <div class="import-box">
        <input v-model="newModel" placeholder="素体模型名,如 苍蓝骑士 1/7" />
        <div class="row">
          <select v-model="newBatch">
            <option v-for="b in batches" :key="b" :value="b">{{ b }}</option>
          </select>
          <button @click="importModel" :disabled="!newModel.trim()">导入素体模型</button>
        </div>
      </div>
      <ul class="order-list">
        <li v-for="o in store.orders" :key="o.id"
            :class="{ active: current?.id === o.id }"
            @click="selectOrder(o)">
          <div class="row-between">
            <b>{{ o.id }}</b>
            <span class="tag" :class="o.status">{{ o.status }}</span>
          </div>
          <div class="dim">{{ o.modelName }} · {{ o.batch }}</div>
          <div v-if="isOverdue(o)" class="err-text">已超期(截止 {{ fmtTime(o.deadline).slice(0,10) }})</div>
        </li>
      </ul>
    </section>

    <!-- 中:WebGL2 素体 -->
    <section class="panel viewport">
      <h3>
        素体分色预览
        <span v-if="current" class="dim"> — {{ current.modelName }} ({{ current.id }})</span>
        <span v-else class="dim"> — 请先选择或导入打样单</span>
      </h3>
      <canvas ref="canvasRef" class="gl"></canvas>
      <div class="hint">拖拽旋转 · 滚轮缩放 · 点击模型区域选中分色区</div>
    </section>

    <!-- 右:分色区编辑 -->
    <section class="panel editor" v-if="current">
      <h3>分色区参数</h3>
      <div class="status-line">
        当前状态:<span class="tag" :class="current.status">{{ current.status }}</span>
        <span v-if="current.reworkCount" class="dim">返工 {{ current.reworkCount }} 次</span>
      </div>
      <div v-for="r in REGIONS" :key="r.key"
           class="region-card"
           :class="{ sel: selRegion === r.key, err: errors[r.key] }"
           @click="selRegion = r.key">
        <div class="row-between">
          <b>{{ r.name }}</b>
          <span v-if="errors[r.key]" class="err-text">⚠ {{ errors[r.key] }}</span>
        </div>
        <div class="grid">
          <label>漆号
            <select v-model="current.regions[r.key].paintNo" @change="onPaintNoChange(r.key)" :disabled="!editable">
              <option value="">— 未绑定 —</option>
              <option v-for="p in PAINT_CATALOG" :key="p.no" :value="p.no">{{ p.no }} {{ p.name }}</option>
            </select>
          </label>
          <label>颜色
            <span class="color-line">
              <span class="swatch" :style="{ background: current.regions[r.key].color || '#555' }"></span>
              <input type="color" v-model="regionColor[r.key]" @input="onColorPick(r.key)" :disabled="!editable" />
            </span>
          </label>
          <label>光泽度
            <select v-model="current.regions[r.key].gloss" :disabled="!editable">
              <option v-for="g in GLOSS_LEVELS" :key="g" :value="g">{{ g }}</option>
            </select>
          </label>
          <label>喷涂遍数
            <input type="number" min="1" max="6" v-model.number="current.regions[r.key].coats" :disabled="!editable" />
          </label>
        </div>
      </div>

      <div class="actions">
        <button v-if="current.status === '待分色'" @click="begin">开始分色</button>
        <button v-if="editable" class="submit" @click="submit">提交打样单</button>
        <span v-if="submitMsg" class="err-text">{{ submitMsg }}</span>
        <span v-if="current.status === '待审批'" class="dim">已提交,等待品控审批…</span>
        <span v-if="current.status === '通过'" class="ok-text">✓ 已通过,车间可见</span>
      </div>
      <div v-if="current.returnRecords.length" class="returns">
        <h4>退回记录</h4>
        <div v-for="(rec, i) in current.returnRecords" :key="i" class="return-item">
          <span class="err-text">#{{ i + 1 }} {{ fmtTime(rec.time) }}</span> {{ rec.reason }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { store, getOrder, validateOrder, startPainting, submitProof, isOverdue, fmtTime, STATUS } from '../store.js'
import { REGIONS, PAINT_CATALOG, GLOSS_LEVELS, paintByNo, hexToRgb } from '../data/paints.js'
import { FigurineRenderer } from '../webgl/figurine.js'

const canvasRef = ref(null)
let renderer = null

const current = ref(null)
const selRegion = ref('head')
const newModel = ref('')
const newBatch = ref('B2026-11B')
const submitMsg = ref('')
const regionColor = ref({})

const batches = computed(() => [...new Set(store.orders.map(o => o.batch))].sort())
const errors = computed(() => current.value ? validateOrder(current.value) : {})
const editable = computed(() => current.value && [STATUS.PAINTING, STATUS.RETURNED].includes(current.value.status))

const GLOSS_MAP = { '哑光': 0.1, '半光': 0.4, '亮光': 0.7, '珠光': 0.8, '金属': 0.95 }

function syncRenderer() {
  if (!renderer || !current.value) return
  const rs = {}
  for (const r of REGIONS) {
    const reg = current.value.regions[r.key]
    rs[r.key] = {
      color: reg.color ? hexToRgb(reg.color).map(v => v / 255) : null,
      gloss: GLOSS_MAP[reg.gloss] ?? 0.15,
      highlight: !!errors.value[r.key]
    }
  }
  renderer.setRegions(rs)
  renderer.setSelected(selRegion.value)
}

function selectOrder(o) {
  current.value = o
  submitMsg.value = ''
  syncRegionColorInputs()
}

function syncRegionColorInputs() {
  if (!current.value) return
  const rc = {}
  for (const r of REGIONS) rc[r.key] = current.value.regions[r.key].color || '#d1ccc2'
  regionColor.value = rc
}

function importModel() {
  const id = 'PO-' + (Math.max(...store.orders.map(o => +o.id.slice(3)), 100) + 1)
  const o = {
    id, batch: newBatch.value, modelName: newModel.value.trim(), sculptor: '当前涂装师',
    status: STATUS.PENDING, regions: {
      head:  { paintNo: '', color: '', gloss: '哑光', coats: 1 },
      torso: { paintNo: '', color: '', gloss: '哑光', coats: 1 },
      cape:  { paintNo: '', color: '', gloss: '哑光', coats: 1 },
      base:  { paintNo: '', color: '', gloss: '哑光', coats: 1 }
    },
    reworkCount: 0, returnRecords: [], history: [],
    createdAt: Date.now(), submittedAt: null, approvedAt: null,
    deadline: Date.now() + 7 * 86400000
  }
  store.orders.unshift(o)
  newModel.value = ''
  selectOrder(o)
}

function begin() { startPainting(current.value) }

function onPaintNoChange(key) {
  const reg = current.value.regions[key]
  const p = paintByNo(reg.paintNo)
  if (p) {
    reg.color = p.hex
    regionColor.value[key] = p.hex
  }
}

function onColorPick(key) {
  current.value.regions[key].color = regionColor.value[key]
}

function submit() {
  const errs = submitProof(current.value)
  if (errs) {
    submitMsg.value = '存在漏涂/空漆号区域,已标红,无法提交'
  } else {
    submitMsg.value = ''
  }
}

watch([() => current.value?.regions, errors, selRegion], syncRenderer, { deep: true })
watch(current, () => nextTick(syncRenderer))

onMounted(() => {
  renderer = new FigurineRenderer(canvasRef.value)
  renderer.onPick = key => { if (key) selRegion.value = key }
  if (store.orders.length) selectOrder(store.orders[0])
  syncRenderer()
})
onBeforeUnmount(() => renderer?.dispose())
</script>

<style scoped>
.painter { display: grid; grid-template-columns: 280px 1fr 360px; gap: 14px; align-items: start; }
@media (max-width: 1200px) { .painter { grid-template-columns: 1fr; } }
.orders { max-height: calc(100vh - 100px); overflow: auto; }
.import-box { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.row { display: flex; gap: 8px; }
.row select { flex: 1; }
.order-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.order-list li { background: var(--panel2); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; cursor: pointer; }
.order-list li.active { border-color: var(--accent); }
.row-between { display: flex; justify-content: space-between; align-items: center; }
.dim { color: var(--dim); font-size: 12px; }
.viewport { display: flex; flex-direction: column; }
.gl { width: 100%; height: calc(100vh - 220px); min-height: 420px; border-radius: 8px; touch-action: none; cursor: grab; }
.hint { color: var(--dim); font-size: 12px; margin-top: 8px; text-align: center; }
.editor { max-height: calc(100vh - 100px); overflow: auto; }
.status-line { margin-bottom: 10px; display: flex; gap: 8px; align-items: center; }
.region-card { background: var(--panel2); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; cursor: pointer; }
.region-card.sel { border-color: var(--accent); }
.region-card.err { border-color: var(--red); box-shadow: 0 0 0 1px var(--red); animation: pulse 1.2s infinite; }
@keyframes pulse { 50% { box-shadow: 0 0 10px rgba(229,72,77,.7); } }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
.grid label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--dim); }
.color-line { display: flex; align-items: center; gap: 8px; }
input[type=color] { width: 40px; height: 26px; padding: 0 2px; }
.actions { display: flex; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
.submit { background: var(--green); }
.ok-text { color: var(--green); }
.returns { margin-top: 14px; }
.returns h4 { margin: 0 0 6px; color: var(--dim); font-size: 13px; }
.return-item { font-size: 12px; padding: 4px 0; border-bottom: 1px dashed var(--line); }
</style>
