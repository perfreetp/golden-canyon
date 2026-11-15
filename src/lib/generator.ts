// 按方向/类型批量生成进路
import type { Route, RouteType, Station, Direction } from '../types'
import { buildTopology, nearestNodeOnRow, planRoute } from './topology'
import { routeTypeLabel } from './util'
import { uid } from './util'

const END_KINDS: Record<RouteType, string[]> = {
  arrival: ['exit', 'shunt'], // 接车：进站信号机 → 出站/调车信号机
  departure: ['exit'], // 发车：调车/进站内按钮 → 出站信号机
  shunt: ['shunt'] // 调车：调车信号机之间
}
const START_KINDS: Record<RouteType, string[]> = {
  arrival: ['entry'],
  departure: ['shunt', 'entry'],
  shunt: ['shunt']
}

export interface GenOptions {
  direction: Direction
  types: RouteType[]
}

export function generateRoutes(station: Station, opts: GenOptions): Route[] {
  const topo = buildTopology(station)
  const created: Route[] = []
  const existing = new Set(
    station.routes.map((r) => `${r.startSignalId}|${r.endSignalId}|${r.direction}`)
  )

  for (const type of opts.types) {
    const starts = station.signals.filter(
      (s) => s.direction === opts.direction && START_KINDS[type].includes(s.kind)
    )
    const ends = station.signals.filter((e) => END_KINDS[type].includes(e.kind))
    for (const start of starts) {
      for (const end of ends) {
        if (start.id === end.id) continue
        if (end.x === start.x && end.rowId === start.rowId) continue
        const dedupKey = `${start.id}|${end.id}|${opts.direction}`
        if (existing.has(dedupKey)) continue
        const sn = nearestNodeOnRow(topo, start.rowId, start.x)
        const en = nearestNodeOnRow(topo, end.rowId, end.x)
        if (!sn || !en) continue
        const plan = planRoute(topo, sn, en, opts.direction)
        if (!plan) continue
        const route: Route = {
          id: uid('route'),
          name: `${routeTypeLabel(type)}进路 ${start.name}→${end.name}`,
          type,
          direction: opts.direction,
          startSignalId: start.id,
          endSignalId: end.id,
          pathNodeKeys: plan.nodeKeys,
          switchReqs: plan.switchReqs,
          sectionOrder: plan.sectionOrder,
          protectiveSwitches: plan.protectiveSwitches,
          simStatus: 'unrun'
        }
        created.push(route)
        existing.add(dedupKey)
      }
    }
  }
  return created
}

/** 重新计算单条进路（设备变更后修复用），失败返回 null */
export function recomputeRoute(station: Station, route: Route): Route | null {
  const topo = buildTopology(station)
  const start = station.signals.find((s) => s.id === route.startSignalId)
  const end = station.signals.find((s) => s.id === route.endSignalId)
  if (!start || !end) return null
  const sn = nearestNodeOnRow(topo, start.rowId, start.x)
  const en = nearestNodeOnRow(topo, end.rowId, end.x)
  if (!sn || !en) return null
  const plan = planRoute(topo, sn, en, route.direction)
  if (!plan) return null
  return {
    ...route,
    pathNodeKeys: plan.nodeKeys,
    switchReqs: plan.switchReqs,
    sectionOrder: plan.sectionOrder,
    protectiveSwitches: plan.protectiveSwitches,
    simStatus: 'unrun',
    simFailStep: undefined,
    simFailReason: undefined,
    simAt: undefined
  }
}
