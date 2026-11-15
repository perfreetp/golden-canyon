<template>
  <div class="qc">
    <!-- 左:待审批队列 -->
    <section class="panel queue">
      <h3>审批队列</h3>
      <ul class="q-list">
        <li v-for="o in reviewable" :key="o.id"
            :class="{ active: current?.id === o.id }"
            @click="select(o)">
          <div class="row-between">
            <b>{{ o.id }}</b>
            <span class="tag" :class="o.status">{{ o.status }}</span>
          </div>
          <div class="dim">{{ o.modelName }} · {{ o.batch }} · 返工{{ o.reworkCount }}次</div>
        </li>
        <li v-if="!reviewable.length" class="dim empty">暂无待审批打样单</li>
      </ul>
    </section>

    <!-- 右:对比视图 -->
    <section class="panel compare" v-if="current">
      <div class="row-between">
        <h3>标准色卡 vs 样件实拍 — {{ current.id }} {{ current.modelName }}</h3>
        <div class="ver-switch" v-if="current.history.length > 1">
          <span class="dim">修改前后对照:</span>
          <button v-for="(h, i) in current.history" :key="i"
                  class="ghost sm" :class="{ on: verIdx === i }"
                  @click="verIdx = i">
            V{{ i + 1 }}{{ i === current.history.length - 1 ? '(当前)' : '' }}
          </button>
        </div>
      </div>

      <table class="cmp-table">
        <thead>
          <tr>
            <th>分色区</th><th>漆号</th><th>标准色卡</th><th>样件实拍</th>
            <th>色差 ΔE</th><th>判定</th>
            <th v-if="comparePrev">上一版</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in compareRows" :key="row.key" :class="{ bad: row.delta > 3 }">
            <td>{{ row.name }}</td>
            <td>{{ row.paintNo || '—' }}</td>
            <td><span class="swatch lg" :style="{ background: row.stdHex }"></span> {{ row.stdHex }}</td>
            <td><span class="swatch lg" :style="{ background: row.sampleHex }"></span> {{ row.sampleHex }}</td>
            <td :class="row.delta > 3 ? 'err-text' : 'ok-text'">{{ row.delta.toFixed(1) }}</td>
            <td>
              <span v-if="row.delta > 3" class="tag 退回">超差</span>
              <span v-else class="tag 通过">合格</span>
            </td>
            <td v-if="comparePrev">
              <template v-if="row.prevHex">
                <span class="swatch lg" :style="{ background: row.prevHex }"></span>
                <span v-if="row.changed" class="changed-mark">已修改</span>
                <span v-else class="dim">未变</span>
              </template>
              <span v-else class="dim">—</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="overList.length" class="over-list">
        <h4>色差超差清单(ΔE &gt; 3,共 {{ overList.length }} 项)</h4>
        <ul>
          <li v-for="r in overList" :key="r.key">
            {{ r.name }}({{ r.paintNo }}):ΔE = {{ r.delta.toFixed(1) }}
          </li>
        </ul>
      </div>
      <div v-else class="ok-text allpass">✓ 全部分色区色差均在 3 以内</div>

      <div class="verdict" v-if="current.status === '待审批'">
        <textarea v-model="reason" placeholder="退回原因(退回时必填,将计入返工次数)"></textarea>
        <div class="btns">
          <button class="danger" @click="doReturn" :disabled="!reason.trim()">退回(返工)</button>
          <button class="pass" @click="doApprove">通过</button>
        </div>
        <div v-if="verdictMsg" class="err-text">{{ verdictMsg }}</div>
      </div>
      <div v-else class="dim">该单当前状态为「{{ current.status }}」,仅可查看。</div>
    </section>
    <section class="panel compare" v-else>
      <h3>对比视图</h3>
      <p class="dim">从左侧队列选择一张打样单进行审批。</p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { store, returnOrder, approveOrder, STATUS } from '../store.js'
import { REGIONS, paintByNo, deltaE, simulateSampleColor } from '../data/paints.js'

