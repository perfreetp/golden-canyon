<template>
  <div class="board-page">
    <div class="board-head">
      <div>
        <h2>消化内镜中心 · 排队叫号大屏</h2>
        <div class="muted">急诊优先 · 过号请联系护士站 · 迟到 15 分钟 / 爽约 30 分钟规则生效中</div>
      </div>
      <div class="big-clock">{{ clockLabel(state.nowMin) }}</div>
    </div>

    <div class="board-grid">
      <div v-for="z in state.layout.zones" :key="z.key" class="zone-board">
        <div class="zone-head">{{ z.name }}</div>
        <table>
          <thead><tr><th>患者编号</th><th>项目</th><th>检查间</th><th>状态</th></tr></thead>
          <tbody>
            <tr v-for="a in zoneCalling(z.key)" :key="a.id" :class="{ urgentRow: a.priority === 'urgent' }">
              <td class="big">{{ a.patientNo }}</td>
              <td>{{ a.procName }}</td>
              <td class="room-code">{{ roomCode(a.roomId) }}</td>
              <td><span class="tag" :class="a.status">{{ boardStatus(a.status) }}</span></td>
            </tr>
            <tr v-if="!zoneCalling(z.key).length"><td colspan="4" class="muted" style="text-align:center;padding:30px 0">暂无叫号</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="ticker">
      <span v-for="a in latestCalling" :key="a.id" class="ticker-item">
        🔔 请 {{ a.patientNo }} {{ maskName(a.patientName) }} 前往 {{ roomCode(a.roomId) }} 检查间（{{ a.procName }}）
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from '../store/store.js'
import { useStats } from '../store/stats.js'
import { clockLabel } from '../utils/time.js'
import { maskName } from '../utils/rng.js'

const store = useStore()
const { state } = store
const { stats } = useStats(store)

function zoneCalling(zone) {
  return stats.value.calling
    .filter((a) => state.roomConfigs.find((r) => r.id === a.roomId)?.zone === zone)
    .slice(0, 8)
}
function roomCode(id) { return state.roomConfigs.find((r) => r.id === id)?.code || '—' }
function boardStatus(s) {
  return { checkedin: '候诊中', late: '迟到候诊', inprogress: '检查中', recovery: '复苏中', scheduled: '待检查' }[s] || s
}
const latestCalling = computed(() => stats.value.calling.slice(0, 6))
</script>

<style scoped>
.board-page { background: #0b2239; min-height: 100%; border-radius: 12px; padding: 22px; color: #e6f0fb; }
.board-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.board-head h2 { margin: 0 0 6px; font-size: 24px; color: #fff; }
.big-clock { font-size: 34px; font-weight: 700; color: #36cfc9; font-variant-numeric: tabular-nums; }
.board-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.zone-board { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 10px; overflow: hidden; }
.zone-head { background: #1668dc; padding: 10px 16px; font-weight: 700; font-size: 16px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,.08); color: #d7e6f5; }
th { color: #8fb0d0; font-weight: 500; }
td.big { font-size: 17px; font-weight: 700; color: #ffd666; font-variant-numeric: tabular-nums; }
td.room-code { font-weight: 700; color: #36cfc9; }
tr.urgentRow { background: rgba(245,34,45,.18); }
.ticker { margin-top: 18px; background: rgba(54,207,201,.12); border: 1px solid rgba(54,207,201,.4); border-radius: 10px; padding: 14px 18px; display: flex; gap: 40px; overflow: hidden; }
.ticker-item { white-space: nowrap; font-size: 16px; color: #b5f5ec; animation: slide 26s linear infinite; }
@keyframes slide { from { transform: translateX(40px); } to { transform: translateX(-100%); } }
:deep(.tag) { color: #fff; }
:deep(.muted) { color: #8fb0d0; }
</style>
