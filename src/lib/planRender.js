// 导出：工程量清单（CSV）与平面图（PNG）
import { SLOPE_CLASSES } from './dem.js'
import { MEASURE_TYPES, LAND_TYPES, measureExtent, regionSlopeStats, summarize, computeMeasure } from './measures.js'
import { bbox, polygonCentroid, rectCorners } from './geometry.js'

export const EXPORT_MEASURE_ORDER = ['terrace', 'fishpit', 'checkdam', 'ditch', 'forest', 'grass']

const num = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '')

export function buildQuantityRows({ measures, patches, watersheds, ctx }) {
  const rows = []
  for (const w of watersheds) {
    const list = measures.filter((m) => m.watershedId === w.id)
    if (!list.length) continue
    // 按措施类型
    const byType = new Map()
    for (const m of list) {
      const c = computeMeasure(m, ctx)
      const t = byType.get(m.type) || { type: m.type, count: 0, area: 0, earthwork: 0, seedlings: 0, ditchLength: 0, units: 0, items: {} }
      t.count++
      t.area += c.area || 0
      t.earthwork += c.earthwork
      t.seedlings += c.seedlings
      t.ditchLength += c.ditchLength
      t.units += c.units || 0
      for (const it of c.items) {
        const k = `${it.label}`
        t.items[k] = (t.items[k] || 0) + it.value
      }
      byType.set(m.type, t)
    }
    for (const t of EXPORT_MEASURE_ORDER) {
      const row = byType.get(t)
      if (!row) continue
      rows.push({
        watershed: w.name,
        watershedCode: w.code,
        type: t,
        typeName: MEASURE_TYPES[t].name,
        category: MEASURE_TYPES[t].category,
        count: row.count,
        area: row.area,
        earthwork: row.earthwork,
        seedlings: row.seedlings,
        ditchLength: row.ditchLength,
        units: row.units,
        items: row.items,
      })
    }
  }
  return rows
}

export function quantityCSV({ measures, patches, watersheds, ctx, project }) {
  const rows = buildQuantityRows({ measures, patches, watersheds, ctx })
  const head = ['小流域', '流域编号', '措施类型', '措施类别', '布设处数', '布设/治理面积(m²)', '土方量(m³)', '苗木(株)', '沟渠长度(m)', '主要参数']
  const lines = [head.join(',')]
  for (const r of rows) {
    const params = Object.entries(r.items)
      .filter(([k]) => !/面积|长度|苗木|土方/.test(k))
      .map(([k, v]) => `${k}:${num(v, 1)}`)
      .join(' ')
    lines.push(
      [
        r.watershed,
        r.watershedCode,
        r.typeName,
        r.category,
        r.count,
        num(r.area, 0),
        num(r.earthwork, 1),
        num(r.seedlings, 0),
        num(r.ditchLength, 1),
        params,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(','),
    )
  }
  // 合计
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0)
  lines.push(
    ['合计', '', '', '', rows.reduce((a, r) => a + r.count, 0), num(sum('area'), 0), num(sum('earthwork'), 1), num(sum('seedlings'), 0), num(sum('ditchLength'), 1), '']
      .map((c) => `"${c}"`)
      .join(','),
  )
  return '﻿' + lines.join('\r\n')
}

export function downloadText(text, filename, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }, 'image/png')
}

