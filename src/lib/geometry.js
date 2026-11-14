// 几何与自动评分工具
// 要素几何形状:
//   { kind: 'polygon', points: [{x,y}...] }
//   { kind: 'polyline', points, width }
//   { kind: 'ellipse', cx, cy, rx, ry }

// ---------- 基础几何 ----------
export function bboxOf(shape) {
  if (shape.kind === 'ellipse') {
    return {
      minX: shape.cx - shape.rx, maxX: shape.cx + shape.rx,
      minY: shape.cy - shape.ry, maxY: shape.cy + shape.ry
    }
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of shape.points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  if (shape.kind === 'polyline') {
    const w = (shape.width || 2) / 2
    return { minX: minX - w, maxX: maxX + w, minY: minY - w, maxY: maxY + w }
  }
  return { minX, maxX, minY, maxY }
}

export function bboxesIntersect(a, b) {
  return !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY)
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by)
}

// 点到线段距离
function pointSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return dist(px, py, ax, ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return dist(px, py, ax + t * dx, ay + t * dy)
}

// 射线法判断点在多边形内
export function pointInPolygon(px, py, points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y
    const xj = points[j].x, yj = points[j].y
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-12) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function pointInEllipse(px, py, s) {
  const dx = (px - s.cx) / s.rx, dy = (py - s.cy) / s.ry
  return dx * dx + dy * dy <= 1
}

// 点是否命中要素（考虑容差，单位世界坐标）
export function hitTest(shape, px, py, tolerance = 6) {
  const bb = bboxOf(shape)
  if (px < bb.minX - tolerance || px > bb.maxX + tolerance ||
      py < bb.minY - tolerance || py > bb.maxY + tolerance) return false
  if (shape.kind === 'ellipse') {
    if (pointInEllipse(px, py, shape)) return true
    // 边缘附近也算命中（容差近似）
    const dx = (px - shape.cx) / shape.rx, dy = (py - shape.cy) / shape.ry
    return Math.abs(Math.sqrt(dx * dx + dy * dy) - 1) * Math.min(shape.rx, shape.ry) <= tolerance + 2
  }
  if (shape.kind === 'polyline') {
    const pts = shape.points
    for (let i = 0; i < pts.length - 1; i++) {
      if (pointSegDist(px, py, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <=
        tolerance + (shape.width || 2) / 2) return true
    }
    return false
  }
  // polygon：内部命中，或靠近边界
  if (pointInPolygon(px, py, shape.points)) return true
  const pts = shape.points
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    if (pointSegDist(px, py, a.x, a.y, b.x, b.y) <= tolerance) return true
  }
  return false
}

// ---------- 多边形面积 / 栅格化 ----------
export function polygonArea(points) {
  let area = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += points[j].x * points[i].y - points[i].x * points[j].y
  }
  return Math.abs(area / 2)
}

// 栅格化多边形到位图（Uint8Array，1=覆盖），cell 为世界单位边长
export function rasterize(points, bbox, cell) {
  const cols = Math.max(1, Math.ceil((bbox.maxX - bbox.minX) / cell))
  const rows = Math.max(1, Math.ceil((bbox.maxY - bbox.minY) / cell))
  const grid = new Uint8Array(cols * rows)
  // 按行扫描，求交点
  for (let r = 0; r < rows; r++) {
    const y = bbox.minY + (r + 0.5) * cell
    const xs = []
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], b = points[j]
      if ((a.y > y) !== (b.y > y)) {
        xs.push(a.x + ((y - a.y) / (b.y - a.y || 1e-12)) * (b.x - a.x))
      }
    }
    xs.sort((p, q) => p - q)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c1 = Math.max(0, Math.floor((xs[k] - bbox.minX) / cell))
      const c2 = Math.min(cols - 1, Math.floor((xs[k + 1] - bbox.minX) / cell))
      for (let c = c1; c <= c2; c++) grid[r * cols + c] = 1
    }
  }
  return { grid, cols, rows, cell, bbox }
}

// 位图按半径膨胀（形态学膨胀，模拟容差半径）
export function dilate(raster, radiusWorld) {
  const rad = Math.max(1, Math.round(radiusWorld / raster.cell))
  const { grid, cols, rows } = raster
  const out = new Uint8Array(grid.length)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r * cols + c]) continue
      const r0 = Math.max(0, r - rad), r1 = Math.min(rows - 1, r + rad)
      const c0 = Math.max(0, c - rad), c1 = Math.min(cols - 1, c + rad)
      for (let rr = r0; rr <= r1; rr++) {
        for (let cc = c0; cc <= c1; cc++) {
          if ((rr - r) * (rr - r) + (cc - c) * (cc - c) <= rad * rad) {
            out[rr * cols + cc] = 1
          }
        }
      }
    }
  }
  return { ...raster, grid: out }
}

// 合并两个位图到同一栅格坐标系
function mergeGrids(rA, rB) {
  const cell = rA.cell
  const minX = Math.min(rA.bbox.minX, rB.bbox.minX)
  const minY = Math.min(rA.bbox.minY, rB.bbox.minY)
  const maxX = Math.max(rA.bbox.maxX, rB.bbox.maxX)
  const maxY = Math.max(rA.bbox.maxY, rB.bbox.maxY)
  const cols = Math.max(1, Math.ceil((maxX - minX) / cell))
  const rows = Math.max(1, Math.ceil((maxY - minY) / cell))
  const gA = new Uint8Array(cols * rows)
  const gB = new Uint8Array(cols * rows)
  const blit = (src, dst) => {
    const offX = Math.round((src.bbox.minX - minX) / cell)
    const offY = Math.round((src.bbox.minY - minY) / cell)
    for (let r = 0; r < src.rows; r++) {
      for (let c = 0; c < src.cols; c++) {
        if (src.grid[r * src.cols + c]) dst[(r + offY) * cols + (c + offX)] = 1
      }
    }
  }
  blit(rA, gA)
  blit(rB, gB)
  return { gA, gB, cols, rows, cell, bbox: { minX, minY, maxX, maxY } }
}

