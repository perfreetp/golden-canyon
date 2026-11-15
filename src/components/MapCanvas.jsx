// 画布地图：等高线渲染、图斑勾绘、措施布设与编辑
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { bbox, polygonArea, polygonCentroid, rectCorners, pointInPolygon, simplifyRing, lineLength } from '../lib/geometry.js'
import { SLOPE_CLASSES, demAt, bilinearZ, slopeClassIndex } from '../lib/dem.js'
import { MEASURE_TYPES, LAND_TYPES, measureExtent, pointInMeasure } from '../lib/measures.js'
import { buildSnapIndex, nearestContour, nearestChannel } from '../lib/snap.js'
import { checkDamPlacement } from '../lib/validate.js'

const PAPER = '#f2eee3'
const CONTOUR_MINOR = '#c3a67a'
const CONTOUR_INDEX = '#8a6836'
const CHANNEL = '#3f7fa3'
const WATERSHED = '#3f6fa8'

const fmt = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—')

function usePatterns() {
  return useMemo(() => {
    const make = (color, draw) => {
      const c = document.createElement('canvas')
      c.width = 26
      c.height = 26
      const g = c.getContext('2d')
      g.strokeStyle = color
      g.fillStyle = color
      g.lineWidth = 1.1
      draw(g)
      return c
    }
    const out = {}
    for (const lt of Object.values(LAND_TYPES)) {
      if (lt.id === 'outlet') {
        out[lt.id] = make(lt.hatch, (g) => {
          for (let i = -26; i < 52; i += 9) {
            g.moveTo(i, 26)
            g.lineTo(i + 26, 0)
            g.stroke()
          }
        })
      } else if (lt.id === 'forest') {
        out[lt.id] = make(lt.hatch, (g) => {
          g.beginPath(); g.arc(9, 8, 3.4, 0, Math.PI * 2); g.fill()
          g.beginPath(); g.arc(20, 19, 3.4, 0, Math.PI * 2); g.fill()
          g.beginPath(); g.moveTo(9, 8); g.lineTo(9, 14); g.stroke()
        })
      } else if (lt.id === 'wasteGrass' || lt.id === 'shrub') {
        out[lt.id] = make(lt.hatch, (g) => {
          for (let i = 4; i < 26; i += 7) {
            g.beginPath(); g.moveTo(i, 20); g.quadraticCurveTo(i - 3, 14, i, 9); g.stroke()
            g.beginPath(); g.moveTo(i + 2, 20); g.quadraticCurveTo(i + 5, 14, i + 2, 9); g.stroke()
          }
        })
      } else {
        out[lt.id] = make(lt.hatch, (g) => {
          for (let i = -26; i < 52; i += 7) {
            g.moveTo(i, 0); g.lineTo(i + 26, 26); g.stroke()
          }
        })
      }
    }
    return out
  }, [])
}

// 生成坡度着色栅格（离屏）
function useSlopeRaster(dem, visible) {
  return useMemo(() => {
    if (!dem || !visible) return null
    const c = document.createElement('canvas')
    c.width = dem.nx
    c.height = dem.ny
    const g = c.getContext('2d')
    const img = g.createImageData(dem.nx, dem.ny)
    const rgb = SLOPE_CLASSES.map((s) => {
      const hex = s.color.replace('#', '')
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
    })
    for (let k = 0; k < dem.nx * dem.ny; k++) {
      const cls = slopeClassIndex(dem.slope[k])
      const [r, gg, b] = rgb[cls]
      const o = k * 4
      img.data[o] = r
      img.data[o + 1] = gg
      img.data[o + 2] = b
      img.data[o + 3] = 96
    }
    // ImageData 行序：y 向下，地图 y 向上 -> 翻转
    const flipped = g.createImageData(dem.nx, dem.ny)
    for (let j = 0; j < dem.ny; j++) {
      const src = (dem.ny - 1 - j) * dem.nx * 4
      flipped.data.set(img.data.subarray(src, src + dem.nx * 4), j * dem.nx * 4)
    }
    g.putImageData(flipped, 0, 0)
    return c
  }, [dem, visible])
}

