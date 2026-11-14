// 主画布控制器：视口变换、三档离散缩放、拖拽平移、命中选择、小地图、实时告警叠加
import { TileManager, SpatialIndex } from './tiles.js'
import { drawAlertMark } from './draw.js'
import { WORLD_W, WORLD_H } from './layout.js'

export const ZOOM_SCALES = [0.16, 0.42, 0.95]
export const ZOOM_LABELS = ['小档 · 房间轮廓', '中档 · 设备床位', '大档 · 编号状态']
const DRAG_THRESHOLD = 5

export class FloorCanvas {
  constructor(canvas, opts) {
    this.canvas = canvas
    this.opts = opts // { elements, byId, layersActive, getZoom, onZoom, onSelect, getAlerts, scheduleIndex, onStatusChange, minimap }
    if (!canvas) throw new Error('FloorCanvas: 主画布元素未挂载')
    this.ctx = canvas.getContext('2d')
    this.index = new SpatialIndex(opts.elements)
    this.tiles = new TileManager({
      elements: opts.elements,
      getZoomIndex: opts.getZoom,
      layersActive: opts.layersActive,
      getAlertElements: opts.getAlerts,
      scheduleIndex: opts.scheduleIndex
    })
    this.minimap = opts.minimap || null
    this.getMinimap = opts.getMinimap || null
    this.view = { scale: ZOOM_SCALES[0], offsetX: 0, offsetY: 0 }
    this.hoverId = null
    this.selectedId = null
    this.dragging = false
    this.moved = false
    this.down = null
    this.raf = 0
    this.running = true
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.frame = 0
    this.#bind()
    this.#bindMinimap()
    this.resize()
    this.fitView(this.opts.getZoom())
    this.#loop()
  }