// ---------- 平面图渲染 ----------
export function renderPlan(canvas, opts) {
  const { survey, dem, watersheds, patches, measures, ctx, title, subtitle, filterWatershed, width = 2200, height = 1600 } = opts
  const g = canvas.getContext('2d')
  canvas.width = width
  canvas.height = height
  const PAPER = '#f4f0e5'
  g.fillStyle = PAPER
  g.fillRect(0, 0, width, height)

  const wsList = filterWatershed ? watersheds.filter((w) => w.id === filterWatershed) : watersheds
  const b = survey.bounds || { minX: 0, minY: 0, maxX: 1600, maxY: 1200 }
  const frame = { x: 46, y: 66, w: width - 92, h: height - 210 }
  const scale = Math.min((frame.w - 24) / (b.maxX - b.minX), (frame.h - 24) / (b.maxY - b.minY))
  const ox = frame.x + (frame.w - (b.maxX - b.minX) * scale) / 2
  const oy = frame.y + (frame.h - (b.maxY - b.minY) * scale) / 2
  const X = (x) => ox + (x - b.minX) * scale
  const Y = (y) => oy + (b.maxY - y) * scale
  // 制图比例：按 150 dpi 出图折算（1 px = 25.4/150 mm）
  const denom = niceDenominator(150000 / (scale * 25.4))
  const scaleText = `1:${denom}`

  // 图框
  g.strokeStyle = '#8e8877'
  g.lineWidth = 1.4
  g.strokeRect(frame.x, frame.y, frame.w, frame.h)
  g.lineWidth = 0.6
  g.strokeRect(frame.x + 5, frame.y + 5, frame.w - 10, frame.h - 10)

  // 坡度底图
  if (dem && opts.showSlope !== false) {
    const off = document.createElement('canvas')
    off.width = dem.nx
    off.height = dem.ny
    const og = off.getContext('2d')
    const img = og.createImageData(dem.nx, dem.ny)
    const rgb = SLOPE_CLASSES.map((s) => {
      const h = s.color.replace('#', '')
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
    })
    for (let k = 0; k < dem.nx * dem.ny; k++) {
      const s = dem.slope[k]
      const idx = s < 5 ? 0 : s < 15 ? 1 : s < 25 ? 2 : 3
      const [r, gg, bb] = rgb[idx]
      const o = k * 4
      img.data[o] = r
      img.data[o + 1] = gg
      img.data[o + 2] = bb
      img.data[o + 3] = 70
    }
    const flip = og.createImageData(dem.nx, dem.ny)
    for (let j = 0; j < dem.ny; j++) {
      const src = (dem.ny - 1 - j) * dem.nx * 4
      flip.data.set(img.data.subarray(src, src + dem.nx * 4), j * dem.nx * 4)
    }
    og.putImageData(flip, 0, 0)
    g.drawImage(off, X(dem.minX), Y(dem.minY + (dem.ny - 1) * dem.cell), (dem.nx - 1) * dem.cell * scale, (dem.ny - 1) * dem.cell * scale)
  }

  // 等高线
  const interval = survey.interval || 5
  const idxEvery = Math.max(1, Math.round(25 / interval))
  g.lineCap = 'round'
  for (const c of survey.contours) {
    const k = Math.round(c.level / interval)
    const isIndex = k % idxEvery === 0
    g.strokeStyle = isIndex ? '#8a6836' : '#c3a67a'
    g.lineWidth = isIndex ? 1.5 : 0.7
    g.beginPath()
    c.points.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))))
    if (c.closed) g.closePath()
    g.stroke()
  }

  // 图斑
  for (const p of patches) {
    if (filterWatershed && p.watershedId !== filterWatershed) continue
    const lt = LAND_TYPES[p.landType]
    g.save()
    g.beginPath()
    p.points.forEach((q, i) => (i ? g.lineTo(X(q[0]), Y(q[1])) : g.moveTo(X(q[0]), Y(q[1]))))
    g.closePath()
    g.fillStyle = `${lt.color}30`
    g.fill()
    g.strokeStyle = lt.color
    g.lineWidth = 1.3
    g.setLineDash([6, 3])
    g.stroke()
    g.restore()
    if (opts.showPatchLabels !== false) {
      const c = polygonCentroid(p.points)
      const bb = bbox(p.points)
      g.font = '600 11px "Microsoft YaHei", sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      const txt = p.name
      const tw = g.measureText(txt).width + 10
      const px = X(c[0])
      const py = Y(bb.maxY) + 14
      g.fillStyle = 'rgba(255,253,247,0.9)'
      g.fillRect(px - tw / 2, py - 9, tw, 18)
      g.fillStyle = '#4a463a'
      g.fillText(txt, px, py)
    }
  }

  // 措施（按类型编号）
  const seqByType = {}
  for (const m of measures) seqByType[m.type] = (seqByType[m.type] || 0) + 1
  const seqMap = new Map()
  const counters = {}
  for (const m of measures) {
    counters[m.type] = (counters[m.type] || 0) + 1
    seqMap.set(m.id, counters[m.type])
  }
  for (const m of measures) {
    if (filterWatershed && m.watershedId !== filterWatershed) continue
    const t = MEASURE_TYPES[m.type]
    if (t.shape === 'area') {
      const pts = m.shape.kind === 'rect' ? rectCorners(m.shape.center, m.shape.angle, m.shape.L, m.shape.W) : m.shape.points
      g.save()
      g.beginPath()
      pts.forEach((q, i) => (i ? g.lineTo(X(q[0]), Y(q[1])) : g.moveTo(X(q[0]), Y(q[1]))))
      g.closePath()
      g.fillStyle = `${t.color}2c`
      g.fill()
      g.strokeStyle = t.color
      g.lineWidth = 1.9
      g.stroke()
      g.clip()
      if (m.type === 'terrace') {
        g.strokeStyle = '#a46e2a'
        g.lineWidth = 0.9
        const W = m.shape.W
        const L = m.shape.L
        const a = m.shape.angle
        const n = Math.max(3, Math.min(16, Math.round(W / (m.params.benchW * 1.6))))
        for (let k = 1; k < n; k++) {
          const off = -W / 2 + (W * k) / n
          const cx = m.shape.center[0] - Math.sin(a) * off
          const cy = m.shape.center[1] + Math.cos(a) * off
          g.beginPath()
          g.moveTo(X(cx - Math.cos(a) * L / 2), Y(cy - Math.sin(a) * L / 2))
          g.lineTo(X(cx + Math.cos(a) * L / 2), Y(cy + Math.sin(a) * L / 2))
          g.stroke()
        }
      } else if (m.type === 'fishpit' || m.type === 'forest') {
        const sp = Math.max(4, (m.params.rowSpacing || 3) * 1.5)
        const bb = bbox(pts)
        g.fillStyle = m.type === 'fishpit' ? '#4f6b2c' : '#2f5236'
        for (let y = bb.minY; y <= bb.maxY; y += sp) {
          for (let x = bb.minX; x <= bb.maxX; x += sp) {
            let inside = false
            for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
              const [xi, yi] = pts[i]
              const [xj, yj] = pts[j]
              if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
            }
            if (!inside) continue
            g.beginPath()
            g.arc(X(x), Y(y), 1.5, 0, Math.PI * 2)
            g.fill()
          }
        }
      }
      g.restore()
      // 编号
      const c = m.shape.kind === 'rect' ? m.shape.center : polygonCentroid(pts)
      g.font = '600 10px "Microsoft YaHei", sans-serif'
      const label = `${MEASURE_TYPES[m.type].short}-${seqMap.get(m.id)}`
      g.fillStyle = 'rgba(255,253,246,0.92)'
      const tw = g.measureText(label).width + 8
      g.fillRect(X(c[0]) - tw / 2, Y(c[1]) - 8, tw, 15)
      g.fillStyle = '#3d3a2f'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(label, X(c[0]), Y(c[1]))
    } else if (t.shape === 'line') {
      g.strokeStyle = t.color
      g.lineWidth = 3
      g.beginPath()
      m.shape.points.forEach((q, i) => (i ? g.lineTo(X(q[0]), Y(q[1])) : g.moveTo(X(q[0]), Y(q[1]))))
      g.stroke()
    } else if (t.shape === 'point') {
      const [px, py] = [X(m.shape.center[0]), Y(m.shape.center[1])]
      g.save()
      g.translate(px, py)
      g.rotate(-(m.shape.angle || 0))
      g.fillStyle = '#8a6a48'
      g.strokeStyle = '#4c3928'
      g.lineWidth = 1.2
      const w = 14
      g.beginPath()
      g.moveTo(-w / 2, -6)
      g.lineTo(w / 2, -6)
      g.lineTo(w / 2 + 5, 6)
      g.lineTo(-w / 2 - 5, 6)
      g.closePath()
      g.fill()
      g.stroke()
      g.restore()
      g.font = '600 10px "Microsoft YaHei", sans-serif'
      g.fillStyle = '#4c3928'
      g.textAlign = 'center'
      g.textBaseline = 'bottom'
      g.fillText('谷坊', px, py - 10)
    }
  }

  // 小流域边界
  for (const w of wsList) {
    g.save()
    g.setLineDash([10, 6])
    g.strokeStyle = '#33527f'
    g.lineWidth = 2.2
    g.beginPath()
    w.points.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))))
    g.closePath()
    g.stroke()
    g.restore()
    const c = polygonCentroid(w.points)
    const bb = bbox(w.points)
    g.font = '700 13px "Microsoft YaHei", sans-serif'
    g.fillStyle = '#33527f'
    g.textAlign = 'center'
    g.textBaseline = 'bottom'
    g.fillText(w.name, X(c[0]), Y(bb.maxY) - 6)
  }

  // 指北针 + 比例尺
  drawNorthArrow(g, width - 92, 96)
  drawScale(g, frame.x + 18, frame.y + frame.h - 22, scale)

  // 眉题
  g.fillStyle = '#2f2c24'
  g.textAlign = 'left'
  g.textBaseline = 'alphabetic'
  g.font = '700 19px "Microsoft YaHei", sans-serif'
  g.fillText(title, frame.x, 38)
  g.font = '11.5px "Microsoft YaHei", sans-serif'
  g.fillStyle = '#6a6353'
  g.fillText(subtitle, frame.x, 55)

  // 图例
  const lx = frame.x + 14
  const ly = frame.y + 18
  g.font = '600 12px "Microsoft YaHei", sans-serif'
  const legendW = 214
  const legendH = 26 + 4 * 18 + 10 + 5 * 18 + 18 + 10
  g.fillStyle = 'rgba(255,253,247,0.93)'
  g.strokeStyle = '#cfc8b8'
  g.lineWidth = 1
  g.beginPath()
  g.rect(lx, ly, legendW, legendH)
  g.fill()
  g.stroke()
  g.fillStyle = '#2f2c24'
  g.textAlign = 'left'
  g.fillText('图 例', lx + 12, ly + 22)
  g.font = '11px "Microsoft YaHei", sans-serif'
  let yy = ly + 42
  for (const c of SLOPE_CLASSES) {
    g.fillStyle = c.color
    g.fillRect(lx + 12, yy - 9, 22, 11)
    g.strokeStyle = 'rgba(0,0,0,0.18)'
    g.strokeRect(lx + 12, yy - 9, 22, 11)
    g.fillStyle = '#4a463a'
    g.fillText(`${c.label} ${c.name}`, lx + 42, yy)
    yy += 18
  }
  yy += 4
  for (const t of [MEASURE_TYPES.terrace, MEASURE_TYPES.fishpit, MEASURE_TYPES.forest, MEASURE_TYPES.ditch, MEASURE_TYPES.checkdam]) {
    if (t.id === 'checkdam') {
      g.fillStyle = '#8a6a48'
      g.beginPath()
      g.moveTo(lx + 14, yy - 10)
      g.lineTo(lx + 30, yy - 10)
      g.lineTo(lx + 33, yy)
      g.lineTo(lx + 11, yy)
      g.closePath()
      g.fill()
    } else if (t.id === 'ditch') {
      g.strokeStyle = t.color
      g.lineWidth = 2.5
      g.beginPath()
      g.moveTo(lx + 12, yy - 5)
      g.lineTo(lx + 34, yy - 5)
      g.stroke()
    } else {
      g.fillStyle = `${t.color}44`
      g.fillRect(lx + 12, yy - 10, 22, 11)
      g.strokeStyle = t.color
      g.lineWidth = 1.2
      g.strokeRect(lx + 12, yy - 10, 22, 11)
    }
    g.fillStyle = '#4a463a'
    g.fillText(t.name, lx + 42, yy)
    yy += 18
  }
  g.setLineDash([5, 3])
  g.strokeStyle = '#33527f'
  g.lineWidth = 1.6
  g.beginPath()
  g.moveTo(lx + 12, yy - 5)
  g.lineTo(lx + 34, yy - 5)
  g.stroke()
  g.setLineDash([])
  g.fillStyle = '#4a463a'
  g.fillText('小流域界线', lx + 42, yy)

  // 标题栏
  const tbH = 108
  const tbY = height - tbH - 24
  const tbX = width - 620
  g.strokeStyle = '#8e8877'
  g.lineWidth = 1.2
  g.strokeRect(tbX, tbY, 574, tbH)
  g.beginPath()
  g.moveTo(tbX, tbY + 34)
  g.lineTo(tbX + 574, tbY + 34)
  g.moveTo(tbX, tbY + 68)
  g.lineTo(tbX + 574, tbY + 68)
  g.moveTo(tbX + 300, tbY + 34)
  g.lineTo(tbX + 300, tbY + 108)
  g.stroke()
  g.font = '700 13px "Microsoft YaHei", sans-serif'
  g.fillStyle = '#2f2c24'
  g.fillText(opts.projectName || '坡面治理措施布设平面图', tbX + 14, tbY + 22)
  g.font = '11px "Microsoft YaHei", sans-serif'
  g.fillStyle = '#4a463a'
  g.fillText(`比例尺 ${scaleText}`, tbX + 14, tbY + 56)
  g.fillText(`高程系统 1985 国家高程基准`, tbX + 310, tbY + 56)
  g.fillText(`绘制 ${opts.when || ''}`, tbX + 14, tbY + 90)
  g.fillText(`${opts.station || '县水土保持站'}`, tbX + 310, tbY + 90)

  return { scale, box: frame }
}

