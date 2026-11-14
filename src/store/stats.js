// 运营看板统计：利用率 / 平均等待 / 爽约率 / 镜体周转
import { computed } from 'vue'
import { SLOT_COUNT } from '../utils/time.js'

export function useStats(store) {
  const state = store.raw

  const stats = computed(() => {
    const appts = state.appointments
    const total = appts.length
    const done = appts.filter((a) => a.status === 'done').length
    const inProgress = appts.filter((a) => ['inprogress', 'recovery'].includes(a.status)).length
    const noshow = appts.filter((a) => a.status === 'noshow').length
    const late = appts.filter((a) => ['late'].includes(a.status)).length
    const urgent = appts.filter((a) => a.priority === 'urgent').length
    const checkedIn = appts.filter((a) => ['checkedin', 'late'].includes(a.status)).length

    // 检查间利用率：已占用时段数 / (启用房间数 × 20)
    const enabledRooms = state.roomConfigs.filter((r) => r.enabled)
    let usedSlots = 0
    for (const a of appts) {
      if (a.slot == null || ['cancelled', 'noshow'].includes(a.status)) continue
      usedSlots += a.duration
    }
    const capacity = enabledRooms.length * SLOT_COUNT
    const utilization = capacity ? usedSlots / capacity : 0

    // 平均等待（签到 - 预约开始）
    const waits = appts.filter((a) => a.waitMinutes != null).map((a) => a.waitMinutes)
    const avgWait = waits.length ? waits.reduce((s, v) => s + v, 0) / waits.length : 0
    const maxWait = waits.length ? Math.max(...waits) : 0

    // 爽约率
    const decided = appts.filter((a) => !['pending', 'scheduled', 'checkedin', 'inprogress', 'recovery', 'late'].includes(a.status)).length
    const noshowRate = decided ? noshow / decided : 0
    const lateRate = total ? late / total : 0

    // 镜体周转次数
    const totalTurnover = state.scopes.reduce((s, x) => s + x.usageCount, 0)
    const reprocessing = state.scopes.filter((s) => s.status === 'reprocessing').length
    const inUseScopes = state.scopes.filter((s) => s.status === 'in_use').length
    const maintScopes = state.scopes.filter((s) => s.status === 'maintenance').length

    // 各检查间明细
    const perRoom = state.roomConfigs.map((room) => {
      const rs = appts.filter((a) => a.roomId === room.id)
      const roomUsed = rs.filter((a) => a.slot != null && !['cancelled', 'noshow'].includes(a.status))
        .reduce((s, a) => s + a.duration, 0)
      const roomNo = rs.filter((a) => a.status === 'noshow').length
      const roomDone = rs.filter((a) => a.status === 'done').length
      const roomWaits = rs.map((a) => a.waitMinutes).filter((v) => v != null)
      return {
        ...room,
        usedSlots: roomUsed,
        utilization: roomUsed / SLOT_COUNT,
        apptCount: rs.length,
        done: roomDone,
        noshow: roomNo,
        avgWait: roomWaits.length ? roomWaits.reduce((s, v) => s + v, 0) / roomWaits.length : 0
      }
    })

    // 按区分组
    const perZone = state.layout.zones.map((z) => {
      const rooms = perRoom.filter((r) => r.zone === z.key)
      const u = rooms.length ? rooms.reduce((s, r) => s + r.utilization, 0) / rooms.length : 0
      return {
        key: z.key, name: z.name,
        utilization: u,
        apptCount: rooms.reduce((s, r) => s + r.apptCount, 0),
        noshow: rooms.reduce((s, r) => s + r.noshow, 0)
      }
    })

    // 排队队列（已签到未开始）
    const queue = appts
      .filter((a) => ['checkedin', 'late'].includes(a.status))
      .sort((a, b) => (a.priority === b.priority ? (a.checkInMin || 0) - (b.checkInMin || 0) : a.priority === 'urgent' ? -1 : 1))

    // 叫号队列（大屏）
    const calling = appts
      .filter((a) => ['checkedin', 'late', 'inprogress', 'recovery'].includes(a.status))
      .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))

    return {
      total, done, inProgress, noshow, late, urgent, checkedIn,
      utilization, avgWait, maxWait, noshowRate, lateRate,
      totalTurnover, reprocessing, inUseScopes, maintScopes,
      perRoom, perZone, queue, calling,
      enabledRoomCount: enabledRooms.length
    }
  })

  return { stats }
}
