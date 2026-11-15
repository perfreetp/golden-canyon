/** CSV / 报表导出工具 */
function esc(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows) {
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

export function download(filename, content, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** 成绩表：课程 + 学员 + 各分项 + 总分 + 复核 */
export function buildScoreRows(course, submissions, students, items) {
  const header = ['学号', '姓名', '科室', '题目', '命名(25)', '分区(25)', '对称(25)', '间距(25)', '自动分', '复核分', '最终分', '状态', '提交时间', '用时(分)'];
  const rows = [header];
  for (const sub of submissions) {
    const st = students.find((s) => s.id === sub.studentId);
    const item = items.find((i) => i.id === sub.itemId) || sub.item;
    const g = sub.grade || {};
    const s = g.scores || {};
    rows.push([
      st?.empNo || sub.studentId,
      st?.name || sub.studentName,
      st?.dept || '',
      item?.title || sub.itemId,
      s.naming ?? '', s.region ?? '', s.symmetry ?? '', s.spacing ?? '',
      sub.autoScore ?? '',
      sub.manualScore ?? '',
      sub.finalScore ?? '',
      sub.status === 'reviewed' ? '已复核' : sub.status === 'pending' ? '待复核' : '自动判分',
      new Date(sub.submittedAt).toLocaleString('zh-CN', { hour12: false }),
      sub.durationSec ? Math.round(sub.durationSec / 60) : '',
    ]);
  }
  return rows;
}

/** 错误率最高的前 5 个导联点 */
export function buildErrorRows(top) {
  const rows = [['排名', '导联点', '解剖分区', '错误次数', '考核次数', '错误率', '主要错型']];
  top.forEach((t, i) => {
    const types = Object.entries(t.byType || {}).filter(([, v]) => v > 0)
      .map(([k, v]) => `${({ missing: '漏放', misplaced: '偏离', region: '分区错' })[k] || k}${v}`).join(' / ');
    rows.push([i + 1, t.lead, t.regionName || '', t.errors, t.total, `${(t.rate * 100).toFixed(0)}%`, types]);
  });
  return rows;
}
