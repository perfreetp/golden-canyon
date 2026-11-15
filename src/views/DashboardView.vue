<template>
  <div class="dash">
    <section class="panel">
      <h3>批次统计总览</h3>
      <div class="cards">
        <div class="card" v-for="b in batchStats" :key="b.batch">
          <div class="card-head">
            <b>{{ b.batch }}</b>
            <span class="dim">{{ b.total }} 单</span>
          </div>
          <div class="metric">
            <span>通过率</span>
            <div class="bar"><i :style="{ width: b.passRate + '%' }" :class="{ low: b.passRate < 60 }"></i></div>
            <b>{{ b.passRate }}%</b>
          </div>
          <div class="metrics-row">
            <div><b>{{ b.approved }}</b><span>通过</span></div>
            <div><b>{{ b.totalRework }}</b><span>返工次数</span></div>
            <div><b :class="{ 'err-text': b.overdue.length }">{{ b.overdue.length }}</b><span>超期单</span></div>
            <div><b>{{ b.avgRework }}</b><span>平均返工</span></div>
          </div>
        </div>
      </div>
    </section>

    <div class="two-col">
      <section class="panel">
        <h3>超期打样单(当前日期 {{ today }})</h3>
        <table>
          <thead><tr><th>单号</th><th>批次</th><th>模型</th><th>状态</th><th>截止</th><th>超期天数</th></tr></thead>
          <tbody>
            <tr v-for="o in overdueOrders" :key="o.id">
              <td>{{ o.id }}</td><td>{{ o.batch }}</td><td>{{ o.modelName }}</td>
              <td><span class="tag" :class="o.status">{{ o.status }}</span></td>
              <td>{{ fmtTime(o.deadline).slice(0, 10) }}</td>
              <td class="err-text">{{ overdueDays(o) }} 天</td>
            </tr>
            <tr v-if="!overdueOrders.length"><td colspan="6" class="dim">无超期打样单</td></tr>
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h3>返工排行</h3>
        <table>
          <thead><tr><th>单号</th><th>批次</th><th>模型</th><th>状态</th><th>返工次数</th><th>最近退回原因</th></tr></thead>
          <tbody>
            <tr v-for="o in reworkRank" :key="o.id">
              <td>{{ o.id }}</td><td>{{ o.batch }}</td><td>{{ o.modelName }}</td>
              <td><span class="tag" :class="o.status">{{ o.status }}</span></td>
              <td><b :class="{ 'err-text': o.reworkCount >= 2 }">{{ o.reworkCount }}</b></td>
              <td class="dim">{{ o.returnRecords.length ? o.returnRecords[o.returnRecords.length - 1].reason : '—' }}</td>
            </tr>
            <tr v-if="!reworkRank.length"><td colspan="6" class="dim">暂无返工记录</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { store, isOverdue, fmtTime, STATUS } from '../store.js'

const today = new Date().toISOString().slice(0, 10)

const batchStats = computed(() => {
  const map = new Map()
  for (const o of store.orders) {
    if (!map.has(o.batch)) map.set(o.batch, [])
    map.get(o.batch).push(o)
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([batch, orders]) => {
    const approved = orders.filter(o => o.status === STATUS.APPROVED).length
    const totalRework = orders.reduce((s, o) => s + o.reworkCount, 0)
    return {
      batch,
      total: orders.length,
      approved,
      passRate: Math.round(approved / orders.length * 100),
      totalRework,
      avgRework: (totalRework / orders.length).toFixed(1),
      overdue: orders.filter(isOverdue)
    }
  })
})

const overdueOrders = computed(() =>
  store.orders.filter(isOverdue).sort((a, b) => a.deadline - b.deadline)
)

const reworkRank = computed(() =>
  store.orders.filter(o => o.reworkCount > 0).sort((a, b) => b.reworkCount - a.reworkCount)
)

function overdueDays(o) {
  return Math.max(0, Math.floor((Date.now() - o.deadline) / 86400000))
}
</script>

<style scoped>
.dash { display: flex; flex-direction: column; gap: 14px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
.card { background: var(--panel2); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; }
.card-head { display: flex; justify-content: space-between; margin-bottom: 10px; }
.metric { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.metric .bar { flex: 1; height: 10px; background: #10131a; border-radius: 5px; overflow: hidden; }
.metric .bar i { display: block; height: 100%; background: var(--green); border-radius: 5px; }
.metric .bar i.low { background: var(--amber); }
.metrics-row { display: flex; justify-content: space-between; margin-top: 12px; text-align: center; }
.metrics-row b { display: block; font-size: 18px; }
.metrics-row span { font-size: 12px; color: var(--dim); }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 1100px) { .two-col { grid-template-columns: 1fr; } }
.err-text { color: var(--red); font-weight: 600; }
.dim { color: var(--dim); }
</style>
