// 方案校核：范围重叠、梯田坡度、谷坊间距、图斑覆盖
import { bbox, pointInPolygon, lineLength } from './geometry.js'
import { MEASURE_TYPES, measureExtent, measureBBox, regionSlopeStats, pointInMeasure, channelGradient } from './measures.js'
import { areaSlopeStats } from './dem.js'

const segIntersect = (a, b, c, d) => {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d)
  return d1 * d2 < 0 && d3 * d4 < 0
}

function bboxOverlap(a, b, pad = 0) {
  return !(a.maxX + pad < b.minX || b.maxX + pad < a.minX || a.maxY + pad < b.minY || b.maxY + pad < a.minY)
}

// 两条措施的范围重叠面积（近似）
function overlapArea(m1, m2) {
  const t1 = MEASURE_TYPES[m1.type]
  const t2 = MEASURE_TYPES[m2.type]
  if (t1.shape === 'area' && t2.shape === 'area') {
    const p1 = measureExtent(m1)
    const p2 = measureExtent(m2)
    return sampleIntersection(p1, p2)
  }
  if (t1.shape === 'point' && t2.shape === 'point') {
    return 0
  }
  if (t1.shape === 'line' && t2.shape === 'line') {
    const l1 = m1.shape.points
    const l2 = m2.shape.points
    for (let i = 1; i < l1.length; i++) {
      for (let j = 1; j < l2.length; j++) {
        if (segIntersect(l1[i - 1], l1[i], l2[j - 1], l2[j])) return 1
      }
    }
    return 0
  }
  return 0
}

function sampleIntersection(p1, p2) {
  const b1 = bbox(p1)
  const b2 = bbox(p2)
  if (!bboxOverlap(b1, b2)) return 0
  const b = {
    minX: Math.max(b1.minX, b2.minX),
    minY: Math.max(b1.minY, b2.minY),
    maxX: Math.min(b1.maxX, b2.maxX),
    maxY: Math.min(b1.maxY, b2.maxY),
  }
  const cell = Math.max(1, Math.min(2.5, Math.sqrt((b.maxX - b.minX) * (b.maxY - b.minY)) / 90))
  let n = 0
  for (let y = b.minY; y <= b.maxY; y += cell) {
    for (let x = b.minX; x <= b.maxX; x += cell) {
      const p = [x, y]
      if (pointInPolygon(p, p1) && pointInPolygon(p, p2)) n++
    }
  }
  return n * cell * cell
}

// 谷坊允许间距与其位置沿沟道桩号
export function damSpacingInfo(m, channels) {
  const ch = channels.find((c) => c.id === m.channelId)
  if (!ch) return null
  const i = channelGradient(ch, m.s || 0)
  const h = m.params.damH
  return { gradient: i, allow: i > 0.0005 ? h / i : Infinity, channel: ch }
}

