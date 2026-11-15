// 领域模型定义

export type Vec3 = [number, number, number]

export type Role = 'engineer' | 'prototyper' | 'qc'

export type JointKind = 'ball' | 'hinge'

export interface DofDef {
  label: string
  axis: Vec3
  min: number
  max: number
}

export interface JointDef {
  id: string
  name: string
  code: string
  parent: string | null
  kind: JointKind
  pivot: Vec3
  dofs: DofDef[]
  calibrated: boolean
  note?: string
}

export type PartGroup = '头部' | '躯干' | '上肢' | '下肢' | '装具' | '配件'

export interface PartDef {
  id: string
  name: string
  jointId: string
  a: Vec3
  b: Vec3
  radius: number
  color: string
  group: PartGroup
  visualOnly?: boolean
}

export type SocketType = '球窝' | '圆榫' | '卡榫' | '螺纹'

export interface SocketSpec {
  type: SocketType
  diameter: number
  depth: number
  tolerance: number
  note?: string
}

export interface FigureModel {
  id: string
  code: string
  name: string
  scale: string
  heightMm: number
  version: string
  source: string
  importedAt: string
  importedBy: string
  joints: JointDef[]
  parts: PartDef[]
  sockets: Record<string, SocketSpec>
  ignorePairs: { pair: [string, string]; reason: string }[]
  status: 'draft' | 'configured'
  note: string
}

export type Pose = Record<string, number[]>

export interface Snapshot {
  id: string
  name: string
  note: string
  modelId: string
  pose: Pose
  assembly: Assembly
  thumb?: string
  createdAt: string
  createdBy: string
}

export type AccessoryKind = '手型' | '武器' | '底座'

export interface AccessoryProxy {
  name: string
  a: Vec3
  b: Vec3
  radius: number
  color: string
  collide: boolean
}

/** Where/how the accessory sits in the socket frame. */
export interface MountSpec {
  pos: Vec3
  rotDeg: Vec3
}

export interface Accessory {
  id: string
  code: string
  name: string
  category: AccessoryKind
  rev: number
  revision: string
  status: '量产' | '试制' | '停用'
  socketKey: string
  attachment: 'both_wrists' | 'wrist_R' | 'root'
  requires: SocketSpec
  provides?: SocketSpec
  mount: MountSpec
  /** location + orientation of this accessory's own provided socket, in its local frame */
  grip?: MountSpec
  /** model parts this accessory is rigidly joined to once seated in its socket */
  matedParts: string[]
  proxies: AccessoryProxy[]
  compatibleModels: string[]
  updatedAt: string
  updatedBy: string
  note: string
  tags: string[]
  baseRadius?: number
  baseHeight?: number
}

export interface Assembly {
  hand?: string
  weapon?: string
  base?: string
}

/** Which socket a slot is wired to; `prop:<accessoryId>` = socket provided by a hand. */
export type SocketRef = string

export interface JointMarginRow {
  jointId: string
  jointName: string
  code: string
  kind: JointKind
  dofLabel: string
  axis: Vec3
  current: number
  min: number
  max: number
  margin: number
  status: 'ok' | 'warn' | 'over'
}

export interface InterferenceRecord {
  id: string
  partA: string
  partB: string
  aKey: string
  bKey: string
  depth: number
  groupA: PartGroup
  groupB: PartGroup
  severity: 'severe' | 'minor'
  source: 'model' | 'accessory'
}

export interface InterfaceRow {
  label: string
  actual: string
  required: string
  ok: boolean
}

export interface InterfaceRecord {
  accessoryId: string
  name: string
  code: string
  revision: string
  target: string
  ok: boolean
  rows: InterfaceRow[]
}

export type TaskStatus = 'pending' | 'rejected' | 'released'

export interface TaskEvent {
  at: string
  actor: string
  role: Role
  action: string
  note?: string
}

export interface AccessoryRef {
  id: string
  name: string
  code: string
  rev: number
  revision: string
}

export interface CalibrationSnapshot {
  jointId: string
  jointName: string
  code: string
  kind: JointKind
  dofs: DofDef[]
}

export interface CheckTask {
  id: string
  code: string
  title: string
  modelId: string
  modelCode: string
  modelName: string
  modelVersion: string
  snapshotId?: string
  poseName: string
  pose: Pose
  calibration: CalibrationSnapshot[]
  assembly: Assembly
  accessories: AccessoryRef[]
  margins: JointMarginRow[]
  interferences: InterferenceRecord[]
  interfaces: InterfaceRecord[]
  minClearance: number
  status: TaskStatus
  submittedBy: string
  submittedByRole: Role
  submittedAt: string
  round: number
  events: TaskEvent[]
  summary: string
  thumb?: string
  locked?: { version: string; at: string; by: string; reportId?: string }
  invalidated?: { at: string; reason: string; accessoryName: string }
}

export interface ReleaseReport {
  id: string
  code: string
  taskId: string
  taskCode: string
  modelId: string
  modelCode: string
  modelName: string
  modelVersion: string
  title: string
  releasedAt: string
  releasedBy: string
  poseName: string
  thumb?: string
  accessories: AccessoryRef[]
  margins: JointMarginRow[]
  interferences: InterferenceRecord[]
  interfaces: InterfaceRecord[]
  minClearance: number
  fingerprint: string
  note: string
  invalidatedAt?: string
  invalidatedReason?: string
}

export type LogKind =
  | 'calib'
  | 'pose'
  | 'accessory'
  | 'submit'
  | 'review'
  | 'release'
  | 'invalidate'
  | 'import'
  | 'system'

export interface LogEntry {
  id: string
  at: string
  actor: string
  role: Role
  kind: LogKind
  action: string
  target: string
  detail?: string
}

export interface UserProfile {
  role: Role
  name: string
  title: string
  initials: string
}

export interface ToastMsg {
  id: number
  tone: 'ok' | 'warn' | 'error' | 'info'
  title: string
  detail?: string
}
