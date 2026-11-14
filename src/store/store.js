// 全局响应式 store：状态联动、模拟时钟、告警、审计日志、操作人
import { reactive, computed, readonly } from 'vue'
import { generateSeedData } from '../data/mock.js'
import { Scheduler } from '../scheduling/scheduler.js'
import { LATE_GRACE_MINUTES, NOSHOW_MINUTES, REPROCESS_MINUTES, SLOT_COUNT } from '../utils/time.js'

const seed = generateSeedData()

const state = reactive({
  layout: seed.layout,
  roomConfigs: seed.roomConfigs,
  scopes: seed.scopes,
  doctors: seed.doctors,
  appointments: seed.appointments,
  procTypes: seed.procTypes,
  audits: [],
  alerts: [],
  nowMin: 8 * 60 + 4 * 30, // 模拟时钟从 10:00 开始
  running: true,
  speed: 1,
  operator: { id: 'u-001', name: '王护长', role: '护士长' },
  operators: [
    { id: 'u-001', name: '王护长', role: '护士长' },
    { id: 'u-002', name: '李医生', role: '主治医师' },
    { id: 'u-003', name: '张护士', role: '巡回护士' },
    { id: 'u-004', name: '陈调度', role: '排班员' }
  ],
  layers: { device: true, schedule: true, alert: true },
  zoomIndex: 1,
  selectedId: null
})

// 外部订阅（画布瓦片失效用）
const statusListeners = new Set()
export function onElementStatusChange(fn) {
  statusListeners.add(fn)
  return () => statusListeners.delete(fn)
}

function setElementStatus(element, status, metaPatch = null) {
  if (!element) return
  if (element.status !== status) {
    element.status = status
    statusListeners.forEach((fn) => fn(element))
  }
  if (metaPatch && element.meta) Object.assign(element.meta, metaPatch)
}

let alertSeq = 1
function pushAlert(level, type, message, elementId = null) {
  state.alerts.push({
    id: `alert-${alertSeq++}`,
    level, // error | warning | info
    type,
    message,
    elementId,
    atMin: state.nowMin
  })
  if (state.alerts.length > 80) state.alerts.splice(0, state.alerts.length - 80)
}

export function logAudit(entry) {
  state.audits.unshift({
    id: `audit-${state.audits.length + 1}-${Math.floor(state.nowMin)}`,
    atMin: state.nowMin,
    time: new Date(),
    operator: state.operator.name,
    operatorRole: state.operator.role,
    ...entry
  })
  if (state.audits.length > 500) state.audits.length = 500
}

const scheduler = new Scheduler({ state, logAudit })

// ---------- 平面图要素状态联动 ----------
function syncElementStatuses() {
  const byId = state.layout.byId
  // 检查间 / 镜位：由当前时段预约决定
  for (const room of state.roomConfigs) {
    const roomEl = byId[room.id]
    const posEl = byId[room.scopePositionId]
    const cur = currentAppointmentForRoom(room.id)
    let st = 'idle'
    if (cur) {
      st = cur.status === 'inprogress' ? 'running'
        : cur.status === 'recovery' ? 'reserved'
          : ['scheduled', 'checkedin', 'late'].includes(cur.status) ? 'reserved' : 'idle'
    }
    if (!room.enabled) st = 'maintenance'
    setElementStatus(roomEl, st)
    setElementStatus(posEl, st === 'running' ? 'running' : room.enabled ? 'idle' : 'maintenance')
  }
  // 洗消工位 / 镜柜：跟随镜体
  const washEls = state.layout.elements.filter((e) => e.type === 'washStation')
  const cabEls = state.layout.elements.filter((e) => e.type === 'scopeCabinet')
  let wi = 0
  for (const s of state.scopes) {
    if (s.status === 'reprocessing') {
      const el = washEls[wi % washEls.length]
      setElementStatus(el, 'reprocessing', { scopeCode: s.code })
      wi++
    } else if (s.status === 'maintenance') {
      const el = cabEls.find((c) => c.id === s.cabinetId)
      setElementStatus(el, 'maintenance', { scopeCode: s.code })
    }
  }
  // 复位不再占用的洗消工位
  for (const el of washEls) {
    if (!el.meta?.scopeCode) continue
    const still = state.scopes.find((s) => s.code === el.meta.scopeCode && s.status === 'reprocessing')
    if (!still) setElementStatus(el, 'idle', { scopeCode: null })
  }
  // 复苏床
  const recBeds = state.layout.elements.filter((e) => e.type === 'recoveryBed')
  const recovering = state.appointments.filter((a) => a.status === 'recovery')
  recBeds.forEach((bed, i) => {
    const appt = recovering[i]
    setElementStatus(bed, appt ? 'occupied' : 'idle', appt ? { patientNo: appt.patientNo } : { patientNo: null })
  })
  // 候诊椅：签到等待中的患者
  const seats = state.layout.elements.filter((e) => e.type === 'waitingSeat')
  const waiting = state.appointments.filter((a) => ['checkedin', 'late'].includes(a.status))
  seats.forEach((seat, i) => setElementStatus(seat, i < waiting.length ? 'occupied' : 'available'))
  // 医师工位
  const ws = state.layout.elements.filter((e) => e.type === 'workstation')
  ws.forEach((el, i) => {
    const doc = state.doctors[i]
    if (!doc) return
    const onDuty = state.nowMin >= 8 * 60 + doc.shiftStart * 30 && state.nowMin <= 8 * 60 + doc.shiftEnd * 30 && !doc.off
    setElementStatus(el, onDuty ? 'occupied' : 'idle', { doctorName: doc.name })
  })
}

