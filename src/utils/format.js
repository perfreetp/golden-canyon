export function pct(n, digits = 1) {
  if (!Number.isFinite(n)) return '0%'
  return `${(n * 100).toFixed(digits)}%`
}

export function round1(n) {
  return Math.round(n * 10) / 10
}

export function statusText(status) {
  const map = {
    idle: '空闲',
    running: '使用中',
    reprocessing: '洗消中',
    maintenance: '维护中',
    reserved: '已预约',
    occupied: '占用',
    waiting: '候诊',
    disabled: '停用',
    available: '可用'
  }
  return map[status] || status
}

export function apptStatusText(s) {
  const map = {
    pending: '待排班',
    scheduled: '已排程',
    checkedin: '已签到',
    inprogress: '检查中',
    recovery: '复苏中',
    done: '已完成',
    late: '迟到',
    noshow: '爽约',
    cancelled: '已取消'
  }
  return map[s] || s
}

export function priorityText(p) {
  return p === 'urgent' ? '急诊加急' : '常规'
}
