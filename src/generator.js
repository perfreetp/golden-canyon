// 切面过程式生成器：纯函数，同一 (参数, 种子) 必然生成完全一致的图
import { line, curveBasisClosed, polygonArea } from 'd3'
import { makeRng } from './rng'

export const CANVAS_W = 640
export const CANVAS_H = 560

// ---------- 配色规范 ----------
export const PALETTES = {
  standard: {
    name: '标准灰阶',
    bg: '#0d1321', sector: '#1b2742', sectorEdge: '#3a4a6b',
    text: '#e8ecf4', leader: '#9fb4d8', valve: '#ffd166', flow: '#ff6b6b',
    chambers: ['#5b8def', '#3fc1a8', '#f0a94e', '#e06c8a', '#9b7ff0', '#6aa9e8', '#aeb8cc']
  },
  contrast: {
    name: '高对比教学',
    bg: '#000000', sector: '#101010', sectorEdge: '#555555',
    text: '#ffffff', leader: '#ffffff', valve: '#ffff00', flow: '#00ffff',
    chambers: ['#00e5ff', '#76ff03', '#ffea00', '#ff4081', '#d500f9', '#ff6d00', '#fafafa']
  },
  warm: {
    name: '暖色印刷',
    bg: '#f7f2e8', sector: '#efe6d4', sectorEdge: '#b8a888',
    text: '#3a2f22', leader: '#8a7a5c', valve: '#c0392b', flow: '#2980b9',
    chambers: ['#c96f4a', '#7a9e7e', '#d9a441', '#a0526d', '#6f5b8f', '#4a7a96', '#8d8577']
  }
}

// ---------- 切面模板（640x560 画布，探头在上方） ----------
// ratio 为该腔室占全部腔室总面积的标准比例（质控基准）
export const VIEW_TYPES = {
  A4C: {
    name: '心尖四腔切面',
    chambers: [
      { key: 'LV', label: '左心室', cx: 258, cy: 285, rx: 68, ry: 128, rot: -8, ratio: 0.41 },
      { key: 'RV', label: '右心室', cx: 402, cy: 278, rx: 54, ry: 112, rot: 10, ratio: 0.29 },
      { key: 'LA', label: '左心房', cx: 252, cy: 462, rx: 62, ry: 52, rot: 0, ratio: 0.15 },
      { key: 'RA', label: '右心房', cx: 406, cy: 458, rx: 60, ry: 52, rot: 0, ratio: 0.15 }
    ],
    valves: [
      { key: 'MV', label: '二尖瓣', between: ['LA', 'LV'] },
      { key: 'TV', label: '三尖瓣', between: ['RA', 'RV'] }
    ],
    flows: [
      { key: 'FLV', label: '舒张期流入', from: 'LA', to: 'LV' },
      { key: 'FRV', label: '舒张期流入', from: 'RA', to: 'RV' }
    ]
  },
  PLAX: {
    name: '胸骨旁左室长轴切面',
    chambers: [
      { key: 'LV', label: '左心室', cx: 285, cy: 320, rx: 140, ry: 60, rot: 0, ratio: 0.49 },
      { key: 'LA', label: '左心房', cx: 480, cy: 345, rx: 56, ry: 46, rot: 0, ratio: 0.15 },
      { key: 'RVOT', label: '右室流出道', cx: 280, cy: 210, rx: 125, ry: 34, rot: 0, ratio: 0.25 },
      { key: 'AO', label: '主动脉', cx: 465, cy: 245, rx: 62, ry: 30, rot: 0, ratio: 0.11 }
    ],
    valves: [
      { key: 'MV', label: '二尖瓣', between: ['LA', 'LV'] },
      { key: 'AV', label: '主动脉瓣', between: ['LV', 'AO'] }
    ],
    flows: [
      { key: 'FAO', label: '收缩期射血', from: 'LV', to: 'AO' },
      { key: 'FLV', label: '舒张期流入', from: 'LA', to: 'LV' }
    ]
  },
  PSAX: {
    name: '乳头肌水平短轴切面',
    chambers: [
      { key: 'LV', label: '左心室腔', cx: 330, cy: 320, rx: 96, ry: 92, rot: 0, ratio: 0.61 },
      { key: 'RV', label: '右心室', cx: 320, cy: 180, rx: 92, ry: 40, rot: 0, ratio: 0.26 },
      { key: 'IVS', label: '室间隔', cx: 330, cy: 250, rx: 88, ry: 22, rot: 0, ratio: 0.13 }
    ],
    valves: [{ key: 'MV', label: '二尖瓣(鱼口)', between: ['IVS', 'LV'] }],
    flows: [{ key: 'FLV', label: '舒张期流入', from: 'IVS', to: 'LV' }]
  },
  SC: {
    name: '剑突下四腔切面',
    chambers: [
      { key: 'LV', label: '左心室', cx: 382, cy: 285, rx: 68, ry: 126, rot: 8, ratio: 0.41 },
      { key: 'RV', label: '右心室', cx: 238, cy: 278, rx: 54, ry: 110, rot: -10, ratio: 0.29 },
      { key: 'LA', label: '左心房', cx: 388, cy: 462, rx: 62, ry: 52, rot: 0, ratio: 0.15 },
      { key: 'RA', label: '右心房', cx: 234, cy: 458, rx: 60, ry: 52, rot: 0, ratio: 0.15 }
    ],
    valves: [
      { key: 'MV', label: '二尖瓣', between: ['LA', 'LV'] },
      { key: 'TV', label: '三尖瓣', between: ['RA', 'RV'] }
    ],
    flows: [
      { key: 'FLV', label: '舒张期流入', from: 'LA', to: 'LV' },
      { key: 'FRV', label: '舒张期流入', from: 'RA', to: 'RV' }
    ]
  }
}

