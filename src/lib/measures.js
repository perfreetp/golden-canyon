// 措施库定义、工程量计算与措施建议
import { polygonArea, rectCorners, pointInPolygon, lineLength, bbox, shapeArea } from './geometry.js'
import { demAt, SLOPE_CLASSES, slopeClassIndex } from './dem.js'

export const LAND_TYPES = {
  slopeFarm: { id: 'slopeFarm', name: '坡耕地', color: '#b9894e', hatch: '#8c5f2c' },
  wasteGrass: { id: 'wasteGrass', name: '荒草地', color: '#8b9a5d', hatch: '#63713f' },
  outlet: { id: 'outlet', name: '沟道出口', color: '#5d839f', hatch: '#3f627c' },
  forest: { id: 'forest', name: '有林地', color: '#4e6f52', hatch: '#365239' },
  shrub: { id: 'shrub', name: '灌木林地', color: '#77875a', hatch: '#55643c' },
}

export const MEASURE_TYPES = {
  terrace: {
    id: 'terrace',
    name: '水平梯田',
    short: '梯田',
    category: '工程措施',
    shape: 'area',
    color: '#d39a4e',
    icon: 'terrace',
    hint: '坡耕地顺等高线布设，沿等高线自动对齐',
    defaults: { ridgeH: 0.6, benchW: 6, ridgeTopW: 0.4, sideSlope: 0.5, shrubSpacing: 1.5 },
    fields: [
      { key: 'ridgeH', label: '埂高', unit: 'm', min: 0.3, max: 1.5, step: 0.1 },
      { key: 'benchW', label: '田面宽', unit: 'm', min: 3, max: 20, step: 0.5 },
      { key: 'ridgeTopW', label: '埂顶宽', unit: 'm', min: 0.2, max: 1, step: 0.05 },
      { key: 'sideSlope', label: '田坎边坡', unit: '1:m', min: 0.2, max: 1, step: 0.1 },
      { key: 'shrubSpacing', label: '护埂灌木株距', unit: 'm', min: 0.8, max: 3, step: 0.1 },
    ],
  },
  fishpit: {
    id: 'fishpit',
    name: '鱼鳞坑整地+植草',
    short: '鱼鳞坑',
    category: '工程+植物措施',
    shape: 'area',
    color: '#7f9a55',
    icon: 'fishpit',
    hint: '荒草地品字形布设，坑内植树、坑间植草',
    defaults: { pitDia: 0.8, pitDepth: 0.4, rowSpacing: 3, plantSpacing: 2, treesPerPit: 1, grassRate: 0.008 },
    fields: [
      { key: 'pitDia', label: '坑径', unit: 'm', min: 0.5, max: 1.5, step: 0.05 },
      { key: 'pitDepth', label: '坑深', unit: 'm', min: 0.2, max: 0.8, step: 0.05 },
      { key: 'rowSpacing', label: '行距', unit: 'm', min: 1.5, max: 6, step: 0.5 },
      { key: 'plantSpacing', label: '株距', unit: 'm', min: 1, max: 5, step: 0.5 },
      { key: 'treesPerPit', label: '每坑苗木', unit: '株', min: 1, max: 3, step: 1 },
    ],
  },
  checkdam: {
    id: 'checkdam',
    name: '谷坊',
    short: '谷坊',
    category: '工程措施',
    shape: 'point',
    color: '#8c6b4f',
    icon: 'checkdam',
    hint: '沟道出口与支沟布设，间距须满足回水衔接校核',
    defaults: { damH: 2.5, topW: 1.5, upstreamSlope: 1.0, downstreamSlope: 0.5, gullyW: 6 },
    fields: [
      { key: 'damH', label: '谷坊高', unit: 'm', min: 1, max: 5, step: 0.1 },
      { key: 'topW', label: '顶宽', unit: 'm', min: 0.8, max: 3, step: 0.1 },
      { key: 'upstreamSlope', label: '迎水坡', unit: '1:m', min: 0.5, max: 2, step: 0.1 },
      { key: 'downstreamSlope', label: '背水坡', unit: '1:m', min: 0.3, max: 1.5, step: 0.1 },
      { key: 'gullyW', label: '沟道宽', unit: 'm', min: 2, max: 20, step: 0.5 },
    ],
  },
  ditch: {
    id: 'ditch',
    name: '截水沟',
    short: '截水沟',
    category: '工程措施',
    shape: 'line',
    color: '#4d8f97',
    icon: 'ditch',
    hint: '沿等高线布设，拦截坡面径流',
    defaults: { bottomW: 0.4, depth: 0.5, sideSlope: 0.5 },
    fields: [
      { key: 'bottomW', label: '沟底宽', unit: 'm', min: 0.3, max: 1.2, step: 0.05 },
      { key: 'depth', label: '沟深', unit: 'm', min: 0.3, max: 1.2, step: 0.05 },
      { key: 'sideSlope', label: '沟坡', unit: '1:m', min: 0.2, max: 1, step: 0.1 },
    ],
  },
  forest: {
    id: 'forest',
    name: '水保林',
    short: '水保林',
    category: '植物措施',
    shape: 'area',
    color: '#5b7f5f',
    icon: 'forest',
    hint: '25°以上坡耕地退耕还林',
    defaults: { rowSpacing: 3, plantSpacing: 2, pitSize: 0.4 },
    fields: [
      { key: 'rowSpacing', label: '行距', unit: 'm', min: 1.5, max: 5, step: 0.5 },
      { key: 'plantSpacing', label: '株距', unit: 'm', min: 1, max: 4, step: 0.5 },
      { key: 'pitSize', label: '穴规格', unit: 'm', min: 0.3, max: 0.8, step: 0.05 },
    ],
  },
  grass: {
    id: 'grass',
    name: '植草护坡',
    short: '植草',
    category: '植物措施',
    shape: 'area',
    color: '#89a15f',
    icon: 'grass',
    hint: '荒坡与退耕地撒播植草',
    defaults: { seedRate: 0.008 },
    fields: [{ key: 'seedRate', label: '播种量', unit: 'kg/m²', min: 0.003, max: 0.02, step: 0.001 }],
  },
}