function drawNorthArrow(g, x, y) {
  g.save()
  g.fillStyle = 'rgba(255,253,247,0.92)'
  g.strokeStyle = '#9c9280'
  g.lineWidth = 1
  g.beginPath()
  g.arc(x, y, 22, 0, Math.PI * 2)
  g.fill()
  g.stroke()
  g.fillStyle = '#3b372c'
  g.beginPath()
  g.moveTo(x, y - 15)
  g.lineTo(x + 6, y + 7)
  g.lineTo(x, y + 3)
  g.lineTo(x - 6, y + 7)
  g.closePath()
  g.fill()
  g.font = '700 10px "Microsoft YaHei", sans-serif'
  g.textAlign = 'center'
  g.fillText('N', x, y + 18)
  g.restore()
}

function niceDenominator(v) {
  const list = [200, 250, 300, 400, 500, 600, 750, 800, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000]
  let best = list[0]
  for (const d of list) if (Math.abs(d - v) < Math.abs(best - v)) best = d
  return best
}

function drawScale(g, x, y, scale) {
  const targetPx = 190
  const meters = targetPx / scale
  const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 300, 500, 1000, 2000]
  let pick = nice[0]
  for (const n of nice) if (n <= meters * 1.3) pick = n
  const px = pick * scale
  g.save()
  g.fillStyle = 'rgba(255,253,247,0.94)'
  g.fillRect(x - 10, y - 20, px + 30, 36)
  g.strokeStyle = '#3b372c'
  g.lineWidth = 1.6
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + px, y)
  g.moveTo(x, y - 6)
  g.lineTo(x, y + 6)
  g.moveTo(x + px, y - 6)
  g.lineTo(x + px, y + 6)
  g.stroke()
  g.fillStyle = '#3b372c'
  g.font = '11px "Microsoft YaHei", sans-serif'
  g.textAlign = 'center'
  g.fillText(pick >= 1000 ? `${pick / 1000} km` : `${pick} m`, x + px / 2, y + 20)
  g.restore()
}
