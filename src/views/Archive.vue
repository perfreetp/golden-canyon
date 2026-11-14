<template>
  <div>
    <div class="panel">
      <h3>归档检索 <small>按批次号 / 供应方检索已放行与已退回的历史批次</small></h3>
      <div class="row">
        <label class="field" style="min-width:200px">批次号
          <input v-model="qNo" placeholder="如 B2026 或 01" />
        </label>
        <label class="field" style="min-width:180px">供应方
          <select v-model="qSupplier">
            <option value="">全部</option>
            <option v-for="s in SUPPLIERS" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <button class="btn ghost" @click="reset">重置</button>
      </div>
    </div>

    <div class="panel">
      <h3>检索结果 <small>{{ results.length }} 个批次</small></h3>
      <table class="data" v-if="results.length">
        <thead>
          <tr>
            <th>批次号</th><th>供应方</th><th>切面类型</th><th>提交时间</th>
            <th>复核人</th><th>结论</th><th>问题统计</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in results" :key="b.id">
            <td class="mono">{{ b.id }}</td>
            <td>{{ b.supplier }}</td>
            <td>{{ VIEW_TYPES[b.viewType].name }}</td>
            <td class="muted">{{ b.submittedAt || '—' }}</td>
            <td>{{ b.reviewer || '—' }}</td>
            <td>
              <span class="chip" :style="{ background: b.status === 'released' ? 'var(--ok)' : 'var(--bad)' }">
                {{ b.verdict }}
              </span>
            </td>
            <td>
              <span class="tag">严重 {{ stat(b).severe }}</span>
              <span class="tag">一般 {{ stat(b).major }}</span>
              <span class="tag">提示 {{ stat(b).minor }}</span>
            </td>
            <td><button class="btn sm" @click="exportReport(b)">导出放行报告</button></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">无匹配的历史批次</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { store, SUPPLIERS, searchArchive, issuesOf } from '../store'
import { VIEW_TYPES, LEVELS, PALETTES } from '../generator'
import { SEVERITY, CHECK_NAMES } from '../qc'

const qNo = ref('')
const qSupplier = ref(store.role === 'supplier' ? store.supplierName : '')

const results = computed(() => searchArchive(qNo.value, qSupplier.value))

function reset() {
  qNo.value = ''
  qSupplier.value = store.role === 'supplier' ? store.supplierName : ''
}
function stat(b) {
  const c = { severe: 0, major: 0, minor: 0 }
  issuesOf(b.id).forEach((i) => c[i.severity]++)
  return c
}

function exportReport(b) {
  const issues = issuesOf(b.id)
  const rows = issues.map((i) => `
    <tr>
      <td>${i.viewIndex + 1}</td><td>${CHECK_NAMES[i.type]}</td>
      <td>${SEVERITY[i.severity].name}</td>
      <td>${esc(i.message)}</td>
      <td>${{ pending: '待复核', confirmed: '已确认', rejected: '已驳回' }[i.status]}</td>
      <td>${esc(i.reviewer || '—')}</td><td>${esc(i.comment || '—')}</td>
    </tr>`).join('')
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<title>放行报告 ${b.id}</title>
<style>
  body{font-family:'Microsoft YaHei',sans-serif;margin:40px;color:#222}
  h1{font-size:20px} table{border-collapse:collapse;width:100%;font-size:13px;margin-top:16px}
  th,td{border:1px solid #999;padding:6px 8px;text-align:left}
  .meta td{border:none;padding:3px 12px 3px 0}
  .verdict{font-size:16px;font-weight:bold;color:${b.status === 'released' ? '#1a7f5a' : '#c0392b'}}
</style></head><body>
<h1>心脏超声切面素材批次 · ${b.verdict === '放行' ? '放行' : '退回'}报告</h1>
<table class="meta">
  <tr><td><b>批次号</b></td><td>${b.id}</td><td><b>供应方</b></td><td>${esc(b.supplier)}</td></tr>
  <tr><td><b>切面类型</b></td><td>${VIEW_TYPES[b.viewType].name}</td><td><b>切面数量</b></td><td>${b.count}</td></tr>
  <tr><td><b>参数</b></td><td colspan="3">${LEVELS[b.level].name} · 探头角度 ${b.probeAngle}° · 线宽 ${b.lineWidth}px · ${PALETTES[b.palette].name} · 种子 ${esc(b.seed)}</td></tr>
  <tr><td><b>提交时间</b></td><td>${esc(b.submittedAt || '—')}</td><td><b>复核人</b></td><td>${esc(b.reviewer || '—')}</td></tr>
  <tr><td><b>结论</b></td><td class="verdict">${b.verdict}</td><td><b>结论意见</b></td><td>${esc(b.verdictComment || '—')}</td></tr>
</table>
<h2>质检问题清单（${issues.length} 条）</h2>
<table>
  <thead><tr><th>切面</th><th>检查项</th><th>级别</th><th>问题描述</th><th>复核结论</th><th>复核人</th><th>意见</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="7">无问题记录</td></tr>'}</tbody>
</table>
<p style="margin-top:24px;color:#666;font-size:12px">报告导出时间：${new Date().toLocaleString('zh-CN', { hour12: false })} · 心脏超声培训中心</p>
</body></html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `放行报告-${b.id}.html`
  a.click()
  URL.revokeObjectURL(a.href)
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
</script>
