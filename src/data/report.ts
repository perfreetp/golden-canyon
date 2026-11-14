/**
 * 版本比对说明报告：生成可打印的 HTML 文档并支持 Blob 下载/打印。
 */
import type { Drawing, VersionDiff } from '@/types'
import { LAYER_DEFS } from '@/render/layers'

const TYPE_LABEL: Record<string, string> = {
  added: '新增',
  removed: '删除',
  modified: '修改',
}

const TYPE_COLOR: Record<string, string> = {
  added: '#1b7a3d',
  removed: '#b03028',
  modified: '#b07412',
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}

export function buildReportHtml(
  diff: VersionDiff,
  before: Drawing,
  after: Drawing,
  author: string,
): string {
  const added = diff.entries.filter((e) => e.type === 'added').length
  const removed = diff.entries.filter((e) => e.type === 'removed').length
  const modified = diff.entries.filter((e) => e.type === 'modified').length
  const crossingDelta = diff.crossingsAfter - diff.crossingsBefore

  const rows = diff.entries
    .map((e) => {
      const fieldRows = (e.fields ?? [])
        .map(
          (f) =>
            `<tr class="field"><td></td><td colspan="4">
              <b>${esc(f.field)}</b>：<span class="old">${esc(f.before)}</span>
              → <span class="new">${esc(f.after)}</span>
            </td></tr>`,
        )
        .join('')
      return `<tr>
        <td><span class="badge" style="background:${TYPE_COLOR[e.type]}">${TYPE_LABEL[e.type]}</span></td>
        <td>${esc(e.label)}${e.kind === 'flow-line' ? '' : ''}</td>
        <td>${esc(LAYER_DEFS[e.layer]?.name ?? e.layer)}</td>
        <td><code>${esc(e.entityId)}</code></td>
        <td>${e.fields ? `${e.fields.length} 项字段变化` : '—'}</td>
      </tr>${fieldRows}`
    })
    .join('')

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>图档版本比对说明 ${esc(after.docNo)} V${diff.toVersion}</title>
<style>
  body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; margin: 32px; color: #222; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 15px; margin-top: 28px; border-left: 4px solid #2b6cb0; padding-left: 8px; }
  .meta { color: #666; font-size: 13px; }
  table { border-collapse: collapse; width: 100%; font-size: 12.5px; margin-top: 8px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f2f5f9; }
  .badge { color: #fff; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
  .field td { background: #fafafa; font-size: 12px; }
  .old { color: #b03028; word-break: break-all; }
  .new { color: #1b7a3d; word-break: break-all; }
  code { font-size: 11px; color: #555; }
  .summary { display: flex; gap: 16px; margin: 16px 0; }
  .card { border: 1px solid #ddd; border-radius: 6px; padding: 12px 20px; min-width: 110px; }
  .card .num { font-size: 26px; font-weight: 700; }
  .warn { color: #b03028; font-weight: 700; }
  .ok { color: #1b7a3d; font-weight: 700; }
  .sign { margin-top: 48px; display: flex; gap: 120px; font-size: 13px; }
  @media print { body { margin: 12mm; } .noprint { display: none; } }
  .noprint button { padding: 8px 18px; margin-right: 8px; font-size: 14px; }
</style>
</head>
<body>
<div class="noprint">
  <button onclick="window.print()">打印 / 另存为 PDF</button>
  <button onclick="window.close()">关闭</button>
</div>
<h1>消化内镜洗消间工艺布局图档 · 版本比对说明报告</h1>
<p class="meta">
  图档编号：<b>${esc(after.docNo)}</b>　图档名称：${esc(after.title)}<br/>
  比对版本：V${diff.fromVersion} → V${diff.toVersion}　生成时间：${fmtTime(diff.generatedAt)}　编制人：${esc(author)}
</p>

<div class="summary">
  <div class="card"><div class="num" style="color:#1b7a3d">${added}</div><div>新增图元</div></div>
  <div class="card"><div class="num" style="color:#b07412">${modified}</div><div>修改图元</div></div>
  <div class="card"><div class="num" style="color:#b03028">${removed}</div><div>删除图元</div></div>
  <div class="card">
    <div class="num ${crossingDelta > 0 ? 'warn' : 'ok'}">${diff.crossingsBefore} → ${diff.crossingsAfter}</div>
    <div>洁污交叉点${crossingDelta > 0 ? `（增加 ${crossingDelta} 处）` : crossingDelta < 0 ? `（消除 ${-crossingDelta} 处）` : '（无变化）'}</div>
  </div>
  <div class="card"><div class="num">${before.entities.length} → ${after.entities.length}</div><div>图元总数</div></div>
</div>

<h2>一、变更明细（逐项）</h2>
${
  diff.entries.length === 0
    ? '<p>两个版本内容完全一致，无差异。</p>'
    : `<table>
  <thead><tr><th style="width:64px">类型</th><th style="width:170px">图元</th><th style="width:110px">图层</th><th>图元 ID</th><th style="width:120px">变化</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`
}

<h2>二、洁污流线交叉核查</h2>
<p>
  旧版本交叉点 <b>${diff.crossingsBefore}</b> 处，新版本 <b>${diff.crossingsAfter}</b> 处。
  ${
    diff.crossingsAfter > 0
      ? '<span class="warn">存在洁污流线交叉，不符合《软式内镜清洗消毒技术规范》洁污分流要求，需在图中红色标记处调整流线或增设物理隔断。</span>'
      : '<span class="ok">新版本无洁污流线交叉，满足洁污分流要求。</span>'
  }
</p>

<h2>三、版本元数据</h2>
<table>
  <tr><th style="width:140px">项目</th><th>V${diff.fromVersion}（旧）</th><th>V${diff.toVersion}（新）</th></tr>
  <tr><td>生成时间</td><td>${fmtTime(before.updatedAt)}</td><td>${fmtTime(after.updatedAt)}</td></tr>
  <tr><td>改造阶段</td><td>${esc(before.stage)}</td><td>${esc(after.stage)}</td></tr>
  <tr><td>改造年份</td><td>${before.renovationYear}</td><td>${after.renovationYear}</td></tr>
  <tr><td>归档状态</td><td>${before.archived ? '已归档' : '在制'}</td><td>${after.archived ? '已归档' : '在制'}</td></tr>
</table>

<div class="sign">
  <div>编制人：${esc(author)}</div>
  <div>审核人：____________</div>
  <div>基建科（盖章）：____________</div>
  <div>日期：____________</div>
</div>
</body>
</html>`
}

export function downloadReport(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function openReportWindow(html: string): Window | null {
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
  return win
}
