/**
 * 领域模型与类型定义
 * 所有坐标单位为毫米(mm)，原点在图纸左下角，Y 轴向上（建模坐标系）。
 */

/** 院区 */
export interface Campus {
  id: string
  code: string // 院区编码，如 ZY（总院）、DF（东院）
  name: string // 院区名称
  address?: string
  createdAt: number
}

/** 楼层 */
export interface Floor {
  id: string
  campusId: string
  code: string // 楼层编码，如 F3
  name: string // 楼层名称，如 门诊三层
  /** 楼层平面图（建筑底图）轮廓，单位 mm */
  bounds: Rect
  createdAt: number
}

/** 房间（洗消间） */
export interface Room {
  id: string
  floorId: string
  campusId: string
  roomNo: string // 房间号，如 3F-内镜-08
  name: string // 房间名称
  bounds: Rect
  /** 改造前状态建档编号，如 ZY-F3-NJ08-2026-001 */
  archiveNo?: string
  /** 最近一次检修日期（ISO yyyy-mm-dd），由房间内设备检修记录汇总 */
  lastMaintenanceDate?: string
  createdAt: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type Vec2 = { x: number; y: number }

/** 图层标识 */
export type LayerKey =
  | 'room' // 房间轮廓/建筑
  | 'wall' // 墙体/门窗
  | 'sink' // 清洗槽
  | 'disinfect' // 消毒槽（含漂洗、终末漂洗）
  | 'dry' // 干燥台
  | 'cabinet' // 储镜柜
  | 'dirt' // 污物通道/污物区
  | 'flow-clean' // 清洁流线
  | 'dirt-clean' // 污物流线（为避免与图层 dirt 混淆，命名 flow-dirt 见下）
  | 'flow-dirt'
  | 'annotation' // 标注

/** 图元类型 */
export type EntityKind =
  | 'room-outline'
  | 'wash-sink' // 清洗槽
  | 'disinfect-tank' // 消毒槽
  | 'dry-bench' // 干燥台
  | 'scope-cabinet' // 储镜柜
  | 'dirt-zone' // 污物通道/污物区
  | 'flow-line' // 洁/污流线
  | 'wall'
  | 'door'
  | 'label'

/** 流线类型 */
export type FlowType = 'clean' | 'dirt'

/** 设备图元的业务属性（点选时展示） */
export interface DeviceInfo {
  assetNo: string // 设备资产编号
  name: string // 设备名称
  model?: string // 型号规格
  manufacturer?: string
  lastMaintenanceDate: string // 最近检修日期 ISO
  maintenanceCycleDays: number // 检修周期（天）
  remark?: string
}

/** 单条流线（折线，带方向箭头） */
export interface FlowLineData {
  flowType: FlowType
  points: Vec2[] // 折线节点（世界坐标 mm）
  /** 自动检测出的与异类流线的交叉点（由引擎回写） */
  crossings?: Vec2[]
}

/** 图元（渲染与业务的最小单元） */
export interface DrawingEntity {
  id: string
  kind: EntityKind
  layer: LayerKey
  /** 轴对齐包围盒（世界坐标），用于视口裁剪与空间索引 */
  bbox: Rect
  /** 矩形类设备的几何：中心 + 尺寸 + 旋转角（弧度） */
  geom?: {
    cx: number
    cy: number
    w: number
    h: number
    rotation: number
  }
  /** 墙/门/房间轮廓：开放或闭合折线 */
  polyline?: Vec2[]
  closed?: boolean
  /** 流线数据 */
  flow?: FlowLineData
  /** 标注文本 */
  label?: { text: string; at: Vec2; heightMm: number }
  /** 设备业务信息 */
  device?: DeviceInfo
  /** 填充/描边颜色覆盖（未指定时按图层默认色） */
  color?: [number, number, number, number]
  /** 细分级别的最小显示阈值：当前缩放(px/mm) >= showAtScale 才绘制；0 表示始终绘制 */
  showAtScale: number
  locked?: boolean
  createdAt: number
  updatedAt: number
}

/** 一张可加工的分层平面图 */
export interface Drawing {
  id: string
  roomId: string
  floorId: string
  campusId: string
  /** 图档编号，规则：院区码-楼层码-房间号-年份-序号 */
  docNo: string
  title: string
  /** 改造阶段：before=改造前建档，scheme=方案设计，asbuilt=竣工归档 */
  stage: 'before' | 'scheme' | 'asbuilt'
  renovationYear: number
  entities: DrawingEntity[]
  /** 图层开关与透明度 */
  layerState: Record<LayerKey, { visible: boolean; opacity: number }>
  /** 当前版本号（每次保存新版本递增） */
  version: number
  archived: boolean
  archivedAt?: number
  createdAt: number
  updatedAt: number
}

/** 改造前现场照片/图纸扫描件 */
export interface PhotoRecord {
  id: string
  roomId: string
  campusId: string
  floorId: string
  /** 建档编号：院区码-楼层码-房间号-P-序号 */
  archiveNo: string
  title: string
  category: 'site-photo' | 'drawing-scan' | 'other'
  /** 拍摄/图纸日期 */
  takenAt: string
  /** 缩略图 dataURL 与原图 Blob 在 IndexedDB 中的 key */
  thumbDataUrl: string
  blobKey: string
  mime: string
  size: number
  remark?: string
  createdAt: number
}

/** 版本快照（整图深拷贝，存 IndexedDB） */
export interface DrawingVersion {
  id: string
  drawingId: string
  version: number
  docNo: string
  /** 变更说明 */
  changeNote: string
  author: string
  snapshot: Drawing
  createdAt: number
}

/** 版本差异条目 */
export interface DiffEntry {
  type: 'added' | 'removed' | 'modified'
  entityId: string
  kind: EntityKind
  layer: LayerKey
  label: string
  /** modified 时的字段级差异 */
  fields?: { field: string; before: string; after: string }[]
}

export interface VersionDiff {
  drawingId: string
  docNo: string
  fromVersion: number
  toVersion: number
  entries: DiffEntry[]
  /** 洁污交叉点数量变化 */
  crossingsBefore: number
  crossingsAfter: number
  generatedAt: number
}

/** 归档检索条件 */
export interface ArchiveQuery {
  campusId?: string
  floorId?: string
  roomNo?: string
  renovationYear?: number
  keyword?: string
}
