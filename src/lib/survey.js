// 测绘成果解析与导出
import { lineLength, simplify } from './geometry.js'

export function emptySurvey() {
  return { name: '未命名测绘成果', contours: [], spotHeights: [], channels: [], bounds: null, interval: 5 }
}

function computeBounds(survey) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const eat = (p) => {
    if (p[0] < minX) minX = p[0]
    if (p[1] < minY) minY = p[1]
    if (p[0] > maxX) maxX = p[0]
    if (p[1] > maxY) maxY = p[1]
  }
  for (const c of survey.contours) c.points.forEach(eat)
  for (const s of survey.spotHeights) eat(s)
  if (!Number.isFinite(minX)) return null
  return { minX, minY, maxX, maxY }
}

// 解析导入：支持本系统 JSON、GeoJSON 及 CSV（等高线：level,x1,y1,x2,y2,...）
export function parseSurvey(text, filename = '') {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('文件为空')
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const data = JSON.parse(trimmed)
    if (Array.isArray(data)) {
      return finalizeSurvey({ name: filename || '等高线数据', contours: normalizeContours(data), spotHeights: [], channels: [] })
    }
    if (data.type === 'FeatureCollection') {
      const contours = []
      const spotHeights = []
      let interval = 5
      let props = {}
      for (const f of data.features || []) {
        const g = f.geometry
        if (!g) continue
        if (g.type === 'LineString') {
          const level = Number(f.properties?.elevation ?? f.properties?.ELEV ?? f.properties?.level)
          if (!Number.isFinite(level)) throw new Error('GeoJSON 线要素缺少 elevation 属性（等高线高程）')
          contours.push({ level, points: g.coordinates.map((c) => [c[0], c[1]]) })
        } else if (g.type === 'Point') {
          const level = Number(f.properties?.elevation ?? f.properties?.ELEV)
          if (Number.isFinite(level)) spotHeights.push([g.coordinates[0], g.coordinates[1], level])
        } else if (g.type === 'Polygon') {
          props = f.properties || props
        }
      }
      interval = Number(props.interval) || 5
      if (!contours.length) throw new Error('GeoJSON 中未找到等高线（LineString）要素')
      return finalizeSurvey({ name: props.name || filename || 'GeoJSON 样品', contours, spotHeights, channels: [], interval })
    }
    if (Array.isArray(data.contours)) {
      const s = {
        name: data.name || filename || '测绘成果',
        contours: normalizeContours(data.contours),
        spotHeights: (data.spotHeights || []).map((s) => [Number(s[0]), Number(s[1]), Number(s[2])]),
        channels: data.channels || [],
        interval: Number(data.interval) || 5,
      }
      if (data.bounds) s.bounds = data.bounds
      return finalizeSurvey(s)
    }
    throw new Error('无法识别的 JSON 结构：需包含 contours 数组')
  }
  // CSV
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'))
  const head = lines[0].split(/[,;\t]/).map((s) => s.trim().toLowerCase())
  const contours = []
  const isHeader = head.some((h) => /level|elev|高程|id/.test(h))
  const start = isHeader ? 1 : 0
  for (let i = start; i < lines.length; i++) {
    const cells = lines[i].split(/[,;\t]/).map((s) => s.trim())
    if (cells.length < 5) continue
    const level = Number(cells[0])
    if (!Number.isFinite(level)) continue
    const pts = []
    for (let k = 1; k + 1 < cells.length; k += 2) {
      const x = Number(cells[k])
      const y = Number(cells[k + 1])
      if (Number.isFinite(x) && Number.isFinite(y)) pts.push([x, y])
    }
    if (pts.length >= 2) contours.push({ level, points: pts })
  }
  if (!contours.length) throw new Error('CSV 未解析到等高线（格式应为 level,x1,y1,x2,y2,…）')
  return finalizeSurvey({ name: filename || 'CSV 等高线', contours, spotHeights: [], channels: [] })
}

