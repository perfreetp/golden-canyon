// 生成演示测绘成果（等高线 + 高程点 + 沟道）。仅供演示数据生成使用。
import fs from 'node:fs'
import { elev, W, H, CHANNELS } from './terrain-source.mjs'

const step = 2
const gx = Math.ceil(W / step)
const gy = Math.ceil(H / step)
const Z = new Float32Array((gx + 1) * (gy + 1))
for (let j = 0; j <= gy; j++) for (let i = 0; i <= gx; i++) Z[j * (gx + 1) + i] = elev(i * step, j * step)

function rdp(pts, tol) {
  if (pts.length < 3) return pts
  const a = pts[0]
  const b = pts[pts.length - 1]
  const vx = b[0] - a[0]
  const vy = b[1] - a[1]
  const L = Math.hypot(vx, vy) || 1e-9
  let md = 0
  let idx = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - a[0]) * vy - (pts[i][1] - a[1]) * vx) / L
    if (d > md) { md = d; idx = i }
  }
  if (md > tol) return rdp(pts.slice(0, idx + 1), tol).slice(0, -1).concat(rdp(pts.slice(idx), tol))
  return [a, b]
}

function contoursForLevel(level) {
  const pts = new Map()
  const links = []
  const gi = (i, j) => Z[j * (gx + 1) + i]
  const interp = (p1, p2, v1, v2) => {
    const t = (level - v1) / (v2 - v1)
    return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]
  }
  const P = (k, p) => { if (!pts.has(k)) pts.set(k, p); return k }
  const table = { 1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: [[3, 0], [1, 2]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]], 9: [[0, 2]], 10: [[0, 1], [2, 3]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[3, 0]] }
  for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
    const x0 = i * step, y0 = j * step, x1 = x0 + step, y1 = y0 + step
    const v00 = gi(i, j), v10 = gi(i + 1, j), v11 = gi(i + 1, j + 1), v01 = gi(i, j + 1)
    let idx = 0
    if (v00 > level) idx |= 1
    if (v10 > level) idx |= 2
    if (v11 > level) idx |= 4
    if (v01 > level) idx |= 8
    if (idx === 0 || idx === 15) continue
    const E = [
      P(`h${i}_${j}`, interp([x0, y0], [x1, y0], v00, v10)),
      P(`v${i + 1}_${j}`, interp([x1, y0], [x1, y1], v10, v11)),
      P(`h${i}_${j + 1}`, interp([x1, y1], [x0, y1], v11, v01)),
      P(`v${i}_${j}`, interp([x0, y1], [x0, y0], v01, v00)),
    ]
    for (const [a, b] of table[idx]) links.push([E[a], E[b]])
  }
  const adj = new Map()
  const add = (a, b) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b) }
  for (const [a, b] of links) { add(a, b); add(b, a) }
  const visited = new Set()
  const lines = []
  for (const [a, b] of links) {
    const lk = a < b ? `${a}|${b}` : `${b}|${a}`
    if (visited.has(lk)) continue
    visited.add(lk)
    const line = [pts.get(a), pts.get(b)]
    let prev = a, cur = b
    while (true) {
      let next = null
      for (const n of adj.get(cur) || []) {
        if (n === prev) continue
        const k2 = cur < n ? `${cur}|${n}` : `${n}|${cur}`
        if (!visited.has(k2)) { next = n; visited.add(k2); break }
      }
      if (!next) break
      line.push(pts.get(next))
      prev = cur
      cur = next
      if (cur === a) break
    }
    lines.push(line)
  }
  return lines.map((l) => rdp(l, 0.45)).filter((l) => l.length >= 2)
}

const levels = []
for (let L = 958; L <= 1272; L += 5) levels.push(L)
const contours = []
for (const L of levels) for (const line of contoursForLevel(L)) contours.push({ level: L, points: line.map((p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]) })
const spotHeights = []
for (let y = 80; y < H; y += 150) for (let x = 90; x < W; x += 170) {
  const z = Math.round(elev(x, y) * 10) / 10
  spotHeights.push([x, y, z])
}
const out = {
  name: '青山沟、柳树沟小流域 1:2000 测绘成果',
  crs: 'CGCS2000 / 3°带',
  interval: 5,
  surveyedAt: '2026-10-06',
  bounds: { minX: 0, minY: 0, maxX: W, maxY: H },
  contours,
  spotHeights,
  channels: CHANNELS.map((c) => ({ id: c.id, name: c.name, points: c.pts.map((p) => [p[0], p[1]]) })),
}
fs.writeFileSync('public/demo-survey.json', JSON.stringify(out))
const pts = contours.reduce((s, c) => s + c.points.length, 0)
console.log('contours', contours.length, 'points', pts, 'spots', spotHeights.length, 'size', (fs.statSync('public/demo-survey.json').size / 1024).toFixed(0) + 'KB')
