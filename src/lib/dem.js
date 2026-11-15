// 由测绘成果（等高线 / 高程点）生成 DEM、坡度栅格与面积统计
import { pointInPolygon, bbox, polygonArea, distToPolyline } from './geometry.js'

export const SLOPE_CLASSES = [
  { id: 'c1', max: 5, label: '<5°', name: '平缓坡', color: '#6d9b68' },
  { id: 'c2', max: 15, label: '5–15°', name: '缓坡', color: '#c8b45c' },
  { id: 'c3', max: 25, label: '15–25°', name: '陡坡', color: '#cd8948' },
  { id: 'c4', max: Infinity, label: '>25°', name: '急坡', color: '#b44f3e' },
]

export const slopeClassIndex = (deg) => {
  if (!Number.isFinite(deg)) return 0
  if (deg < 5) return 0
  if (deg < 15) return 1
  if (deg < 25) return 2
  return 3
}

function densify(pts, step) {
  const out = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    if (i === pts.length - 1) {
      if (pts.length > 2) break
    }
    const L = Math.hypot(b[0] - a[0], b[1] - a[1])
    const n = Math.max(1, Math.ceil(L / step))
    for (let k = 0; k < n; k++) {
      const t = k / n
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return out
}

// 构建 DEM：等高线离散点 + 高程点 -> IDW -> 平滑 -> 坡度
export function buildDEM(survey, cell = 8) {
  const b = survey.bounds
  const nx = Math.max(2, Math.ceil((b.maxX - b.minX) / cell) + 1)
  const ny = Math.max(2, Math.ceil((b.maxY - b.minY) / cell) + 1)
  const n = nx * ny
  const z = new Float32Array(n)
  const samples = []
  for (const c of survey.contours) {
    for (const p of densify(c.points, 10)) samples.push([p[0], p[1], c.level])
  }
  for (const s of survey.spotHeights || []) samples.push([s[0], s[1], s[2]])

  // 空间桶索引
  const BK = 48
  const buckets = new Map()
  const bkey = (i, j) => i * 73856093 ^ j * 19349663
  for (const s of samples) {
    const k = bkey(Math.floor(s[0] / BK), Math.floor(s[1] / BK))
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k).push(s)
  }

  const findK = (x, y, k = 8) => {
    const ci = Math.floor(x / BK)
    const cj = Math.floor(y / BK)
    let best = []
    for (let r = 0; r <= 6; r++) {
      for (let i = ci - r; i <= ci + r; i++) {
        for (let j = cj - r; j <= cj + r; j++) {
          if (r > 0 && Math.abs(i - ci) !== r && Math.abs(j - cj) !== r) continue
          const arr = buckets.get(bkey(i, j))
          if (!arr) continue
          for (const s of arr) {
            const d2 = (s[0] - x) ** 2 + (s[1] - y) ** 2
            best.push([d2, s[2]])
          }
        }
      }
      if (best.length >= k * 4 || r >= 6) {
        best.sort((p, q) => p[0] - q[0])
        if (best.length >= k) break
      }
    }
    best.sort((p, q) => p[0] - q[0])
    return best.slice(0, k)
  }

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = b.minX + i * cell
      const y = b.minY + j * cell
      const list = findK(x, y, 8)
      let ws = 0
      let zs = 0
      for (const [d2, zz] of list) {
        const w = 1 / (d2 + 30)
        ws += w
        zs += w * zz
      }
      z[j * nx + i] = ws > 0 ? zs / ws : NaN
    }
  }

  // 3x3 平滑两遍
  const smooth = (src, passes) => {
    let cur = src
    for (let p = 0; p < passes; p++) {
      const out = new Float32Array(cur.length)
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          let s = 0
          let w = 0
          for (let dj = -1; dj <= 1; dj++) {
            for (let di = -1; di <= 1; di++) {
              const ii = i + di
              const jj = j + dj
              if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue
              const wt = di === 0 && dj === 0 ? 4 : di === 0 || dj === 0 ? 2 : 1
              const v = cur[jj * nx + ii]
              if (!Number.isFinite(v)) continue
              s += v * wt
              w += wt
            }
          }
          out[j * nx + i] = w ? s / w : cur[j * nx + i]
        }
      }
      cur = out
    }
    return cur
  }
  const zs = smooth(z, 2)

  // 坡度（Horn 三阶差分）
  const slope = new Float32Array(n)
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const i0 = Math.max(0, i - 1)
      const i1 = Math.min(nx - 1, i + 1)
      const j0 = Math.max(0, j - 1)
      const j1 = Math.min(ny - 1, j + 1)
      const z00 = zs[j0 * nx + i0]
      const z10 = zs[j0 * nx + i]
      const z20 = zs[j0 * nx + i1]
      const z01 = zs[j * nx + i0]
      const z21 = zs[j * nx + i1]
      const z02 = zs[j1 * nx + i0]
      const z12 = zs[j1 * nx + i]
      const z22 = zs[j1 * nx + i1]
      const dx = ((z20 + 2 * z21 + z22) - (z00 + 2 * z01 + z02)) / (8 * cell)
      const dy = ((z02 + 2 * z12 + z22) - (z00 + 2 * z10 + z20)) / (8 * cell)
      slope[j * nx + i] = (Math.atan(Math.hypot(dx, dy)) * 180) / Math.PI
    }
  }

  let minZ = Infinity
  let maxZ = -Infinity
  for (const v of zs) {
    if (v < minZ) minZ = v
    if (v > maxZ) maxZ = v
  }

  return {
    nx,
    ny,
    cell,
    minX: b.minX,
    minY: b.minY,
    z: zs,
    slope,
    minZ,
    maxZ,
    index: (i, j) => j * nx + i,
  }
}

