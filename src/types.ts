// 铁路车站信号联锁进路表系统 —— 领域类型定义

export type Role = 'designer' | 'reviewer' | 'tester'

export type RouteType = 'arrival' | 'departure' | 'shunt'
export type Direction = 'left' | 'right'
export type SwitchPosition = 'normal' | 'reverse'
export type WorkflowStatus = 'draft' | 'submitted' | 'rejected' | 'published'
export type SignalKind = 'entry' | 'exit' | 'shunt'

export interface TrackRow {
  id: string
  name: string
  y: number
  x1: number
  x2: number
  main: boolean // 是否为正线（股道中心线，区段自动吸附目标）
}

export interface SwitchNode {
  id: string
  name: string
  rowId: string
  x: number
}

export interface Section {
  id: string
  name: string
  rowId: string
  x1: number
  x2: number
  blocked?: boolean // 仿真用：区段封锁/故障
}

export interface SignalDevice {
  id: string
  name: string
  kind: SignalKind
  rowId: string
  x: number
  direction: Direction // 信号开放后授权的运行方向
}

export interface Station {
  id: string
  name: string
  width: number
  height: number
  rows: TrackRow[]
  switches: SwitchNode[]
  sections: Section[]
  signals: SignalDevice[]
  routes: Route[]
  status: WorkflowStatus
  submitAt?: number
  submitBy?: string
  reviewAt?: number
  reviewBy?: string
  reviewNote?: string
  createdAt: number
  updatedAt: number
}

export interface SwitchReq {
  switchId: string
  position: SwitchPosition
}

export interface Route {
  id: string
  name: string
  type: RouteType
  direction: Direction
  startSignalId: string // 始端按钮（信号机按钮）
  endSignalId: string // 终端按钮
  pathNodeKeys: string[] // 图节点 key 序列（自动计算）
  switchReqs: SwitchReq[] // 道岔定/反位要求
  sectionOrder: string[] // 区段占用顺序（section id）
  protectiveSwitches: string[] // 防护道岔 id
  note?: string
  simStatus?: 'unrun' | 'passed' | 'failed'
  simFailStep?: number
  simFailReason?: string
  simAt?: number
  simBy?: string
}

export interface SimStep {
  index: number
  kind: 'switch' | 'section' | 'signal' | 'complete'
  targetId: string
  label: string
  ok: boolean
  reason?: string
}

export interface SimResult {
  routeId: string
  ok: boolean
  steps: SimStep[]
  failStep: number // -1 表示全部通过
  reason?: string
  at: number
  by: Role
}

export interface ConflictPair {
  routeA: string
  routeB: string
  sectionId: string
  direction: Direction
}

export interface SwitchConflictPair {
  routeA: string
  routeB: string
  switchId: string
  posA: SwitchPosition
  posB: SwitchPosition
}

export interface ConflictReport {
  hostile: ConflictPair[]
  switchConflicts: SwitchConflictPair[]
  hostileRouteIds: Set<string>
  switchConflictRouteIds: Set<string>
}
