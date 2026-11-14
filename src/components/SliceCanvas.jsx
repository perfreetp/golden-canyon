// PixiJS 断层画布：批量绘制 + 视口裁剪 + 两级 LOD + 平移缩放 + 点选 + 套索 + 复核标记
import { useEffect, useMemo, useRef } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'
import { LOD_THRESHOLD, layerMeta } from '../lib/data.js'
import { bboxesIntersect, hitTest, simplifyPoints } from '../lib/geometry.js'

const MIN_SCALE = 0.35
const MAX_SCALE = 9
const LAYER_KEYS = ['artery', 'vein', 'nerve', 'functional', 'lesion']

export default function SliceCanvas(props) {
  const {
    slice, structureMap, visibleLayers, mode = 'browse',
    selectedId, onSelect, onLassoComplete, onZoomChange,
    committedPolygons = [], reviewOverlays = null, height = 620
  } = props

  const hostRef = useRef(null)
  const appRef = useRef(null)
  const stateRef = useRef({})
  const propsRef = useRef(props)
  propsRef.current = props
  const cbRef = useRef({ onSelect, onLassoComplete, onZoomChange })
  cbRef.current = { onSelect, onLassoComplete, onZoomChange }

  // 当前层要素（按 id 映射还原）
  const sliceElements = useMemo(
    () => slice.structures.map((id) => structureMap.get(id)).filter(Boolean),
    [slice, structureMap]
  )
  const elementsRef = useRef(sliceElements)
  elementsRef.current = sliceElements

  useEffect(() => {
    let disposed = false
    // 每次挂载建立独立运行时对象，避免 StrictMode 双挂载共享 stateRef 互相清空
    const runtime = {}
    stateRef.current = runtime
    const app = new Application()
    appRef.current = app

    app.init({
      background: '#0a1020',
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      width: hostRef.current.clientWidth,
      height
    }).then(() => {
      // StrictMode 双挂载/组件卸载可能发生在 init 完成前：未就绪实例由这里自行销毁，
      // 不能在 cleanup 中对未 init 的 Application 调 destroy（Pixi v8 内部状态尚未建立）
      if (disposed) { app.destroy(true, { children: true }); return }
      const S = runtime
      S.ready = true
      hostRef.current.appendChild(app.canvas)
      app.canvas.style.width = '100%'
      app.canvas.style.height = '100%'

      const stage = app.stage
      const world = new Container()
      // 渲染顺序（自下而上）：底图 → 五类图层 → 高亮 → 文字 → 套索 → 复核叠加
      const baseG = new Graphics()
      world.addChild(baseG)
      const layerG = {}
      for (const key of LAYER_KEYS) {
        layerG[key] = new Graphics()
        world.addChild(layerG[key])
      }
      const highlightG = new Graphics()
      const label = new Text({ text: '', style: {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: 13, fill: '#ffffff',
        background: '#1c2740', padding: 4
      } })
      label.visible = false
      const lassoG = new Graphics()
      const overlayG = new Graphics()
      world.addChild(highlightG, label, lassoG, overlayG)
      // 视口外裁剪由两层保证：应用层 bboxesIntersect 剔除 + 画布/CSS 边界（renderer 尺寸即视口）
      stage.addChild(world)

      S.world = world; S.baseG = baseG; S.layerG = layerG
      S.highlightG = highlightG; S.lassoG = lassoG; S.overlayG = overlayG
      S.label = label
      S.scale = 1; S.highDetail = false; S.dragging = false; S.lassoing = false
      S.lassoPts = []; S.moved = 0; S.lastCull = 0; S.cullDirty = true
      S.slice = null

      const toWorld = (sx, sy) => ({
        x: (sx - world.position.x) / world.scale.x,
        y: (sy - world.position.y) / world.scale.y
      })

      const fitView = () => {
        const w = app.canvas.clientWidth, h = app.canvas.clientHeight
        // 让 1000×1000 世界尽量占满视口，初始 scale≈1 使线宽/底色与设计一致
        S.scale = Math.min(w / 1040, h / 1040)
        world.scale.set(S.scale)
        world.position.set(w / 2 - 500 * S.scale, h / 2 - 500 * S.scale)
        S.cullDirty = true
      }
      S.fitView = fitView

      // ---------- 几何绘制 ----------
      const drawShape = (g, el) => {
        const sh = el.shape
        if (sh.kind === 'ellipse') {
          g.ellipse(sh.cx, sh.cy, sh.rx, sh.ry)
        } else if (sh.kind === 'polygon') {
          const flat = []
          for (const p of sh.points) flat.push(p.x, p.y)
          g.poly(flat)
        } else {
          g.moveTo(sh.points[0].x, sh.points[0].y)
          for (let k = 1; k < sh.points.length; k++) g.lineTo(sh.points[k].x, sh.points[k].y)
        }
      }

      const viewBounds = () => {
        const w = app.canvas.clientWidth, h = app.canvas.clientHeight
        const tl = toWorld(0, 0), br = toWorld(w, h)
        return { minX: tl.x, minY: tl.y, maxX: br.x, maxY: br.y }
      }

      // 断层底图：颅骨、脑实质、侧脑室（随层号重绘）
      const drawBase = () => {
        const sl = S.slice
        if (!sl) return
        const g = baseG.clear()
        g.setStrokeStyle({ width: 1 / S.scale, color: 0x1b2942, alpha: 0.5 })
        for (let x = 0; x <= 1000; x += 100) g.moveTo(x, 0).lineTo(x, 1000)
        for (let y = 0; y <= 1000; y += 100) g.moveTo(0, y).lineTo(1000, y)
        g.stroke()
        g.ellipse(sl.skullShape.cx, sl.skullShape.cy, sl.skullShape.rx, sl.skullShape.ry)
          .fill({ color: 0x2a3750, alpha: 0.7 })
          .stroke({ width: 3.5, color: 0x8595b3, alpha: 0.95 })
        g.ellipse(sl.baseShape.cx, sl.baseShape.cy, sl.baseShape.rx, sl.baseShape.ry)
          .fill({ color: 0x3a4d72, alpha: 0.92 })
          .stroke({ width: 2.4, color: 0xa9bcd9, alpha: 0.95 })
        if (sl.index >= 20 && sl.index <= 42) {
          const e = sl.baseShape
          for (const side of [-1, 1]) {
            g.ellipse(e.cx + side * e.rx * 0.16, e.cy - e.ry * 0.08, e.rx * 0.07, e.ry * 0.16)
              .fill({ color: 0x101a2e, alpha: 0.9 })
              .stroke({ width: 1.5, color: 0x5b7299, alpha: 0.8 })
          }
        }
      }
      S.drawBase = drawBase

      const drawHighlight = () => {
        highlightG.clear()
        label.visible = false
        if (!S.elements || !S.selectedId) return
        const el = S.elements.find((x) => x.id === S.selectedId)
        if (!el) return
        const sh = el.shape
        highlightG.setStrokeStyle({
          width: sh.kind === 'polyline' ? (sh.width || 3) + 5 : 3.5,
          color: 0xffffff, alpha: 0.95, cap: 'round', join: 'round'
        })
        drawShape(highlightG, el)
        if (sh.kind === 'polyline') highlightG.stroke()
        else highlightG.stroke().fill({ color: 0xffffff, alpha: 0.12 })
        label.text = el.name
        label.visible = true
        label.position.set(el.bbox.minX, Math.max(8, el.bbox.minY - 24))
        label.scale.set(1 / S.scale)
      }
      S.drawHighlight = drawHighlight

      // 要素图层：视口裁剪 + LOD
      const rebuildLayers = () => {
        if (!S.elements) return
        const vb = viewBounds()
        const high = S.scale >= LOD_THRESHOLD
        S.highDetail = high
        for (const key of LAYER_KEYS) S.layerG[key].clear()
        let drawn = 0, culled = 0, lodHidden = 0
        for (const el of S.elements) {
          if (!S.visible[el.layer]) continue
          // LOD：低倍仅绘制 low 级要素（脑叶轮廓 + 主要血管/神经/病灶主体）
          if (!high && el.lod === 'high') { lodHidden++; continue }
          // 视口外要素裁掉
          if (!bboxesIntersect(el.bbox, vb)) { culled++; continue }
          const meta = layerMeta(el.layer)
          const g = S.layerG[el.layer]
          const sh = el.shape
          if (sh.kind === 'polyline') {
            const w = (sh.width || 3) * (el.lod === 'low' ? 1.3 : 1.05)
            g.setStrokeStyle({ width: w, color: meta.color, alpha: 1,
              cap: 'round', join: 'round' })
            drawShape(g, el)
            g.stroke()
          } else if (sh.kind === 'polygon') {
            drawShape(g, el)
            g.fill({ color: meta.color, alpha: el.layer === 'functional' ? 0.22 : 0.45 })
            g.stroke({ width: 2.2, color: meta.color, alpha: 0.95 })
          } else {
            drawShape(g, el)
            g.fill({ color: meta.color, alpha: el.layer === 'functional' ? 0.3 : 0.55 })
            g.stroke({ width: 2.6, color: meta.color, alpha: 1 })
          }
          drawn++
        }
        S.stats = { drawn, culled, lodHidden, total: S.elements.length }
        if (S.lastHigh !== high) {
          S.lastHigh = high
          cbRef.current.onZoomChange?.(high, S.scale)
        }
        drawHighlight()
      }
      S.rebuildLayers = rebuildLayers

      // 套索命题/作答/复核叠加层
      const drawOverlays = () => {
        const g = overlayG.clear()
        for (const poly of S.committedPolygons || []) {
          const flat = poly.points.flatMap((p) => [p.x, p.y])
          g.poly(flat).fill({ color: poly.color ?? 0x35d07f, alpha: poly.alpha ?? 0.18 })
            .stroke({ width: 2, color: poly.color ?? 0x35d07f, alpha: 0.95 })
        }
        const ro = S.reviewOverlays
        if (ro) {
          if (ro.ref) {
            const flat = ro.ref.flatMap((p) => [p.x, p.y])
            g.poly(flat).stroke({ width: 2.5, color: 0x35d07f, alpha: 0.95 })
          }
          for (const r of ro.referenceRegions || []) {
            const flat = r.points.flatMap((p) => [p.x, p.y])
            g.poly(flat).fill({ color: 0xff4d57, alpha: 0.3 }).stroke({ width: 1.5, color: 0xff4d57 })
          }
          for (const r of ro.extraRegions || []) {
            const flat = r.points.flatMap((p) => [p.x, p.y])
            g.poly(flat).fill({ color: 0xffd24d, alpha: 0.22 }).stroke({ width: 1.2, color: 0xffd24d })
          }
        }
      }
      S.drawOverlays = drawOverlays

      // React props -> Pixi 运行时的唯一同步入口（解决异步初始化竞态）
      S.syncFromProps = (p) => {
        const sliceChanged = S.slice !== p.slice
        S.slice = p.slice
        S.elements = elementsRef.current
        S.visible = p.visibleLayers
        S.mode = p.mode
        S.selectedId = p.selectedId
        S.committedPolygons = p.committedPolygons
        S.reviewOverlays = p.reviewOverlays
        app.canvas.style.cursor = p.mode === 'lasso' ? 'crosshair' : 'grab'
        if (sliceChanged) {
          fitView()
          drawBase()
        }
        S.cullDirty = true
        rebuildLayers()
        drawOverlays()
        drawHighlight()
      }
      S.zoomBy = (factor) => {
        const w = app.canvas.clientWidth, h = app.canvas.clientHeight
        const before = toWorld(w / 2, h / 2)
        S.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, S.scale * factor))
        world.scale.set(S.scale)
        world.position.set(w / 2 - before.x * S.scale, h / 2 - before.y * S.scale)
        S.cullDirty = true
      }

      // ---------- 交互 ----------
      app.stage.eventMode = 'static'
      app.stage.hitArea = app.screen

      app.stage.on('pointerdown', (e) => {
        const p = toWorld(e.global.x, e.global.y)
        if (S.mode === 'lasso') {
          S.lassoing = true
          S.lassoPts = [p]
          lassoG.clear()
        } else {
          S.dragging = true
          S.moved = 0
          S.down = { x: e.global.x, y: e.global.y, wx: world.position.x, wy: world.position.y }
        }
      })

      app.stage.on('globalpointermove', (e) => {
        const p = toWorld(e.global.x, e.global.y)
        if (S.lassoing) {
          const last = S.lassoPts[S.lassoPts.length - 1]
          if (Math.hypot(p.x - last.x, p.y - last.y) >= 3) {
            S.lassoPts.push(p)
            lassoG.clear()
            lassoG.setStrokeStyle({ width: 2 / S.scale, color: 0x35d07f, alpha: 0.95 })
              .moveTo(S.lassoPts[0].x, S.lassoPts[0].y)
            for (const q of S.lassoPts.slice(1)) lassoG.lineTo(q.x, q.y)
            lassoG.stroke()
          }
          return
        }
        if (S.dragging) {
          const dx = e.global.x - S.down.x, dy = e.global.y - S.down.y
          S.moved += Math.abs(dx) + Math.abs(dy)
          world.position.set(S.down.wx + dx, S.down.wy + dy)
          S.cullDirty = true
          app.canvas.style.cursor = 'grabbing'
        }
      })

      const finishLasso = () => {
        S.lassoing = false
        lassoG.clear()
        const pts = simplifyPoints(S.lassoPts)
        S.lassoPts = []
        if (pts.length >= 3) cbRef.current.onLassoComplete?.(pts)
      }

      app.stage.on('pointerup', (e) => {
        if (S.lassoing) { finishLasso(); return }
        if (S.dragging) {
          S.dragging = false
          app.canvas.style.cursor = S.mode === 'lasso' ? 'crosshair' : 'grab'
          if (S.moved < 8 && S.mode === 'browse') {
            const p = toWorld(e.global.x, e.global.y)
            const tolWorld = 7 / S.scale
            // 图层优先级：病灶 > 功能区 > 神经 > 静脉 > 动脉；同层逆序命中最新要素
            const order = ['lesion', 'functional', 'nerve', 'vein', 'artery']
            let hit = null
            for (const layer of order) {
              if (!S.visible[layer]) continue
              for (let k = S.elements.length - 1; k >= 0; k--) {
                const el = S.elements[k]
                if (el.layer !== layer) continue
                if (!S.highDetail && el.lod === 'high') continue
                if (hitTest(el.shape, p.x, p.y, tolWorld)) { hit = el; break }
              }
              if (hit) break
            }
            cbRef.current.onSelect?.(hit)
          }
        }
      })
      // 指针移出画布松手：结束套索/拖拽，避免状态卡死
      app.stage.on('pointerupoutside', () => {
        if (S.lassoing) { S.lassoing = false; S.lassoPts = []; lassoG.clear() }
        S.dragging = false
      })

      const onWheel = (e) => {
        e.preventDefault()
        const rect = app.canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left, my = e.clientY - rect.top
        const before = toWorld(mx, my)
        const factor = Math.exp(-e.deltaY * 0.0012)
        S.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, S.scale * factor))
        world.scale.set(S.scale)
        world.position.set(mx - before.x * S.scale, my - before.y * S.scale)
        S.cullDirty = true
      }
      app.canvas.addEventListener('wheel', onWheel, { passive: false })
      S.onWheel = onWheel

      // ticker：拖拽时节流重建裁剪，保证流畅
      app.ticker.add(() => {
        label.scale.set(1 / S.scale)
        if (!S.cullDirty) return
        const now = performance.now()
        if (S.dragging && now - S.lastCull < 120) return
        S.lastCull = now
        S.cullDirty = false
        rebuildLayers()
      })

      const ro = new ResizeObserver(() => {
        app.renderer.resize(hostRef.current.clientWidth, height)
        S.cullDirty = true
      })
      ro.observe(hostRef.current)
      S.ro = ro

      // 初始化完成后立即同步一次当前 props（首帧不为空白）
      S.syncFromProps(propsRef.current)
    })

    return () => {
      disposed = true
      // 仅销毁已完成 init 的实例；未就绪者由 init 回调内的 disposed 分支处理
      if (runtime.ready) {
        runtime.ro?.disconnect()
        if (runtime.onWheel) app.canvas?.removeEventListener('wheel', runtime.onWheel)
        app.destroy({ removeView: true }, { children: true })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 任意 props 变化统一同步
  useEffect(() => {
    stateRef.current.syncFromProps?.({
      slice, visibleLayers, mode, selectedId, committedPolygons, reviewOverlays
    })
  }, [slice, sliceElements, visibleLayers, mode, selectedId, committedPolygons, reviewOverlays])

  return (
    <div style={{ position: 'relative', width: '100%', height, background: '#0a1020', borderRadius: 10, overflow: 'hidden' }}>
      <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', right: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button className="zoom-btn" onClick={() => stateRef.current.zoomBy?.(1.35)}>＋</button>
        <button className="zoom-btn" onClick={() => stateRef.current.zoomBy?.(1 / 1.35)}>－</button>
        <button className="zoom-btn" onClick={() => stateRef.current.fitView?.()}>适配</button>
      </div>
      <div className="canvas-hint">
        {mode === 'lasso' ? '套索模式：按住鼠标圈出目标结构，松开完成' : '浏览模式：拖拽平移 · 滚轮缩放 · 单击点选要素'}
      </div>
    </div>
  )
}