export const MEASURE_LIST = Object.values(MEASURE_TYPES)

export const RECOMMENDATION = {
  slopeFarm: {
    text: '坡耕地：修筑水平梯田，沿等高线布设田面与田埂',
    types: ['terrace'],
    alt: { text: '坡度大于25°时退耕还林', types: ['forest'] },
  },
  wasteGrass: {
    text: '荒草地：鱼鳞坑整地造林，坑间植草覆盖',
    types: ['fishpit'],
    alt: { text: '平缓地段可撒播植草', types: ['grass'] },
  },
  outlet: {
    text: '沟道出口：布设谷坊群，逐级消能拦沙',
    types: ['checkdam'],
    alt: { text: '配套截水沟导流', types: ['ditch'] },
  },
  forest: { text: '有林地：封山育林，坡面布设截水沟', types: ['ditch'], alt: null },
  shrub: { text: '灌木林地：补植水保林，辅以鱼鳞坑整地', types: ['forest'], alt: null },
}

// ---------- 几何测算 ----------
export function measurePolygon(m) {
  if (m.shape.kind === 'rect') return rectCorners(m.shape.center, m.shape.angle, m.shape.L, m.shape.W)
  if (m.shape.kind === 'line') return m.shape.points
  if (m.shape.kind === 'point') {
    const a = m.shape.angle || 0
    const half = (m.params?.gullyW || 6) / 2
    const nx = -Math.sin(a)
    const ny = Math.cos(a)
    return [
      [m.shape.center[0] - nx * half, m.shape.center[1] - ny * half],
      [m.shape.center[0] + nx * half, m.shape.center[1] + ny * half],
    ]
  }
  return []
}

export function measureExtent(m) {
  if (m.shape.kind === 'polygon') return m.shape.points
  if (m.shape.kind === 'rect') return rectCorners(m.shape.center, m.shape.angle, m.shape.L, m.shape.W)
  if (m.shape.kind === 'line') return m.shape.points
  if (m.shape.kind === 'point') {
    const a = m.shape.angle || 0
    const nx = -Math.sin(a)
    const ny = Math.cos(a)
    const half = (m.params?.gullyW || 6) / 2
    const tx = Math.cos(a) * 1.2
    const ty = Math.sin(a) * 1.2
    return [
      [m.shape.center[0] - nx * half - tx, m.shape.center[1] - ny * half - ty],
      [m.shape.center[0] + nx * half - tx, m.shape.center[1] + ny * half - ty],
      [m.shape.center[0] + nx * half + tx, m.shape.center[1] + ny * half + ty],
      [m.shape.center[0] - nx * half + tx, m.shape.center[1] - ny * half + ty],
    ]
  }
  return []
}

export function measureBBox(m) {
  const pts = measureExtent(m)
  return pts.length ? bbox(pts) : { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 }
}