function currentAppointmentForRoom(roomId) {
  const slot = Math.floor((state.nowMin - 8 * 60) / 30)
  return state.appointments.find((a) => a.roomId === roomId && a.slot != null &&
    slot >= a.slot && slot < a.slot + a.duration &&
    ['inprogress', 'recovery', 'checkedin', 'scheduled', 'late'].includes(a.status)) || null
}

// ---------- 模拟时钟推进 ----------
let lastTickAt = Date.now()
function tick() {
  if (!state.running) { lastTickAt = Date.now(); return }
  const now = Date.now()
  const realMs = now - lastTickAt
  lastTickAt = now
  // 1 真实秒 ≈ 1.5 模拟分钟 × 速度
  state.nowMin += (realMs / 1000) * 1.5 * state.speed
  if (state.nowMin >= 18 * 60) state.nowMin = 8 * 60 // 一天结束后循环
  const curSlot = Math.floor((state.nowMin - 8 * 60) / 30)

  // 镜体洗消完成
  for (const s of state.scopes) {
    if (s.status === 'reprocessing' && s.reprocessUntilMin != null && state.nowMin >= s.reprocessUntilMin) {
      s.status = 'available'
      s.reprocessUntilMin = null
      s.currentRoom = null
      pushAlert('info', 'scope-ready', `镜体 ${s.code} 洗消完成，已回库`, s.cabinetId)
    }
  }

  // 预约状态机推进
  for (const a of state.appointments) {
    if (a.slot == null) continue
    const startMin = 8 * 60 + a.slot * 30
    if (a.status === 'scheduled' && state.nowMin >= startMin - LATE_GRACE_MINUTES && a.checkInMin == null) {
      // 临近时段：70% 自动签到，其余等超时
      if (pseudo(a.id, state.nowMin) < 0.7) {
        a.status = 'checkedin'
        a.checkInMin = state.nowMin
        a.waitMinutes = Math.max(0, Math.round(state.nowMin - startMin))
      }
    }
    if ((a.status === 'scheduled' || a.status === 'checkedin') && state.nowMin >= startMin) {
      if (a.checkInMin == null && state.nowMin - startMin > LATE_GRACE_MINUTES) {
        a.status = 'late'
        a.lateReason = a.lateReason || '系统标记：超过宽限时间'
        pushAlert('warning', 'late', `${a.patientName}（${a.patientNo}）迟到`, a.roomId)
      } else if (a.checkInMin != null) {
        startExam(a)
      }
    }
    if (a.status === 'late' && state.nowMin - startMin > NOSHOW_MINUTES) {
      a.status = 'noshow'
      a.noshowReason = a.noshowReason || '超过 30 分钟未到场'
      pushAlert('error', 'noshow', `${a.patientName}（${a.patientNo}）爽约`, a.roomId)
    }
    if (a.status === 'inprogress' && state.nowMin >= startMin + a.duration * 30 + 8) {
      finishExam(a, curSlot)
    }
    if (a.status === 'recovery' && state.nowMin >= (a.recoveryStartMin || startMin) + 25) {
      a.status = 'done'
    }
  }
  syncElementStatuses()
}

function pseudo(seedStr, salt) {
  let h = 0
  const s = seedStr + ':' + Math.floor(salt / 30)
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return (h % 1000) / 1000
}

function startExam(a) {
  a.status = 'inprogress'
  if (a.actualStartMin == null) a.actualStartMin = state.nowMin
  const scope = state.scopes.find((s) => s.id === a.scopeId)
  if (scope) {
    scope.status = 'in_use'
    scope.currentRoom = a.roomId
    scope.usageCount++
  }
}

function finishExam(a) {
  a.status = 'recovery'
  a.recoveryStartMin = state.nowMin
  const scope = state.scopes.find((s) => s.id === a.scopeId)
  if (scope) {
    scope.status = 'reprocessing'
    scope.reprocessUntilMin = state.nowMin + REPROCESS_MINUTES
  }
}

