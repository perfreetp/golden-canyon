// 借展交接单：生成可打印 HTML 并触发下载/打印
import { esc } from './utils.js';

export function handoverHtml(loan, figures, damages) {
  const items = loan.figureIds.map(id => figures.find(f => f.id === id)).filter(Boolean);
  const relDamages = damages.filter(d => loan.damageRecordIds.includes(d.id));
  const rows = items.map((f, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(f.name)}</td>
      <td>${esc(f.series || '')}</td>
      <td>${esc(f.scale)}</td>
      <td>${esc(f.material)}</td>
      <td>${f.weightG || ''}</td>
      <td>${esc(f.boxLocation || '')}</td>
      <td>${(f.defects || []).map(d => esc(`${d.part}:${d.desc}`)).join('；') || '无'}</td>
    </tr>`).join('');

  const dmgRows = relDamages.length ? relDamages.map(d => {
    const f = figures.find(x => x.id === d.figureId);
    return `<tr><td>${esc(f?.name || '')}</td><td>${esc(d.date)}</td><td>${esc(d.desc)}</td>
      <td>${d.spots.map(s => esc(`${s.part}(${s.note || ''})`)).join('；')}</td></tr>`;
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888">无</td></tr>';

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>借展交接单 ${esc(loan.loanNo)}</title>
<style>
  body { font-family: 'PingFang SC','Microsoft YaHei',sans-serif; padding: 36px; color: #222; }
  h1 { text-align: center; font-size: 22px; letter-spacing: 4px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin: 18px 0; font-size: 13.5px; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
  th, td { border: 1px solid #555; padding: 8px; text-align: left; vertical-align: top; }
  th { background: #f0ece3; }
  .sign { display: flex; justify-content: space-between; margin-top: 46px; font-size: 14px; }
  .sign div { width: 45%; border-top: 1px solid #333; padding-top: 8px; }
  .note { font-size: 12.5px; color: #666; margin-top: 6px; }
  h3 { margin-top: 26px; }
  @media print { .noprint { display:none } }
</style></head><body>
<button class="noprint" onclick="window.print()" style="padding:8px 22px;font-size:14px;cursor:pointer">打印 / 另存为 PDF</button>
<h1>藏品借展交接单</h1>
<p style="text-align:right">单据编号：<b>${esc(loan.loanNo)}</b></p>
<div class="meta">
  <div>借展方（单位/个人）：<b>${esc(loan.org || '')} ${esc(loan.borrower || '')}</b></div>
  <div>联系方式：${esc(loan.contact || '')}</div>
  <div>出库日期：${esc(loan.actualOutDate || loan.startDate)}</div>
  <div>应归还日期：<b>${esc(loan.dueReturnDate)}</b></div>
  <div>当前状态：${esc(loan.stage)}${loan.actualReturnDate ? '（实际归还 ' + esc(loan.actualReturnDate) + '）' : ''}</div>
  <div>经办人：${esc(loan.handler || '')}</div>
  <div style="grid-column:1/3">备注：${esc(loan.notes || '无')}</div>
</div>
<h3>一、交接藏品明细</h3>
<table><thead><tr><th>序号</th><th>藏品名称</th><th>系列</th><th>比例</th><th>材质</th><th>重量(g)</th><th>包装盒存放位</th><th>既有瑕疵</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="note">出库前双方共同核验外观、配件与包装；归还时按本单逐项验收。</p>
<h3>二、归还验收损伤登记</h3>
<table><thead><tr><th>藏品</th><th>日期</th><th>损伤描述</th><th>点选部位</th></tr></thead><tbody>${dmgRows}</tbody></table>
<div class="sign">
  <div>借出方经办人签字 / 日期：</div>
  <div>借入方接收签字 / 日期：</div>
</div>
</body></html>`;
}