export function pointInMeasure(m, p) {
  if (m.shape.kind === 'rect') return pointInPolygon(p, rectCorners(m.shape.center, m.shape.angle, m.shape.L, m.shape.W))
  if (m.shape.kind === 'line') {
    for (let i = 1; i < m.shape.points.length; i++) {
      const a = m.shape.points[i - 1]
      const b = m.shape.points[i]
      const vx = b[0] - a[0]
      const vy = b[1] - a[1]
      const L2 = vx * vx + vy * vy || 1
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2))
      if (Math.hypot(p[0] - (a[0] + vx * t), p[1] - (a[1] + vy * t)) < 2.2) return true
    }
    return false
  }
  if (m.shape.kind === 'point') return Math.hypot(p[0] - m.shape.center[0], p[1] - m.shape.center[1]) < Math.max(3, (m.params?.gullyW || 6) / 2)
  return false
}

// 措施与图斑的交集面积（按格网采样）
export function intersectionArea(shapePts, polyPts, cell = 1.5) {
  if (!polyPts || !polyPts.length) return 0
  const b = bbox([...shapePts, ...polyPts])
  let inside = 0
  const ny = Math.ceil(b.h / cell)
  const nx = Math.ceil(b.w / cell)
  if (nx * ny > 400000) return polygonArea(shapePts) // 防护
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const p = [b.minX + (i + 0.5) * cell, b.minY + (j + 0.5) * cell]
      if (pointInPolygon(p, shapePts) && pointInPolygon(p, polyPts)) inside++
    }
  }
  return inside * cell * cell
}

// 区域内坡度统计（用于梯田坡度校核）
export function regionSlopeStats(dem, shapePts, cell = 4) {
  const b = bbox(shapePts)
  const acc = [0, 0, 0, 0]
  let n = 0
  let sum = 0
  for (let y = b.minY; y <= b.maxY; y += cell) {
    for (let x = b.minX; x <= b.maxX; x += cell) {
      if (!pointInPolygon([x, y], shapePts)) continue
      const { slope } = demAt(dem, x, y)
      if (!Number.isFinite(slope)) continue
      acc[slopeClassIndex(slope)]++
      sum += slope
      n++
    }
  }
  return { mean: n ? sum / n : 0, shares: n ? acc.map((v) => v / n) : [0, 0, 0, 0], n }
}

