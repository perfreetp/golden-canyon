<template>
  <div>
    <div class="grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom:14px">
      <div class="kpi">
        <div class="v">{{ pct(s.utilization) }}</div>
        <div class="l">检查间综合利用率</div>
        <div class="bar" style="margin-top:10px"><i :style="{ width: pct(s.utilization) }"></i></div>
      </div>
      <div class="kpi">
        <div class="v">{{ round1(s.avgWait) }} <small style="font-size:13px">分钟</small></div>
        <div class="l">平均等待时长（最长 {{ s.maxWait }} 分）</div>
      </div>
      <div class="kpi">
        <div class="v" style="color:#a8071a">{{ pct(s.noshowRate) }}</div>
        <div class="l">爽约率（{{ s.noshow }} / 已定论 {{ s.noshow + s.done + s.inProgress }} 例）</div>
      </div>
      <div class="kpi">
        <div class="v" style="color:#722ed1">{{ s.totalTurnover }}</div>
        <div class="l">镜体周转次数（洗消中 {{ s.reprocessing }} · 使用中 {{ s.inUseScopes }}）</div>
      </div>
    </div>

    <div class="grid" style="grid-template-columns: 1fr 1fr; align-items:start">
      <div class="card">
        <div class="card-h">分区利用率</div>
        <div class="card-b">
          <div v-for="z in s.perZone" :key="z.key" style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px">
              <b>{{ z.name }}</b>
              <span class="muted">{{ z.apptCount }} 例 · 爽约 {{ z.noshow }} · 利用率 {{ pct(z.utilization) }}</span>
            </div>
            <div class="bar" style="height:14px"><i :style="{ width: pct(z.utilization) }"></i></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-h">实时队列（急诊优先）</div>
        <div class="card-b scroll-x" style="max-height:300px;overflow:auto">
          <table>
            <thead><tr><th>#</th><th>患者编号</th><th>项目</th><th>优先级</th><th>状态</th></tr></thead>
            <tbody>
              <tr v-for="(a, i) in s.queue" :key="a.id">
                <td>{{ i + 1 }}</td>
                <td>{{ a.patientNo }}</td>
                <td>{{ a.procName }}</td>
                <td><span class="tag" :class="a.priority">{{ priorityText(a.priority) }}</span></td>
                <td><span class="tag" :class="a.status">{{ apptStatusText(a.status) }}</span></td>
              </tr>
              <tr v-if="!s.queue.length"><td colspan="5" class="muted" style="text-align:center">当前无排队患者</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <div class="card-h">
        各检查间明细
        <div style="flex:1"></div>
        <span class="muted" style="font-size:12px">按利用率降序</span>
      </div>
      <div class="card-b scroll-x">
        <table>
          <thead>
            <tr><th>检查间</th><th>区域</th><th>利用率</th><th>占用时段</th><th>预约数</th><th>完成</th><th>爽约</th><th>平均等待(分)</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in roomRows" :key="r.id">
              <td><b>{{ r.code }}</b></td>
              <td>{{ r.zone }} 区</td>
              <td style="min-width:160px">
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="bar" style="flex:1"><i :style="{ width: pct(r.utilization) }"></i></div>
                  <span style="width:52px;text-align:right">{{ pct(r.utilization) }}</span>
                </div>
              </td>
              <td>{{ r.usedSlots }} / 20</td>
              <td>{{ r.apptCount }}</td>
              <td>{{ r.done }}</td>
              <td><span :style="{ color: r.noshow ? '#a8071a' : '' }">{{ r.noshow }}</span></td>
              <td>{{ round1(r.avgWait) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from '../store/store.js'
import { useStats } from '../store/stats.js'
import { pct, round1, apptStatusText, priorityText } from '../utils/format.js'

const store = useStore()
const { stats } = useStats(store)
const s = computed(() => stats.value)
const roomRows = computed(() => [...s.value.perRoom].sort((a, b) => b.utilization - a.utilization))
</script>
