// 运营时间与时间槽（30 分钟一档，08:00 - 18:00，共 20 档）
export const DAY_START_MIN = 8 * 60
export const SLOT_MINUTES = 30
export const SLOT_COUNT = 20
export const REPROCESS_MINUTES = 25 // 镜体洗消周转时长
export const LATE_GRACE_MINUTES = 15
export const NOSHOW_MINUTES = 30

export function slotToMin(slot) {
  return DAY_START_MIN + slot * SLOT_MINUTES
}

export function minToLabel(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function slotLabel(slot) {
  return minToLabel(slotToMin(slot))
}

export function slotRangeLabel(start, duration) {
  return `${slotLabel(start)}-${minToLabel(slotToMin(start) + duration * SLOT_MINUTES)}`
}

// 当前模拟时钟 HH:MM
export function clockLabel(nowMin) {
  return minToLabel(Math.round(nowMin))
}

export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
