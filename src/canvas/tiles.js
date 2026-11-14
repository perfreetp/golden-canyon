// 离屏瓦片渲染引擎：按 (缩放档, 图层) 把世界烘焙到 512px OffscreenCanvas 瓦片，
// 主画布每帧只 drawImage 视口内瓦片，保证 2000+ 要素下平移/缩放流畅。
import { drawElement, visibleAtZoom, drawAlertMark } from './draw.js'

export const TILE_SIZE = 512
const MAX_CACHED_TILES = 260 // LRU 上限，控制显存

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

// 空间哈希：命中检测用
export class SpatialIndex {
  constructor(elements, cell = 260) {
    this.cell = cell
    this.map = new Map()
    for (const e of elements) {
      const x0 = Math.floor(e.x / cell), y0 = Math.floor(e.y / cell)
      const x1 = Math.floor((e.x + e.w) / cell), y1 = Math.floor((e.y + e.h) / cell)
      for (let gx = x0; gx <= x1; gx++) {
        for (let gy = y0; gy <= y1; gy++) {
          const k = gx + ':' + gy
          let arr = this.map.get(k)
          if (!arr) { arr = []; this.map.set(k, arr) }
          arr.push(e)
        }
      }
    }
  }

  hit(wx, wy) {
    const k = Math.floor(wx / this.cell) + ':' + Math.floor(wy / this.cell)
    const arr = this.map.get(k)
    if (!arr) return null
    // 后加入的（小设备）优先于房间大框
    for (let i = arr.length - 1; i >= 0; i--) {
      const e = arr[i]
      if (wx >= e.x && wx <= e.x + e.w && wy >= e.y && wy <= e.y + e.h) return e
    }
    return null
  }
}

export class TileManager {
  constructor({ elements, getZoomIndex, layersActive, getAlertElements, scheduleIndex, selectedId }) {
    this.elements = elements
    this.getZoomIndex = getZoomIndex
    this.layersActive = layersActive
    this.getAlertElements = getAlertElements
    this.scheduleIndex = scheduleIndex // Map roomId/scopePositionId -> slots
    this.selectedId = selectedId
    this.cache = new Map() // key -> {canvas, lru}
    this.lruTick = 0
  }

  tileKey(zoom, layer, tx, ty) {
    return zoom + '|' + layer + '|' + tx + '|' + ty
  }

  invalidate(zoom = null, layer = null) {
    for (const key of [...this.cache.keys()]) {
      const [z, l] = key.split('|')
      if ((zoom === null || +z === zoom) && (layer === null || l === layer)) this.cache.delete(key)
    }
  }

  invalidateElementArea(element, zoom = null) {
    // 状态变化时只丢弃覆盖该要素范围的瓦片（按图层全部丢弃，简单可靠）
    const tx0 = Math.floor(element.x / TILE_SIZE), ty0 = Math.floor(element.y / TILE_SIZE)
    const tx1 = Math.floor((element.x + element.w) / TILE_SIZE), ty1 = Math.floor((element.y + element.h) / TILE_SIZE)
    for (const key of [...this.cache.keys()]) {
      const [z, l, tx, ty] = key.split('|')
      if (zoom !== null && +z !== zoom) continue
      const ntx = +tx, nty = +ty
      if (ntx >= tx0 && ntx <= tx1 && nty >= ty0 && nty <= ty1) this.cache.delete(key)
    }
  }

