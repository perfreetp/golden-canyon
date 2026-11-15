<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { downloadJsonBackup, selectStation, state, stats } from '../store'
import { statusLabel } from '../lib/util'

const router = useRouter()
const rows = stats

const totals = computed(() => ({
  stations: state.stations.length,
  routes: rows.value.reduce((a, r) => a + r.routeCount, 0),
  hostile: rows.value.reduce((a, r) => a + r.hostilePairs, 0),
  swConflicts: rows.value.reduce((a, r) => a + r.switchConflictPairs, 0),
  passed: rows.value.reduce((a, r) => a + r.simPassed, 0),
  failed: rows.value.reduce((a, r) => a + r.simFailed, 0),
  unrun: rows.value.reduce((a, r) => a + r.simUnrun, 0)
}))

const passRate = computed(() => {
  const decided = totals.value.passed + totals.value.failed
  return decided ? Math.round((totals.value.passed / decided) * 100) : 0
})

function open(id: string) {
  selectStation(id)
  router.push('/routes')
}

function barWidth(n: number, max: number) {
  return max ? Math.max(2, Math.round((n / max) * 100)) : 0
}
const maxRoutes = computed(() => Math.max(1, ...rows.value.map((r) => r.routeCount)))
</script>

<template>
  <div>
    <h2 class="page-title">
      全站统计汇总
      <button class="sm ghost" @click="downloadJsonBackup()">导出数据备份（JSON）</button>
    </h2>

    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-num">{{ totals.stations }}</div><div class="kpi-lbl">车站数</div></div>
      <div class="kpi"><div class="kpi-num">{{ totals.routes }}</div><div class="kpi-lbl">进路总条数</div></div>
      <div class="kpi danger"><div class="kpi-num">{{ totals.hostile }}</div><div class="kpi-lbl">敌对进路对数</div></div>
      <div class="kpi warn"><div class="kpi-num">{{ totals.swConflicts }}</div><div class="kpi-lbl">防护道岔冲突对数</div></div>
      <div class="kpi ok"><div class="kpi-num">{{ totals.failed }}</div><div class="kpi-lbl">仿真未通过条目</div></div>
      <div class="kpi"><div class="kpi-num">{{ passRate }}%</div><div class="kpi-lbl">仿真通过率（已跑条目）</div></div>
    </div>

    <div class="panel">
      <h3>各车站进路规模对比</h3>
      <div v-for="r in rows" :key="r.stationId" class="bar-row" @click="open(r.stationId)">
        <div class="bar-name">{{ r.stationName }}<span class="tag gray">{{ statusLabel(r.status) }}</span></div>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: barWidth(r.routeCount, maxRoutes) + '%' }"></div>
          <span class="bar-val">{{ r.routeCount }} 条</span>
        </div>
      </div>
      <div v-if="!rows.length" class="empty">暂无车站数据</div>
    </div>

    <div class="panel" style="margin-top:14px">
      <h3>明细表</h3>
      <div style="overflow:auto">
        <table>
          <thead>
            <tr>
              <th>车站</th>
              <th>状态</th>
              <th>进路条数</th>
              <th>敌对进路对</th>
              <th>道岔冲突对</th>
              <th>仿真通过</th>
              <th>仿真未通过</th>
              <th>未仿真</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.stationId"
                :class="r.hostilePairs ? 'row-danger' : r.switchConflictPairs ? 'row-warn' : ''">
              <td><b>{{ r.stationName }}</b></td>
              <td><span class="tag gray">{{ statusLabel(r.status) }}</span></td>
              <td>{{ r.routeCount }}</td>
              <td :class="r.hostilePairs ? 'danger-text' : ''">{{ r.hostilePairs }}</td>
              <td :class="r.switchConflictPairs ? 'warn-text' : ''">{{ r.switchConflictPairs }}</td>
              <td class="ok-text">{{ r.simPassed }}</td>
              <td :class="r.simFailed ? 'danger-text' : ''">{{ r.simFailed }}</td>
              <td class="muted">{{ r.simUnrun }}</td>
              <td><button class="sm" @click="open(r.stationId)">查看进路表</button></td>
            </tr>
            <tr v-if="!rows.length"><td colspan="9" class="empty">暂无数据，请先新建车站</td></tr>
          </tbody>
          <tfoot v-if="rows.length">
            <tr>
              <td><b>合计</b></td><td></td>
              <td><b>{{ totals.routes }}</b></td>
              <td><b :class="totals.hostile ? 'danger-text' : ''">{{ totals.hostile }}</b></td>
              <td><b :class="totals.swConflicts ? 'warn-text' : ''">{{ totals.swConflicts }}</b></td>
              <td><b class="ok-text">{{ totals.passed }}</b></td>
              <td><b :class="totals.failed ? 'danger-text' : ''">{{ totals.failed }}</b></td>
              <td class="muted">{{ totals.unrun }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.kpi {
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 18px 16px;
  border-top: 4px solid var(--primary);
}
.kpi.danger { border-top-color: var(--danger); }
.kpi.warn { border-top-color: var(--warn); }
.kpi.ok { border-top-color: var(--ok); }
.kpi-num { font-size: 30px; font-weight: 800; }
.kpi.danger .kpi-num { color: var(--danger); }
.kpi.warn .kpi-num { color: var(--warn); }
.kpi.ok .kpi-num { color: var(--ok); }
.kpi-lbl { color: var(--muted); margin-top: 4px; font-size: 13px; }
h3 { margin: 0 0 14px; font-size: 15px; }
.bar-row { display: grid; grid-template-columns: 240px 1fr; gap: 14px; align-items: center; padding: 7px 0; cursor: pointer; }
.bar-row:hover .bar-fill { opacity: 0.85; }
.bar-name { display: flex; gap: 8px; align-items: center; font-weight: 600; }
.bar-track { position: relative; background: var(--band); border-radius: 8px; height: 26px; }
.bar-fill {
  position: absolute; inset: 0 auto 0 0;
  background: linear-gradient(90deg, #1d5fd0, #5b93ee);
  border-radius: 8px;
  transition: width 0.4s;
}
.bar-val { position: relative; line-height: 26px; padding-left: 10px; font-size: 12px; font-weight: 700; color: #33475c; }
tfoot td { border-top: 2px solid var(--line); border-bottom: none; }
</style>
