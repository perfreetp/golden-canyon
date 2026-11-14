// 断层序列与解剖要素生成器（确定性随机，模拟 DICOM 断层导入后的结构化标注）
import { makeRng, range, intRange, pick } from './rng.js'
import { bboxOf } from './geometry.js'

export const WORLD_SIZE = 1000
export const SLICE_COUNT = 60
export const LOD_THRESHOLD = 1.35 // 缩放 >= 该倍数时铺开高倍细节

export const LAYERS = [
  { id: 'artery', name: '动脉', color: 0xe5484d, soft: 'rgba(229,72,77,0.16)', desc: '脑动脉主干与皮质/穿支分支' },
  { id: 'vein', name: '静脉', color: 0x3d7bf2, soft: 'rgba(61,123,242,0.16)', desc: '静脉窦、深静脉与浅静脉属支' },
  { id: 'nerve', name: '颅神经', color: 0xe8b526, soft: 'rgba(232,181,38,0.14)', desc: '十二对颅神经走形及远端分支' },
  { id: 'functional', name: '功能区', color: 0x8b5cf6, soft: 'rgba(139,92,246,0.15)', desc: '脑叶分区、皮层功能区与深部核团' },
  { id: 'lesion', name: '病灶', color: 0xff8a3d, soft: 'rgba(255,138,61,0.18)', desc: '梗死、出血、占位及周围水肿带' }
]

export const layerMeta = (id) => LAYERS.find((l) => l.id === id)

// 脑轮廓随层号变化：中部宽大、两端收窄
function brainEllipse(i) {
  const t = i / (SLICE_COUNT - 1) // 0=颅底, 1=颅顶
  const env = Math.pow(Math.sin(Math.PI * t), 0.42)
  const rx = 150 + 300 * env + (t > 0.35 && t < 0.75 ? 18 : 0)
  const ry = 120 + 250 * env
  return { cx: 500, cy: 515 - 18 * env, rx, ry }
}

function ellipsePoint(e, u, scale = 1) {
  const a = 2 * Math.PI * u
  return { x: e.cx + e.rx * scale * Math.cos(a), y: e.cy + e.ry * scale * Math.sin(a) }
}

// 扇形脑叶多边形
function sectorPolygon(e, u0, u1, scale = 0.93) {
  const pts = [{ x: e.cx, y: e.cy }]
  const steps = 9
  for (let k = 0; k <= steps; k++) {
    pts.push(ellipsePoint(e, u0 + ((u1 - u0) * k) / steps, scale))
  }
  return pts
}

function jitterPts(rng, pts, amt) {
  return pts.map((p) => ({ x: p.x + range(rng, -amt, amt), y: p.y + range(rng, -amt, amt) }))
}

// 生成一条柔和弯曲的血管走形
function vesselPath(rng, start, end, segs, bend) {
  const pts = []
  const perp = Math.atan2(end.y - start.y, end.x - start.x) + Math.PI / 2
  const phase = range(rng, 0, Math.PI * 2)
  for (let k = 0; k <= segs; k++) {
    const t = k / segs
    const wob = Math.sin(t * Math.PI * 2 + phase) * bend * (1 - Math.abs(0.5 - t))
    pts.push({
      x: start.x + (end.x - start.x) * t + Math.cos(perp) * wob,
      y: start.y + (end.y - start.y) * t + Math.sin(perp) * wob
    })
  }
  return pts
}

let uid = 0
function makeStructure(slice, layer, name, lod, shape) {
  return { id: `el-${uid++}`, slice, layer, name, lod, shape, bbox: null }
}

// ---------- 各图层生成 ----------
function buildLobes(i, e, rng) {
  const out = []
  if (e.rx < 190) return out // 最两端层面不细分脑叶
  const defs = [
    ['额叶', [[0.625, 0.75], [0.75, 0.875]], '左', '右'],
    ['顶叶', [[0.5, 0.625], [0.875, 1.0]], '左', '右'],
    ['颞叶', [[0.25, 0.4], [0.1, 0.25]], '左', '右'],
    ['枕叶', [[0.4, 0.5], [0.0, 0.1]], '左', '右']
  ]
  for (const [lobe, ranges, sl, sr] of defs) {
    out.push(makeStructure(i, 'functional', `${sl}${lobe}`, 'low',
      { kind: 'polygon', points: jitterPts(rng, sectorPolygon(e, ranges[0][0], ranges[0][1]), 2.2) }))
    out.push(makeStructure(i, 'functional', `${sr}${lobe}`, 'low',
      { kind: 'polygon', points: jitterPts(rng, sectorPolygon(e, ranges[1][0], ranges[1][1]), 2.2) }))
  }
  // 岛叶：中部层面的外侧裂深部
  if (i >= 22 && i <= 44) {
    for (const side of [-1, 1]) {
      out.push(makeStructure(i, 'functional', `${side < 0 ? '左' : '右'}岛叶`, 'low', {
        kind: 'ellipse',
        cx: e.cx + side * e.rx * 0.42, cy: e.cy - e.ry * 0.05,
        rx: e.rx * 0.13, ry: e.ry * 0.16
      }))
    }
  }
  return out
}