  #renderTile(zoom, layer, tx, ty) {
    const canvas = makeCanvas(TILE_SIZE, TILE_SIZE)
    const ctx = canvas.getContext('2d')
    const ox = tx * TILE_SIZE, oy = ty * TILE_SIZE
    const bounds = { x0: ox, y0: oy, x1: ox + TILE_SIZE, y1: oy + TILE_SIZE }
    const elements = this.#elementsInBounds(bounds)
    // 关键：要素用世界坐标存储，绘制前平移到瓦片局部坐标系
    ctx.save()
    ctx.translate(-ox, -oy)
    for (const e of elements) {
      if (!visibleAtZoom(e.type, zoom)) continue
      if (layer === 'base' || layer === 'device') {
        const eLayer = ['room', 'recoveryBay', 'washRoom', 'scopeLibrary', 'zoneSign', 'sign', 'corridor', 'reception'].includes(e.type) ? 'base' : 'device'
        if (eLayer !== layer) continue
        drawElement(ctx, e, zoom, { selectedId: this.selectedId?.value })
      }
    }
    // 排程层：在房间/镜位上画时段标记
    if (layer === 'schedule' && zoom >= 1) {
      const schedMap = this.scheduleIndex?.()
      for (const e of elements) {
        const slots = schedMap?.get(e.id)
        if (!slots?.length) continue
        for (const s of slots) {
          ctx.fillStyle = s.priority === 'urgent' ? 'rgba(245,34,45,0.85)' : 'rgba(22,119,255,0.85)'
          const dotX = e.x + e.w - 12 - (s.slot % 6) * 9
          const dotY = e.y + 14 + Math.floor(s.slot / 6) * 9
          ctx.beginPath()
          ctx.arc(dotX, dotY, 4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    ctx.restore()
    // 告警层不烘焙（实时脉冲），此处保留空分支以兼容缓存键
    return canvas
  }

  #elementsInBounds(bounds) {
    // 全量 2000 个做边界过滤成本很低（每瓦片一次），无需额外网格
    const out = []
    for (const e of this.elements) {
      if (e.x + e.w < bounds.x0 || e.x > bounds.x1 || e.y + e.h < bounds.y0 || e.y > bounds.y1) continue
      out.push(e)
    }
    return out
  }

  getTile(zoom, layer, tx, ty) {
    const key = this.tileKey(zoom, layer, tx, ty)
    let entry = this.cache.get(key)
    if (entry) {
      entry.lru = ++this.lruTick
      return entry.canvas
    }
    if (this.cache.size >= MAX_CACHED_TILES) {
      let oldestKey = null, oldest = Infinity
      for (const [k, v] of this.cache) {
        if (v.lru < oldest) { oldest = v.lru; oldestKey = k }
      }
      if (oldestKey) this.cache.delete(oldestKey)
    }
    const canvas = this.#renderTile(zoom, layer, tx, ty)
    this.cache.set(key, { canvas, lru: ++this.lruTick })
    return canvas
  }

  // 绘制视口。瓦片在屏幕空间用 setTransform 直接定位缩放，
  // 避免在世界变换中 drawImage 造成二次变换/瓦片缝隙
  renderVisible(mainCtx, view, vp) {
    const zoom = this.getZoomIndex()
    const { x0, y0, x1, y1 } = view
    const tx0 = Math.max(0, Math.floor(x0 / TILE_SIZE))
    const ty0 = Math.max(0, Math.floor(y0 / TILE_SIZE))
    const tx1 = Math.floor(x1 / TILE_SIZE)
    const ty1 = Math.floor(y1 / TILE_SIZE)
    // 告警层不烘焙进瓦片（需要实时脉冲动画），由 FloorCanvas 每帧叠加
    const layerOrder = ['base', 'device', 'schedule']
    const dpr = vp.dpr
    mainCtx.save()
    for (const layer of layerOrder) {
      if (layer !== 'base' && !this.layersActive[layer]) continue
      for (let tx = tx0; tx <= tx1; tx++) {
        for (let ty = ty0; ty <= ty1; ty++) {
          const tile = this.getTile(zoom, layer, tx, ty)
          const sx = tx * TILE_SIZE * vp.scale + vp.offsetX
          const sy = ty * TILE_SIZE * vp.scale + vp.offsetY
          mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
          mainCtx.drawImage(tile, sx, sy, TILE_SIZE * vp.scale, TILE_SIZE * vp.scale)
        }
      }
    }
    mainCtx.restore()
    // 还原世界变换，供后续告警/高亮实时叠加
    mainCtx.setTransform(dpr, 0, 0, dpr, vp.offsetX * dpr, vp.offsetY * dpr)
    mainCtx.scale(vp.scale, vp.scale)
  }
}
