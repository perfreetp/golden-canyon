/**
 * WebGL2 渲染器
 *
 * 性能策略（支撑单图 2 万图元）：
 * 1. SpatialGrid 视口裁剪，视口外图元不进入绘制流程；
 * 2. LOD：低倍(scale < LOD0_SCALE)只画房间轮廓与主干流线，设备/标注全部跳过；
 * 3. 按颜色合批，全图通常只有十几次 draw call；
 * 4. 动态 VBO 每帧重建（2 万图元视口可见部分通常 < 数千，顶点量可控）；
 * 5. 文字标注走叠加的 2D Canvas，不进 GL 管线。
 */
import type { Drawing, DrawingEntity, LayerKey, Rect, Vec2 } from '@/types'
import { Camera } from './camera'
import { createMeshBuilder, type MeshBuilder } from './mesh'
import {
  hitTest,
  polylineCrossings,
  rectsOverlap,
  rotatedRectCorners,
} from './geometry'
import { SpatialGrid } from './spatial-grid'
import { CROSSING_COLOR, HOVER_COLOR, LAYER_DEFS, SELECT_COLOR } from './layers'

const VERT_SRC = `#version 300 es
layout(location=0) in vec2 a_pos;
uniform vec2 u_pan;
uniform float u_scale;
uniform vec2 u_viewport;
void main() {
  vec2 screen = vec2(a_pos.x * u_scale + u_pan.x,
                     u_viewport.y - (a_pos.y * u_scale + u_pan.y));
  vec2 ndc = screen / u_viewport * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
}`

const FRAG_SRC = `#version 300 es
precision highp float;
uniform vec4 u_color;
out vec4 outColor;
void main() { outColor = u_color; }`

/** 低倍 LOD 阈值（设备像素 / mm），低于该值仅渲染房间轮廓与主干流线 */
export const LOD0_SCALE = 0.03

interface ColorBatch {
  key: string
  color: [number, number, number, number]
  builder: MeshBuilder
}

export interface RenderStats {
  total: number
  culled: number
  lodHidden: number
  drawn: number
  drawCalls: number
  vertices: number
  fps: number
  lod: 0 | 1
}

export class WebGLRenderer {
  readonly canvas: HTMLCanvasElement
  readonly camera = new Camera()
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private vbo: WebGLBuffer
  private grid = new SpatialGrid()
  private drawing: Drawing | null = null
  private entities: DrawingEntity[] = []
  private selectedId: string | null = null
  private hoverId: string | null = null
  private crossings = new Map<string, Vec2[]>()
  private stats: RenderStats = {
    total: 0, culled: 0, lodHidden: 0, drawn: 0, drawCalls: 0, vertices: 0, fps: 0, lod: 1,
  }
  private frames = 0
  private lastFpsAt = 0
  private rafHandle = 0
  private dirty = true
  private onStats?: (s: RenderStats) => void
  /** 每帧回调（驱动 2D overlay 同步重绘） */
  onFrame?: () => void