function buildFunctionalHigh(i, e, rng) {
  const out = []
  const add = (name, cx, cy, rx, ry) => out.push(makeStructure(i, 'functional', name, 'high',
    { kind: 'ellipse', cx, cy, rx, ry }))
  // 深部核团与间脑
  if (i >= 18 && i <= 40) {
    for (const side of [-1, 1]) {
      const tag = side < 0 ? '左' : '右'
      add(`${tag}丘脑`, e.cx + side * e.rx * 0.12, e.cy + e.ry * 0.08, e.rx * 0.1, e.ry * 0.12)
      add(`${tag}尾状核头`, e.cx + side * e.rx * 0.2, e.cy - e.ry * 0.18, e.rx * 0.07, e.ry * 0.09)
      add(`${tag}豆状核`, e.cx + side * e.rx * 0.3, e.cy - e.ry * 0.05, e.rx * 0.09, e.ry * 0.11)
      add(`${tag}内囊`, e.cx + side * e.rx * 0.21, e.cy - e.ry * 0.04, e.rx * 0.045, e.ry * 0.14)
    }
  }
  // 皮层功能区
  if (i >= 26 && i <= 50) {
    const top = ellipsePoint(e, 0.75, 0.82)
    add('中央前回（初级运动皮层）', top.x - 14, top.y, 26, 16)
    add('中央后回（初级体感皮层）', top.x + 14, top.y - 4, 26, 15)
    add('Broca 语言运动区', e.cx - e.rx * 0.55, e.cy - e.ry * 0.55, 24, 18)
  }
  if (i >= 20 && i <= 44) {
    const post = ellipsePoint(e, 0.5, 0.85)
    add('视觉皮层（距状裂）', post.x + 10, post.y, 26, 20)
    add('Wernicke 语言理解区', e.cx - e.rx * 0.6, e.cy + e.ry * 0.35, 26, 18)
  }
  if (i >= 14 && i <= 34) {
    for (const side of [-1, 1]) {
      add(`${side < 0 ? '左' : '右'}颞横回（听觉皮层）`,
        e.cx + side * e.rx * 0.5, e.cy + e.ry * 0.28, 20, 14)
    }
    add('海马', e.cx - e.rx * 0.28, e.cy + e.ry * 0.34, 22, 12)
  }
  // 少量小皮层沟回标注，保证高倍细节密度
  const n = intRange(rng, 4, 6)
  const names = ['额中回', '角回', '缘上回', '楔叶', '舌回', '扣带回']
  for (let k = 0; k < n; k++) {
    const u = range(rng, 0.05, 0.95)
    const p = ellipsePoint(e, u, range(rng, 0.55, 0.8))
    add(`${pick(rng, names)}（皮质）`, p.x, p.y, range(rng, 12, 20), range(rng, 9, 15))
  }
  return out
}

function buildArteries(i, e, rng) {
  const out = []
  const trunks = []
  // 主干出现层面
  if (i <= 22) trunks.push('颈内动脉', '基底动脉')
  if (i >= 14 && i <= 46) trunks.push('大脑中动脉', '大脑前动脉')
  if (i >= 16 && i <= 40) trunks.push('大脑后动脉')
  if (i >= 38) trunks.push('大脑前动脉（胼周段）')
  const anchor = (side) => ({ x: e.cx + side * e.rx * range(rng, 0.12, 0.3), y: e.cy + e.ry * range(rng, 0.5, 0.75) })
  for (const name of trunks) {
    const side = name.includes('基底') ? 0 : (rng() > 0.5 ? 1 : -1)
    const start = name.includes('基底')
      ? { x: e.cx + range(rng, -8, 8), y: e.cy + e.ry * 0.8 }
      : anchor(side)
    const end = name.includes('大脑中')
      ? { x: e.cx + side * e.rx * 0.85, y: e.cy - e.ry * range(rng, 0.1, 0.4) }
      : name.includes('大脑后')
        ? { x: e.cx + side * e.rx * 0.7, y: e.cy + e.ry * 0.45 }
        : { x: e.cx + side * e.rx * 0.25, y: e.cy - e.ry * 0.8 }
    const path = vesselPath(rng, start, end, 5, 16)
    out.push(makeStructure(i, 'artery', name, 'low', { kind: 'polyline', points: path, width: 7 }))
    // 高倍：皮质分支与穿支
    const branches = intRange(rng, 4, 6)
    for (let b = 0; b < branches; b++) {
      const bp = path[intRange(rng, 1, path.length - 2)]
      const ang = range(rng, 0, Math.PI * 2)
      const len = range(rng, 30, 75)
      const bend = range(rng, 6, 16)
      const bPath = vesselPath(rng, bp,
        { x: bp.x + Math.cos(ang) * len, y: bp.y + Math.sin(ang) * len }, 3, bend)
      out.push(makeStructure(i, 'artery', `${name}·皮质支 ${b + 1}`, 'high',
        { kind: 'polyline', points: bPath, width: 3 }))
    }
    if (i >= 18 && i <= 36 && rng() > 0.4) {
      const bp = path[Math.floor(path.length / 2)]
      const dp = vesselPath(rng, bp, { x: e.cx + range(rng, -30, 30), y: e.cy + range(rng, -20, 20) }, 3, 8)
      out.push(makeStructure(i, 'artery', '豆纹动脉（穿支）', 'high',
        { kind: 'polyline', points: dp, width: 2.5 }))
    }
  }
  return out
}