export function validatePlan({ dem, channels, patches, measures, watersheds, activeWatershedId }) {
  const issues = []
  const push = (o) => issues.push({ id: `${o.type}-${o.measureId || o.patchId || issues.length}-${issues.length}`, ...o })
  const byId = new Map(measures.map((m) => [m.id, m]))
  const patchById = new Map(patches.map((p) => [p.id, p]))

  // 1. 梯田落在 >25° 坡面
  for (const m of measures) {
    if (m.type !== 'terrace' || !dem) continue
    const ext = measureExtent(m)
    const st = regionSlopeStats(dem, ext, 4)
    m._slope = st
    if (st.mean > 25 || st.shares[3] > 0.35) {
      push({
        level: 'error',
        type: 'terrace-steep',
        measureId: m.id,
        patchId: m.patchId,
        title: '梯田布设在25°以上坡面',
        message: `该梯田平均坡度 ${st.mean.toFixed(1)}°，大于25°的面积占 ${(st.shares[3] * 100).toFixed(0)}%，不符合《水土保持综合治理 技术规范》，应改为退耕还林。`,
        action: 'convert-forest',
      })
    }
  }

  // 2. 措施范围重叠
  for (let i = 0; i < measures.length; i++) {
    for (let j = i + 1; j < measures.length; j++) {
      const a = measures[i]
      const b = measures[j]
      if (a.watershedId !== b.watershedId) continue
      const ba = measureBBox(a)
      const bb = measureBBox(b)
      if (!bboxOverlap(ba, bb)) continue
      let conflict = false
      let detail = ''
      const ta = MEASURE_TYPES[a.type]
      const tb = MEASURE_TYPES[b.type]
      if (ta.shape === 'area' && tb.shape === 'area') {
        const area = overlapArea(a, b)
        if (area > 150) {
          conflict = true
          detail = `重叠 ${area.toFixed(0)} m²`
        }
      } else if (ta.shape === 'point' && tb.shape === 'area') {
        if (pointInMeasure(b, a.shape.center)) {
          conflict = true
          detail = '谷坊位于另一措施范围内'
        }
      } else if (tb.shape === 'point' && ta.shape === 'area') {
        if (pointInMeasure(a, b.shape.center)) {
          conflict = true
          detail = '谷坊位于另一措施范围内'
        }
      } else if (ta.shape === 'point' && tb.shape === 'point') {
        const d = Math.hypot(a.shape.center[0] - b.shape.center[0], a.shape.center[1] - b.shape.center[1])
        if (d < 12) {
          conflict = true
          detail = `两座谷坊相距仅 ${d.toFixed(1)} m`
        }
      } else if (ta.shape === 'line' || tb.shape === 'line') {
        if (ta.shape === 'line' && tb.shape === 'line' && overlapArea(a, b)) {
          conflict = true
          detail = '沟渠相互交叉'
        }
        const lineM = ta.shape === 'line' ? a : b
        const areaM = ta.shape === 'line' ? b : a
        if (areaM && MEASURE_TYPES[areaM.type].shape === 'area') {
          const mid = midpointOfLine(lineM)
          if (pointInMeasure(areaM, mid)) {
            conflict = true
            detail = '沟渠穿越另一措施范围'
          }
        }
      }
      if (conflict) {
        push({
          level: 'error',
          type: 'overlap',
          measureId: a.id,
          measureId2: b.id,
          type1: a.type,
          type2: b.type,
          patchId: a.patchId,
          title: '措施范围重叠',
          message: `「${MEASURE_TYPES[a.type].name}」与「${MEASURE_TYPES[b.type].name}」${detail}`,
          blocking: true,
        })
      }
    }
  }

  // 3. 谷坊间距校核
  const dams = measures.filter((m) => m.type === 'checkdam')
  const groups = new Map()
  for (const d of dams) {
    const k = d.channelId || 'none'
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(d)
  }
  for (const [k, list] of groups) {
    const sorted = [...list].sort((a, b) => (a.s || 0) - (b.s || 0))
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]
        const b = sorted[j]
        const info = damSpacingInfo(a, channels)
        if (!info) continue
        const d = Math.abs((b.s || 0) - (a.s || 0))
        if (d < info.allow - 0.5) {
          push({
            level: 'error',
            type: 'dam-spacing',
            measureId: a.id,
            measureId2: b.id,
            type1: a.type,
            type2: b.type,
            patchId: a.patchId,
            title: '谷坊间距不满足校核',
            message: `沟底比降 ${(info.gradient * 100).toFixed(2)}%，谷坊高 ${a.params.damH} m，回水衔接要求间距不小于 ${info.allow.toFixed(0)} m，实际 ${d.toFixed(0)} m。`,
            blocking: true,
          })
        }
      }
    }
  }

  // 4. 图斑超出测绘范围
  if (dem) {
    for (const p of patches) {
      const st = areaSlopeStats(dem, p.points)
      if (st.outOfRange) {
        push({
          level: 'warning',
          type: 'patch-out-of-range',
          patchId: p.id,
          title: '图斑超出测绘范围',
          message: `${p.name} 不在当前测绘成果覆盖范围内，无法统计坡度与工程量，请重新导入对应测绘数据或调整图斑。`,
        })
      } else if (st.coverage < 0.6) {
        push({
          level: 'warning',
          type: 'patch-partial-range',
          patchId: p.id,
          title: '图斑部分超出测绘范围',
          message: `${p.name} 仅 ${(st.coverage * 100).toFixed(0)}% 面积落在测绘成果范围内，坡度统计仅供参考。`,
        })
      }
    }
  }

  // 5. 图斑未布设措施 / 措施超出图斑
  for (const p of patches) {
    const list = measures.filter((m) => m.patchId === p.id)
    if (!list.length) {
      push({
        level: 'warning',
        type: 'patch-uncovered',
        patchId: p.id,
        title: '图斑未布设措施',
        message: `${p.name}（${p.landTypeName}）尚未布设治理措施。`,
      })
    }
  }
  for (const m of measures) {
    if (m.coverage !== undefined && m.coverage < 0.75) {
      push({
        level: 'warning',
        type: 'measure-outside',
        measureId: m.id,
        patchId: m.patchId,
        title: '措施超出图斑范围',
        message: `「${MEASURE_TYPES[m.type].name}」仅 ${(m.coverage * 100).toFixed(0)}% 位于所属图斑内。`,
      })
    }
  }
  // 5. 无措施覆盖的流域
  for (const w of watersheds) {
    const list = measures.filter((m) => m.watershedId === w.id)
    if (!list.length && w.id !== activeWatershedId) {
      push({ level: 'warning', type: 'watershed-empty', patchId: null, title: '小流域无措施', message: `${w.name} 尚未布设任何措施。`, silent: true })
    }
  }

  const errors = issues.filter((i) => i.level === 'error')
  const warnings = issues.filter((i) => i.level === 'warning')
  return { issues, errors, warnings, ok: errors.length === 0, blocking: issues.some((i) => i.blocking) }
}

function midpointOfLine(m) {
  const pts = m.shape.points
  const total = lineLength(pts)
  let acc = 0
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    if (acc + seg >= total / 2) {
      const t = seg > 0 ? (total / 2 - acc) / seg : 0
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]
    }
    acc += seg
  }
  return pts[0]
}

// 候选谷坊位置校核（布设前拦截）
export function checkDamPlacement(candidate, channels, measures) {
  const ch = channels.find((c) => c.id === candidate.channelId)
  if (!ch) return { ok: false, reason: '未找到所在沟道' }
  const info = damSpacingInfo(candidate, channels)
  if (!info) return { ok: false, reason: '无法计算沟底比降' }
  const others = measures.filter((m) => m.type === 'checkdam' && m.channelId === candidate.channelId)
  for (const o of others) {
    const d = Math.abs((o.s || 0) - candidate.s)
    const allow = Math.max(info.allow, damSpacingInfo(o, channels)?.allow || 0)
    if (d < allow - 0.5) {
      return {
        ok: false,
        reason: `与既有谷坊相距 ${d.toFixed(0)} m，小于回水衔接要求的 ${allow.toFixed(0)} m`,
        gradient: info.gradient,
        allow,
        dist: d,
        other: o,
      }
    }
  }
  return { ok: true, gradient: info.gradient, allow: info.allow }
}
