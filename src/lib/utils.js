// 通用工具：日期、ID、数字格式化
export const DAY = 24 * 60 * 60 * 1000;

export function uid(prefix = '') {
  return prefix + (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
}

export function todayStr() {
  return toStr(new Date());
}

export function toStr(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  return toStr(new Date(parseDate(s).getTime() + n * DAY));
}

// 今天距 s 过了几天（s 为过去日期时为正）
export function daysSince(s) {
  if (!s) return null;
  return Math.round((parseDate(todayStr()) - parseDate(s)) / DAY);
}

// 距 s 还有几天（未来日期为正）
export function daysUntil(s) {
  if (!s) return null;
  return -daysSince(s);
}

export function fmtNum(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('zh-CN', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 比例选项
export const SCALES = ['1/4', '1/6', '1/7', '1/8', '1/10', '1/12'];

export function scaleDenominator(scale) {
  return Number(String(scale).split('/')[1]) || 1;
}

// 按 1:7 等比例换算手办高度（mm）。canonicalHeight 为角色真实身高 mm
export function figureHeightMm(fig) {
  if (fig.actualHeightMm) return fig.actualHeightMm;
  if (fig.canonicalHeightMm) return fig.canonicalHeightMm / scaleDenominator(fig.scale);
  return null;
}

export function download(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