function buildVeins(i, e, rng) {
  const out = []
  const trunks = []
  if (i >= 30) trunks.push('上矢状窦')
  if (i >= 20 && i <= 44) trunks.push('大脑内静脉', '大脑大静脉')
  if (i >= 12 && i <= 30) trunks.push('横窦', '直窦')
  for (const name of trunks) {
    let start, end
    if (name === '上矢状窦') {
      start = { x: e.cx - e.rx * 0.25, y: e.cy - e.ry * 0.92 }
      end = { x: e.cx + e.rx * 0.25, y: e.cy - e.ry * 0.92 }
    } else if (name === '横窦') {
      start = { x: e.cx - e.rx * 0.85, y: e.cy + e.ry * 0.55 }
      end = { x: e.cx + e.rx * 0.85, y: e.cy + e.ry * 0.5 }
    } else if (name === '直窦') {
      start = { x: e.cx, y: e.cy - e.ry * 0.7 }
      end = { x: e.cx + e.rx * 0.12, y: e.cy + e.ry * 0.25 }
    } else {
      const side = rng() > 0.5 ? 1 : -1
      start = { x: e.cx + side * e.rx * 0.2, y: e.cy - e.ry * 0.3 }
      end = { x: e.cx + range(rng, -20, 20), y: e.cy + e.ry * 0.35 }
    }
    const path = vesselPath(rng, start, end, 5, 12)
    out.push(makeStructure(i, 'vein', name, 'low', { kind: 'polyline', points: path, width: 7 }))
    const branches = intRange(rng, 3, 5)
    for (let b = 0; b < branches; b++) {
      const bp = path[intRange(rng, 1, path.length - 2)]
      const ang = range(rng, 0, Math.PI * 2)
      const len = range(rng, 25, 60)
      const bPath = vesselPath(rng, bp,
        { x: bp.x + Math.cos(ang) * len, y: bp.y + Math.sin(ang) * len }, 3, range(rng, 5, 12))
      const vName = rng() > 0.5 ? '皮层浅静脉' : (rng() > 0.5 ? 'Trolard 吻合静脉' : 'Labbe 吻合静脉')
      out.push(makeStructure(i, 'vein', `${vName} ${b + 1}`, 'high',
        { kind: 'polyline', points: bPath, width: 3 }))
    }
  }
  return out
}

const CN = [
  ['嗅神经', 4, 10], ['视神经', 8, 14], ['动眼神经', 10, 16], ['滑车神经', 12, 18],
  ['三叉神经', 12, 22], ['外展神经', 14, 22], ['面神经', 10, 20], ['前庭蜗神经', 10, 18],
  ['舌咽神经', 6, 14], ['迷走神经', 6, 16], ['副神经', 2, 12], ['舌下神经', 4, 14]
]

function buildNerves(i, e, rng) {
  const out = []
  CN.forEach(([name, z0, z1], idx) => {
    if (i < z0 || i > z1) return
    for (const side of [-1, 1]) {
      const tag = side < 0 ? '左' : '右'
      const start = { x: e.cx + side * range(rng, 4, 18), y: e.cy + e.ry * range(rng, 0.25, 0.5) }
      const ang = side * range(rng, 0.25, 0.95)
      const len = e.rx * range(rng, 0.5, 0.85)
      const end = {
        x: start.x + Math.sin(ang) * len * side + side * 30,
        y: start.y + Math.cos(ang) * len * 0.55
      }
      const path = vesselPath(rng, start, end, 4, 10)
      out.push(makeStructure(i, 'nerve', `${tag}${name}（${roman(idx + 1)}）`, 'low',
        { kind: 'polyline', points: path, width: 4.5 }))
      // 高倍：远端细小分支（三叉神经三个支等）
      if (idx === 4 || idx === 6 || rng() > 0.3) {
        const subNames = idx === 4 ? ['眼支 V1', '上颌支 V2', '下颌支 V3']
          : idx === 6 ? ['颞面支', '颈面支'] : ['远端走形支 A', '远端走形支 B']
        subNames.forEach((sn, k) => {
          const sp = path[path.length - 1]
          const subPath = vesselPath(rng, sp, {
            x: sp.x + side * range(rng, 25, 55),
            y: sp.y + range(rng, -30, 30) + k * 12
          }, 2, 6)
          out.push(makeStructure(i, 'nerve', `${tag}${name}·${sn}`, 'high',
            { kind: 'polyline', points: subPath, width: 2 }))
        })
      }
    }
  })
  return out
}

