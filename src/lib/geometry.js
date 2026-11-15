// 平面几何工具（坐标单位：米）
export const rad = (d) => (d * Math.PI) / 180
export const deg = (r) => (r * 180) / Math.PI

export function polygonArea(pts) {
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    s += x1 * y2 - x2 * y1
  }
  return Math.abs(s) / 2
}

export function polygonCentroid(pts) {
  let a = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    const cross = x1 * y2 - x2 * y1
    a += cross
    cx += (x1 + x2) * cross
    cy += (y1 + y2) * cross
  }
  a /= 2
  if (Math.abs(a) < 1e-9) {
    const n = pts.length || 1
    return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n]
  }
  return [cx / (6 * a), cy / (6 * a)]
}

export function pointInPolygon(pt, pts) {
  const [x, y] = pt
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0]
    const yi = pts[i][1]
    const xj = pts[j][0]
    const yj = pts[j][1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function bbox(pts) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of pts) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
}

export function lineLength(pts) {
  let s = 0
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  return s
}

export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

export function pointSegmentDistance(p, a, b) {
  const vx = b[0] - a[0]
  const vy = b[1] - a[1]
  const len2 = vx * vx + vy * vy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2))
  return { d: Math.hypot(p[0] - (a[0] + vx * t), p[1] - (a[1] + vy * t)), t }
}

export function distToPolyline(p, pts) {
  let best = Infinity
  for (let i = 1; i < pts.length; i++) {
    const { d } = pointSegmentDistance(p, pts[i - 1], pts[i])
    if (d < best) best = d
  }
  return best
}

export function distToPolygonBoundary(p, pts) {
  return distToPolyline(p, [...pts, pts[0]])
}

// Ramer-Douglas-Peucker
export function simplify(pts, tol = 0.8) {
  if (pts.length < 3) return pts.slice()
  const [a, b] = [pts[0], pts[pts.length - 1]]
  const vx = b[0] - a[0]
  const vy = b[1] - a[1]
  const L = Math.hypot(vx, vy) || 1e-9
  let maxD = 0
  let idx = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - a[0]) * vy - (pts[i][1] - a[1]) * vx) / L
    if (d > maxD) {
      maxD = d
      idx = i
    }
  }
  if (maxD > tol) {
    const left = simplify(pts.slice(0, idx + 1), tol)
    const right = simplify(pts.slice(idx), tol)
    return left.slice(0, -1).concat(right)
  }
  return [a, b]
}

// 闭合环简化：先去重，再按首尾切开做 RDP
export function simplifyRing(pts, tol = 0.5) {
  const clean = []
  for (const p of pts) {
    const last = clean[clean.length - 1]
    if (!last || Math.abs(last[0] - p[0]) > 1e-6 || Math.abs(last[1] - p[1]) > 1e-6) clean.push(p)
  }
  while (clean.length > 1) {
    const f = clean[0]
    const l = clean[clean.length - 1]
    if (Math.abs(f[0] - l[0]) < 1e-6 && Math.abs(f[1] - l[1]) < 1e-6) clean.pop()
    else break
  }
  if (clean.length <= 4) return clean
  const half = Math.floor(clean.length / 2)
  const a = simplify(clean.slice(0, half + 1), tol)
  const b = simplify([...clean.slice(half), clean[0]], tol)
  const out = a.slice(0, -1).concat(b.slice(0, -1))
  return out.length >= 3 ? out : clean
}

export function rotatePoint(p, center, angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const dx = p[0] - center[0]
  const dy = p[1] - center[1]
  return [center[0] + dx * c - dy * s, center[1] + dx * s + dy * c]
}

// 以 center 为中心、长轴方向 angle、长 L、宽 W 的矩形四角
export function rectCorners(center, angle, L, W) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const hx = (L / 2) * c
  const hy = (L / 2) * s
  const px = (-W / 2) * s
  const py = (W / 2) * c
  return [
    [center[0] - hx - px, center[1] - hy - py],
    [center[0] + hx - px, center[1] + hy - py],
    [center[0] + hx + px, center[1] + hy + py],
    [center[0] - hx + px, center[1] - hy + py],
  ]
}

export function pointInRect(p, center, angle, L, W) {
  const c = Math.cos(-angle)
  const s = Math.sin(-angle)
  const dx = p[0] - center[0]
  const dy = p[1] - center[1]
  const u = dx * c - dy * s
  const v = dx * s + dy * c
  return Math.abs(u) <= L / 2 && Math.abs(v) <= W / 2
}

// 判断两点是否位于多边形内（用于线段裁剪）
export function polygonLineIntersections(center, angle, poly) {
  // 沿 angle 方向过 center 的无限直线与多边形边界的交点参数
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const ts = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const ex = b[0] - a[0]
    const ey = b[1] - a[1]
    const den = dx * ey - dy * ex
    if (Math.abs(den) < 1e-9) continue
    const qx = a[0] - center[0]
    const qy = a[1] - center[1]
    const t = (qx * ey - qy * ex) / den
    const u = (qx * dy - qy * dx) / den
    if (u >= 0 && u <= 1) ts.push(t)
  }
  ts.sort((a, b) => a - b)
  return ts
}

// 多边形裁剪长条工具：线段与多边形相交区间
export function clippedLineSpan(poly, p1, p2) {
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const ts = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const ex = b[0] - a[0]
    const ey = b[1] - a[1]
    const den = dx * ey - dy * ex
    if (Math.abs(den) < 1e-9) continue
    const qx = a[0] - p1[0]
    const qy = a[1] - p1[1]
    const t = (qx * ey - qy * ex) / den
    const u = (qx * dy - qy * dx) / den
    if (u >= 0 && u <= 1 && t >= 0 && t <= 1) ts.push(t)
  }
  if (ts.length < 2) return null
  ts.sort((a, b) => a - b)
  return [ts[0], ts[ts.length - 1]]
}

export function shapeContains(shape, p) {
  if (!shape) return false
  if (shape.kind === 'rect') return pointInRect(p, shape.center, shape.angle, shape.L, shape.W)
  if (shape.kind === 'polygon') return pointInPolygon(p, shape.points)
  return false
}

export function shapeBBox(shape) {
  if (shape.kind === 'rect') return bbox(rectCorners(shape.center, shape.angle, shape.L, shape.W))
  return bbox(shape.points)
}

export function shapeArea(shape) {
  if (shape.kind === 'rect') return shape.L * shape.W
  return polygonArea(shape.points)
}