// 标注层级
export const LEVELS = {
  L1: { name: 'L1 仅腔室', chambers: true, valves: false, flows: false },
  L2: { name: 'L2 腔室+瓣膜', chambers: true, valves: true, flows: false },
  L3: { name: 'L3 腔室+瓣膜+血流', chambers: true, valves: true, flows: true }
}

const deg2rad = (d) => (d * Math.PI) / 180

function rotatePt(x, y, cx, cy, deg) {
  const r = deg2rad(deg)
  const cos = Math.cos(r), sin = Math.sin(r)
  const dx = x - cx, dy = y - cy
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]
}

// 带径向噪声的椭圆多边形（确定性：噪声来自 rng）
function ellipsePoints(cx, cy, rx, ry, rot, rng, n = 28) {
  const pts = []
  const rr = deg2rad(rot)
  const cos = Math.cos(rr), sin = Math.sin(rr)
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    const wobble = 1 + (rng() * 2 - 1) * 0.06
    const ex = Math.cos(t) * rx * wobble
    const ey = Math.sin(t) * ry * wobble
    pts.push([cx + ex * cos - ey * sin, cy + ex * sin + ey * cos])
  }
  return pts
}

const pathOf = line().x((d) => d[0]).y((d) => d[1]).curve(curveBasisClosed)

function boundaryPoint(chamber, angleDeg) {
  // 取腔室多边形上最接近指定角度的点
  const t = deg2rad(angleDeg)
  const tx = chamber.cx + Math.cos(t) * 500
  const ty = chamber.cy + Math.sin(t) * 500
  let best = chamber.points[0], bd = Infinity
  for (const p of chamber.points) {
    const d = (p[0] - tx) ** 2 + (p[1] - ty) ** 2
    if (d < bd) { bd = d; best = p }
  }
  return { x: best[0], y: best[1] }
}

/**
 * 生成单个切面视图。纯函数：同 (params, viewIndex) 输出完全一致。
 * params: { viewType, probeAngle, level, seed }
 */