// ---------- 人工操作 ----------
function checkIn(apptId) {
  const a = state.appointments.find((x) => x.id === apptId)
  if (!a) return
  const startMin = a.scheduledMin ?? state.nowMin
  a.checkInMin = state.nowMin
  a.waitMinutes = Math.max(0, Math.round(state.nowMin - startMin))
  a.status = state.nowMin - startMin > LATE_GRACE_MINUTES ? 'late' : 'checkedin'
  logAudit({ action: 'checkin', target: a.id, detail: `${a.patientName} 签到${a.status === 'late' ? '（迟到）' : ''}` })
}

function markLate(apptId, reason) {
  const a = state.appointments.find((x) => x.id === apptId)
  if (!a) return
  a.status = 'late'
  a.lateReason = reason
  logAudit({ action: 'mark-late', target: a.id, detail: `${a.patientName} 迟到原因：${reason}` })
  pushAlert('warning', 'late', `${a.patientName} 迟到：${reason}`, a.roomId)
}

function markNoShow(apptId, reason) {
  const a = state.appointments.find((x) => x.id === apptId)
  if (!a) return
  a.status = 'noshow'
  a.noshowReason = reason
  if (a.scopeId) {
    const scope = state.scopes.find((s) => s.id === a.scopeId)
    if (scope && scope.status === 'in_use') {
      scope.status = 'available'
      scope.currentRoom = null
    }
  }
  logAudit({ action: 'mark-noshow', target: a.id, detail: `${a.patientName} 爽约原因：${reason}` })
  pushAlert('error', 'noshow', `${a.patientName} 爽约：${reason}`, a.roomId)
}

function cancelAppt(apptId, reason) {
  const a = state.appointments.find((x) => x.id === apptId)
  if (!a) return
  a.status = 'cancelled'
  a.note = reason
  logAudit({ action: 'cancel', target: a.id, detail: `${a.patientName} 取消：${reason}` })
}

function dismissAlert(alertId) {
  const i = state.alerts.findIndex((x) => x.id === alertId)
  if (i >= 0) state.alerts.splice(i, 1)
}

function updateRoomConfig(roomId, patch) {
  const room = state.roomConfigs.find((r) => r.id === roomId)
  if (!room) return
  Object.assign(room, patch)
  const el = state.layout.byId[roomId]
  if (patch.enabled === false) setElementStatus(el, 'maintenance')
  logAudit({ action: 'room-config', target: roomId, detail: `配置变更：${Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', ')}` })
}

function updateDoctor(doctorId, patch) {
  const d = state.doctors.find((x) => x.id === doctorId)
  if (!d) return
  Object.assign(d, patch)
  logAudit({ action: 'doctor-schedule', target: doctorId, detail: `排班变更：${d.name} ${Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', ')}` })
}

function updateScope(scopeId, patch) {
  const s = state.scopes.find((x) => x.id === scopeId)
  if (!s) return
  Object.assign(s, patch)
  logAudit({ action: 'scope-pool', target: scopeId, detail: `镜体变更：${s.code} ${Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', ')}` })
}

function setOperator(op) {
  state.operator = op
}

// ---------- 排程索引（画布排程层） ----------
const scheduleIndex = computed(() => {
  const map = new Map()
  for (const a of state.appointments) {
    if (a.slot == null || ['cancelled', 'noshow'].includes(a.status)) continue
    for (const id of [a.roomId, state.roomConfigs.find((r) => r.id === a.roomId)?.scopePositionId].filter(Boolean)) {
      if (!map.has(id)) map.set(id, [])
      map.get(id).push({ slot: a.slot, priority: a.priority, apptId: a.id })
    }
  }
  return map
})

function roomTimeline(roomId) {
  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => ({ slot: i, items: [] }))
  for (const a of state.appointments) {
    if (a.roomId !== roomId || a.slot == null) continue
    for (let s = a.slot; s < a.slot + a.duration; s++) {
      slots[s]?.items.push(a)
    }
  }
  return slots
}

// 告警对应的要素（告警层渲染）
const alertElementMap = computed(() => {
  const set = new Set()
  for (const al of state.alerts) {
    if (al.elementId && state.layout.byId[al.elementId]) set.add(state.layout.byId[al.elementId])
  }
  return [...set]
})

// 初始化
logAudit({ action: 'system', target: '-', detail: '系统启动，加载平面图与当日演示数据' })
syncElementStatuses()

export function useStore() {
  return {
    state: readonly(state),
    raw: state,
    scheduler,
    tick,
    checkIn, markLate, markNoShow, cancelAppt, dismissAlert,
    updateRoomConfig, updateDoctor, updateScope, setOperator,
    logAudit,
    scheduleIndex,
    roomTimeline,
    alertElementMap,
    onElementStatusChange
  }
}
