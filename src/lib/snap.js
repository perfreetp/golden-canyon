// 等高线 / 沟道 空间索引与吸附
import { pointSegmentDistance } from './geometry.js'

const CELL = 64

export function buildSnapIndex(survey) {
  const contourSegs = []
  const channelSegs = []
  const grid = new Map()
  const put = (key, idx) => {
    let arr = grid.get(key)
    if (!arr) grid.set(key, (arr = []))
    arr.push(idx)
  }
  let id = 0
  for (const c of survey.contours) {
    for (let i = 1; i < c.points.length; i++) {
      const a = c.points[i - 1]
      const b = c.points[i]
      const seg = { a, b, level: c.level, id, contour: c }
      contourSegs.push(seg)
      const x0 = Math.floor(Math.min(a[0], b[0]) / CELL)
      const x1 = Math.floor(Math.max(a[0], b[0]) / CELL)
      const y0 = Math.floor(Math.min(a[1], b[1]) / CELL)
      const y1 = Math.floor(Math.max(a[1], b[1]) / CELL)
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) put(`${x},${y}`, id)
      id++
    }
  }
  const chGrid = new Map()
  let cid = 0
  const chById = new Map()
  for (const ch of survey.channels || []) {
    chById.set(ch.id, ch)
    const cum = ch.cum || []
    for (let i = 1; i < ch.points.length; i++) {
      const a = ch.points[i - 1]
      const b = ch.points[i]
      const seg = { a, b, channel: ch, i, s0: cum[i - 1] || 0, s1: cum[i] ?? 0, id: cid }
      channelSegs.push(seg)
      const x0 = Math.floor(Math.min(a[0], b[0]) / CELL)
      const x1 = Math.floor(Math.max(a[0], b[0]) / CELL)
      const y0 = Math.floor(Math.min(a[1], b[1]) / CELL)
      const y1 = Math.floor(Math.max(a[1], b[1]) / CELL)
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
        const k = `c${x},${y}`
        let arr = chGrid.get(k)
        if (!arr) chGrid.set(k, (arr = []))
        arr.push(cid)
      }
      cid++
    }
  }
  return { contourSegs, channelSegs, grid, chGrid, chById }
}

function query(index, p, radius, keyPrefix, gridMap, segs) {
  const r = Math.ceil(radius / CELL)
  const ci = Math.floor(p[0] / CELL)
  const cj = Math.floor(p[1] / CELL)
  const seen = new Set()
  const out = []
  for (let x = ci - r; x <= ci + r; x++) {
    for (let y = cj - r; y <= cj + r; y++) {
      const arr = gridMap.get(keyPrefix === 'c' ? `c${x},${y}` : `${x},${y}`)
      if (!arr) continue
      for (const idx of arr) {
        if (seen.has(idx)) continue
        seen.add(idx)
        const seg = segs[idx]
        const { d, t } = pointSegmentDistance(p, seg.a, seg.b)
        if (d <= radius) out.push({ seg, d, t })
      }
    }
  }
  out.sort((a, b) => a.d - b.d)
  return out
}

export function nearestContour(index, p, radius = 20) {
  if (!index || !index.contourSegs.length) return null
  const list = query(index, p, radius, '', index.grid, index.contourSegs)
  if (!list.length) return null
  const { seg, d, t } = list[0]
  const point = [seg.a[0] + (seg.b[0] - seg.a[0]) * t, seg.a[1] + (seg.b[1] - seg.a[1]) * t]
  const angle = Math.atan2(seg.b[1] - seg.a[1], seg.b[0] - seg.a[0])
  return { point, d, level: seg.level, angle, seg }
}

export function nearestChannel(index, p, radius = 60) {
  if (!index || !index.channelSegs.length) return null
  const list = query(index, p, radius, 'c', index.chGrid, index.channelSegs)
  if (!list.length) return null
  const { seg, d, t } = list[0]
  const point = [seg.a[0] + (seg.b[0] - seg.a[0]) * t, seg.a[1] + (seg.b[1] - seg.a[1]) * t]
  const s = seg.s0 + (seg.s1 - seg.s0) * t
  return { point, d, channel: seg.channel, s, angle: Math.atan2(seg.b[1] - seg.a[1], seg.b[0] - seg.a[0]) }
}

// 顶点吸附：图斑边界端点、措施角点
export function snapVertex(candidates, p, radius) {
  let best = null
  for (const c of candidates) {
    const d = Math.hypot(c[0] - p[0], c[1] - p[1])
    if (d <= radius && (!best || d < best.d)) best = { point: [c[0], c[1]], d }
  }
  return best
}
