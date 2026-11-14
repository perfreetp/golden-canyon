// 演示数据生成：检查间配置、镜体池、医师排班、当日预约（确定性 + 少量随机）
import { createRng, fakeName, pick, randInt, chance } from '../utils/rng.js'
import { buildLayout } from '../canvas/layout.js'
import { SLOT_COUNT } from '../utils/time.js'

const PROC_TYPES = [
  { id: 'gastro', name: '胃镜', duration: 1, scopeType: 'gastroscope' },
  { id: 'colon', name: '肠镜', duration: 2, scopeType: 'colonoscope' },
  { id: 'ergo', name: 'ERCP 治疗', duration: 3, scopeType: 'duodenoscope' },
  { id: 'eus', name: '超声内镜', duration: 2, scopeType: 'eus' },
  { id: 'enteroscopy', name: '小肠镜', duration: 3, scopeType: 'enteroscope' },
  { id: 'polypectomy', name: '息肉切除', duration: 2, scopeType: 'colonoscope' }
]
export { PROC_TYPES }

const SCOPE_MODELS = {
  gastroscope: ['GIF-H290', 'GIF-HQ290', 'EG-760R'],
  colonoscope: ['CF-HQ290I', 'EC-760ZP', 'PCF-H290ZL'],
  duodenoscope: ['TJF-Q290V', 'ED-580XT'],
  eus: ['GF-UCT260', 'EG-580UR'],
  enteroscope: ['EN-580T', 'SIF-H290S']
}
export const SCOPE_TYPE_NAME = {
  gastroscope: '胃镜', colonoscope: '肠镜', duodenoscope: '十二指肠镜',
  eus: '超声内镜', enteroscope: '小肠镜'
}

function doctorShift(rng) {
  const r = rng()
  if (r < 0.65) return { label: '全天 08:00-17:30', start: 0, end: 19 }
  if (r < 0.82) return { label: '上午 08:00-12:30', start: 0, end: 9 }
  return { label: '下午 13:00-18:00', start: 10, end: 20 }
}

