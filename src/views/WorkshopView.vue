<template>
  <div class="ws">
    <section class="panel">
      <div class="row-between">
        <h3>已通过分色表(仅「通过」状态对车间可见)</h3>
        <button @click="exportCsv" :disabled="!approved.length">导出给喷涂组长 (CSV)</button>
      </div>
      <table v-if="approved.length">
        <thead>
          <tr><th>单号</th><th>批次</th><th>模型</th><th>分色区</th><th>漆号</th><th>颜色</th><th>光泽度</th><th>喷涂遍数</th></tr>
        </thead>
        <tbody v-for="o in approved" :key="o.id">
          <tr v-for="(r, i) in regionRows(o)" :key="o.id + r.key">
            <template v-if="i === 0">
              <td :rowspan="4">{{ o.id }}</td>
              <td :rowspan="4">{{ o.batch }}</td>
              <td :rowspan="4">{{ o.modelName }}</td>
            </template>
            <td>{{ r.name }}</td>
            <td>{{ r.paintNo }}</td>
            <td><span class="swatch" :style="{ background: r.color }"></span> {{ r.color }}</td>
            <td>{{ r.gloss }}</td>
            <td>{{ r.coats }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="dim">暂无已通过的打样单。</p>
    </section>

    <section class="panel">
      <h3>漆号用量清单(按已通过单汇总)</h3>
      <table>
        <thead><tr><th>漆号</th><th>颜色</th><th>名称</th><th>涉及单数</th><th>预计用量 (ml)</th><th>用量占比</th></tr></thead>
        <tbody>
          <tr v-for="u in usage" :key="u.paintNo">
            <td>{{ u.paintNo }}</td>
            <td><span class="swatch" :style="{ background: paintHex(u.paintNo) }"></span></td>
            <td>{{ u.name }}</td>
            <td>{{ u.orders }}</td>
            <td>{{ u.usage.toFixed(1) }}</td>
            <td>
              <div class="bar"><i :style="{ width: (u.usage / maxUsage * 100) + '%' }"></i></div>
            </td>
          </tr>
          <tr v-if="!usage.length"><td colspan="6" class="dim">暂无用量数据</td></tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { store, usageList, fmtTime, STATUS } from '../store.js'
import { REGIONS, paintByNo } from '../data/paints.js'

const approved = computed(() => store.orders.filter(o => o.status === STATUS.APPROVED))
const usage = computed(() => usageList())
const maxUsage = computed(() => Math.max(1, ...usage.value.map(u => u.usage)))

function regionRows(o) {
  return REGIONS.map(r => ({ key: r.key, name: r.name, ...o.regions[r.key] }))
}

function paintHex(no) {
  return paintByNo(no)?.hex || '#888'
}

function exportCsv() {
  const lines = []
  lines.push('=== 车间分色表(已通过) 导出时间:' + fmtTime(Date.now()) + ' ===')
  lines.push('单号,批次,模型,分色区,漆号,颜色,光泽度,喷涂遍数')
  for (const o of approved.value) {
    for (const r of regionRows(o)) {
      lines.push([o.id, o.batch, o.modelName, r.name, r.paintNo, r.color, r.gloss, r.coats].join(','))
    }
  }
  lines.push('')
  lines.push('=== 漆号用量清单 ===')
  lines.push('漆号,名称,涉及单数,预计用量(ml)')
  for (const u of usage.value) {
    lines.push([u.paintNo, u.name, u.orders, u.usage.toFixed(1)].join(','))
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `车间分色表_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<style scoped>
.ws { display: flex; flex-direction: column; gap: 14px; }
.row-between { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.dim { color: var(--dim); }
.bar { height: 10px; background: #10131a; border-radius: 5px; overflow: hidden; min-width: 120px; }
.bar i { display: block; height: 100%; background: var(--accent); }
</style>