export function demAt(dem, x, y) {
  if (!dem) return { z: NaN, slope: NaN }
  const fi = (x - dem.minX) / dem.cell
  const fj = (y - dem.minY) / dem.cell
  const i = Math.max(0, Math.min(dem.nx - 1, Math.round(fi)))
  const j = Math.max(0, Math.min(dem.ny - 1, Math.round(fj)))
  const k = j * dem.nx + i
  return { z: dem.z[k], slope: dem.slope[k] }
}

// 依据 DEM 生成沟道高程剖面（单调递减），用于谷坊间距与比降校核
export function channelProfiles(survey, dem) {
  if (!dem || !survey) return []
  return (survey.channels || []).map((ch) => {
    const zs = ch.points.map((p) => bilinearZ(dem, p[0], p[1]))
    let min = Infinity
    const mono = zs.map((v) => {
      if (!Number.isFinite(v)) return min
      min = Math.min(min, v)
      return min
    })
    for (let i = 1; i < mono.length; i++) if (mono[i] > mono[i - 1]) mono[i] = mono[i - 1]
    const cum = [0]
    for (let i = 1; i < ch.points.length; i++) cum.push(cum[i - 1] + Math.hypot(ch.points[i][0] - ch.points[i - 1][0], ch.points[i][1] - ch.points[i - 1][1]))
    return { ...ch, z: mono, cum, length: cum[cum.length - 1], points: ch.points }
  })
}

export function bilinearZ(dem, x, y) {
  if (!dem) return NaN
  const fx = (x - dem.minX) / dem.cell
  const fy = (y - dem.minY) / dem.cell
  const i = Math.floor(fx)
  const j = Math.floor(fy)
  if (i < 0 || j < 0 || i >= dem.nx - 1 || j >= dem.ny - 1) return NaN
  const tx = fx - i
  const ty = fy - j
  const a = dem.z[j * dem.nx + i]
  const b = dem.z[j * dem.nx + i + 1]
  const c = dem.z[(j + 1) * dem.nx + i]
  const d = dem.z[(j + 1) * dem.nx + i + 1]
  return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty
}

// 某点等高线切向角（长轴沿等高线方向）
export function contourTangent(dem, x, y) {
  if (!dem) return 0
  const h = dem.cell
  const gx = (bilinearZ(dem, x + h, y) - bilinearZ(dem, x - h, y)) / (2 * h)
  const gy = (bilinearZ(dem, x, y + h) - bilinearZ(dem, x, y - h)) / (2 * h)
  return Math.atan2(gx, -gy)
}

// 区域坡度统计（按格网中心落入统计）
export function areaSlopeStats(dem, pts) {
  const bb = bbox(pts)
  const cellArea = dem.cell * dem.cell
  const acc = [0, 0, 0, 0]
  let total = 0
  let sumSlope = 0
  let minZ = Infinity
  let maxZ = -Infinity
  const i0 = Math.max(0, Math.floor((bb.minX - dem.minX) / dem.cell))
  const i1 = Math.min(dem.nx - 1, Math.ceil((bb.maxX - dem.minX) / dem.cell))
  const j0 = Math.max(0, Math.floor((bb.minY - dem.minY) / dem.cell))
  const j1 = Math.min(dem.ny - 1, Math.ceil((bb.maxY - dem.minY) / dem.cell))
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const x = dem.minX + i * dem.cell
      const y = dem.minY + j * dem.cell
      if (!pointInPolygon([x, y], pts)) continue
      const k = j * dem.nx + i
      const s = dem.slope[k]
      acc[slopeClassIndex(s)] += cellArea
      total += cellArea
      sumSlope += s
      const zz = dem.z[k]
      if (zz < minZ) minZ = zz
      if (zz > maxZ) maxZ = zz
    }
  }
  const area = polygonArea(pts)
  // 边界不足格网面积时按多边形面积折算比例
  const shares = acc.map((a) => (total > 0 ? a / total : 0))
  const coverage = area > 0 ? Math.min(1, total / area) : 0
  return {
    area,
    cellsArea: total,
    coverage,
    outOfRange: total === 0,
    shares,
    sharesByClass: SLOPE_CLASSES.map((c, idx) => ({ ...c, area: shares[idx] * area, share: shares[idx] })),
    meanSlope: total > 0 ? sumSlope / (total / cellArea) : 0,
    minZ: Number.isFinite(minZ) ? minZ : 0,
    maxZ: Number.isFinite(maxZ) ? maxZ : 0,
  }
}

export function polygonMeanSlope(dem, pts) {
  return areaSlopeStats(dem, pts).meanSlope
}

// 到最近等高线的距离与高程（用于吸附显示）
export function nearestContour(survey, x, y) {
  let best = { d: Infinity, level: null, point: null }
  for (const c of survey.contours) {
    const d = distToPolyline([x, y], c.points)
    if (d < best.d) {
      let bp = c.points[0]
      let bd = Infinity
      for (const p of c.points) {
        const dd = Math.hypot(p[0] - x, p[1] - y)
        if (dd < bd) {
          bd = dd
          bp = p
        }
      }
      best = { d, level: c.level, point: bp }
    }
  }
  return best
}
