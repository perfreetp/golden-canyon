// 进路排列仿真引擎：按步骤校验并产出仿真结果
import type { Route, SimResult, SimStep, Station, SwitchPosition } from '../types'
import { buildTopology, nearestNodeOnRow, planRoute, type Topology } from './topology'
import { posLabel } from './util'

export interface RuntimeLock {
  // 设备锁闭状态（已排列进路占用）
  switchLocks: Map<string, { routeId: string; position: SwitchPosition }>
  sectionLocks: Map<string, string> // sectionId -> routeId
  switchBlocked: Set<string> // 道岔故障/封锁（手动注入）
  sectionBlocked: Set<string> // 区段故障/封锁（手动注入，含 section.blocked）
}

export function createRuntimeLock(station: Station): RuntimeLock {
  const lock: RuntimeLock = {
    switchLocks: new Map(),
    sectionLocks: new Map(),
    switchBlocked: new Set(),
    sectionBlocked: new Set(station.sections.filter((s) => s.blocked).map((s) => s.id))
  }
  return lock
}

export function lockRoute(rt: RuntimeLock, route: Route): void {
  for (const r of route.switchReqs) rt.switchLocks.set(r.switchId, { routeId: route.id, position: r.position })
  for (const s of route.protectiveSwitches) {
    if (!rt.switchLocks.has(s)) rt.switchLocks.set(s, { routeId: route.id, position: 'normal' })
  }
  for (const sid of route.sectionOrder) rt.sectionLocks.set(sid, route.id)
}

export function releaseRoute(rt: RuntimeLock, route: Route): void {
  for (const r of route.switchReqs) {
    const cur = rt.switchLocks.get(r.switchId)
    if (cur?.routeId === route.id) rt.switchLocks.delete(r.switchId)
  }
  for (const s of route.protectiveSwitches) {
    const cur = rt.switchLocks.get(s)
    if (cur?.routeId === route.id) rt.switchLocks.delete(s)
  }
  for (const sid of route.sectionOrder) {
    if (rt.sectionLocks.get(sid) === route.id) rt.sectionLocks.delete(sid)
  }
}

export interface BuildContext {
  station: Station
  topo: Topology
  route: Route
  rt: RuntimeLock
  hostileRouteIds: Set<string>
  by: 'designer' | 'reviewer' | 'tester'
}