function normalizeContours(list) {
  return list
    .map((c) => ({
      level: Number(c.level ?? c.elevation),
      points: (c.points || c.coordinates || []).map((p) => [Number(p[0]), Number(p[1])]),
      closed: !!c.closed,
    }))
    .filter((c) => Number.isFinite(c.level) && c.points.length >= 2 && c.points.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])))
}

export function finalizeSurvey(survey) {
  const s = { ...emptySurvey(), ...survey }
  s.contours = s.contours.map((c) => {
    const pts = simplify(c.points, 0.25)
    const closed = pts.length > 3 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.5
    return { ...c, points: closed ? [...pts, pts[0]] : pts, closed, length: lineLength(pts) }
  })
  const levels = [...new Set(s.contours.map((c) => c.level))].sort((a, b) => a - b)
  s.levels = levels
  s.minLevel = levels[0]
  s.maxLevel = levels[levels.length - 1]
  const diffs = []
  for (let i = 1; i < levels.length; i++) diffs.push(levels[i] - levels[i - 1])
  s.interval = s.interval || (diffs.length ? Math.round(diffs.sort((a, b) => a - b)[Math.floor(diffs.length / 2)]) : 5)
  s.bounds = computeBounds(s) || s.bounds
  s.channels = (s.channels || []).map((c) => ({
    ...c,
    points: c.points.map((p) => [Number(p[0]), Number(p[1])]),
  }))
  if (s.channels.length) {
    for (const ch of s.channels) {
      const cum = [0]
      for (let i = 1; i < ch.points.length; i++) cum.push(cum[i - 1] + Math.hypot(ch.points[i][0] - ch.points[i - 1][0], ch.points[i][1] - ch.points[i - 1][1]))
      ch.cum = cum
      ch.length = cum[cum.length - 1]
    }
  }
  s.stats = {
    contourCount: s.contours.length,
    pointCount: s.contours.reduce((a, c) => a + c.points.length, 0),
    spotCount: s.spotHeights.length,
    channelCount: s.channels.length,
  }
  return s
}

// 沟道桩号 -> 坐标
export function channelPointAt(ch, s) {
  if (!ch || !ch.cum) return null
  const total = ch.cum[ch.cum.length - 1]
  const ss = Math.max(0, Math.min(total, s))
  for (let i = 1; i < ch.cum.length; i++) {
    if (ch.cum[i] >= ss) {
      const a = ch.points[i - 1]
      const b = ch.points[i]
      const seg = ch.cum[i] - ch.cum[i - 1] || 1
      const t = (ss - ch.cum[i - 1]) / seg
      return {
        point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
        angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
        s: ss,
      }
    }
  }
  const p = ch.points[ch.points.length - 1]
  const q = ch.points[ch.points.length - 2] || p
  return { point: p, angle: Math.atan2(p[1] - q[1], p[0] - q[0]), s: total }
}

// 最近沟道与桩号
export function nearestChannel(channels, p) {
  let best = null
  for (const ch of channels) {
    if (!ch.cum) continue
    for (let i = 1; i < ch.points.length; i++) {
      const a = ch.points[i - 1]
      const b = ch.points[i]
      const vx = b[0] - a[0]
      const vy = b[1] - a[1]
      const L2 = vx * vx + vy * vy || 1
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2))
      const d = Math.hypot(p[0] - (a[0] + vx * t), p[1] - (a[1] + vy * t))
      if (!best || d < best.d) {
        best = { d, channel: ch, s: ch.cum[i - 1] + (ch.cum[i] - ch.cum[i - 1]) * t, point: [a[0] + vx * t, a[1] + vy * t], angle: Math.atan2(vy, vx) }
      }
    }
  }
  return best
}

export function surveyToGeoJSON(survey) {
  return {
    type: 'FeatureCollection',
    features: survey.contours.map((c) => ({
      type: 'Feature',
      properties: { elevation: c.level },
      geometry: { type: 'LineString', coordinates: c.points.map((p) => [p[0], p[1]]) },
    })),
  }
}
