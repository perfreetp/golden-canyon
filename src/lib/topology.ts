// 站场拓扑建模与进路路径搜索
import type { Section, Station, SwitchNode, SwitchPosition, SwitchReq, TrackRow } from '../types'

export interface GraphNode {
  key: string
  x: number
  y: number
  rowId: string
  kind: 'switch' | 'boundary'
  switchId?: string
}

export interface GraphEdge {
  a: string
  b: string
  rowId: string
  slip: boolean // 是否为渡线（换股道）边
  switchReqs: SwitchReq[]
  sections: string[] // 该边上的区段 id（按 x 排序）
}

export interface Topology {
  nodes: Map<string, GraphNode>
  edges: GraphEdge[]
  adjacency: Map<string, { edge: GraphEdge; to: string }[]>
}

export const SLIP_GAP = 26 // 不同股道上道岔 x 坐标差小于该值视为渡线连接

const swKey = (id: string) => `sw:${id}`
const bKey = (rowId: string, x: number) => `b:${rowId}:${Math.round(x)}`

export function buildTopology(station: Station): Topology {
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []
  const adjacency = new Map<string, { edge: GraphEdge; to: string }[]>()

  const ensureBoundary = (row: TrackRow, x: number): string => {
    const key = bKey(row.id, x)
    if (!nodes.has(key)) {
      nodes.set(key, { key, x, y: row.y, rowId: row.id, kind: 'boundary' })
    }
    return key
  }
  const ensureSwitch = (s: SwitchNode, row: TrackRow): string => {
    const key = swKey(s.id)
    if (!nodes.has(key)) {
      nodes.set(key, { key, x: s.x, y: row.y, rowId: row.id, kind: 'switch', switchId: s.id })
    }
    return key
  }
  const addEdge = (e: GraphEdge) => {
    edges.push(e)
    if (!adjacency.has(e.a)) adjacency.set(e.a, [])
    if (!adjacency.has(e.b)) adjacency.set(e.b, [])
    adjacency.get(e.a)!.push({ edge: e, to: e.b })
    adjacency.get(e.b)!.push({ edge: e, to: e.a })
  }

  const rowById = new Map(station.rows.map((r) => [r.id, r]))

  // 1) 每条股道上按道岔/站界切分段，形成股道内边
  for (const row of station.rows) {
    const sws = station.switches.filter((s) => s.rowId === row.id).sort((a, b) => a.x - b.x)
    const cuts = [0, ...sws.map((s) => s.x), station.width]
    const uniq = [...new Set(cuts)].sort((a, b) => a - b)
    const swAt = new Map(sws.map((s) => [s.x, s]))
    for (let i = 0; i < uniq.length - 1; i++) {
      const x1 = uniq[i]
      const x2 = uniq[i + 1]
      const ka = swAt.has(x1) ? ensureSwitch(swAt.get(x1)!, row) : ensureBoundary(row, x1)
      const kb = swAt.has(x2) ? ensureSwitch(swAt.get(x2)!, row) : ensureBoundary(row, x2)
      const reqs: SwitchReq[] = []
      const na = nodes.get(ka)!
      const nb = nodes.get(kb)!
      if (na.kind === 'switch') reqs.push({ switchId: na.switchId!, position: 'normal' })
      if (nb.kind === 'switch') reqs.push({ switchId: nb.switchId!, position: 'normal' })
      const sections = station.sections
        .filter((sec) => sec.rowId === row.id)
        .filter((sec) => (sec.x1 + sec.x2) / 2 >= x1 && (sec.x1 + sec.x2) / 2 <= x2)
        .sort((a, b) => a.x1 - b.x1)
        .map((s) => s.id)
      addEdge({ a: ka, b: kb, rowId: row.id, slip: false, switchReqs: reqs, sections })
    }
  }

  // 2) 不同股道上对齐的道岔之间建立渡线边（反位连通）
  for (let i = 0; i < station.switches.length; i++) {
    for (let j = i + 1; j < station.switches.length; j++) {
      const s1 = station.switches[i]
      const s2 = station.switches[j]
      if (s1.rowId === s2.rowId) continue
      if (Math.abs(s1.x - s2.x) <= SLIP_GAP) {
        const r1 = rowById.get(s1.rowId)!
        const r2 = rowById.get(s2.rowId)!
        const k1 = ensureSwitch(s1, r1)
        const k2 = ensureSwitch(s2, r2)
        addEdge({
          a: k1,
          b: k2,
          rowId: '',
          slip: true,
          switchReqs: [
            { switchId: s1.id, position: 'reverse' },
            { switchId: s2.id, position: 'reverse' }
          ],
          sections: []
        })
      }
    }
  }

  return { nodes, edges, adjacency }
}

/** 找到某股道上距离 x 最近的图节点 */
export function nearestNodeOnRow(topo: Topology, rowId: string, x: number): string | null {
  let best: string | null = null
  let bestD = Infinity
  for (const n of topo.nodes.values()) {
    if (n.rowId !== rowId) continue
    const d = Math.abs(n.x - x)
    if (d < bestD) {
      bestD = d
      best = n.key
    }
  }
  return best
}

