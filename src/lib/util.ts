let counter = 0
export function uid(prefix = 'id'): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`
}

export function posLabel(p: 'normal' | 'reverse'): string {
  return p === 'normal' ? '定位' : '反位'
}

export function dirLabel(d: 'left' | 'right'): string {
  return d === 'left' ? '向左（下行）' : '向右（上行）'
}

export function dirShort(d: 'left' | 'right'): string {
  return d === 'left' ? '←' : '→'
}

export function routeTypeLabel(t: string): string {
  return t === 'arrival' ? '接车' : t === 'departure' ? '发车' : '调车'
}

export function statusLabel(s: string): string {
  return { draft: '编制中', submitted: '待审核', rejected: '已退回', published: '已发布' }[s] ?? s
}

export function formatTime(ts?: number): string {
  if (!ts) return '—'
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
