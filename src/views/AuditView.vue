<template>
  <div class="card">
    <div class="card-h">
      审计日志 · 全部调整留存操作人与时间
      <span class="pill">{{ state.audits.length }} 条</span>
      <div style="flex:1"></div>
      <select v-model="actionFilter" style="width:150px">
        <option value="">全部操作类型</option>
        <option v-for="a in actionTypes" :key="a" :value="a">{{ actionText(a) }}</option>
      </select>
      <input v-model="kw" placeholder="搜索操作人/对象/详情" style="width:210px" />
      <button class="btn sm" @click="exportLog">⬇ 导出 CSV</button>
    </div>
    <div class="card-b scroll-x" style="max-height:74vh;overflow:auto">
      <table>
        <thead>
          <tr><th style="width:150px">时间（模拟）</th><th style="width:150px">操作人</th><th style="width:130px">操作类型</th><th>对象</th><th>详情</th></tr>
        </thead>
        <tbody>
          <tr v-for="a in filtered" :key="a.id">
            <td style="font-variant-numeric:tabular-nums">{{ clockLabel(a.atMin) }}</td>
            <td>{{ a.operator }} <small class="muted">{{ a.operatorRole }}</small></td>
            <td><span class="tag idle">{{ actionText(a.action) }}</span></td>
            <td style="font-family:monospace;font-size:12px">{{ a.target }}</td>
            <td>{{ a.detail }}</td>
          </tr>
          <tr v-if="!filtered.length"><td colspan="5" class="muted" style="text-align:center;padding:26px 0">无匹配日志</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStore } from '../store/store.js'
import { clockLabel } from '../utils/time.js'

const store = useStore()
const { state } = store
const actionFilter = ref('')
const kw = ref('')

const actionTypes = ['system', 'schedule', 'reschedule', 'auto-schedule', 'checkin', 'self-checkin',
  'mark-late', 'mark-noshow', 'cancel', 'room-config', 'doctor-schedule', 'scope-pool', 'scope-maint', 'scope-reprocess-skip']

function actionText(a) {
  return {
    system: '系统', schedule: '人工排班', reschedule: '人工改期', 'auto-schedule': '自动排程',
    checkin: '签到', 'self-checkin': '自助签到', 'mark-late': '迟到登记', 'mark-noshow': '爽约登记',
    cancel: '取消预约', 'room-config': '房间配置', 'doctor-schedule': '医师排班',
    'scope-pool': '镜体调整', 'scope-maint': '镜体报修', 'scope-reprocess-skip': '洗消确认'
  }[a] || a
}

const filtered = computed(() => state.audits.filter((a) => {
  if (actionFilter.value && a.action !== actionFilter.value) return false
  if (kw.value) {
    const q = kw.value
    return a.operator.includes(q) || a.target.includes(q) || a.detail.includes(q)
  }
  return true
}))

function exportLog() {
  const header = '时间,操作人,角色,操作类型,对象,详情\n'
  const rows = filtered.value.map((a) =>
    [clockLabel(a.atMin), a.operator, a.operatorRole, actionText(a.action), a.target, a.detail]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const blob = new Blob(['﻿' + header + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '内镜中心审计日志.csv'
  link.click()
  URL.revokeObjectURL(url)
}
</script>
