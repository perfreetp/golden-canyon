/**
 * 相机：世界坐标(mm, Y 向上) ↔ 屏幕像素(左上角原点) 换算，缩放平移。
 */
export interface ViewState {
  /** 屏幕像素平移（世界原点在屏幕上的位置，含 DPR 后的设备像素） */
  panX: number
  panY: number
  /** px / mm（设备像素） */
  scale: number
}

export class Camera {
  view: ViewState = { panX: 0, panY: 0, scale: 1 }
  minScale = 0.002
  maxScale = 2
  /** 画布设备像素尺寸 */
  width = 1
  height = 1

  resize(w: number, h: number): void {
    this.width = w
    this.height = h
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: wx * this.view.scale + this.view.panX,
      y: this.height - (wy * this.view.scale + this.view.panY),
    }
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.view.panX) / this.view.scale,
      y: (this.height - sy - this.view.panY) / this.view.scale,
    }
  }

  /** 以屏幕点为锚点缩放 */
  zoomAt(sx: number, sy: number, factor: number): void {
    const before = this.screenToWorld(sx, sy)
    const next = Math.min(this.maxScale, Math.max(this.minScale, this.view.scale * factor))
    this.view.scale = next
    const s = this.worldToScreen(before.x, before.y)
    this.view.panX += sx - s.x
    // panY 对应的“屏幕量”是 H - screenY，故增量为 s.y - sy
    this.view.panY += s.y - sy
  }

  pan(dxPx: number, dyPx: number): void {
    this.view.panX += dxPx
    // 屏幕向下 dy>0 时，世界内容应跟随手指，panY 反向
    this.view.panY -= dyPx
  }

  /** 让给定世界矩形完整居中显示 */
  frameRect(r: { x: number; y: number; w: number; h: number }, pad = 0.08): void {
    const sx = (this.width * (1 - pad * 2)) / Math.max(r.w, 1)
    const sy = (this.height * (1 - pad * 2)) / Math.max(r.h, 1)
    this.view.scale = Math.min(this.maxScale, Math.max(this.minScale, Math.min(sx, sy)))
    const cx = r.x + r.w / 2
    const cy = r.y + r.h / 2
    this.view.panX = this.width / 2 - cx * this.view.scale
    this.view.panY = this.height / 2 - cy * this.view.scale
  }

  /** 当前视口对应的世界矩形（用于裁剪） */
  viewportWorldRect(): { x: number; y: number; w: number; h: number } {
    const tl = this.screenToWorld(0, 0)
    const br = this.screenToWorld(this.width, this.height)
    return { x: tl.x, y: br.y, w: br.x - tl.x, h: tl.y - br.y }
  }
}