// ---------- 工程量 ----------
export function computeMeasure(m, ctx) {
  const { dem, patches, channels } = ctx
  const t = MEASURE_TYPES[m.type]
  const p = m.params
  const patch = patches.find((x) => x.id === m.patchId) || null
  const out = { area: 0, earthwork: 0, seedlings: 0, ditchLength: 0, units: 0, items: [], coverage: 1 }

  if (t.shape === 'area') {
    const ext = measureExtent(m)
    const raw = shapeArea({ kind: 'polygon', points: ext })
    const inter = patch ? intersectionArea(ext, patch.points) : raw
    out.area = inter
    out.coverage = raw > 0 ? Math.min(1, inter / raw) : 0
    if (m.type === 'terrace') {
      const ridgeLen = p.benchW > 0 ? inter / p.benchW : 0
      const section = p.ridgeH * (p.ridgeTopW + p.sideSlope * p.ridgeH)
      out.ditchLength = 0
      out.earthwork = ridgeLen * section
      out.seedlings = p.shrubSpacing > 0 ? ridgeLen / p.shrubSpacing : 0
      out.units = ridgeLen
      out.items = [
        { label: '布设面积', value: inter, unit: 'm²', digits: 0 },
        { label: '田埂长度', value: ridgeLen, unit: 'm', digits: 0 },
        { label: '单位土方', value: inter > 0 ? out.earthwork / (inter / 10000) : 0, unit: 'm³/hm²', digits: 0 },
        { label: '筑埂土方', value: out.earthwork, unit: 'm³', digits: 1 },
        { label: '护埂灌木', value: out.seedlings, unit: '株', digits: 0 },
      ]
    } else if (m.type === 'fishpit') {
      const spacing = Math.max(0.5, p.rowSpacing * p.plantSpacing)
      const pits = Math.floor(inter / spacing)
      const pitVol = (Math.PI * p.pitDia * p.pitDia) / 4 * p.pitDepth * 0.6
      out.units = pits
      out.earthwork = pits * pitVol
      out.seedlings = pits * p.treesPerPit
      out.items = [
        { label: '布设面积', value: inter, unit: 'm²', digits: 0 },
        { label: '鱼鳞坑数', value: pits, unit: '个', digits: 0 },
        { label: '单坑土方', value: pitVol, unit: 'm³', digits: 3 },
        { label: '整地土方', value: out.earthwork, unit: 'm³', digits: 1 },
        { label: '苗木', value: out.seedlings, unit: '株', digits: 0 },
        { label: '撒播植草', value: inter, unit: 'm²', digits: 0 },
      ]
    } else if (m.type === 'forest') {
      const spacing = Math.max(0.5, p.rowSpacing * p.plantSpacing)
      const pits = Math.floor(inter / spacing)
      out.units = pits
      out.earthwork = pits * p.pitSize * p.pitSize * p.pitSize
      out.seedlings = pits
      out.items = [
        { label: '造林面积', value: inter, unit: 'm²', digits: 0 },
        { label: '栽植穴数', value: pits, unit: '个', digits: 0 },
        { label: '整地土方', value: out.earthwork, unit: 'm³', digits: 1 },
        { label: '苗木', value: out.seedlings, unit: '株', digits: 0 },
      ]
    } else if (m.type === 'grass') {
      out.units = inter
      out.earthwork = 0
      out.seedlings = 0
      out.items = [
        { label: '植草面积', value: inter, unit: 'm²', digits: 0 },
        { label: '草籽用量', value: inter * p.seedRate, unit: 'kg', digits: 1 },
      ]
    }
    if (dem) {
      const st = regionSlopeStats(dem, ext, 3)
      out.meanSlope = st.mean
      out.steepShare = st.shares[3]
    }
  } else if (m.type === 'ditch') {
    const len = lineLength(m.shape.points)
    const sec = p.depth * (p.bottomW + p.sideSlope * p.depth)
    out.ditchLength = len
    out.earthwork = len * sec
    out.units = len
    out.items = [
      { label: '沟长', value: len, unit: 'm', digits: 0 },
      { label: '断面面积', value: sec, unit: 'm²', digits: 3 },
      { label: '开挖土方', value: out.earthwork, unit: 'm³', digits: 1 },
    ]
  } else if (m.type === 'checkdam') {
    const crossSection = ((p.topW + (p.topW + p.damH * (p.upstreamSlope + p.downstreamSlope))) / 2) * p.damH
    out.earthwork = crossSection * p.gullyW
    out.units = 1
    out.area = p.gullyW * 2
    out.items = [
      { label: '谷坊数量', value: 1, unit: '座', digits: 0 },
      { label: '断面面积', value: crossSection, unit: 'm²', digits: 2 },
      { label: '单座土方', value: out.earthwork, unit: 'm³', digits: 1 },
    ]
    if (channels) {
      const ch = channels.find((c) => c.id === m.channelId)
      if (ch) {
        const i = channelGradient(ch, m.s)
        out.channelGradient = i
        out.maxSpacing = i > 0.002 ? p.damH / i : Infinity
        out.items.push({ label: '沟底比降', value: i * 100, unit: '%', digits: 2 })
        out.items.push({ label: '允许最大间距', value: out.maxSpacing, unit: 'm', digits: 0 })
      }
    }
  }
  return out
}

// 沟道比降（局部）
export function channelGradient(ch, s) {
  if (!ch || !ch.z || ch.z.length < 2 || !ch.cum) return 0.05
  const at = (ss) => {
    const cum = ch.cum
    let i = 1
    while (i < cum.length - 1 && cum[i] < ss) i++
    const a = cum[i - 1]
    const b = cum[i]
    const t = b > a ? (ss - a) / (b - a) : 0
    return ch.z[i - 1] + (ch.z[i] - ch.z[i - 1]) * t
  }
  const s0 = Math.max(0, s - 20)
  const s1 = Math.min(ch.cum[ch.cum.length - 1], s + 20)
  const ds = s1 - s0
  if (ds < 1) return 0.05
  return Math.max(0.001, (at(s0) - at(s1)) / ds)
}

export function summarize(measures, ctx) {
  const totals = { earthwork: 0, seedlings: 0, ditchLength: 0, area: 0 }
  const byType = {}
  for (const m of measures) {
    const c = computeMeasure(m, ctx)
    totals.earthwork += c.earthwork
    totals.seedlings += c.seedlings
    totals.ditchLength += c.ditchLength
    totals.area += c.area || 0
    const key = m.type
    if (!byType[key]) byType[key] = { type: key, count: 0, earthwork: 0, seedlings: 0, ditchLength: 0, area: 0, units: 0 }
    byType[key].count++
    byType[key].earthwork += c.earthwork
    byType[key].seedlings += c.seedlings
    byType[key].ditchLength += c.ditchLength
    byType[key].area += c.area || 0
    byType[key].units += c.units || 0
  }
  return { totals, byType }
}

export { SLOPE_CLASSES }