export default function MapCanvas({
  survey,
  dem,
  watersheds,
  patches,
  measures,
  issues,
  activeWatershedId,
  tool,
  drawKind,
  pendingMeasure,
  onAddWatershed,
  onAddPatch,
  onPlaceMeasure,
  onUpdateMeasure,
  onSelect,
  selection,
  showSlope,
  showLabels,
  showPatches,
  onHover,
  notify,
  canEdit,
  fitToken,
}) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [view, setView] = useState({ cx: 800, cy: 600, scale: 0.52 })
  const [cursor, setCursor] = useState(null)
  const [draft, setDraft] = useState(null) // {kind, points, current}
  const [ghost, setGhost] = useState(null)
  const dragRef = useRef(null)
  const patterns = usePatterns()
  const slopeRaster = useSlopeRaster(dem, showSlope)
  const snapIndex = useMemo(() => (survey ? buildSnapIndex(survey) : null), [survey])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ w: Math.max(200, r.width), h: Math.max(200, r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const toScreen = useCallback(
    (p) => [(p[0] - view.cx) * view.scale + size.w / 2, size.h / 2 - (p[1] - view.cy) * view.scale],
    [view, size],
  )
  const toMap = useCallback(
    (sx, sy) => [(sx - size.w / 2) / view.scale + view.cx, view.cy - (sy - size.h / 2) / view.scale],
    [view, size],
  )

  const issueFor = useCallback(
    (measureId) => issues.filter((i) => i.measureId === measureId || i.measureId2 === measureId),
    [issues],
  )

  // ---------- 绘制 ----------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !survey) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    const g = canvas.getContext('2d')
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, size.w, size.h)
    g.fillStyle = PAPER
    g.fillRect(0, 0, size.w, size.h)

    const sx = (p) => toScreen(p)
    const sc = view.scale
    const viewBox = {
      minX: view.cx - size.w / 2 / sc,
      maxX: view.cx + size.w / 2 / sc,
      minY: view.cy - size.h / 2 / sc,
      maxY: view.cy + size.h / 2 / sc,
    }
    const visible = (b) => !(b.maxX < viewBox.minX || b.minX > viewBox.maxX || b.maxY < viewBox.minY || b.minY > viewBox.maxY)

    // 坡度着色
    if (slopeRaster && dem) {
      g.save()
      g.globalAlpha = 1
      g.imageSmoothingEnabled = true
      const [x0, y0] = sx([dem.minX, dem.minY + (dem.ny - 1) * dem.cell])
      const [x1, y1] = sx([dem.minX + (dem.nx - 1) * dem.cell, dem.minY])
      g.drawImage(slopeRaster, x0, y0, x1 - x0, y1 - y0)
      g.restore()
    }

    // 等高线
    const interval = survey.interval || 5
    const idxEvery = Math.max(1, Math.round(25 / interval))
    g.lineCap = 'round'
    for (const c of survey.contours) {
      const bb = bbox(c.points)
      if (!visible(bb)) continue
      const k = Math.round(c.level / interval)
      const isIndex = k % idxEvery === 0
      g.strokeStyle = isIndex ? CONTOUR_INDEX : CONTOUR_MINOR
      g.lineWidth = isIndex ? 1.6 : 0.85
      g.globalAlpha = isIndex ? 0.92 : 0.62
      g.beginPath()
      for (let i = 0; i < c.points.length; i++) {
        const [px, py] = sx(c.points[i])
        if (i === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      if (c.closed && c.points.length > 2) {
        const [px, py] = sx(c.points[0])
        g.lineTo(px, py)
      }
      g.stroke()
    }
    g.globalAlpha = 1

    // 计曲线高程注记
    if (showLabels && sc > 0.5) {
      g.font = '600 10px "Segoe UI", system-ui, sans-serif'
      g.fillStyle = '#6b4f26'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      const placed = []
      for (const c of survey.contours) {
        const k = Math.round(c.level / interval)
        if (k % idxEvery !== 0) continue
        const bb = bbox(c.points)
        if (!visible(bb)) continue
        if (Math.max(bb.w, bb.h) < 140) continue
        const p = c.points[Math.floor(c.points.length / 2)]
        if (!p) continue
        const [px, py] = sx(p)
        if (px < 26 || px > size.w - 26 || py < 16 || py > size.h - 16) continue
        if (placed.some((q) => Math.hypot(q[0] - px, q[1] - py) < 150)) continue
        placed.push([px, py])
        const txt = `${c.level}`
        const w = g.measureText(txt).width + 8
        g.save()
        g.fillStyle = 'rgba(242,238,227,0.9)'
        g.fillRect(px - w / 2, py - 7, w, 14)
        g.fillStyle = '#6b4f26'
        g.fillText(txt, px, py)
        g.restore()
      }
    }

    // 高程点
    if (showLabels && sc > 0.7) {
      g.font = '10px "Segoe UI", system-ui, sans-serif'
      for (const s of survey.spotHeights || []) {
        const [px, py] = sx([s[0], s[1]])
        if (px < 0 || px > size.w || py < 0 || py > size.h) continue
        g.fillStyle = '#5f6b5a'
        g.beginPath()
        g.arc(px, py, 2, 0, Math.PI * 2)
        g.fill()
        g.textAlign = 'left'
        g.textBaseline = 'middle'
        g.fillText(`${s[2].toFixed(1)}`, px + 5, py - 6)
      }
    }

    // 沟道
    for (const ch of survey.channels || []) {
      if (!ch.points?.length) continue
      g.strokeStyle = CHANNEL
      g.lineWidth = Math.max(1.6, 3.2 * sc)
      g.globalAlpha = 0.9
      g.beginPath()
      ch.points.forEach((p, i) => {
        const [px, py] = sx(p)
        if (i === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      })
      g.stroke()
      g.globalAlpha = 1
      if (showLabels && sc > 0.4) {
        const mid = ch.points[Math.floor(ch.points.length / 2)]
        const [px, py] = sx(mid)
        g.font = 'italic 500 10.5px "Segoe UI", system-ui, sans-serif'
        g.fillStyle = 'rgba(35,90,120,0.95)'
        g.textAlign = 'left'
        g.textBaseline = 'bottom'
        g.fillText(ch.name, px + 6, py - 4)
      }
    }

    // 小流域边界
    for (const w of watersheds) {
      const bb = bbox(w.points)
      if (!visible(bb)) continue
      const active = w.id === activeWatershedId
      g.save()
      g.setLineDash([7, 5])
      g.strokeStyle = WATERSHED
      g.lineWidth = active ? 2.6 : 1.6
      g.globalAlpha = active ? 0.95 : 0.55
      g.beginPath()
      w.points.forEach((p, i) => {
        const [px, py] = sx(p)
        if (i === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      })
      const [px, py] = sx(w.points[0])
      g.lineTo(px, py)
      g.stroke()
      g.restore()
      if (showLabels) {
        const c = polygonCentroid(w.points)
        const [px, py] = sx([c[0], bb.maxY])
        g.font = '700 12px "Segoe UI", system-ui, sans-serif'
        g.fillStyle = active ? '#33527f' : 'rgba(51,82,127,0.7)'
        g.textAlign = 'center'
        g.textBaseline = 'bottom'
        g.fillText(w.name, px, py - 8)
      }
    }

    // 图斑
    if (showPatches) {
      for (const p of patches) {
        const bb = bbox(p.points)
        if (!visible(bb)) continue
        const lt = LAND_TYPES[p.landType] || LAND_TYPES.slopeFarm
        const sel = selection?.kind === 'patch' && selection.id === p.id
        g.save()
        g.fillStyle = `${lt.color}33`
        g.beginPath()
        p.points.forEach((q, i) => {
          const [px, py] = sx(q)
          if (i === 0) g.moveTo(px, py)
          else g.lineTo(px, py)
        })
        g.closePath()
        g.fill()
        const pat = patterns[lt.id]
        if (pat && sc > 0.28) {
          const ctxPattern = g.createPattern(pat, 'repeat')
          g.fillStyle = ctxPattern
          g.globalAlpha = 0.55
          g.fill()
          g.globalAlpha = 1
        }
        g.strokeStyle = sel ? '#d4762a' : lt.color
        g.lineWidth = sel ? 2.6 : 1.4
        g.stroke()
        if (showLabels) {
          const c = polygonCentroid(p.points)
          const [cx, cy] = sx(c)
          const [tx0, ty0] = sx([bb.minX, bb.maxY])
          const [tx1] = sx([bb.maxX, bb.minY])
          const px = (tx0 + tx1) / 2
          const py = ty0 + 12
          g.font = '600 11px "Segoe UI", system-ui, sans-serif'
          g.textAlign = 'center'
          g.textBaseline = 'middle'
          const txt = p.name
          const tw = g.measureText(txt).width + 10
          g.fillStyle = 'rgba(255,253,246,0.9)'
          g.fillRect(px - tw / 2, py - 9, tw, 18)
          g.fillStyle = '#3d3a2f'
          g.fillText(txt, px, py)
          if (sc > 0.45) {
            g.font = '10px "Segoe UI", system-ui, sans-serif'
            g.fillStyle = '#6a6353'
            const sub = `${lt.name} · ${fmt(polygonArea(p.points) / 10000, 2)} hm²`
            const sw = g.measureText(sub).width + 8
            g.fillStyle = 'rgba(255,253,246,0.78)'
            g.fillRect(px - sw / 2, py + 9, sw, 14)
            g.fillStyle = '#6a6353'
            g.fillText(sub, px, py + 16)
          }
        }
        g.restore()
      }
    }

    // 措施
    for (const m of measures) {
      const ext = measureExtent(m)
      if (!ext.length) continue
      const bb = bbox(ext)
      if (!visible(bb)) continue
      const type = MEASURE_TYPES[m.type]
      const errs = issueFor(m.id)
      const hasErr = errs.some((e) => e.level === 'error')
      const sel = selection?.kind === 'measure' && selection.id === m.id
      g.save()
      if (type.shape === 'area') {
        let pts = ext
        if (m.type === 'terrace') pts = rectCorners(m.shape.center, m.shape.angle, m.shape.L, m.shape.W)
        g.beginPath()
        pts.forEach((q, i) => {
          const [px, py] = sx(q)
          if (i === 0) g.moveTo(px, py)
          else g.lineTo(px, py)
        })
        g.closePath()
        // 先用浅底压住图斑底纹，再叠措施底色，保证埂线/坑点可读
        g.fillStyle = 'rgba(250,247,239,0.72)'
        g.fill()
        g.fillStyle = hasErr ? 'rgba(200,60,40,0.26)' : `${type.color}40`
        g.fill()
        g.strokeStyle = hasErr ? '#c02f24' : sel ? '#1f5f8b' : type.color
        g.lineWidth = sel ? 2.6 : hasErr ? 2.2 : 1.2
        if (hasErr) g.setLineDash([6, 4])
        g.stroke()
        g.setLineDash([])
        // 类型纹样
        g.globalAlpha = 0.55
        if (m.type === 'terrace') {
          const a = m.shape.angle
          const W = m.shape.W
          const L = m.shape.L
          const n = Math.max(2, Math.min(14, Math.round(W / Math.max(3, m.params.benchW * 1.4))))
          g.strokeStyle = 'rgba(122,74,18,0.85)'
          g.lineWidth = 1.15
          for (let k = 1; k < n; k++) {
            const off = -W / 2 + (W * k) / n
            const c = m.shape.center
            const nx = -Math.sin(a) * off
            const ny = Math.cos(a) * off
            const p1 = [c[0] + nx - Math.cos(a) * L / 2, c[1] + ny - Math.sin(a) * L / 2]
            const p2 = [c[0] + nx + Math.cos(a) * L / 2, c[1] + ny + Math.sin(a) * L / 2]
            const [ax, ay] = sx(p1)
            const [bx, by] = sx(p2)
            g.beginPath()
            g.moveTo(ax, ay)
            g.lineTo(bx, by)
            g.stroke()
          }
        } else if (m.type === 'fishpit') {
          const sp = Math.max(16 / sc, m.params.rowSpacing * 2)
          const bb2 = bbox(ext)
          g.fillStyle = 'rgba(63,88,36,0.9)'
          const path = new Path2D()
          for (let y = bb2.minY + sp / 2; y < bb2.maxY; y += sp) {
            for (let x = bb2.minX + sp / 2; x < bb2.maxX; x += sp) {
              if (!pointInPolygon([x, y], ext)) continue
              const [px, py] = sx([x, y])
              if (px < -5 || py < -5 || px > size.w + 5 || py > size.h + 5) continue
              path.moveTo(px + 1.7, py)
              path.arc(px, py, 1.7, 0, Math.PI * 2)
            }
          }
          g.fill(path)
        } else if (m.type === 'forest') {
          const sp = Math.max(18 / sc, m.params.rowSpacing * 2.2)
          const bb2 = bbox(ext)
          g.strokeStyle = '#2f5236'
          g.lineWidth = 1
          const path = new Path2D()
          for (let y = bb2.minY + sp / 2; y < bb2.maxY; y += sp) {
            for (let x = bb2.minX + sp / 2; x < bb2.maxX; x += sp) {
              if (!pointInPolygon([x, y], ext)) continue
              const [px, py] = sx([x, y])
              if (px < -5 || py < -5 || px > size.w + 5 || py > size.h + 5) continue
              path.moveTo(px + 2.1, py)
              path.arc(px, py, 2.1, 0, Math.PI * 2)
            }
          }
          g.stroke(path)
        } else if (m.type === 'grass') {
          const sp = Math.max(14 / sc, 36)
          const bb2 = bbox(ext)
          g.strokeStyle = '#5c7637'
          g.lineWidth = 1
          const path = new Path2D()
          for (let y = bb2.minY + sp / 2; y < bb2.maxY; y += sp) {
            for (let x = bb2.minX + sp / 2; x < bb2.maxX; x += sp) {
              if (!pointInPolygon([x, y], ext)) continue
              const [px, py] = sx([x, y])
              if (px < -5 || py < -5 || px > size.w + 5 || py > size.h + 5) continue
              path.moveTo(px, py)
              path.lineTo(px - 2, py - 5)
              path.moveTo(px, py)
              path.lineTo(px + 1.5, py - 5.5)
            }
          }
          g.stroke(path)
        }
        g.globalAlpha = 1
        // 标注
        if (showLabels) {
          const c = m.shape.center
          const [px, py] = sx(c)
          g.font = '600 10.5px "Segoe UI", system-ui, sans-serif'
          g.textAlign = 'center'
          g.textBaseline = 'middle'
          const txt = `${type.short}`
          const tw = g.measureText(txt).width + 10
          g.fillStyle = hasErr ? 'rgba(192,47,36,0.92)' : 'rgba(255,253,246,0.92)'
          g.fillRect(px - tw / 2, py - 8, tw, 16)
          g.fillStyle = hasErr ? '#fff' : '#4a4335'
          g.fillText(txt, px, py)
        }
      } else if (type.shape === 'line') {
        const pts = m.shape.points
        g.strokeStyle = hasErr ? '#c02f24' : sel ? '#1f5f8b' : type.color
        g.lineWidth = sel ? 4 : 2.6
        g.beginPath()
        pts.forEach((q, i) => {
          const [px, py] = sx(q)
          if (i === 0) g.moveTo(px, py)
          else g.lineTo(px, py)
        })
        g.stroke()
        // 方向箭头
        g.fillStyle = g.strokeStyle
        for (let i = 1; i < pts.length; i++) {
          const [ax, ay] = sx(pts[i - 1])
          const [bx, by] = sx(pts[i])
          const ang = Math.atan2(by - ay, bx - ax)
          const midx = (ax + bx) / 2
          const midy = (ay + by) / 2
          g.beginPath()
          g.moveTo(midx + Math.cos(ang) * 5, midy + Math.sin(ang) * 5)
          g.lineTo(midx + Math.cos(ang + 2.5) * 5, midy + Math.sin(ang + 2.5) * 5)
          g.lineTo(midx + Math.cos(ang - 2.5) * 5, midy + Math.sin(ang - 2.5) * 5)
          g.fill()
        }
        if (showLabels) {
          const mid = pts[Math.floor(pts.length / 2)]
          const [px, py] = sx(mid)
          g.font = '600 10px "Segoe UI", system-ui, sans-serif'
          g.fillStyle = '#1f5f5f'
          g.textAlign = 'left'
          g.fillText('截水沟', px + 8, py - 8)
        }
      } else if (type.shape === 'point') {
        const c = m.shape.center
        const [px, py] = sx(c)
        const gw = m.params.gullyW || 6
        const wpx = gw * sc
        const ang = m.shape.angle || 0
        g.save()
        g.translate(px, py)
        g.rotate(-ang)
        const w = Math.max(7, wpx)
        g.fillStyle = hasErr ? 'rgba(192,47,36,0.85)' : sel ? '#2c6f96' : '#8a6a48'
        g.beginPath()
        g.moveTo(-w / 2, -5)
        g.lineTo(w / 2, -5)
        g.lineTo(w / 2 + 4, 5)
        g.lineTo(-w / 2 - 4, 5)
        g.closePath()
        g.fill()
        g.strokeStyle = '#4c3928'
        g.lineWidth = 1
        g.stroke()
        g.restore()
        if (showLabels) {
          g.font = '600 10px "Segoe UI", system-ui, sans-serif'
          g.fillStyle = '#4c3928'
          g.textAlign = 'left'
          g.textBaseline = 'middle'
          g.fillText(`谷坊 H${w ? '' : ''}${m.params.damH}m`, px + 8, py - 9)
        }
      }
      if (sel && canEdit) drawHandles(g, m, sx, sc)
      g.restore()
    }

    // 绘制中的多边形
    if (draft && draft.points.length) {
      g.save()
      g.strokeStyle = draft.kind === 'watershed' ? WATERSHED : '#d4762a'
      g.lineWidth = 2
      g.setLineDash([5, 4])
      g.beginPath()
      draft.points.forEach((p, i) => {
        const [px, py] = sx(p)
        if (i === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      })
      if (draft.current) {
        const [px, py] = sx(draft.current)
        g.lineTo(px, py)
      }
      g.stroke()
      g.setLineDash([])
      g.fillStyle = draft.kind === 'watershed' ? 'rgba(63,111,168,0.12)' : 'rgba(212,118,42,0.12)'
      g.beginPath()
      draft.points.forEach((p, i) => {
        const [px, py] = sx(p)
        if (i === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      })
      g.fill()
      for (const p of draft.points) {
        const [px, py] = sx(p)
        g.fillStyle = '#fff'
        g.beginPath()
        g.arc(px, py, 3.4, 0, Math.PI * 2)
        g.fill()
        g.strokeStyle = '#b35a1f'
        g.lineWidth = 1.2
        g.stroke()
      }
      if (draft.points.length >= 2) {
        const pts = draft.points
        const a = polygonArea(pts)
        const c = polygonCentroid(pts)
        const [px, py] = sx(c)
        g.font = '600 11px "Segoe UI", system-ui, sans-serif'
        g.fillStyle = 'rgba(255,255,255,0.9)'
        const txt = `${fmt(a)} m² (${fmt(a / 10000, 2)} hm²)`
        const tw = g.measureText(txt).width + 10
        g.fillRect(px - tw / 2, py - 10, tw, 20)
        g.fillStyle = '#7a4420'
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillText(txt, px, py)
      }
      g.restore()
    }

    // 放置预览
    if (ghost && pendingMeasure) {
      g.save()
      g.globalAlpha = 0.85
      const type = MEASURE_TYPES[pendingMeasure.type]
      if (ghost.ext && ghost.ext.length) {
        g.strokeStyle = '#1d7a5f'
        g.fillStyle = 'rgba(29,122,95,0.14)'
        g.lineWidth = 2
        g.setLineDash([6, 3])
        g.beginPath()
        ghost.ext.forEach((q, i) => {
          const [px, py] = sx(q)
          if (i === 0) g.moveTo(px, py)
          else g.lineTo(px, py)
        })
        if (type.shape === 'area') g.closePath()
        g.fill()
        g.stroke()
        g.setLineDash([])
      }
      if (ghost.circle) {
        const [px, py] = sx(ghost.circle.point)
        g.strokeStyle = ghost.ok === false ? '#c02f24' : '#1d7a5f'
        g.lineWidth = 2
        g.beginPath()
        g.arc(px, py, Math.max(6, (ghost.circle.r || 5) * sc), 0, Math.PI * 2)
        g.stroke()
      }
      if (ghost.label) {
        const [px, py] = sx(ghost.label.at)
        g.font = '600 11px "Segoe UI", system-ui, sans-serif'
        const tw = g.measureText(ghost.label.text).width + 12
        g.fillStyle = ghost.label.bad ? 'rgba(192,47,36,0.94)' : 'rgba(24,90,72,0.94)'
        g.fillRect(px - tw / 2, py - 22, tw, 20)
        g.fillStyle = '#fff'
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillText(ghost.label.text, px, py - 12)
      }
      g.restore()
    }

    // 比例尺 / 指北针
    drawScaleBar(g, view, size)
    drawNorth(g, { w: 0, h: 0 })

    // 底部坐标读数
    if (cursor) {
      g.save()
      g.fillStyle = 'rgba(40,38,32,0.82)'
      g.fillRect(10, size.h - 82, 340, 22)
      g.font = '11px "Segoe UI", system-ui, sans-serif'
      g.fillStyle = '#f6f2e7'
      g.textAlign = 'left'
      g.textBaseline = 'middle'
      const z = dem ? bilinearZ(dem, cursor[0], cursor[1]) : NaN
      const s = dem ? demAt(dem, cursor[0], cursor[1]).slope : NaN
      g.fillText(`X ${cursor[0].toFixed(1)}  Y ${cursor[1].toFixed(1)}   高程 ${fmt(z, 1)} m   坡度 ${fmt(s, 1)}°`, 18, size.h - 71)
      g.restore()
    }
  }, [survey, dem, watersheds, patches, measures, issues, activeWatershedId, selection, size, view, draft, ghost, slopeRaster, patterns, showSlope, showLabels, showPatches, cursor, pendingMeasure, canEdit, toScreen, issueFor])

  // ---------- 指针交互 ----------
  const hitTest = useCallback(
    (mapp) => {
      const tol = 8 / view.scale
      // 先测编辑手柄
      if (canEdit && selection?.kind === 'measure') {
        const m = measures.find((x) => x.id === selection.id)
        if (m) {
          const h = handlesFor(m)
          for (const hd of h) {
            if (Math.hypot(hd.point[0] - mapp[0], hd.point[1] - mapp[1]) <= tol * 1.6) return { kind: 'handle', handle: hd, measure: m }
          }
        }
      }
      for (let i = measures.length - 1; i >= 0; i--) {
        const m = measures[i]
        if (pointInMeasure(m, mapp)) return { kind: 'measure', id: m.id, measure: m }
      }
      for (let i = patches.length - 1; i >= 0; i--) {
        if (pointInPolygon(mapp, patches[i].points)) return { kind: 'patch', id: patches[i].id, patch: patches[i] }
      }
      return null
    },
    [measures, patches, view.scale, canEdit, selection],
  )

  const handlesFor = (m) => {
    const a = m.shape.kind === 'point' ? m.shape.angle || 0 : m.shape.angle || 0
    if (m.shape.kind === 'rect') {
      const c = m.shape.center
      const L = m.shape.L
      const W = m.shape.W
      const corners = rectCorners(c, a, L, W)
      const list = corners.map((p, i) => ({ type: 'corner', idx: i, point: p }))
      const topMid = [(corners[0][0] + corners[1][0]) / 2, (corners[0][1] + corners[1][1]) / 2]
      const nx = Math.cos(a)
      const ny = Math.sin(a)
      list.push({ type: 'rotate', point: [topMid[0] + nx * (16 / view.scale), topMid[1] + ny * (16 / view.scale)] })
      list.push({ type: 'move', point: c })
      return list
    }
    if (m.shape.kind === 'line') {
      return [
        { type: 'lineEnd', idx: 0, point: m.shape.points[0] },
        { type: 'lineEnd', idx: m.shape.points.length - 1, point: m.shape.points[m.shape.points.length - 1] },
        { type: 'move', point: midpoint(m.shape.points) },
      ]
    }
    if (m.shape.kind === 'point') {
      return [{ type: 'move', point: m.shape.center }]
    }
    return []
  }

  const onPointerDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const sp = [e.clientX - rect.left, e.clientY - rect.top]
    const mp = toMap(sp[0], sp[1])
    canvasRef.current.setPointerCapture?.(e.pointerId)
    if (e.button === 1 || e.altKey) {
      dragRef.current = { kind: 'pan', start: sp, view: { ...view } }
      return
    }
    // 布设模式：不命中已有措施，避免误拖动；按住左键可平移
    if (tool === 'place') {
      dragRef.current = { kind: 'pan', start: sp, view: { ...view }, spawnedAt: Date.now() }
      return
    }
    // 绘制模式
    if (tool === 'draw-watershed' || tool === 'draw-patch') {
      const kind = tool === 'draw-watershed' ? 'watershed' : 'patch'
      const snap = nearestContour(snapIndex, mp, 18 / view.scale)
      const p = snap && snap.d < 10 / view.scale ? snap.point : mp
      if (!draft || draft.kind !== kind) {
        setDraft({ kind, points: [p], current: null })
        return
      }
      // 闭合判断
      if (draft.points.length >= 3) {
        const firstS = toScreen(draft.points[0])
        if (Math.hypot(firstS[0] - sp[0], firstS[1] - sp[1]) < 12) {
          finishDraft()
          return
        }
      }
      setDraft({ ...draft, points: [...draft.points, p] })
      return
    }
    const hit = hitTest(mp)
    if (hit?.kind === 'handle' && canEdit) {
      const m = hit.measure
      const started = { ...shapeClone(m.shape) }
      dragRef.current =
        hit.handle.type === 'rotate'
          ? { kind: 'rotate', id: m.id, start: mp, baseAngle: started.angle, started }
          : hit.handle.type === 'corner'
            ? { kind: 'corner', id: m.id, idx: hit.handle.idx, start: mp, started }
            : hit.handle.type === 'lineEnd'
              ? { kind: 'lineEnd', id: m.id, idx: hit.handle.idx, start: mp, started }
              : { kind: 'moveMeasure', id: m.id, start: mp, started }
      onSelect({ kind: 'measure', id: m.id })
      return
    }
    if (hit?.kind === 'measure') {
      onSelect({ kind: 'measure', id: hit.id })
      if (canEdit) {
        dragRef.current = { kind: 'moveMeasure', id: hit.id, start: mp, started: shapeClone(hit.measure.shape), moved: false }
      }
      return
    }
    if (hit?.kind === 'patch') {
      onSelect({ kind: 'patch', id: hit.id })
      dragRef.current = { kind: 'pan', start: sp, view: { ...view } }
      return
    }
    onSelect(null)
    dragRef.current = { kind: 'pan', start: sp, view: { ...view } }
  }

  const onPointerMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const sp = [e.clientX - rect.left, e.clientY - rect.top]
    const mp = toMap(sp[0], sp[1])
    setCursor(mp)
    onHover?.(mp)

    const drag = dragRef.current
    if (drag) {
      if (drag.kind === 'pan') {
        setView({
          ...drag.view,
          cx: drag.view.cx - (sp[0] - drag.start[0]) / drag.view.scale,
          cy: drag.view.cy + (sp[1] - drag.start[1]) / drag.view.scale,
        })
      } else if (drag.kind === 'moveMeasure') {
        const dx = mp[0] - drag.start[0]
        const dy = mp[1] - drag.start[1]
        if (Math.hypot(dx, dy) * view.scale > 2) drag.moved = true
        const started = drag.started
        if (started.kind === 'rect' || started.kind === 'point') {
          applyShape(drag.id, { center: [started.center[0] + dx, started.center[1] + dy] })
        } else if (started.kind === 'line') {
          applyShape(drag.id, { points: started.points.map((p) => [p[0] + dx, p[1] + dy]) })
        }
      } else if (drag.kind === 'corner') {
        const s = drag.started
        const corners = rectCorners(s.center, s.angle, s.L, s.W)
        const opp = corners[(drag.idx + 2) % 4]
        const angLocal = Math.atan2(mp[1] - opp[1], mp[0] - opp[0])
        const projL = Math.abs((mp[0] - opp[0]) * Math.cos(s.angle) + (mp[1] - opp[1]) * Math.sin(s.angle)) * 2
        const projW = Math.abs(-(mp[0] - opp[0]) * Math.sin(s.angle) + (mp[1] - opp[1]) * Math.cos(s.angle)) * 2
        const c = [(mp[0] + opp[0]) / 2, (mp[1] + opp[1]) / 2]
        applyShape(drag.id, {
          center: c,
          L: Math.max(20, Math.min(900, projL)),
          W: Math.max(12, Math.min(600, projW)),
        })
      } else if (drag.kind === 'rotate') {
        const s = drag.started
        const raw = Math.atan2(mp[1] - s.center[1], mp[0] - s.center[0])
        let ang = raw + Math.PI / 2
        if (!e.shiftKey) {
          const snap = nearestContour(snapIndex, s.center, 60 / view.scale)
          if (snap && snap.d < 22 / view.scale) ang = snap.angle
        }
        applyShape(drag.id, { angle: ang })
      } else if (drag.kind === 'lineEnd') {
        const s = drag.started
        const pts = s.points.map((p) => [...p])
        const i = drag.idx
        const snap = nearestContour(snapIndex, mp, 30 / view.scale)
        pts[i] = snap && snap.d < 14 / view.scale ? snap.point : mp
        applyShape(drag.id, { points: pts })
      }
      return
    }

    if (tool === 'draw-watershed' || tool === 'draw-patch') {
      if (draft) {
        const snap = nearestContour(snapIndex, mp, 25 / view.scale)
        setDraft((d) => (d ? { ...d, current: snap && snap.d < 10 / view.scale ? snap.point : mp } : d))
      }
      return
    }

    // 放置预览
    if (pendingMeasure && tool === 'place') {
      const g = buildGhost(mp, e.shiftKey)
      setGhost(g)
    }
  }

  const onPointerUp = (e) => {
    const drag = dragRef.current
    dragRef.current = null
    if (drag?.kind === 'moveMeasure' && !drag.moved) {
      // 单击选中
    }
  }

  const onPointerLeave = () => {
    setCursor(null)
    setGhost(null)
    onHover?.(null)
  }

  const onWheel = (e) => {
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const sp = [e.clientX - rect.left, e.clientY - rect.top]
    const before = toMap(sp[0], sp[1])
    const factor = Math.exp(-e.deltaY * 0.0016)
    const scale = Math.max(0.08, Math.min(6, view.scale * factor))
    const after = [(sp[0] - size.w / 2) / scale + view.cx, view.cy - (sp[1] - size.h / 2) / scale]
    setView({
      scale,
      cx: view.cx + (before[0] - after[0]),
      cy: view.cy + (before[1] - after[1]),
    })
  }

  const onDoubleClick = () => {
    if ((tool === 'draw-watershed' || tool === 'draw-patch') && draft && draft.points.length >= 3) finishDraft()
  }

  const finishDraft = () => {
    if (!draft || draft.points.length < 3) {
      notify?.(draft?.kind === 'watershed' ? '小流域边界至少需要 3 个点' : '图斑至少需要 3 个点', 'warn')
      return
    }
    const ring = simplifyRing(draft.points, 1.5)
    if (ring.length < 3 || polygonArea(ring) < 20) {
      notify?.('绘制范围过小或重复点过多，请重新勾绘', 'warn')
      return
    }
    if (draft.kind === 'watershed') onAddWatershed(ring)
    else onAddPatch(ring)
    setDraft(null)
  }

  const buildGhost = (mp, freeRotate, explicitType) => {
    const typeId = explicitType || pendingMeasure?.type
    if (!typeId) return null
    const spec = explicitType ? { type: typeId, params: MEASURE_TYPES[typeId].defaults } : pendingMeasure
    const type = MEASURE_TYPES[typeId]
    if (type.shape === 'area') {
      const near = nearestContour(snapIndex, mp, 75 / view.scale)
      const angle = near && !freeRotate ? near.angle : 0
      const L = spec.defaults?.L ?? (typeId === 'terrace' ? 150 : 120)
      const W = spec.defaults?.W ?? (typeId === 'terrace' ? 90 : 100)
      const center = mp
      const snapped = !!(near && near.d < 22 / view.scale)
      const ext = rectCorners(center, angle, L, W)
      return {
        ext,
        center,
        angle,
        L,
        W,
        snapped,
        label: {
          at: [center[0], center[1] + W / 2],
          text: snapped ? `已对齐等高线 ${near.level} m` : '按住 Shift 自由旋转',
          bad: false,
        },
      }
    }
    if (type.shape === 'point') {
      const ch = nearestChannel(snapIndex, mp, 60 / view.scale)
      if (ch && ch.d < 22 / view.scale) {
        const cand = {
          type: 'checkdam',
          channelId: ch.channel.id,
          s: ch.s,
          params: spec.params,
          shape: { kind: 'point', center: ch.point, angle: Math.atan2(Math.cos(ch.angle), Math.sin(ch.angle)) },
        }
        const chk = checkDamPlacement(cand, survey.channels, measures.filter((m) => m.channelId))
        return {
          ext: null,
          circle: { point: ch.point, r: (spec.params.gullyW || 6) / 2 },
          ok: chk.ok,
          label: {
            at: ch.point,
            text: chk.ok ? `谷坊 · 比降 ${(chk.gradient * 100).toFixed(1)}%` : `距相邻谷坊不足 ${chk.allow.toFixed(0)} m`,
            bad: !chk.ok,
          },
        }
      }
      return { ext: null, circle: { point: mp, r: 4 }, ok: false, label: { at: mp, text: '请靠近沟道布设谷坊', bad: true } }
    }
    if (type.shape === 'line') {
      const near = nearestContour(snapIndex, mp, 60 / view.scale)
      if (!near || near.d > 30 / view.scale) {
        return { ext: [mp, mp], circle: null, label: { at: mp, text: '截水沟需沿等高线布设', bad: true } }
      }
      const span = contourSpan(near, 130)
      return {
        ext: span,
        label: { at: span[Math.floor(span.length / 2)], text: `沿 ${near.level} m 等高线`, bad: false },
      }
    }
    return null
  }

  const contourSpan = (near, targetLen) => {
    const c = near.seg.contour
    const pts = c.points
    const idx = pts.findIndex((p) => p === near.seg.a)
    if (idx < 0) return [near.point, [near.point[0] + 100, near.point[1]]]
    const out = []
    let acc = 0
    // 从 idx 向前
    const forward = []
    for (let i = idx; i < pts.length - 1 && acc < targetLen / 2; i++) {
      const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
      acc += d
      forward.push(pts[i + 1])
    }
    const backward = []
    for (let i = idx; i > 0 && acc < targetLen; i--) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
      acc += d
      backward.unshift(pts[i - 1])
    }
    out.push(...backward, near.point, ...forward)
    return out.length >= 2 ? out : [near.point, [near.point[0] + 60, near.point[1]]]
  }

  const onClickPlace = (e) => {
    if (tool !== 'place' || !pendingMeasure) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mp = toMap(e.clientX - rect.left, e.clientY - rect.top)
    const freeRotate = e.shiftKey
    const g = buildGhost(mp, freeRotate)
    if (!g) return
    if (MEASURE_TYPES[pendingMeasure.type].shape === 'point') {
      if (g.ok === false) {
        notify?.(`谷坊无法布设：${g.label.text}`, 'error')
        return
      }
      onPlaceMeasure({
        type: 'checkdam',
        channelId: g.label.channelId,
        s: g.label.s,
        shape: { kind: 'point', center: g.circle.point, angle: g.label.angle },
      }, true)
      return
    }
    if (MEASURE_TYPES[pendingMeasure.type].shape === 'line') {
      if (g.label.bad) {
        notify?.(g.label.text, 'warn')
        return
      }
      onPlaceMeasure({ type: 'ditch', shape: { kind: 'line', points: g.ext } }, true)
      return
    }
    onPlaceMeasure(
      {
        type: pendingMeasure.type,
        shape: {
          kind: 'polygon',
          points: g.ext,
        },
        rect: { center: g.center, angle: g.angle, L: g.L, W: g.W },
      },
      true,
    )
  }

  // HTML5 拖放
  const onDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    const rect = canvasRef.current.getBoundingClientRect()
    const mp = toMap(e.clientX - rect.left, e.clientY - rect.top)
    if (e.dataTransfer.types.includes('text/measure-type')) {
      const typeId = window.__dragMeasureType
      if (typeId) {
        setGhost(buildGhost(mp, e.shiftKey, typeId))
      }
    }
  }
  const onDrop = (e) => {
    e.preventDefault()
    const typeId = e.dataTransfer.getData('text/measure-type') || window.__dragMeasureType
    if (!typeId) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mp = toMap(e.clientX - rect.left, e.clientY - rect.top)
    const g = buildGhost(mp, e.shiftKey, typeId)
    if (!g) return
    const t = MEASURE_TYPES[typeId]
    if (t.shape === 'point') {
      if (g.ok === false) {
        notify?.(`谷坊无法布设：${g.label.text}`, 'error')
        return
      }
      onPlaceMeasure({
        type: typeId,
        channelId: g.label.channelId,
        s: g.label.s,
        shape: { kind: 'point', center: g.circle.point, angle: g.label.angle },
      })
      return
    }
    if (t.shape === 'line') {
      if (g.label.bad) {
        notify?.(g.label.text, 'warn')
        return
      }
      onPlaceMeasure({ type: typeId, shape: { kind: 'line', points: g.ext } })
      return
    }
    onPlaceMeasure(
      { type: typeId, shape: { kind: 'polygon', points: g.ext }, rect: { center: g.center, angle: g.angle, L: g.L, W: g.W } },
    )
    setGhost(null)
  }

  const applyShape = (id, patch) => {
    onUpdateMeasure(id, { shape: { ...patch } }, true)
  }

  // 键盘
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDraft(null)
        onSelect(null)
      }
      if (e.key === 'Enter' && draft) finishDraft()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // 测绘成果更换或首次拿到画布尺寸后自动取景
  const fittedRef = useRef(false)
  useEffect(() => {
    if (!survey?.bounds || size.w < 260 || size.h < 260) return
    const tokenChanged = fittedRef.current !== fitToken
    if (fittedRef.current !== false && !tokenChanged) return
    fittedRef.current = fitToken
    const b = survey.bounds
    const pad = 56
    const scale = Math.max(0.05, Math.min((size.w - pad * 2) / Math.max(1, b.maxX - b.minX), (size.h - pad * 2) / Math.max(1, b.maxY - b.minY)))
    setView({ cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, scale })
  }, [fitToken, size.w, size.h, survey])

  // 居中
  const fit = () => {
    if (!survey.bounds) return
    const b = survey.bounds
    const pad = 60
    const scale = Math.min((size.w - pad * 2) / (b.maxX - b.minX), (size.h - pad * 2) / (b.maxY - b.minY))
    setView({ cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, scale })
  }

  const cursorStyle =
    tool === 'draw-watershed' || tool === 'draw-patch' ? 'crosshair' : tool === 'place' ? 'copy' : 'grab'

  return (
    <div className="map-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: cursorStyle, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onClick={onClickPlace}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onContextMenu={(e) => e.preventDefault()}
      />
      {draft && (
        <div className="draw-hint">
          {draft.kind === 'watershed' ? '勾绘小流域边界' : '勾绘图斑'}：单击添加节点（自动吸附等高线），双击或点击起点闭合，Esc 取消
        </div>
      )}
      {tool === 'place' && pendingMeasure && (
        <div className="draw-hint place">
          在图上点击布设「{MEASURE_TYPES[pendingMeasure.type].name}」（需落在图斑内）· 靠近等高线自动对齐走向 · 按住 Shift 自由旋转
        </div>
      )}
      <div className="map-tools">
        <button onClick={fit} title="全图">⤢</button>
        <button onClick={() => setView((v) => ({ ...v, scale: Math.min(6, v.scale * 1.35) }))} title="放大">＋</button>
        <button onClick={() => setView((v) => ({ ...v, scale: Math.max(0.08, v.scale / 1.35) }))} title="缩小">－</button>
        {draft && <button className="finish" onClick={finishDraft}>闭合</button>}
      </div>
      <div className="map-legend">
        <div className="legend-title">坡度分级着色</div>
        {SLOPE_CLASSES.map((c) => (
          <div className="legend-row" key={c.id}>
            <span className="swatch" style={{ background: c.color }} />
            <span>
              {c.label} {c.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function midpoint(pts) {
  if (pts.length === 1) return pts[0]
  const total = lineLength(pts)
  let acc = 0
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    if (acc + d >= total / 2) {
      const t = d ? (total / 2 - acc) / d : 0
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]
    }
    acc += d
  }
  return pts[0]
}

function shapeClone(s) {
  if (s.kind === 'rect') return { ...s, center: [...s.center] }
  if (s.kind === 'point') return { ...s, center: [...s.center] }
  if (s.kind === 'line') return { ...s, points: s.points.map((p) => [...p]) }
  if (s.kind === 'polygon') return { ...s, points: s.points.map((p) => [...p]) }
  return { ...s }
}

function drawHandles(g, m, sx, sc) {
  g.save()
  const pts = []
  if (m.shape.kind === 'rect') {
    const corners = rectCorners(m.shape.center, m.shape.angle, m.shape.L, m.shape.W)
    corners.forEach((p) => pts.push({ p, square: true }))
    const c = m.shape.center
    const a = m.shape.angle
    const topMid = [(corners[0][0] + corners[1][0]) / 2, (corners[0][1] + corners[1][1]) / 2]
    const rp = [topMid[0] + Math.cos(a) * (16 / sc), topMid[1] + Math.sin(a) * (16 / sc)]
    const [tmx, tmy] = sx(topMid)
    const [rpx, rpy] = sx(rp)
    g.strokeStyle = '#1f5f8b'
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(tmx, tmy)
    g.lineTo(rpx, rpy)
    g.stroke()
    pts.push({ p: rp, round: true })
  } else if (m.shape.kind === 'line') {
    pts.push({ p: m.shape.points[0], square: true })
    pts.push({ p: m.shape.points[m.shape.points.length - 1], square: true })
  } else if (m.shape.kind === 'point') {
    pts.push({ p: m.shape.center, square: true })
  }
  for (const h of pts) {
    const [x, y] = sx(h.p)
    g.fillStyle = '#ffffff'
    g.strokeStyle = '#1f5f8b'
    g.lineWidth = 1.4
    if (h.round) {
      g.beginPath()
      g.arc(x, y, 4.5, 0, Math.PI * 2)
      g.fill()
      g.stroke()
    } else {
      g.beginPath()
      g.rect(x - 4, y - 4, 8, 8)
      g.fill()
      g.stroke()
    }
  }
  g.restore()
}

function drawScaleBar(g, view, size) {
  const targetPx = 120
  const meters = targetPx / view.scale
  const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000]
  let pick = nice[0]
  for (const n of nice) if (n <= meters * 1.4) pick = n
  const px = pick * view.scale
  const x = 16
  const y = size.h - 52
  g.save()
  g.fillStyle = 'rgba(255,253,247,0.9)'
  g.fillRect(x - 6, y - 8, px + 24, 30)
  g.strokeStyle = '#3b372c'
  g.lineWidth = 1.5
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + px, y)
  g.moveTo(x, y - 4)
  g.lineTo(x, y + 4)
  g.moveTo(x + px / 2, y - 3)
  g.lineTo(x + px / 2, y + 3)
  g.moveTo(x + px, y - 4)
  g.lineTo(x + px, y + 4)
  g.stroke()
  g.fillStyle = '#3b372c'
  g.font = '10px "Segoe UI", system-ui, sans-serif'
  g.textAlign = 'center'
  g.fillText(pick >= 1000 ? `${pick / 1000} km` : `${pick} m`, x + px / 2, y + 14)
  g.restore()
}

function drawNorth(g) {
  const x = 44
  const y = 44
  g.save()
  g.fillStyle = 'rgba(255,253,247,0.9)'
  g.beginPath()
  g.arc(x, y, 20, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#9c9280'
  g.lineWidth = 1
  g.stroke()
  g.fillStyle = '#3b372c'
  g.beginPath()
  g.moveTo(x, y - 14)
  g.lineTo(x + 5.5, y + 6)
  g.lineTo(x, y + 2)
  g.lineTo(x - 5.5, y + 6)
  g.closePath()
  g.fill()
  g.font = '700 9px "Segoe UI", system-ui, sans-serif'
  g.textAlign = 'center'
  g.fillText('N', x, y + 17)
  g.restore()
}
