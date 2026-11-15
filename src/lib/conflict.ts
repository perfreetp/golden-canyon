// 敌对进路与防护道岔位置冲突检测
import type { ConflictReport, Route, SwitchConflictPair, Station } from '../types'

export function analyzeConflicts(station: Station): ConflictReport {
  const routes = station.routes
  const hostile: ConflictReport['hostile'] = []
  const switchConflicts: SwitchConflictPair[] = []
  const hostileRouteIds = new Set<string>()
  const switchConflictRouteIds = new Set<string>()

  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const a = routes[i]
      const b = routes[j]

      // 敌对进路：同一区段 + 同方向
      if (a.direction === b.direction) {
        const bSecs = new Set(b.sectionOrder)
        const shared = a.sectionOrder.filter((s) => bSecs.has(s))
        for (const sectionId of shared) {
          hostile.push({ routeA: a.id, routeB: b.id, sectionId, direction: a.direction })
          hostileRouteIds.add(a.id)
          hostileRouteIds.add(b.id)
        }
      }

      // 防护道岔位置冲突：
      // A 的防护道岔（要求定位）被 B 以反位经过，或 B 的防护道岔被 A 以反位经过；
      // 以及同一道岔两条进路定位/反位要求直接相反。
      const reqA = new Map(a.switchReqs.map((r) => [r.switchId, r.position]))
      const reqB = new Map(b.switchReqs.map((r) => [r.switchId, r.position]))
      const allSw = new Set<string>([...reqA.keys(), ...reqB.keys(), ...a.protectiveSwitches, ...b.protectiveSwitches])
      for (const sw of allSw) {
        const pa = reqA.get(sw)
        const pb = reqB.get(sw)
        const aProtects = a.protectiveSwitches.includes(sw)
        const bProtects = b.protectiveSwitches.includes(sw)
        let conflict = false
        let posA: 'normal' | 'reverse' = aProtects ? 'normal' : (pa ?? 'normal')
        let posB: 'normal' | 'reverse' = bProtects ? 'normal' : (pb ?? 'normal')
        if (pa && pb && pa !== pb) conflict = true
        if (aProtects && pb === 'reverse') conflict = true
        if (bProtects && pa === 'reverse') conflict = true
        if (conflict) {
          switchConflicts.push({ routeA: a.id, routeB: b.id, switchId: sw, posA, posB })
          switchConflictRouteIds.add(a.id)
          switchConflictRouteIds.add(b.id)
        }
      }
    }
  }

  return { hostile, switchConflicts, hostileRouteIds, switchConflictRouteIds }
}

export function routeConflicts(station: Station, routeId: string): Pick<ConflictReport, 'hostile' | 'switchConflicts'> {
  const all = analyzeConflicts(station)
  return {
    hostile: all.hostile.filter((c) => c.routeA === routeId || c.routeB === routeId),
    switchConflicts: all.switchConflicts.filter((c) => c.routeA === routeId || c.routeB === routeId)
  }
}
