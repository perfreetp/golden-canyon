/**
 * 实体工厂：统一编号规则、默认 bbox 与图层状态。
 * 编号规则：
 *   图档 docNo：院区码-楼层码-房间号-年份-序号
 *   照片 archiveNo：院区码-楼层码-房间号-P-序号
 */
import { nanoid } from 'nanoid'
import type {
  DeviceInfo,
  Drawing,
  DrawingEntity,
  EntityKind,
  FlowLineData,
  LayerKey,
  Rect,
  Room,
  Vec2,
} from '@/types'
import { bboxOfRotatedRect, computeBBox, rectFromPoints } from '@/render/geometry'

export const DEFAULT_LAYER_STATE = (): Record<
  LayerKey,
  { visible: boolean; opacity: number }
> => ({
  room: { visible: true, opacity: 1 },
  wall: { visible: true, opacity: 1 },
  sink: { visible: true, opacity: 1 },
  disinfect: { visible: true, opacity: 1 },
  dry: { visible: true, opacity: 1 },
  cabinet: { visible: true, opacity: 1 },
  dirt: { visible: true, opacity: 1 },
  'flow-clean': { visible: true, opacity: 1 },
  'flow-dirt': { visible: true, opacity: 1 },
  'dirt-clean': { visible: false, opacity: 1 },
  annotation: { visible: true, opacity: 1 },
})

const KIND_LAYER: Record<EntityKind, LayerKey> = {
  'room-outline': 'room',
  'wash-sink': 'sink',
  'disinfect-tank': 'disinfect',
  'dry-bench': 'dry',
  'scope-cabinet': 'cabinet',
  'dirt-zone': 'dirt',
  'flow-line': 'flow-clean', // 运行时按 flowType 覆盖
  wall: 'wall',
  door: 'wall',
  label: 'annotation',
}
export function kindToLayer(kind: EntityKind, flowType?: 'clean' | 'dirt'): LayerKey {
  if (kind === 'flow-line') return flowType === 'dirt' ? 'flow-dirt' : 'flow-clean'
  return KIND_LAYER[kind]
}

export function makeDevice(partial: Partial<DeviceInfo> & { name: string }): DeviceInfo {
  return {
    assetNo: partial.assetNo ?? `ZC-${nanoid(6).toUpperCase()}`,
    name: partial.name,
    model: partial.model,
    manufacturer: partial.manufacturer,
    lastMaintenanceDate: partial.lastMaintenanceDate ?? new Date().toISOString().slice(0, 10),
    maintenanceCycleDays: partial.maintenanceCycleDays ?? 180,
    remark: partial.remark,
  }
}

interface RectEntityOpts {
  kind: EntityKind
  cx: number
  cy: number
  w: number
  h: number
  rotation?: number
  device?: DeviceInfo
  showAtScale?: number
  color?: [number, number, number, number]
}

export function makeRectEntity(opts: RectEntityOpts): DrawingEntity {
  const now = Date.now()
  const geom = {
    cx: opts.cx,
    cy: opts.cy,
    w: opts.w,
    h: opts.h,
    rotation: opts.rotation ?? 0,
  }
  const e: DrawingEntity = {
    id: nanoid(12),
    kind: opts.kind,
    layer: kindToLayer(opts.kind),
    bbox: bboxOfRotatedRect(geom.cx, geom.cy, geom.w, geom.h, geom.rotation),
    geom,
    device: opts.device,
    color: opts.color,
    showAtScale: opts.showAtScale ?? 0,
    createdAt: now,
    updatedAt: now,
  }
  return e
}

export function makePolylineEntity(
  kind: EntityKind,
  points: Vec2[],
  closed = false,
): DrawingEntity {
  const now = Date.now()
  return {
    id: nanoid(12),
    kind,
    layer: kindToLayer(kind),
    bbox: rectFromPoints(points),
    polyline: points.map((p) => ({ ...p })),
    closed,
    showAtScale: 0,
    createdAt: now,
    updatedAt: now,
  }
}

export function makeFlowEntity(flow: FlowLineData): DrawingEntity {
  const now = Date.now()
  return {
    id: nanoid(12),
    kind: 'flow-line',
    layer: kindToLayer('flow-line', flow.flowType),
    bbox: rectFromPoints(flow.points, 60),
    flow: { flowType: flow.flowType, points: flow.points.map((p) => ({ ...p })) },
    showAtScale: 0,
    createdAt: now,
    updatedAt: now,
  }
}

export function makeLabelEntity(text: string, at: Vec2, heightMm = 220): DrawingEntity {
  const now = Date.now()
  const e: DrawingEntity = {
    id: nanoid(12),
    kind: 'label',
    layer: 'annotation',
    bbox: rectFromPoints([at], heightMm),
    label: { text, at: { ...at }, heightMm },
    showAtScale: 0,
    createdAt: now,
    updatedAt: now,
  }
  e.bbox = computeBBox(e)
  return e
}

export function makeDrawing(
  init: Pick<Drawing, 'roomId' | 'floorId' | 'campusId' | 'docNo' | 'title' | 'stage' | 'renovationYear'>,
): Drawing {
  const now = Date.now()
  return {
    id: nanoid(12),
    ...init,
    entities: [],
    layerState: DEFAULT_LAYER_STATE(),
    version: 0,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function makeRoom(
  init: Omit<Room, 'id' | 'createdAt'> & { id?: string },
): Room {
  return {
    id: init.id ?? nanoid(10),
    floorId: init.floorId,
    campusId: init.campusId,
    roomNo: init.roomNo,
    name: init.name,
    bounds: init.bounds,
    archiveNo: init.archiveNo,
    lastMaintenanceDate: init.lastMaintenanceDate,
    createdAt: Date.now(),
  }
}

/** 图档编号：院区码-楼层码-房间号-年份-序号 */
export function buildDocNo(campusCode: string, floorCode: string, roomNo: string, year: number, seq: number): string {
  return `${campusCode}-${floorCode}-${roomNo}-${year}-${String(seq).padStart(3, '0')}`
}

/** 房间建档编号 */
export function buildRoomArchiveNo(campusCode: string, floorCode: string, roomNo: string, seq: number): string {
  return `${campusCode}-${floorCode}-${roomNo}-${String(seq).padStart(3, '0')}`
}

export function boundsOfEntities(entities: DrawingEntity[]): Rect {
  if (entities.length === 0) return { x: 0, y: 0, w: 1000, h: 1000 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const e of entities) {
    minX = Math.min(minX, e.bbox.x)
    minY = Math.min(minY, e.bbox.y)
    maxX = Math.max(maxX, e.bbox.x + e.bbox.w)
    maxY = Math.max(maxY, e.bbox.y + e.bbox.h)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}