function roman(n) {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n - 1]
}

// 病灶：全序列定义 4 处，各跨若干层
function lesionPlan() {
  return [
    { name: '右侧基底节区急性梗死灶', z0: 20, z1: 30, cx: 0.66, cy: 0.47, r: 34, kind: 'infarct' },
    { name: '左颞叶出血灶', z0: 14, z1: 22, cx: 0.3, cy: 0.66, r: 26, kind: 'hemorrhage' },
    { name: '右额叶占位性病变', z0: 28, z1: 40, cx: 0.72, cy: 0.28, r: 40, kind: 'mass' },
    { name: '侧脑室旁白质脱髓鞘斑块', z0: 32, z1: 42, cx: 0.52, cy: 0.52, r: 16, kind: 'plaque' }
  ]
}

function buildLesions(i, e, rng, plan) {
  const out = []
  for (const L of plan) {
    if (i < L.z0 || i > L.z1) continue
    const span = L.z1 - L.z0
    const taper = 1 - Math.abs(i - (L.z0 + span / 2)) / (span / 2 + 1) // 中间层最大
    const cx = e.cx - e.rx + L.cx * 2 * e.rx
    const cy = e.cy - e.ry + L.cy * 2 * e.ry
    const rr = L.r * (0.55 + 0.45 * taper)
    out.push(makeStructure(i, 'lesion', L.name, 'low', {
      kind: 'ellipse', cx: cx + range(rng, -3, 3), cy: cy + range(rng, -3, 3),
      rx: rr, ry: rr * range(rng, 0.75, 1.1)
    }))
    // 高倍：不规则水肿带（多边形环）
    const edema = []
    const steps = 12
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2
      const rad = rr * range(rng, 1.35, 1.8)
      edema.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad * 0.9 })
    }
    out.push(makeStructure(i, 'lesion', `${L.name}·血管源性水肿带`, 'high',
      { kind: 'polygon', points: edema }))
    if (L.kind === 'mass' && rng() > 0.4) {
      out.push(makeStructure(i, 'lesion', '占位周围卫星灶', 'high', {
        kind: 'ellipse', cx: cx + rr * 1.7, cy: cy - rr * 0.8, rx: 8, ry: 7
      }))
    }
  }
  return out
}

// ---------- 序列入口 ----------
export function generateSeries(seed = 20261115) {
  uid = 0
  const rng = makeRng(seed)
  const plan = lesionPlan()
  const slices = []
  const structures = []
  for (let i = 0; i < SLICE_COUNT; i++) {
    const e = brainEllipse(i)
    const items = []
    const add = (arr) => { for (const s of arr) { s.bbox = null; items.push(s.id); structures.push(s) } }
    add(buildLobes(i, e, rng))
    add(buildFunctionalHigh(i, e, rng))
    add(buildArteries(i, e, rng))
    add(buildVeins(i, e, rng))
    add(buildNerves(i, e, rng))
    add(buildLesions(i, e, rng, plan))
    slices.push({
      index: i,
      // 模拟 DICOM 位置：颅底 -> 颅顶
      z: -(SLICE_COUNT - 1) * 2.5 + i * 5,
      baseShape: { kind: 'ellipse', cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry },
      skullShape: { kind: 'ellipse', cx: e.cx, cy: e.cy, rx: e.rx + 22, ry: e.ry + 20 },
      structures: items
    })
  }
  // 预计算所有要素的包围盒（供视口裁剪与点选检索）
  for (const s of structures) s.bbox = bboxOf(s.shape)
  const byLayer = Object.fromEntries(LAYERS.map((l) => [l.id, 0]))
  for (const s of structures) byLayer[s.layer]++
  return {
    id: 'series-001',
    name: '头颅 MRI 轴位断层序列（教学标注版）',
    modality: 'MRI-T1/T2 融合',
    seed,
    sliceThickness: 5,
    worldSize: WORLD_SIZE,
    sliceCount: SLICE_COUNT,
    importedAt: null,
    slices,
    structures,
    countByLayer: byLayer
  }
}