export interface PlannedRoute {
  nodeKeys: string[]
  sectionOrder: string[]
  switchReqs: SwitchReq[]
  protectiveSwitches: string[]
}

/**
 * Dijkstra 搜索始端→终端路径。
 * 代价：股道内边 1，渡线边 8（优先正线/少换道），边内每副反位要求 +2。
 * 首段必须与始端信号机授权方向一致。
 */
export function planRoute(
  topo: Topology,
  startNodeKey: string,
  endNodeKey: string,
  startDirection: 'left' | 'right'
): PlannedRoute | null {
  const start = topo.nodes.get(startNodeKey)
  const end = topo.nodes.get(endNodeKey)
  if (!start || !end) return null

  const dist = new Map<string, number>([[start.key, 0]])
  const prev = new Map<string, { from: string; edge: GraphEdge }>()
  const queue = new Set<string>([start.key])

  // 运行方向要求 x 坐标全程单调（始端信号机授权方向）
  const monotonicOk = (fromKey: string, toKey: string): boolean => {
    const fn = topo.nodes.get(fromKey)!
    const tn = topo.nodes.get(toKey)!
    if (startDirection === 'right') return tn.x >= fn.x - 0.5
    return tn.x <= fn.x + 0.5
  }

  // 注意：道岔节点同时挂股道边与渡线边，不能用 visited 提前关闭，
  // 否则先以较短距离访问该节点的股道路径会剪掉渡线分支。
  while (queue.size) {
    let cur = ''
    let curD = Infinity
    for (const k of queue) {
      const d = dist.get(k) ?? Infinity
      if (d < curD) {
        curD = d
        cur = k
      }
    }
    queue.delete(cur)
    if (cur === end.key) break

    const neighbors = topo.adjacency.get(cur) ?? []
    for (const { edge, to } of neighbors) {
      if (!monotonicOk(cur, to)) continue
      const reverseCount = edge.switchReqs.filter((r) => r.position === 'reverse').length
      const cost = (edge.slip ? 8 : 1) + reverseCount * 2
      const nd = curD + cost
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd)
        prev.set(to, { from: cur, edge })
        queue.add(to)
      }
    }
  }

  if (!prev.has(end.key) && start.key !== end.key) return null

  // 回溯
  const edgePath: GraphEdge[] = []
  const nodeKeys: string[] = [end.key]
  let cur = end.key
  while (cur !== start.key) {
    const p = prev.get(cur)
    if (!p) return null
    edgePath.unshift(p.edge)
    cur = p.from
    nodeKeys.unshift(cur)
  }

  // 区段占用顺序（去重保序）
  const sectionOrder: string[] = []
  const secSet = new Set<string>()
  for (const e of edgePath) {
    for (const sid of e.sections) {
      if (!secSet.has(sid)) {
        secSet.add(sid)
        sectionOrder.push(sid)
      }
    }
  }

  // 道岔要求：只由列车实际经过的边决定。
  // 经过渡线边的道岔 → 反位；其余路径上的道岔 → 定位。
  // （股道内边端点上的定位要求是静态标注，不能覆盖渡线边的实际走行方向）
  const swPosition = new Map<string, SwitchPosition>()
  const pathSwitchIds: string[] = []
  const collectSwitch = (key: string) => {
    const n = topo.nodes.get(key)!
    if (n.kind === 'switch' && n.switchId && !swPosition.has(n.switchId)) {
      swPosition.set(n.switchId, 'normal')
      pathSwitchIds.push(n.switchId)
    }
  }
  for (const k of nodeKeys) collectSwitch(k)
  for (const e of edgePath) {
    if (!e.slip) continue
    for (const r of e.switchReqs) swPosition.set(r.switchId, 'reverse')
  }
  const switchReqs: SwitchReq[] = pathSwitchIds.map((id) => ({ switchId: id, position: swPosition.get(id)! }))

  // 防护道岔：与路径节点相邻但不在路径上的道岔
  const pathNodeSet = new Set(nodeKeys)
  const onPathSwitches = new Set(switchReqs.map((r) => r.switchId))
  const protective = new Set<string>()
  for (const k of nodeKeys) {
    for (const { to } of topo.adjacency.get(k) ?? []) {
      const tn = topo.nodes.get(to)!
      if (tn.kind === 'switch' && !pathNodeSet.has(to) && tn.switchId && !onPathSwitches.has(tn.switchId)) {
        protective.add(tn.switchId)
      }
    }
  }

  return {
    nodeKeys,
    sectionOrder,
    switchReqs,
    protectiveSwitches: [...protective]
  }
}

/** 校验已存进路的区段顺序是否仍与当前拓扑一致（设备被删改后使用） */
export function sectionsOnRows(station: Station): Map<string, Section> {
  return new Map(station.sections.map((s) => [s.id, s]))
}
