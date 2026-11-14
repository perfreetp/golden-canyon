// 自动排程引擎：急诊优先 + 镜体周转时间约束 + 时段容量校验 + 冲突候选时段
import { SLOT_COUNT, REPROCESS_MINUTES } from '../utils/time.js'

export class Scheduler {
  constructor(store) {
    this.store = store
  }

  get state() { return this.store.state }

  // 房间在某时段的占用数
  #roomLoad(roomId, slot, duration, excludeApptId = null) {
    let load = 0
    for (const a of this.state.appointments) {
      if (a.id === excludeApptId || a.roomId !== roomId) continue
      if (['cancelled', 'done', 'noshow'].includes(a.status)) continue
      if (a.slot == null) continue
      if (slot < a.slot + a.duration && a.slot < slot + duration) load++
    }
    return load
  }

  #doctorLoad(doctorId, slot, duration, excludeApptId = null) {
    for (const a of this.state.appointments) {
      if (a.id === excludeApptId || a.doctorId !== doctorId) continue
      if (['cancelled', 'done', 'noshow'].includes(a.status) || a.slot == null) continue
      if (slot < a.slot + a.duration && a.slot < slot + duration) return true
    }
    return false
  }

  // 候选镜体：类型匹配、可用（或在需要时间点前完成洗消）、且该时段未被其他预约占用
  #isScopeBooked(scopeId, slot, duration, excludeApptId) {
    for (const a of this.state.appointments) {
      if (a.id === excludeApptId || a.scopeId !== scopeId || a.slot == null) continue
      if (['cancelled', 'done', 'noshow'].includes(a.status)) continue
      // 占用档 = 检查档 + 1 个洗消周转档
      if (slot < a.slot + a.duration + 1 && a.slot < slot + duration) return true
    }
    return false
  }

  #findScope(procType, zone, slot, duration, excludeApptId = null) {
    const proc = this.state.procTypes.find((p) => p.id === procType)
    const neededByMin = 8 * 60 + slot * 30
    const free = (s) => !this.#isScopeBooked(s.id, slot, duration, excludeApptId)
    const scopes = this.state.scopes
      .filter((s) => s.type === proc.scopeType && s.status !== 'maintenance')
      .sort((a, b) => {
        const rank = (s) => (s.status === 'available' ? 0 : s.status === 'reprocessing' ? 1 : 2)
        return rank(a) - rank(b) || (a.reprocessUntilMin || 0) - (b.reprocessUntilMin || 0)
      })
    return (
      scopes.find((s) => s.zone === zone && s.status === 'available' && free(s)) ||
      scopes.find((s) => s.status === 'available' && free(s)) ||
      scopes.find((s) => s.zone === zone && (s.reprocessUntilMin ?? 0) <= neededByMin && free(s)) ||
      scopes.find((s) => (s.reprocessUntilMin ?? 0) <= neededByMin && free(s)) ||
      null
    )
  }

  // 评估单个候选时段，返回 0=完全可行，1=有软冲突（加急配额外），2=硬冲突不可行
  #evaluateSlot(appt, room, doctor, slot, excludeApptId = null) {
    const end = slot + appt.duration
    if (end > SLOT_COUNT) return { ok: false, hard: true, reason: '超出运营时段' }
    if (!room.supported.includes(appt.procId)) return { ok: false, hard: true, reason: '房间不支持该检查类型' }
    if (!room.enabled) return { ok: false, hard: true, reason: '房间已停用' }
    const load = this.#roomLoad(room.id, slot, appt.duration, excludeApptId)
    if (load >= room.slotCapacity) return { ok: false, hard: true, reason: '时段容量已满' }
    if (doctor) {
      if (slot < doctor.shiftStart || end > doctor.shiftEnd) return { ok: false, hard: true, reason: '医师不在排班时段' }
      if (this.#doctorLoad(doctor.id, slot, appt.duration, excludeApptId)) return { ok: false, hard: true, reason: '医师该时段已有排程' }
    }
    const neededMin = 8 * 60 + slot * 30
    const scope = this.#findScope(appt.procId, room.zone, slot, appt.duration, excludeApptId)
    if (!scope) return { ok: false, hard: true, reason: '无可用镜体（含周转等待）' }
    // 加急配额：当天该房间已排加急占比
    if (appt.priority === 'normal') {
      const urgentToday = this.state.appointments.filter(
        (a) => a.roomId === room.id && a.priority === 'urgent' && a.id !== excludeApptId &&
          !['cancelled', 'noshow'].includes(a.status)
      ).length
      const total = this.state.appointments.filter(
        (a) => a.roomId === room.id && a.id !== excludeApptId && a.slot != null &&
          !['cancelled', 'noshow'].includes(a.status)
      ).length
      if (total > 0 && urgentToday / total >= room.urgentRatio) {
        // 配额已达标仍可排，只是不优先
      }
    }
    return { ok: true, hard: false, scope, neededMin }
  }

  // 列出候选时段（冲突时人工选择用）
  candidateSlots(appt, { roomId = null, doctorId = null } = {}) {
    const rooms = this.state.roomConfigs.filter(
      (r) => (!roomId || r.id === roomId) && r.supported.includes(appt.procId)
    )
    const doctor = doctorId ? this.state.doctors.find((d) => d.id === doctorId) : null
    const out = []
    for (const room of rooms) {
      for (let slot = 0; slot + appt.duration <= SLOT_COUNT; slot++) {
        const ev = this.#evaluateSlot(appt, room, doctor, slot)
        if (ev.ok) {
          out.push({
            roomId: room.id, roomCode: room.code, slot,
            doctorId: doctor?.id || null,
            doctorName: doctor?.name || '自动指派',
            scopeId: ev.scope.id, scopeCode: ev.scope.code,
            urgent: appt.priority === 'urgent',
            score: slot * 10 + (appt.priority === 'urgent' ? 0 : 100)
          })
        }
      }
    }
    // 急诊优先排序：急诊预约的候选排在最前，同时段按房间编号
    out.sort((a, b) => a.slot - b.slot || a.roomCode.localeCompare(b.roomCode))
    return out
  }

  // 尝试将预约放入指定时段（人工调整），返回 {ok} 或冲突信息
  tryAssign(appt, { roomId, slot, doctorId = null, operator }) {
    const room = this.state.roomConfigs.find((r) => r.id === roomId)
    const doctor = doctorId ? this.state.doctors.find((d) => d.id === doctorId) : null
    const ev = this.#evaluateSlot(appt, room, doctor, slot, appt.id)
    if (!ev.ok) {
      return { ok: false, reason: ev.reason, candidates: this.candidateSlots(appt, { roomId, doctorId }) }
    }
    this.#commit(appt, { room, slot, doctor, scope: ev.scope, operator })
    return { ok: true }
  }

  #commit(appt, { room, slot, doctor, scope, operator }) {
    const oldRoom = appt.roomId
    appt.roomId = room.id
    appt.slot = slot
    appt.doctorId = doctor?.id || appt.doctorId
    appt.scopeId = scope.id
    appt.status = 'scheduled'
    appt.scheduledMin = 8 * 60 + slot * 30
    this.store.logAudit({
      action: oldRoom ? 'reschedule' : 'schedule',
      target: appt.id,
      detail: `${appt.patientName} ${appt.procName} → ${room.code} 第${slot + 1}时段 镜体${scope.code}${doctor ? ' 医师' + doctor.name : ''}`,
      operator
    })
  }

  #autoPickDoctor(appt, room, slot) {
    const end = slot + appt.duration
    return this.state.doctors
      .filter((d) => !d.off && d.skills.includes(appt.procId) && slot >= d.shiftStart && end <= d.shiftEnd &&
        !this.#doctorLoad(d.id, slot, appt.duration, appt.id))
      .sort((a, b) => a.zone === room.zone ? -1 : 1)[0] || null
  }

  // 自动排全部待排预约
  autoSchedule({ operator } = {}) {
    const pending = this.state.appointments
      .filter((a) => a.status === 'pending')
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === 'urgent' ? -1 : 1
        return (a.id < b.id ? -1 : 1)
      })
    const results = { scheduled: [], failed: [] }
    for (const appt of pending) {
      const rooms = this.state.roomConfigs
        .filter((r) => r.enabled && r.supported.includes(appt.procId))
        .sort((a, b) => (a.zone === b.zone ? 0 : 0))
      let best = null
      for (const room of rooms) {
        for (let slot = 0; slot + appt.duration <= SLOT_COUNT; slot++) {
          const doctor = this.#autoPickDoctor(appt, room, slot)
          const ev = this.#evaluateSlot(appt, room, doctor, slot, appt.id)
          if (!ev.ok) continue
          // 急诊优先：加急预约选最早可行时段；普通预约避开房间加急配额未达标的早期时段
          const score = slot + (appt.priority === 'normal' && this.#urgentQuotaPending(room) ? 2 : 0)
          if (!best || score < best.score) best = { room, slot, doctor, scope: ev.scope, score }
        }
      }
      if (best) {
        this.#commit(appt, { ...best, operator })
        results.scheduled.push(appt.id)
      } else {
        results.failed.push({ id: appt.id, reason: '无可行时段/镜体/医师，请人工处理' })
      }
    }
    if (operator) {
      this.store.logAudit({
        action: 'auto-schedule',
        target: 'batch',
        detail: `自动排程：成功 ${results.scheduled.length} 例，待人工 ${results.failed.length} 例`,
        operator
      })
    }
    return results
  }

  #urgentQuotaPending(room) {
    const urgentPending = this.state.appointments.filter(
      (a) => a.status === 'pending' && a.priority === 'urgent'
    ).length
    return urgentPending > 0
  }

  // 冲突检测：返回当前存在的所有容量/医师冲突
  detectConflicts() {
    const conflicts = []
    const active = this.state.appointments.filter(
      (a) => a.slot != null && !['cancelled', 'done', 'noshow'].includes(a.status)
    )
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i], b = active[j]
        const overlap = a.slot < b.slot + b.duration && b.slot < a.slot + a.duration
        if (!overlap) continue
        if (a.roomId === b.roomId) {
          const room = this.state.roomConfigs.find((r) => r.id === a.roomId)
          if (room && this.#roomLoad(a.roomId, a.slot, 1) > room.slotCapacity) {
            conflicts.push({ type: 'room', a: a.id, b: b.id, roomId: a.roomId, detail: `${room.code} 时段容量冲突` })
          }
        }
        if (a.doctorId && a.doctorId === b.doctorId) {
          conflicts.push({ type: 'doctor', a: a.id, b: b.id, doctorId: a.doctorId, detail: '医师同一时段重复排程' })
        }
        if (a.scopeId && a.scopeId === b.scopeId) {
          conflicts.push({ type: 'scope', a: a.id, b: b.id, scopeId: a.scopeId, detail: '镜体周转时间冲突' })
        }
      }
    }
    return conflicts
  }
}

export { REPROCESS_MINUTES }