export function generateSeedData() {
  const rng = createRng(20261115)
  const layout = buildLayout()
  const roomElements = layout.elements.filter((e) => e.type === 'room' && e.meta?.code)

  // 检查间配置：时段容量 / 加急比例 / 支持类型
  const roomConfigs = roomElements.map((e, i) => {
    const kind = e.meta.kind
    const supported = kind === 'therapy'
      ? ['gastro', 'colon', 'polypectomy', 'ergo']
      : kind === 'special'
        ? ['gastro', 'eus', 'enteroscopy', 'colon']
        : ['gastro', 'colon', 'polypectomy']
    return {
      id: e.id,
      code: e.meta.code,
      zone: e.meta.zone,
      kind,
      name: e.name,
      slotCapacity: 1, // 每时段并行检查数（标准间 1，治疗间可配 2）
      urgentRatio: kind === 'special' ? 0.25 : 0.15,
      supported,
      enabled: true,
      scopePositionId: e.meta.scopePositionId
    }
  })

  // 镜体池：按区分配，共约 150 条，绑定位/镜柜
  const scopes = []
  const cabinets = layout.elements.filter((e) => e.type === 'scopeCabinet')
  let cabinetCursor = 0
  const typePlan = ['gastroscope', 'gastroscope', 'colonoscope', 'colonoscope', 'colonoscope', 'duodenoscope', 'eus', 'enteroscope']
  for (const zone of layout.zones) {
    const count = 38
    for (let i = 0; i < count; i++) {
      const type = typePlan[randInt(rng, 0, typePlan.length - 1)]
      const id = `scope-${zone.key}-${String(i + 1).padStart(3, '0')}`
      const cabinet = cabinets[cabinetCursor % cabinets.length]
      cabinetCursor++
      scopes.push({
        id,
        code: id.replace('scope-', 'SC-'),
        type,
        typeName: SCOPE_TYPE_NAME[type],
        model: pick(rng, SCOPE_MODELS[type]),
        zone: zone.key,
        cabinetId: cabinet.id,
        positionId: null,
        status: 'available', // available | in_use | reprocessing | maintenance
        usageCount: randInt(rng, 0, 42),
        lastMaint: `2026-${String(randInt(rng, 8, 11)).padStart(2, '0')}-${String(randInt(rng, 1, 28)).padStart(2, '0')}`,
        reprocessUntilMin: null,
        currentRoom: null
      })
    }
  }
  // 几条维护镜
  for (let i = 0; i < 6; i++) {
    scopes[randInt(rng, 0, scopes.length - 1)].status = 'maintenance'
  }

  // 医师排班：32 名医师
  const titles = ['主任医师', '副主任医师', '主治医师', '住院医师']
  const doctors = []
  const usedNames = new Set()
  for (let i = 0; i < 32; i++) {
    let name = fakeName(rng)
    while (usedNames.has(name)) name = fakeName(rng)
    usedNames.add(name)
    const shift = doctorShift(rng)
    const title = titles[Math.min(3, Math.floor(rng() * 4 + (i < 6 ? 0 : 1)))]
    const zone = layout.zones[i % 4].key
    doctors.push({
      id: `doc-${i + 1}`,
      name,
      title,
      zone,
      shift: shift.label,
      shiftStart: shift.start,
      shiftEnd: shift.end,
      skills: i < 6 ? PROC_TYPES.map((p) => p.id) : ['gastro', 'colon', 'polypectomy'],
      workstationId: `workstation-${(i % 8) + 1}-${(i % 8) + 1}`,
      off: false
    })
  }

  // 当日预约：先生成需求，再按排程同源规则贪心落位（避免初始硬冲突）
  const surnames = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜'
  const givens = '伟芳娜敏静丽强磊军洋勇艳杰娟涛明超秀兰霞平'
  const demands = []
  const total = 310
  for (let i = 0; i < total; i++) {
    const urgent = i < 26 || chance(rng, 0.04)
    const proc = urgent && chance(rng, 0.5)
      ? pick(rng, PROC_TYPES.filter((p) => ['gastro', 'colon', 'ergo', 'eus'].includes(p.id)))
      : pick(rng, PROC_TYPES)
    const nm = surnames[Math.floor(rng() * surnames.length)] + givens[Math.floor(rng() * givens.length)]
    demands.push({
      proc, urgent,
      patientName: nm,
      age: randInt(rng, 22, 84),
      gender: chance(rng, 0.5) ? '男' : '女',
      preferSlot: randInt(rng, 0, SLOT_COUNT - proc.duration)
    })
  }
  // 急诊优先落位
  demands.sort((a, b) => (a.urgent === b.urgent ? 0 : a.urgent ? -1 : 1))

  const roomBusy = new Map() // roomId -> Set(slot)
  const docBusy = new Map()
  const scopeBusy = new Map() // 含洗消周转档
  const isFree = (map, id, slots) => {
    const set = map.get(id)
    return !set || !slots.some((s) => set.has(s))
  }
  const reserve = (map, id, slots) => {
    if (!map.has(id)) map.set(id, new Set())
    slots.forEach((s) => map.get(id).add(s))
  }
  const usableScopes = new Map() // type -> 非维护镜体
  for (const p of PROC_TYPES) {
    usableScopes.set(p.scopeType, scopes.filter((s) => s.type === p.scopeType && s.status !== 'maintenance'))
  }

  const appointments = []
  let seq = 1
  for (const d of demands) {
    const id = `appt-${String(seq).padStart(4, '0')}`
    seq++
    const appt = {
      id,
      patientNo: `P${String(20260000 + seq)}`,
      patientName: d.patientName,
      age: d.age,
      gender: d.gender,
      procId: d.proc.id,
      procName: d.proc.name,
      duration: d.proc.duration,
      priority: d.urgent ? 'urgent' : 'normal',
      slot: null, roomId: null, doctorId: null, scopeId: null,
      status: 'pending',
      checkInMin: null, scheduledMin: null, actualStartMin: null, waitMinutes: null,
      lateReason: null, noshowReason: null,
      note: d.urgent ? '急诊绿色通道' : ''
    }
    const rooms = roomConfigs
      .filter((r) => r.enabled && r.supported.includes(d.proc.id))
      .sort(() => rng() - 0.5)
    const slotOrder = [...Array(SLOT_COUNT - d.proc.duration + 1).keys()].sort((a, b) => {
      // 急诊从最早开始找；常规以偏好时段为中心向外扩散
      if (d.urgent) return a - b
      const da = Math.abs(a - d.preferSlot), db = Math.abs(b - d.preferSlot)
      return da - db || a - b
    })
    let placed = false
    outer:
    for (const slot of slotOrder) {
      const slots = Array.from({ length: d.proc.duration + 1 }, (_, k) => slot + k) // +1 为洗消周转档
      for (const room of rooms) {
        if (!isFree(roomBusy, room.id, slots.slice(0, d.proc.duration))) continue
        const doctor = doctors.find((dd) => dd.skills.includes(d.proc.id) &&
          slot >= dd.shiftStart && slot + d.proc.duration <= dd.shiftEnd &&
          isFree(docBusy, dd.id, slots.slice(0, d.proc.duration)) &&
          (dd.zone === room.zone || rng() < 0.25)) ||
          doctors.find((dd) => dd.skills.includes(d.proc.id) &&
            slot >= dd.shiftStart && slot + d.proc.duration <= dd.shiftEnd &&
            isFree(docBusy, dd.id, slots.slice(0, d.proc.duration)))
        if (!doctor) continue
        const scope = usableScopes.get(d.proc.scopeType)
          .find((s) => (s.zone === room.zone || rng() < 0.2) && isFree(scopeBusy, s.id, slots)) ||
          usableScopes.get(d.proc.scopeType).find((s) => isFree(scopeBusy, s.id, slots))
        if (!scope) continue
        reserve(roomBusy, room.id, slots.slice(0, d.proc.duration))
        reserve(docBusy, doctor.id, slots.slice(0, d.proc.duration))
        reserve(scopeBusy, scope.id, slots)
        appt.slot = slot
        appt.roomId = room.id
        appt.doctorId = doctor.id
        appt.scopeId = scope.id
        appt.scheduledMin = 8 * 60 + slot * 30
        placed = true
        break outer
      }
    }

    if (placed) {
      // 按模拟时钟起点 10:00（第 4 档）回推当日状态分布
      const slot = appt.slot
      if (slot <= 3 && !d.urgent) appt.status = chance(rng, 0.85) ? 'done' : 'noshow'
      else if (slot === 4) appt.status = chance(rng, 0.5) ? 'inprogress' : 'checkedin'
      else if (slot === 5) appt.status = chance(rng, 0.4) ? 'recovery' : 'checkedin'
      else appt.status = 'scheduled'
      if (appt.status === 'done' || appt.status === 'inprogress' || appt.status === 'recovery') {
        appt.actualStartMin = appt.scheduledMin + randInt(rng, 0, 18)
      }
      if (['done', 'checkedin', 'inprogress', 'recovery'].includes(appt.status)) {
        appt.checkInMin = appt.scheduledMin + (chance(rng, 0.2) ? randInt(rng, 5, 28) : -randInt(rng, 2, 20))
      }
      if (appt.status === 'noshow') {
        appt.noshowReason = pick(rng, ['联系不上', '身体不适改期', '已在外院检查', '未禁食无法检查', '个人原因放弃'])
      }
    }
    appointments.push(appt)
  }
  // 保证待排队列中含急诊加急样本
  const pendingApps = appointments.filter((a) => a.status === 'pending')
  for (const a of pendingApps.slice(0, 3)) a.priority = 'urgent'

  // 根据已落位预约的初始状态同步镜体（检查中/洗消中），镜体绑定在分配阶段已完成
  for (const a of appointments) {
    if (a.scopeId == null) continue
    const scope = scopes.find((s) => s.id === a.scopeId)
    if (!scope) continue
    if (a.status === 'inprogress') {
      scope.status = 'in_use'
      scope.currentRoom = a.roomId
    } else if (a.status === 'recovery') {
      scope.status = 'reprocessing'
      scope.reprocessUntilMin = a.scheduledMin + 25
    }
  }

  return {
    layout,
    roomConfigs,
    scopes,
    doctors,
    appointments,
    procTypes: PROC_TYPES
  }
}
