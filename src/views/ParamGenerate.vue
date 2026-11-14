<template>
  <div>
    <div class="panel">
      <h3>参数生成 <small>选择批次 → 生成/重排 → 手动微调（自动锁定）→ 跑检查 → 提交复核</small></h3>
      <div class="row">
        <label class="field" style="min-width:260px">批次
          <select v-model="currentId">
            <option v-for="b in store.batches" :key="b.id" :value="b.id">
              {{ b.id }} · {{ b.supplier }} · {{ BATCH_STATUS[b.status].name }}
            </option>
          </select>
        </label>
        <template v-if="batch">
          <span class="tag">{{ VIEW_TYPES[batch.viewType].name }}</span>
          <span class="tag">{{ LEVELS[batch.level].name }}</span>
          <span class="tag">角度 {{ batch.probeAngle }}°</span>
          <span class="tag">线宽 {{ batch.lineWidth }}px</span>
          <span class="tag">{{ PALETTES[batch.palette].name }}</span>
          <span class="tag mono">种子 {{ batch.seed }}</span>
        </template>
      </div>

      <div v-if="batch" class="row mt">
        <template v-if="can('generate')">
          <button class="btn" @click="doGenerate" :disabled="batch.status === 'submitted' || batch.status === 'released'">
            {{ batch.views.length ? '按种子重新生成（保留锁定）' : '生成素材' }}
          </button>
          <button class="btn ghost" @click="doQc" :disabled="!batch.views.length">运行自动检查</button>
          <button class="btn ok" @click="doSubmit" :disabled="!canSubmit">提交复核</button>
        </template>
        <span v-if="!can('generate')" class="muted" style="font-size:12px">
          当前身份为「{{ ROLES[store.role].name }}」，仅可查看，生成与编辑需教研员身份。
        </span>
        <span v-if="qcRan" class="muted" style="font-size:12px">
          检查完成：严重 {{ counts.severe }} · 一般 {{ counts.major }} · 提示 {{ counts.minor }}
        </span>
      </div>
    </div>

    <template v-if="batch && batch.views.length">
      <!-- 缩略图选择 -->
      <div class="panel">
        <h3>切面列表 <small>点击切换编辑对象；🔒 为已锁定标注</small></h3>
        <div class="row">
          <div
            v-for="v in batch.views" :key="v.index"
            :style="thumbStyle(v.index)"
            style="width:150px; cursor:pointer; border-radius:8px; overflow:hidden"
            @click="currentView = v.index"
          >
            <EchoView :view="v" :palette="batch.palette" :line-width="batch.lineWidth" />
          </div>
        </div>
      </div>

      <!-- 编辑区 -->
      <div class="panel" v-if="view">
        <h3>
          切面 #{{ view.index + 1 }} 细节
          <small>{{ editable ? '拖动标注文字即可微调，改动自动锁定；重新生成只重排未锁定部分' : '只读' }}</small>
        </h3>
        <div class="grid" style="grid-template-columns: 1.4fr 1fr">
          <EchoView
            :view="view" :palette="batch.palette" :line-width="batch.lineWidth"
            :editable="editable" :selected-ann="selectedAnn"
            :highlight-targets="highlightTargets"
            @select-ann="(a) => (selectedAnn = a.id)"
            @move-ann="onMoveAnn"
          />
          <div>
            <h4 style="margin:0 0 8px">标注列表</h4>
            <table class="data">
              <thead><tr><th>文字</th><th>目标</th><th>状态</th><th v-if="editable">操作</th></tr></thead>
              <tbody>
                <tr v-for="a in view.annotations" :key="a.id"
                    :style="a.id === selectedAnn ? 'background:rgba(91,141,239,.12)' : ''"
                    @click="selectedAnn = a.id" style="cursor:pointer">
                  <td>
                    <input v-if="editable && a.id === selectedAnn" v-model="a.text"
                           @input="markManual(a)" style="width:110px; padding:2px 6px" />
                    <span v-else>{{ a.text }}</span>
                  </td>
                  <td class="mono" style="font-size:11px">{{ a.targetKey }}</td>
                  <td>
                    <span v-if="a.locked" class="chip" style="background:var(--warn);color:#222">🔒 锁定</span>
                    <span v-else class="tag">未锁定</span>
                  </td>
                  <td v-if="editable">
                    <button class="btn sm ghost" @click.stop="toggleLock(a)">{{ a.locked ? '解锁' : '锁定' }}</button>
                    <button class="btn sm bad" @click.stop="removeAnn(a)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p class="muted" style="font-size:12px">
              面积占比：
              <span v-for="c in view.chambers" :key="c.key" class="tag">
                {{ c.label }} {{ (c.actualRatio * 100).toFixed(1) }}% / 标准 {{ (c.targetRatio * 100).toFixed(0) }}%
              </span>
            </p>
          </div>
        </div>
      </div>
    </template>
    <div v-else-if="batch" class="panel empty">该批次尚未生成素材，请先点击「生成素材」。</div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  store, can, ROLES, BATCH_STATUS,
  generateBatch, regenerateBatch, runQc, submitBatch, issuesOf
} from '../store'
import { VIEW_TYPES, LEVELS, PALETTES } from '../generator'
import EchoView from '../components/EchoView.vue'

const props = defineProps({ focusBatch: { type: String, default: '' } })

const currentId = ref(props.focusBatch || store.batches[0]?.id || '')
watch(() => props.focusBatch, (v) => { if (v) currentId.value = v })

const batch = computed(() => store.batches.find((b) => b.id === currentId.value))
const currentView = ref(0)
const view = computed(() => batch.value?.views[currentView.value])
const selectedAnn = ref('')
const qcRan = ref(false)

const editable = computed(() =>
  can('edit') && batch.value && !['submitted', 'released'].includes(batch.value.status)
)
const canSubmit = computed(() =>
  batch.value && batch.value.views.length && qcRan.value &&
  !['submitted', 'released'].includes(batch.value.status)
)

const counts = computed(() => {
  const c = { severe: 0, major: 0, minor: 0 }
  if (!batch.value) return c
  issuesOf(batch.value.id).forEach((i) => c[i.severity]++)
  return c
})

// 当前视图存在问题的目标高亮
const highlightTargets = computed(() => {
  if (!batch.value || !view.value) return []
  return issuesOf(batch.value.id)
    .filter((i) => i.viewIndex === view.value.index && i.targetKey)
    .map((i) => i.targetKey)
})

function doGenerate() {
  if (batch.value.views.length) regenerateBatch(batch.value)
  else generateBatch(batch.value)
  qcRan.value = false
}
function doQc() {
  runQc(batch.value)
  qcRan.value = true
}
function doSubmit() {
  submitBatch(batch.value)
  alert(`批次 ${batch.value.id} 已提交复核`)
}
function onMoveAnn({ ann, x, y }) {
  ann.x = x
  ann.y = y
  markManual(ann)
}
function markManual(a) {
  a.manual = true
  a.locked = true // 手动改过的局部自动打锁定标记
}
function toggleLock(a) {
  a.locked = !a.locked
}
function removeAnn(a) {
  const v = view.value
  v.annotations = v.annotations.filter((x) => x.id !== a.id)
}
function thumbStyle(i) {
  return i === currentView.value
    ? { outline: '2px solid var(--accent)' }
    : { outline: '1px solid var(--border)' }
}
</script>