  constructor(canvas: HTMLCanvasElement, onStats?: (s: RenderStats) => void) {
    this.canvas = canvas
    this.onStats = onStats
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    })
    if (!gl) throw new Error('当前浏览器不支持 WebGL2，请使用最新版 Chrome/Edge。')
    this.gl = gl
    this.program = this.createProgram(VERT_SRC, FRAG_SRC)
    this.vbo = gl.createBuffer()!
    gl.useProgram(this.program)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  }

  private createProgram(vs: string, fs: string): WebGLProgram {
    const gl = this.gl
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error('着色器编译失败: ' + gl.getShaderInfoLog(sh))
      }
      return sh
    }
    const p = gl.createProgram()!
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs))
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('着色器链接失败: ' + gl.getProgramInfoLog(p))
    }
    return p
  }

  /** 加载图纸并重建空间索引、重算洁污交叉 */
  setDrawing(drawing: Drawing): void {
    this.drawing = drawing
    this.entities = drawing.entities
    this.grid.build(this.entities)
    this.recomputeCrossings()
    this.selectedId = null
    this.invalidate()
  }

  /** 数据增量变更后重建索引（保存/删除图元后调用） */
  rebuildIndex(): void {
    if (this.drawing) {
      this.entities = this.drawing.entities
      this.grid.build(this.entities)
      this.recomputeCrossings()
    }
    this.invalidate()
  }

  setSelected(id: string | null): void {
    this.selectedId = id
    this.invalidate()
  }

  setHover(id: string | null): void {
    if (this.hoverId !== id) {
      this.hoverId = id
      this.invalidate()
    }
  }

  invalidate(): void {
    this.dirty = true
  }

  start(): void {
    const loop = (t: number) => {
      this.rafHandle = requestAnimationFrame(loop)
      if (this.dirty) {
        this.render()
        this.dirty = false
      }
      this.onFrame?.()
      this.frames++
      if (t - this.lastFpsAt >= 1000) {
        this.stats.fps = Math.round((this.frames * 1000) / (t - this.lastFpsAt))
        this.frames = 0
        this.lastFpsAt = t
        this.onStats?.({ ...this.stats })
      }
    }
    this.rafHandle = requestAnimationFrame(loop)
  }

  stop(): void {
    cancelAnimationFrame(this.rafHandle)
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    const w = Math.max(1, Math.round(cssW * dpr))
    const h = Math.max(1, Math.round(cssH * dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
      this.camera.resize(w, h)
      this.invalidate()
    }
  }

  /** 重算清洁/污物流线交叉点，回写到 flow.crossings */
  recomputeCrossings(): void {
    this.crossings.clear()
    if (!this.drawing) return
    // 先清空旧结果，避免删除流线后交叉点残留
    for (const e of this.entities) {
      if (e.flow) e.flow.crossings = undefined
    }
    const clean = this.entities.filter((e) => e.flow?.flowType === 'clean')
    const dirt = this.entities.filter((e) => e.flow?.flowType === 'dirt')
    for (const c of clean) {
      for (const d of dirt) {
        const hits = polylineCrossings(c.flow!.points, d.flow!.points)
        if (hits.length) {
          this.crossings.set(c.id, [...(this.crossings.get(c.id) ?? []), ...hits])
          this.crossings.set(d.id, [...(this.crossings.get(d.id) ?? []), ...hits])
          c.flow!.crossings = hits
          d.flow!.crossings = hits
        }
      }
    }
  }

  getCrossingCount(): number {
    const all = new Set<string>()
    for (const pts of this.crossings.values()) {
      for (const p of pts) all.add(`${Math.round(p.x)}_${Math.round(p.y)}`)
    }
    return all.size
  }

  private layerVisible(key: LayerKey): boolean {
    const ls = this.drawing?.layerState[key]
    return ls ? ls.visible : true
  }

  private layerOpacity(key: LayerKey): number {
    const ls = this.drawing?.layerState[key]
    return ls ? ls.opacity : 1
  }

  private batches = new Map<string, ColorBatch>()

  private batch(color: [number, number, number, number], alphaMul = 1): MeshBuilder {
    const c: [number, number, number, number] = [
      color[0], color[1], color[2], Math.min(1, color[3] * alphaMul),
    ]
    const key = c.map((v) => v.toFixed(3)).join(',')
    let b = this.batches.get(key)
    if (!b) {
      b = { key, color: c, builder: createMeshBuilder() }
      this.batches.set(key, b)
    }
    return b.builder
  }

  private render(): void {
    const gl = this.gl
    const cam = this.camera
    gl.viewport(0, 0, cam.width, cam.height)
    gl.clearColor(0.985, 0.985, 0.975, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const lod: 0 | 1 = cam.view.scale < LOD0_SCALE ? 0 : 1
    this.batches.clear()
    let drawn = 0
    let lodHidden = 0
    const view = cam.viewportWorldRect()
    const candidates = this.grid.queryRect(view)
    const culled = this.entities.length - candidates.length

    // 背景网格（世界 1m 间距，随 LOD 放大间距）
    this.buildGrid(view, lod)

    for (const e of candidates) {
      if (!this.layerVisible(e.layer)) continue
      const def = LAYER_DEFS[e.layer]
      if (lod === 0 && !def.lod0Visible) {
        lodHidden++
        continue
      }
      this.buildEntity(e, lod)
      drawn++
    }

    // 洁污交叉红点（独立批次，最上层）
    if (lod === 1) this.buildCrossingMarks()

    let totalVerts = 0
    let drawCalls = 0
    gl.useProgram(this.program)
    const panLoc = gl.getUniformLocation(this.program, 'u_pan')
    const scaleLoc = gl.getUniformLocation(this.program, 'u_scale')
    const vpLoc = gl.getUniformLocation(this.program, 'u_viewport')
    const colorLoc = gl.getUniformLocation(this.program, 'u_color')
    gl.uniform2f(panLoc, cam.view.panX, cam.view.panY)
    gl.uniform1f(scaleLoc, cam.view.scale)
    gl.uniform2f(vpLoc, cam.width, cam.height)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    // 半透明批次靠后画：先按 alpha 排序
    const ordered = [...this.batches.values()].sort((a, b) => a.color[3] - b.color[3])
    for (const b of ordered) {
      const data = new Float32Array(b.builder.vertices)
      if (data.length === 0) continue
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
      gl.uniform4f(colorLoc, b.color[0], b.color[1], b.color[2], b.color[3])
      gl.drawArrays(gl.TRIANGLES, 0, data.length / 2)
      totalVerts += data.length / 2
      drawCalls++
    }

    this.stats = {
      total: this.entities.length,
      culled,
      lodHidden,
      drawn,
      drawCalls,
      vertices: totalVerts,
      fps: this.stats.fps,
      lod,
    }
  }

  /** 自适应背景网格 */
  private buildGrid(view: Rect, lod: 0 | 1): void {
    const step = lod === 0 ? 5000 : 1000 // mm
    const x0 = Math.floor(view.x / step) * step
    const y0 = Math.floor(view.y / step) * step
    const b = this.batch([0.88, 0.88, 0.86, lod === 0 ? 0.5 : 0.9])
    const widthMm = lod === 0 ? 30 : 12
    const x1 = view.x + view.w
    const y1 = view.y + view.h
    for (let x = x0; x <= x1; x += step) {
      b.addPolyline([{ x, y: y0 }, { x, y: y1 }], widthMm, false)
    }
    for (let y = y0; y <= y1; y += step) {
      b.addPolyline([{ x: x0, y }, { x: x1, y }], widthMm, false)
    }
  }

  /** 单个图元转 mesh */
  private buildEntity(e: DrawingEntity, lod: 0 | 1): void {
    const def = LAYER_DEFS[e.layer]
    const opacity = this.layerOpacity(e.layer)
    const isSelected = e.id === this.selectedId
    const isHover = e.id === this.hoverId
    const stroke: [number, number, number, number] = isSelected
      ? SELECT_COLOR
      : isHover
        ? HOVER_COLOR
        : (e.color ?? def.stroke)
    const fill: [number, number, number, number] = e.color ?? def.fill

    // 屏幕线宽换算回世界尺寸，并夹取范围，保证任何缩放下可见
    const targetPx = e.kind === 'room-outline' || e.kind === 'wall' || e.kind === 'door' ? 2 : 2.4
    let widthMm = targetPx / this.camera.view.scale
    widthMm = Math.max(8, Math.min(widthMm, 220))

    if (e.geom) {
      const g = e.geom
      const corners = rotatedRectCorners(g.cx, g.cy, g.w, g.h, g.rotation)
      if (fill[3] > 0.01) this.batch(fill, opacity).addPolygon(corners)
      this.batch(stroke, opacity).addPolyline(corners, widthMm, true)
      // 清洗槽/消毒槽内部隔档示意（中线）
      if ((e.kind === 'wash-sink' || e.kind === 'disinfect-tank') && g.w > g.h) {
        this.batch(stroke, opacity * 0.7).addPolyline(
          [{ x: g.cx, y: g.cy - g.h / 2 }, { x: g.cx, y: g.cy + g.h / 2 }],
          widthMm * 0.6,
          false,
        )
      }
      return
    }

    if (e.polyline) {
      if (e.closed && fill[3] > 0.01) {
        this.batch(fill, opacity).addPolygon(e.polyline)
      }
      this.batch(stroke, opacity).addPolyline(e.polyline, widthMm, !!e.closed)
      return
    }

    if (e.flow) {
      const pts = e.flow.points
      const flowWidth = Math.max(40, Math.min(140 / this.camera.view.scale, 260))
      this.batch(stroke, opacity).addPolyline(pts, flowWidth, false)
      // LOD0 主干流线不画箭头，减少噪声
      if (lod === 1 && pts.length >= 2) {
        const arrow = Math.max(120, flowWidth * 1.6)
        for (let i = 1; i < pts.length; i++) {
          this.batch(stroke, opacity).addArrowHead(pts[i], pts[i - 1], arrow)
        }
      }
      return
    }

    if (e.label && lod === 1) {
      // 文字由 2D overlay 绘制；此处仅占位保证图元进入统计
    }
  }

  private buildCrossingMarks(): void {
    if (!this.layerVisible('flow-clean') && !this.layerVisible('flow-dirt')) return
    const r = Math.max(60, 9 / this.camera.view.scale)
    for (const pts of this.crossings.values()) {
      for (const p of pts) {
        const b = this.batch(CROSSING_COLOR)
        b.addRing(p.x, p.y, r * 1.4, r * 0.85)
        b.addCircle(p.x, p.y, r * 0.55)
      }
    }
  }

  /** 屏幕坐标点选（css 像素），返回命中的图元 */
  pick(cssX: number, cssY: number, dpr: number): DrawingEntity | null {
    const w = this.screenToWorld(cssX * dpr, cssY * dpr)
    const tolMm = Math.max(30, 8 / this.camera.view.scale)
    const candidates = this.grid.queryPoint(w, tolMm * 4)
    // 只在可见图层中命中
    const visible = candidates.filter((e) => this.layerVisible(e.layer))
    return hitTest(visible, w, tolMm)
  }

  screenToWorld(deviceX: number, deviceY: number): Vec2 {
    return this.camera.screenToWorld(deviceX, deviceY)
  }

  /** 供 overlay 使用：视口内需要绘制文字的标注 */
  visibleLabels(): { e: DrawingEntity; screen: { x: number; y: number } }[] {
    if (this.camera.view.scale < LOD0_SCALE) return []
    const view = this.camera.viewportWorldRect()
    const out: { e: DrawingEntity; screen: { x: number; y: number } }[] = []
    for (const e of this.entities) {
      if (!e.label || !this.layerVisible(e.layer)) continue
      if (!rectsOverlap(e.bbox, view)) continue
      const s = this.camera.worldToScreen(e.label.at.x, e.label.at.y)
      out.push({ e, screen: s })
    }
    return out
  }

  getStats(): RenderStats {
    return { ...this.stats }
  }

  getDrawing(): Drawing | null {
    return this.drawing
  }

  dispose(): void {
    this.stop()
    const gl = this.gl
    gl.deleteBuffer(this.vbo)
    gl.deleteProgram(this.program)
  }
}
