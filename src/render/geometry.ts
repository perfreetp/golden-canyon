/**
 * 几何工具：包围盒、线段相交、点选命中、坐标换算。
 * 全部基于世界坐标（mm，Y 向上）。
 */
import type { DrawingEntity, Rect, Vec2 } from '@/types'

export function rectFromPoints(points: Vec2[], pad = 0): Rect {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y
}

export function pointInRect(p: Vec2, r: Rect, pad = 0): boolean {
  return (
    p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad
  )
}

/** 旋转矩形的 4 个角点 */
export function rotatedRectCorners(cx: number, cy: number, w: number, h: number, rot: number): Vec2[] {
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  const hw = w / 2
  const hh = h / 2
  const local: Vec2[] = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ]
  return local.map((p) => ({ x: cx + p.x * cos - p.y * sin, y: cy + p.x * sin + p.y * cos }))
}

/** 由旋转矩形计算轴对齐 bbox */
export function bboxOfRotatedRect(cx: number, cy: number, w: number, h: number, rot: number): Rect {
  return rectFromPoints(rotatedRectCorners(cx, cy, w, h, rot))
}

/**
 * 两线段求交。返回交点；平行/共线/不相交返回 null。
 */
export function segmentIntersection(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): Vec2 | null {
  const r = { x: p2.x - p1.x, y: p2.y - p1.y }
  const s = { x: p4.x - p3.x, y: p4.y - p3.y }
  const rxs = r.x * s.y - r.y * s.x
  if (Math.abs(rxs) < 1e-9) return null
  const qpx = p3.x - p1.x
  const qpy = p3.y - p1.y
  const t = (qpx * s.y - qpy * s.x) / rxs
  const u = (qpx * r.y - qpy * r.x) / rxs
  const eps = 1e-9
  if (t < -eps || t > 1 + eps || u < -eps || u > 1 + eps) return null
  return { x: p1.x + t * r.x, y: p1.y + t * r.y }
}

/** 两条折线的所有交叉点（去重，容差 1mm） */
export function polylineCrossings(a: Vec2[], b: Vec2[]): Vec2[] {
  const out: Vec2[] = []
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < b.length - 1; j++) {
      const hit = segmentIntersection(a[i], a[i + 1], b[j], b[j + 1])
      if (hit && !out.some((p) => Math.hypot(p.x - hit.x, p.y - hit.y) < 1)) {
        out.push(hit)
      }
    }
  }
  return out
}

/** 点到线段距离 */
export function distPointSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const vx = b.x - a.x
  const vy = b.y - a.y
  const len2 = vx * vx + vy * vy
  if (len2 < 1e-12) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = a.x + t * vx
  const cy = a.y + t * vy
  return Math.hypot(p.x - cx, p.y - cy)
}

/** 点到折线的最短距离 */
export function distPointPolyline(p: Vec2, pts: Vec2[], closed: boolean): number {
  let best = Infinity
  const n = pts.length
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    best = Math.min(best, distPointSegment(p, a, b))
  }
  return best
}

function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y
    const intersect =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * 点选命中测试。toleranceMm 为世界坐标容差。
 * 优先级：流线/线类（距离判定）→ 矩形设备（多边形包含/距离）→ 标注。
 * 返回最上层（后绘制者优先）的图元。
 */
export function hitTest(
  entities: DrawingEntity[],
  p: Vec2,
  toleranceMm: number,
): DrawingEntity | null {
  // 逆序：后绘制的在上层
  for (let k = entities.length - 1; k >= 0; k--) {
    const e = entities[k]
    if (!pointInRect(p, e.bbox, toleranceMm)) continue
    if (e.flow) {
      if (distPointPolyline(p, e.flow.points, false) <= toleranceMm) return e
      continue
    }
    if (e.polyline) {
      const d = distPointPolyline(p, e.polyline, !!e.closed)
      if (e.closed) {
        if (d <= toleranceMm || pointInPolygon(p, e.polyline)) return e
      } else if (d <= toleranceMm) {
        return e
      }
      continue
    }
    if (e.geom) {
      const corners = rotatedRectCorners(e.geom.cx, e.geom.cy, e.geom.w, e.geom.h, e.geom.rotation)
      if (pointInPolygon(p, corners) || distPointPolyline(p, corners, true) <= toleranceMm) {
        return e
      }
      continue
    }
    if (e.label) {
      // 标注按 bbox 容差命中
      return e
    }
  }
  return null
}

/** 计算图元 bbox（新建/修改图元时调用） */
export function computeBBox(e: DrawingEntity): Rect {
  if (e.geom) {
    return bboxOfRotatedRect(e.geom.cx, e.geom.cy, e.geom.w, e.geom.h, e.geom.rotation)
  }
  if (e.flow) return rectFromPoints(e.flow.points, 50)
  if (e.polyline) return rectFromPoints(e.polyline)
  if (e.label) return rectFromPoints([e.label.at], Math.max(e.label.heightMm, 80))
  return { x: 0, y: 0, w: 0, h: 0 }
}