export function generateView(params, viewIndex) {
  const tpl = VIEW_TYPES[params.viewType]
  const lvl = LEVELS[params.level]
  const rng = makeRng(`${params.seed}::${params.viewType}::${viewIndex}`)
  const angle = Number(params.probeAngle) || 0
  const CX = CANVAS_W / 2, CY = CANVAS_H / 2

  // 1. 腔室轮廓
  const chambers = tpl.chambers.map((c, i) => {
    const j = (v, amt) => v + (rng() * 2 - 1) * amt
    const cx = j(c.cx, 14), cy = j(c.cy, 12)
    const rx = c.rx * (0.92 + rng() * 0.16)
    const ry = c.ry * (0.92 + rng() * 0.16)
    const rot = (c.rot || 0) + (rng() * 2 - 1) * 6
    let pts = ellipsePoints(cx, cy, rx, ry, rot, rng)
    if (angle) pts = pts.map(([x, y]) => rotatePt(x, y, CX, CY, angle))
    const rcx = angle ? rotatePt(cx, cy, CX, CY, angle) : [cx, cy]
    return {
      key: c.key, label: c.label, targetRatio: c.ratio, colorIdx: i,
      cx: rcx[0], cy: rcx[1], rx, ry, rot: rot + angle,
      points: pts, path: pathOf(pts), area: Math.abs(polygonArea(pts))
    }
  })
  const totalArea = chambers.reduce((s, c) => s + c.area, 0)
  chambers.forEach((c) => { c.actualRatio = c.area / totalArea })

  const byKey = Object.fromEntries(chambers.map((c) => [c.key, c]))

  // 2. 瓣膜（两腔室中心连线的中点处画一段横线）
  const valves = tpl.valves.map((v) => {
    const a = byKey[v.between[0]], b = byKey[v.between[1]]
    const mx = (a.cx + b.cx) / 2, my = (a.cy + b.cy) / 2
    const dx = b.cx - a.cx, dy = b.cy - a.cy
    const len = Math.hypot(dx, dy) || 1
    const px = -dy / len, py = dx / len
    const half = 16 + rng() * 10
    return {
      key: v.key, label: v.label,
      x1: mx - px * half, y1: my - py * half,
      x2: mx + px * half, y2: my + py * half,
      mx, my
    }
  })

  // 3. 血流方向箭头
  const flows = tpl.flows.map((f) => {
    const a = byKey[f.from], b = byKey[f.to]
    const dx = b.cx - a.cx, dy = b.cy - a.cy
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len, uy = dy / len
    const trim = 26
    return {
      key: f.key, label: f.label,
      x1: a.cx + ux * trim, y1: a.cy + uy * trim,
      x2: b.cx - ux * trim, y2: b.cy - uy * trim,
      mx: (a.cx + b.cx) / 2, my: (a.cy + b.cy) / 2
    }
  })

  // 4. 标注与引线（按层级；位置由 rng 决定，故同种子完全一致）
  const annotations = []
  const addAnn = (targetKey, text, anchor, baseAngle) => {
    const a = baseAngle + (rng() * 2 - 1) * 30
    const dist = 42 + rng() * 55
    annotations.push({
      id: `ann-${viewIndex}-${targetKey}`,
      targetKey, text,
      anchor: { x: Math.round(anchor.x), y: Math.round(anchor.y) },
      x: Math.round(anchor.x + Math.cos(deg2rad(a)) * dist),
      y: Math.round(anchor.y + Math.sin(deg2rad(a)) * dist),
      locked: false, manual: false
    })
  }
  if (lvl.chambers) {
    chambers.forEach((c) => {
      const side = c.cx < CX ? 180 : 0 // 左侧腔室标注放左边，右侧放右边
      addAnn(c.key, c.label, boundaryPoint(c, side), side)
    })
  }
  if (lvl.valves) valves.forEach((v) => addAnn(v.key, v.label, { x: v.mx, y: v.my }, v.mx < CX ? 200 : -20))
  if (lvl.flows) flows.forEach((f) => addAnn(f.key, f.label, { x: f.mx, y: f.my }, 90))

  return {
    index: viewIndex,
    viewType: params.viewType,
    viewName: tpl.name,
    chambers, valves, flows, annotations,
    requiredTargets: requiredTargets(params)
  }
}

// 该参数组合下必须存在的标注目标
export function requiredTargets(params) {
  const tpl = VIEW_TYPES[params.viewType]
  const lvl = LEVELS[params.level]
  const req = tpl.chambers.map((c) => ({ key: c.key, label: c.label }))
  if (lvl.valves) tpl.valves.forEach((v) => req.push({ key: v.key, label: v.label }))
  if (lvl.flows) tpl.flows.forEach((f) => req.push({ key: f.key, label: f.label }))
  return req
}

/** 生成整批视图 */
export function generateBatchViews(params) {
  const views = []
  for (let i = 0; i < params.count; i++) views.push(generateView(params, i))
  return views
}

/**
 * 重新生成：保留旧视图中被锁定的标注（位置/文字不动），其余按种子重排。
 * 锁定标注的 id 是确定性的，因此跨生成可对应。
 */
export function regenerateKeepingLocks(params, oldViews) {
  const fresh = generateBatchViews(params)
  fresh.forEach((view, i) => {
    const old = oldViews && oldViews[i]
    if (!old) return
    const lockedMap = new Map(old.annotations.filter((a) => a.locked).map((a) => [a.id, a]))
    view.annotations = view.annotations.map((a) => {
      const lk = lockedMap.get(a.id)
      return lk ? { ...a, x: lk.x, y: lk.y, text: lk.text, locked: true, manual: lk.manual } : a
    })
    // 锁定但目标已不在新模板中的标注（手动新增等情况）也保留
    for (const [id, lk] of lockedMap) {
      if (!view.annotations.some((a) => a.id === id)) view.annotations.push({ ...lk })
    }
  })
  return fresh
}