/** 生成排列进路的完整步骤序列；遇错停止，ok=false 的步骤即卡住位置 */
export function buildSimSteps(ctx: BuildContext): SimStep[] {
  const { station, topo, route, rt, hostileRouteIds } = ctx
  const steps: SimStep[] = []
  const swMap = new Map(station.switches.map((s) => [s.id, s]))
  const secMap = new Map(station.sections.map((s) => [s.id, s]))
  const sigMap = new Map(station.signals.map((s) => [s.id, s]))
  let idx = 0
  const push = (s: Omit<SimStep, 'index'>): SimStep => {
    const step = { ...s, index: idx++ }
    steps.push(step)
    return step
  }

  // 步骤1：始端/终端按钮（信号机）检查
  const startSig = sigMap.get(route.startSignalId)
  const endSig = sigMap.get(route.endSignalId)
  if (!startSig || !endSig) {
    push({
      kind: 'signal',
      targetId: !startSig ? route.startSignalId : route.endSignalId,
      label: '检查始端/终端按钮（信号机）',
      ok: false,
      reason: `信号机 ${!startSig ? '始端' : '终端'} 已被删除或未命名，按钮不存在`
    })
    return steps
  }
  push({ kind: 'signal', targetId: startSig.id, label: `始端按钮 ${startSig.name}、终端按钮 ${endSig.name} 均存在`, ok: true })

  // 步骤2：选路（拓扑可达性）
  const startNode = nearestNodeOnRow(topo, startSig.rowId, startSig.x)
  const endNode = nearestNodeOnRow(topo, endSig.rowId, endSig.x)
  if (!startNode || !endNode) {
    push({ kind: 'signal', targetId: startSig.id, label: '进路选路', ok: false, reason: '信号机附近找不到站场拓扑节点' })
    return steps
  }
  const planned = planRoute(topo, startNode, endNode, route.direction)
  if (!planned) {
    push({
      kind: 'signal',
      targetId: startSig.id,
      label: '进路选路（始端→终端搜索路径）',
      ok: false,
      reason: `按${route.direction === 'left' ? '向左（下行）' : '向右（上行）'}方向，始端 ${startSig.name} 到终端 ${endSig.name} 无可达路径（道岔/渡线缺失）`
    })
    return steps
  }
  push({ kind: 'signal', targetId: startSig.id, label: `选路成功，途经 ${planned.nodeKeys.length} 个拓扑节点、${planned.sectionOrder.length} 个区段`, ok: true })

  // 步骤3：敌对进路锁闭检查
  const lockedHostile = [...rt.sectionLocks.values()].some((rid) => hostileRouteIds.has(rid) && rid !== route.id)
  if (lockedHostile) {
    push({
      kind: 'signal',
      targetId: startSig.id,
      label: '敌对进路锁闭检查',
      ok: false,
      reason: '存在敌对进路处于锁闭状态，本进路禁止排列（先解锁敌对进路）'
    })
    return steps
  }
  push({ kind: 'signal', targetId: startSig.id, label: '敌对进路检查通过（无锁闭中的敌对进路）', ok: true })

  // 步骤4：道岔逐一转动
  for (const req of route.switchReqs) {
    const sw = swMap.get(req.switchId)
    if (!sw) {
      push({ kind: 'switch', targetId: req.switchId, label: `道岔 ${req.switchId} 检查`, ok: false, reason: `道岔 ${req.switchId} 已从站场图删除，进路表未同步` })
      return steps
    }
    if (rt.switchBlocked.has(sw.id)) {
      push({ kind: 'switch', targetId: sw.id, label: `道岔 ${sw.name} 转动至${posLabel(req.position)}`, ok: false, reason: `道岔 ${sw.name} 故障/封锁，无法转动` })
      return steps
    }
    const lock = rt.switchLocks.get(sw.id)
    if (lock && lock.routeId !== route.id && lock.position !== req.position) {
      push({ kind: 'switch', targetId: sw.id, label: `道岔 ${sw.name} 转动至${posLabel(req.position)}`, ok: false, reason: `道岔 ${sw.name} 已被进路锁闭在${posLabel(lock.position)}，无法转到${posLabel(req.position)}` })
      return steps
    }
    push({ kind: 'switch', targetId: sw.id, label: `道岔 ${sw.name} 转动至${posLabel(req.position)}并锁闭`, ok: true })
  }

  // 步骤5：防护道岔到位检查
  for (const swId of route.protectiveSwitches) {
    const sw = swMap.get(swId)
    const name = sw?.name ?? swId
    if (!sw) {
      push({ kind: 'switch', targetId: swId, label: `防护道岔 ${swId} 检查`, ok: false, reason: `防护道岔 ${swId} 已从站场图删除` })
      return steps
    }
    if (rt.switchBlocked.has(swId)) {
      push({ kind: 'switch', targetId: swId, label: `防护道岔 ${name} 置于定位`, ok: false, reason: `防护道岔 ${name} 故障/封锁` })
      return steps
    }
    const lock = rt.switchLocks.get(swId)
    if (lock && lock.routeId !== route.id && lock.position !== 'normal') {
      push({ kind: 'switch', targetId: swId, label: `防护道岔 ${name} 置于定位`, ok: false, reason: `防护道岔 ${name} 被其他进路锁在反位，防护条件不满足` })
      return steps
    }
    push({ kind: 'switch', targetId: swId, label: `防护道岔 ${name} 置于定位并锁闭`, ok: true })
  }

  // 步骤6：区段空闲检查（按占用顺序逐段点亮）
  for (const sid of route.sectionOrder) {
    const sec = secMap.get(sid)
    const name = sec?.name ?? sid
    if (!sec) {
      push({ kind: 'section', targetId: sid, label: `区段 ${sid} 检查`, ok: false, reason: `区段 ${sid} 已从站场图删除，进路表未同步` })
      return steps
    }
    if (sec.blocked || rt.sectionBlocked.has(sid)) {
      push({ kind: 'section', targetId: sid, label: `区段 ${name} 空闲检查`, ok: false, reason: `区段 ${name} 故障/封锁（占用），进路无法排列` })
      return steps
    }
    const lockOwner = rt.sectionLocks.get(sid)
    if (lockOwner && lockOwner !== route.id) {
      push({ kind: 'section', targetId: sid, label: `区段 ${name} 空闲检查`, ok: false, reason: `区段 ${name} 已被其他进路锁闭占用` })
      return steps
    }
    push({ kind: 'section', targetId: sid, label: `区段 ${name} 空闲，点亮白光带并锁闭`, ok: true })
  }

  // 步骤7：信号开放
  push({ kind: 'signal', targetId: startSig.id, label: `始端信号机 ${startSig.name} 开放（进路排列完成）`, ok: true })
  push({ kind: 'complete', targetId: route.id, label: '进路排列成功', ok: true })
  return steps
}

export function runSimulation(
  station: Station,
  route: Route,
  rt: RuntimeLock,
  hostileRouteIds: Set<string>,
  by: BuildContext['by']
): SimResult {
  const topo = buildTopology(station)
  const steps = buildSimSteps({ station, topo, route, rt, hostileRouteIds, by })
  const fail = steps.find((s) => !s.ok)
  const result: SimResult = {
    routeId: route.id,
    ok: !fail,
    steps,
    failStep: fail ? fail.index : -1,
    reason: fail?.reason,
    at: Date.now(),
    by
  }
  if (result.ok) lockRoute(rt, route)
  return result
}