  #bind() {
    this._onDown = (e) => this.#onPointerDown(e)
    this._onMove = (e) => this.#onPointerMove(e)
    this._onUp = (e) => this.#onPointerUp(e)
    this._onWheel = (e) => this.#onWheel(e)
    this._onResize = () => this.resize()
    this.canvas.addEventListener('pointerdown', this._onDown)
    window.addEventListener('pointermove', this._onMove)
    window.addEventListener('pointerup', this._onUp)
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false })
    window.addEventListener('resize', this._onResize)
    this._unsubStatus = this.opts.onStatusChange?.((element) => {
      this.tiles.invalidateElementArea(element)
    })
  }

  #bindMinimap() {
    const mm = this.getMinimap?.() || this.minimap
    if (!mm || mm === this._boundMinimap) return
    this._boundMinimap = mm
    this._onMini = (e) => this.#onMinimap(e)
    mm.addEventListener('pointerdown', this._onMini)
    this.minimap = mm
  }

  destroy() {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.canvas.removeEventListener('pointerdown', this._onDown)
    window.removeEventListener('pointermove', this._onMove)
    window.removeEventListener('pointerup', this._onUp)
    this.canvas.removeEventListener('wheel', this._onWheel)
    window.removeEventListener('resize', this._onResize)
    if (this._boundMinimap) this._boundMinimap.removeEventListener('pointerdown', this._onMini)
    this._unsubStatus?.()
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect()
    this.cssW = Math.max(320, rect.width)
    this.cssH = Math.max(240, rect.height)
    this.canvas.width = this.cssW * this.dpr
    this.canvas.height = this.cssH * this.dpr
    this.canvas.style.width = this.cssW + 'px'
    this.canvas.style.height = this.cssH + 'px'
    this.#clampView()
  }

  fitView(level = 0) {
    this.opts.onZoom(level)
    const scale = ZOOM_SCALES[level]
    this.view.scale = scale
    this.view.offsetX = (this.cssW - WORLD_W * scale) / 2
    this.view.offsetY = (this.cssH - WORLD_H * scale) / 2
    this.#clampView()
  }

  setZoom(level, center = null) {
    const z = Math.max(0, Math.min(2, level))
    const cx = center ? center.x : this.cssW / 2
    const cy = center ? center.y : this.cssH / 2
    const before = this.#toWorld(cx, cy)
    this.opts.onZoom(z)
    this.view.scale = ZOOM_SCALES[z]
    this.view.offsetX = cx - before.x * this.view.scale
    this.view.offsetY = cy - before.y * this.view.scale
    this.#clampView()
  }

  #onWheel(e) {
    e.preventDefault()
    const cur = this.opts.getZoom()
    const dir = e.deltaY < 0 ? 1 : -1
    this.setZoom(cur + dir, { x: e.offsetX, y: e.offsetY })
  }

  #toWorld(sx, sy) {
    return { x: (sx - this.view.offsetX) / this.view.scale, y: (sy - this.view.offsetY) / this.view.scale }
  }

  #onPointerDown(e) {
    this.canvas.setPointerCapture?.(e.pointerId)
    this.dragging = true
    this.moved = false
    this.down = { x: e.clientX, y: e.clientY, ox: this.view.offsetX, oy: this.view.offsetY }
  }

  #onPointerMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    if (this.dragging && this.down) {
      const dx = e.clientX - this.down.x
      const dy = e.clientY - this.down.y
      if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) this.moved = true
      this.view.offsetX = this.down.ox + dx
      this.view.offsetY = this.down.oy + dy
      this.#clampView()
      return
    }
    if (sx < 0 || sy < 0 || sx > this.cssW || sy > this.cssH) return
    const w = this.#toWorld(sx, sy)
    const hit = this.index.hit(w.x, w.y)
    const sel = hit && (hit.selectable ? hit : this.#resolveSelectable(hit))
    this.hoverId = sel?.id || null
    this.canvas.style.cursor = sel ? 'pointer' : 'grab'
  }

  #onPointerUp(e) {
    if (!this.dragging) return
    this.dragging = false
    if (this.moved) { this.down = null; return }
    const rect = this.canvas.getBoundingClientRect()
    const w = this.#toWorld(e.clientX - rect.left, e.clientY - rect.top)
    const hit = this.index.hit(w.x, w.y)
    const target = hit && (hit.selectable ? hit : this.#resolveSelectable(hit))
    this.down = null
    if (target) {
      this.selectedId = target.id
      this.opts.onSelect?.(target)
    } else {
      this.selectedId = null
      this.opts.onSelect?.(null)
    }
  }

  #resolveSelectable(hit) {
    if (hit.roomId) {
      const room = this.opts.byId[hit.roomId]
      if (room?.selectable) return room
    }
    // 向上找包含该点的可选要素（小设备落在房间内）
    const point = { x: hit.x + hit.w / 2, y: hit.y + hit.h / 2 }
    const candidates = this.opts.elements.filter(
      (el) => el.selectable && point.x >= el.x && point.x <= el.x + el.w && point.y >= el.y && point.y <= el.y + el.h
    )
    candidates.sort((a, b) => a.w * a.h - b.w * b.h)
    return candidates[0] || null
  }

  #clampView() {
    const margin = 80
    const sw = WORLD_W * this.view.scale
    const sh = WORLD_H * this.view.scale
    // 世界大于视口：offset 允许区间 [cssW - sw - margin, margin]
    if (sw >= this.cssW) {
      const lo = this.cssW - sw - margin
      this.view.offsetX = Math.min(margin, Math.max(lo, this.view.offsetX))
    } else {
      this.view.offsetX = (this.cssW - sw) / 2 // 世界小于视口：居中
    }
    if (sh >= this.cssH) {
      const lo = this.cssH - sh - margin
      this.view.offsetY = Math.min(margin, Math.max(lo, this.view.offsetY))
    } else {
      this.view.offsetY = (this.cssH - sh) / 2
    }
  }

  invalidateSchedule() {
    this.tiles.invalidate(null, 'schedule')
  }

  #loop() {
    if (!this.running) return
    this.raf = requestAnimationFrame(() => this.#loop())
    this.frame++
    if (!this._boundMinimap) this.#bindMinimap()
    const ctx = this.ctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.fillStyle = '#eef2f7'
    ctx.fillRect(0, 0, this.cssW, this.cssH)
    ctx.save()
    ctx.translate(this.view.offsetX, this.view.offsetY)
    ctx.scale(this.view.scale, this.view.scale)

    const view = {
      x0: -this.view.offsetX / this.view.scale,
      y0: -this.view.offsetY / this.view.scale,
      x1: (this.cssW - this.view.offsetX) / this.view.scale,
      y1: (this.cssH - this.view.offsetY) / this.view.scale
    }
    // 瓦片在屏幕空间绘制（内部会切换/还原 transform）
    this.tiles.renderVisible(ctx, view, {
      dpr: this.dpr, scale: this.view.scale,
      offsetX: this.view.offsetX, offsetY: this.view.offsetY
    })

    // 告警脉冲实时叠加
    if (this.opts.layersActive.alert) {
      const alerts = this.opts.getAlerts() || []
      for (const e of alerts) {
        if (e.x > view.x1 || e.x + e.w < view.x0 || e.y > view.y1 || e.y + e.h < view.y0) continue
        drawAlertMark(ctx, e, this.frame / 3)
      }
    }

    // 选中 / 悬停高亮
    const hl = this.opts.byId[this.selectedId] || this.opts.byId[this.hoverId]
    if (hl) {
      ctx.save()
      ctx.lineWidth = (this.selectedId === hl.id ? 3 : 2) / this.view.scale
      ctx.strokeStyle = this.selectedId === hl.id ? '#ff4d4f' : '#faad14'
      ctx.setLineDash([8 / this.view.scale, 6 / this.view.scale])
      ctx.strokeRect(hl.x - 4, hl.y - 4, hl.w + 8, hl.h + 8)
      ctx.restore()
    }
    ctx.restore()
    this.#drawMinimap(view)
  }

  #drawMinimap(view) {
    const mm = this.minimap
    if (!mm) return
    const mctx = mm.getContext('2d')
    const mw = mm.width, mh = mm.height
    const k = Math.min(mw / WORLD_W, mh / WORLD_H)
    mctx.setTransform(1, 0, 0, 1, 0, 0)
    mctx.fillStyle = '#dfe7f0'
    mctx.fillRect(0, 0, mw, mh)
    for (const e of this.opts.elements) {
      if (e.type !== 'room' && e.type !== 'washRoom' && e.type !== 'scopeLibrary' && e.type !== 'recoveryBay') continue
      mctx.fillStyle = e.type === 'washRoom' ? '#e9d8fd' : e.type === 'scopeLibrary' ? '#d9f7be' : '#c7d9ec'
      mctx.fillRect(e.x * k, e.y * k, Math.max(1, e.w * k), Math.max(1, e.h * k))
    }
    // 视口框
    mctx.strokeStyle = '#ff4d4f'
    mctx.lineWidth = 1.5
    mctx.strokeRect(view.x0 * k, view.y0 * k, (view.x1 - view.x0) * k, (view.y1 - view.y0) * k)
    this._miniK = k
  }

  #onMinimap(e) {
    if (!this._miniK) return
    const rect = this.opts.minimap.getBoundingClientRect()
    const wx = (e.clientX - rect.left) / this._miniK
    const wy = (e.clientY - rect.top) / this._miniK
    this.view.offsetX = this.cssW / 2 - wx * this.view.scale
    this.view.offsetY = this.cssH / 2 - wy * this.view.scale
    this.#clampView()
  }
}