function unionCount(g) {
  let n = 0
  for (let i = 0; i < g.length; i++) n += g[i]
  return n
}

// 自动评分：对比学员圈画 answerPts 与标准答案 refPts
// tolerance 为允许偏差半径（世界单位），maxScore 为题目分值
export function scoreAnswer(answerPts, refPts, tolerance, maxScore) {
  const cell = 4 // 4 世界单位/栅格
  const bbA = bboxOf({ kind: 'polygon', points: answerPts })
  const bbR = bboxOf({ kind: 'polygon', points: refPts })
  const pad = tolerance + cell * 4
  const mergedBB = {
    minX: Math.min(bbA.minX, bbR.minX) - pad,
    minY: Math.min(bbA.minY, bbR.minY) - pad,
    maxX: Math.max(bbA.maxX, bbR.maxX) + pad,
    maxY: Math.max(bbA.maxY, bbR.maxY) + pad
  }
  let rAns = rasterize(answerPts, mergedBB, cell)
  let rRef = rasterize(refPts, mergedBB, cell)
  // 标准答案按容差半径膨胀：落在膨胀区内的答案视为合格
  const rRefTol = dilate(rRef, tolerance)
  const m = mergeGrids(rAns, rRefTol)
  let interTol = 0, ansCells = 0
  for (let i = 0; i < m.gA.length; i++) {
    if (m.gA[i]) ansCells++
    if (m.gA[i] && m.gB[i]) interTol++
  }
  // 原始（无容差）重合，用于 IoU 展示
  const m0 = mergeGrids(rAns, rRef)
  let inter = 0, union = 0
  for (let i = 0; i < m0.gA.length; i++) {
    const a = m0.gA[i], b = m0.gB[i]
    if (a && b) inter++
    if (a || b) union++
  }
  const refCells = unionCount(rRef.grid)
  const iou = union ? inter / union : 0
  const recall = refCells ? inter / refCells : 0                 // 标准答案覆盖率
  const precisionTol = ansCells ? interTol / ansCells : 0       // 容差内精确率
  // 综合得分：覆盖率权重 0.6，容差精确率权重 0.4
  const ratio = Math.max(0, Math.min(1, recall * 0.6 + precisionTol * 0.4))
  const autoScore = Math.round(ratio * maxScore * 10) / 10

  // 超差区域：标准答案中未被学员答案（容差膨胀后）覆盖的栅格 -> 参考位置多边形
  const missCells = []
  for (let i = 0; i < m.gB.length; i++) {
    if (m.gB[i] && !m.gA[i]) missCells.push(i)
  }
  const referenceRegions = cellsToPolygons(missCells, m.cols, cell, mergedBB)

  // 多画区域：学员答案落在标准答案容差区之外
  const extraCells = []
  for (let i = 0; i < m.gA.length; i++) {
    if (m.gA[i] && !m.gB[i]) extraCells.push(i)
  }
  const extraRegions = cellsToPolygons(extraCells, m.cols, cell, mergedBB)

  return {
    autoScore, ratio, iou, recall, precisionTol,
    referenceRegions,   // 漏画/超差参考位置
    extraRegions,       // 多画位置
    withinTolerance: ratio >= 0.85
  }
}

// 将离散栅格聚类为简化多边形（按连通域提取轮廓点的外包矩形多边形，控制数据量）
function cellsToPolygons(cells, cols, cell, bb) {
  if (!cells.length) return []
  const seen = new Set()
  const regions = []
  const set = new Set(cells)
  for (const start of cells) {
    if (seen.has(start)) continue
    // BFS 连通域（4 邻接）
    const comp = []
    const queue = [start]
    seen.add(start)
    while (queue.length) {
      const idx = queue.pop()
      comp.push(idx)
      const r = Math.floor(idx / cols), c = idx % cols
      const nbrs = [idx - 1, idx + 1, idx - cols, idx + cols]
      for (const n of nbrs) {
        if (n < 0 || seen.has(n) || !set.has(n)) continue
        const nr = Math.floor(n / cols), nc = n % cols
        if (Math.abs(nr - r) <= 1 && Math.abs(nc - c) <= 1 &&
          (Math.abs(nr - r) + Math.abs(nc - c) === 1)) {
          seen.add(n)
          queue.push(n)
        }
      }
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const idx of comp) {
      const r = Math.floor(idx / cols), c = idx % cols
      const x = bb.minX + c * cell, y = bb.minY + r * cell
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x + cell > maxX) maxX = x + cell
      if (y + cell > maxY) maxY = y + cell
    }
    const shrink = cell * 0.15
    regions.push({
      kind: 'polygon',
      points: [
        { x: minX + shrink, y: minY + shrink },
        { x: maxX - shrink, y: minY + shrink },
        { x: maxX - shrink, y: maxY - shrink },
        { x: minX + shrink, y: maxY - shrink }
      ]
    })
  }
  // 合并过小区域，最多返回 12 个
  regions.sort((a, b) => polygonArea(b.points) - polygonArea(a.points))
  return regions.slice(0, 12)
}

// 套索点简化（Douglas–Peucker 的轻量替代：等距抽稀 + 闭合）
export function simplifyPoints(points, step = 3) {
  if (points.length <= 6) return points
  const out = []
  for (let i = 0; i < points.length; i += step) out.push(points[i])
  const first = points[0], last = out[out.length - 1]
  if (dist(first.x, first.y, last.x, last.y) > 8) out.push(first)
  return out
}