const current = ref(null)
const reason = ref('')
const verdictMsg = ref('')
const verIdx = ref(0)

const reviewable = computed(() =>
  store.orders.filter(o => [STATUS.REVIEW, STATUS.RETURNED, STATUS.APPROVED].includes(o.status))
    .sort((a, b) => (a.status === STATUS.REVIEW ? 0 : 1) - (b.status === STATUS.REVIEW ? 0 : 1) || b.submittedAt - a.submittedAt)
)

function select(o) {
  current.value = o
  reason.value = ''
  verdictMsg.value = ''
  verIdx.value = Math.max(0, o.history.length - 1)
}

const viewRegions = computed(() => {
  if (!current.value) return null
  const h = current.value.history
  return (h.length && h[verIdx.value]) ? h[verIdx.value].regions : current.value.regions
})

const comparePrev = computed(() => current.value && current.value.history.length > 1 && verIdx.value > 0)

const compareRows = computed(() => {
  if (!current.value || !viewRegions.value) return []
  const o = current.value
  const prev = verIdx.value > 0 ? o.history[verIdx.value - 1].regions : null
  return REGIONS.map(r => {
    const reg = viewRegions.value[r.key]
    const stdHex = reg.color || '#888888'
    // 样件实拍:以标准色为基准模拟,返工次数越多越准
    const sampleHex = reg.color ? simulateSampleColor(o.id, r.key, reg.color, o.reworkCount) : '#888888'
    const delta = reg.color ? deltaE(reg.color, sampleHex) : 0
    const prevReg = prev?.[r.key]
    return {
      key: r.key, name: r.name, paintNo: reg.paintNo,
      stdHex, sampleHex, delta,
      prevHex: prevReg?.color || null,
      changed: prevReg ? JSON.stringify(prevReg) !== JSON.stringify(reg) : false
    }
  })
})

const overList = computed(() => compareRows.value.filter(r => r.delta > 3))

function doReturn() {
  if (!reason.value.trim()) {
    verdictMsg.value = '退回必须填写原因'
    return
  }
  returnOrder(current.value, reason.value.trim(), overList.value.map(r => r.key))
  verdictMsg.value = ''
  reason.value = ''
}

function doApprove() {
  if (overList.value.length) {
    verdictMsg.value = `仍有 ${overList.value.length} 个区域色差超差(ΔE>3),不能通过,请退回返工`
    return
  }
  approveOrder(current.value)
  verdictMsg.value = ''
}
</script>

<style scoped>
.qc { display: grid; grid-template-columns: 300px 1fr; gap: 14px; align-items: start; }
@media (max-width: 1000px) { .qc { grid-template-columns: 1fr; } }
.q-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.q-list li { background: var(--panel2); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; cursor: pointer; }
.q-list li.active { border-color: var(--accent); }
.q-list li.empty { cursor: default; text-align: center; }
.row-between { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.dim { color: var(--dim); font-size: 12px; }
.cmp-table { margin-top: 10px; }
.cmp-table tr.bad { background: rgba(229, 72, 77, 0.08); }
.swatch.lg { width: 26px; height: 26px; margin-right: 6px; }
.err-text { color: var(--red); font-weight: 600; }
.ok-text { color: var(--green); }
.over-list { margin-top: 14px; border: 1px solid var(--red); border-radius: 8px; padding: 10px 14px; }
.over-list h4 { margin: 0 0 6px; color: var(--red); font-size: 13px; }
.over-list ul { margin: 0; padding-left: 18px; }
.allpass { margin-top: 14px; }
.verdict { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }
.verdict textarea { min-height: 60px; resize: vertical; }
.btns { display: flex; gap: 10px; }
.pass { background: var(--green); }
.ver-switch { display: flex; gap: 6px; align-items: center; }
.sm { padding: 3px 10px; font-size: 12px; }
.sm.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.changed-mark { color: var(--amber); font-size: 12px; margin-left: 6px; }
</style>
