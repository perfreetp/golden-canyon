<template>
  <div>
    <div class="grid" style="grid-template-columns: repeat(5, 1fr); margin-bottom:14px">
      <div class="kpi"><div class="v">{{ state.scopes.length }}</div><div class="l">镜体总数</div></div>
      <div class="kpi"><div class="v" style="color:#389e0d">{{ countByStatus.available }}</div><div class="l">在库可用</div></div>
      <div class="kpi"><div class="v" style="color:#cf1322">{{ countByStatus.in_use }}</div><div class="l">检查使用中</div></div>
      <div class="kpi"><div class="v" style="color:#722ed1">{{ countByStatus.reprocessing }}</div><div class="l">洗消周转中</div></div>
      <div class="kpi"><div class="v" style="color:#d46b08">{{ countByStatus.maintenance }}</div><div class="l">维护停用</div></div>
    </div>

    <div class="card">
      <div class="card-h">
        镜体池
        <div style="flex:1"></div>
        <select v-model="typeFilter" style="width:130px">
          <option value="">全部类型</option>
          <option v-for="(name, id) in typeNames" :key="id" :value="id">{{ name }}</option>
        </select>
        <select v-model="statusFilter" style="width:120px">
          <option value="">全部状态</option>
          <option value="available">可用</option>
          <option value="in_use">使用中</option>
          <option value="reprocessing">洗消中</option>
          <option value="maintenance">维护中</option>
        </select>
      </div>
      <div class="card-b scroll-x" style="max-height:62vh;overflow:auto">
        <table>
          <thead>
            <tr><th>编号</th><th>类型</th><th>型号</th><th>所属区</th><th>状态</th><th>今日周转</th><th>最近保养</th><th>当前位置</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="s in filtered" :key="s.id">
              <td><b>{{ s.code }}</b></td>
              <td>{{ s.typeName }}</td>
              <td>{{ s.model }}</td>
              <td>{{ s.zone }} 区</td>
              <td><span class="tag" :class="s.status === 'available' ? 'available' : s.status">{{ statusText(s.status) }}</span></td>
              <td>{{ s.usageCount }} 次</td>
              <td>{{ s.lastMaint }}</td>
              <td style="font-size:12px">{{ locationText(s) }}</td>
              <td>
                <button v-if="s.status !== 'maintenance'" class="btn sm danger" @click="setMaint(s, true)">报修维护</button>
                <button v-else class="btn sm" @click="setMaint(s, false)">修复回库</button>
                <button v-if="s.status === 'reprocessing'" class="btn sm" @click="finishReprocess(s)">提前完成洗消</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStore } from '../store/store.js'
import { statusText } from '../utils/format.js'
import { SCOPE_TYPE_NAME } from '../data/mock.js'

const store = useStore()
const { state, updateScope, logAudit } = store
const typeFilter = ref('')
const statusFilter = ref('')
const typeNames = SCOPE_TYPE_NAME

const filtered = computed(() => state.scopes.filter((s) =>
  (!typeFilter.value || s.type === typeFilter.value) &&
  (!statusFilter.value || s.status === statusFilter.value)
))

const countByStatus = computed(() => {
  const c = { available: 0, in_use: 0, reprocessing: 0, maintenance: 0 }
  for (const s of state.scopes) c[s.status]++
  return c
})

function locationText(s) {
  if (s.status === 'in_use') return `检查间 ${roomCode(s.currentRoom)}`
  if (s.status === 'reprocessing') return `洗消中 · 预计${s.reprocessUntilMin ? Math.round(s.reprocessUntilMin - state.nowMin) : 0}分钟`
  const cab = state.layout.byId[s.cabinetId]
  return cab ? `${cab.name}（${cab.meta?.code || s.zone}）` : '镜库'
}
function roomCode(roomId) { return state.roomConfigs.find((r) => r.id === roomId)?.code || '—' }
function setMaint(s, on) {
  updateScope(s.id, { status: on ? 'maintenance' : 'available', reprocessUntilMin: null })
  if (on) logAudit({ action: 'scope-maint', target: s.id, detail: `镜体 ${s.code} 报修停用` })
}
function finishReprocess(s) {
  updateScope(s.id, { status: 'available', reprocessUntilMin: null, currentRoom: null })
  logAudit({ action: 'scope-reprocess-skip', target: s.id, detail: `镜体 ${s.code} 人工确认洗消完成回库` })
}
</script>
