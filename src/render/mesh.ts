/**
 * 世界坐标三角化工具：把粗线/矩形/圆转成顶点三元组（每 3 个顶点一个三角形）。
 * WebGL 端只做世界→裁剪空间变换，所有几何在 CPU 侧按当前相机生成。
 */
import type { Vec2 } from '@/types'

export interface MeshBuilder {
  vertices: number[]
  addTri(a: Vec2, b: Vec2, c: Vec2): void
  addQuad(a: Vec2, b: Vec2, c: Vec2, d: Vec2): void
  addPolygon(points: Vec2[]): void
  addRectCorners(corners: Vec2[]): void
  addCircle(cx: number, cy: number, r: number, segments?: number): void
  addRing(cx: number, cy: number, rOuter: number, rInner: number, segments?: number): void
  /** 粗折线（miter 接头，clamp 防尖角过长） */
  addPolyline(points: Vec2[], widthMm: number, closed: boolean): void
  /** 末端箭头三角形 */
  addArrowHead(end: Vec2, prev: Vec2, sizeMm: number): void
}

export function createMeshBuilder(): MeshBuilder {
  const vertices: number[] = []
  const push = (p: Vec2) => vertices.push(p.x, p.y)
  return {
    vertices,
    addTri(a, b, c) {
      push(a)
      push(b)
      push(c)
    },
    addQuad(a, b, c, d) {
      push(a)
      push(b)
      push(c)
      push(a)
      push(c)
      push(d)
    },
    addPolygon(points) {
      for (let i = 1; i < points.length - 1; i++) {
        push(points[0])
        push(points[i])
        push(points[i + 1])
      }
    },
    addRectCorners(corners) {
      this.addQuad(corners[0], corners[1], corners[2], corners[3])
    },
    addCircle(cx, cy, r, segments = 20) {
      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2
        const a1 = ((i + 1) / segments) * Math.PI * 2
        this.addTri(
          { x: cx, y: cy },
          { x: cx + Math.cos(a0) * r, y: cy + Math.sin(a0) * r },
          { x: cx + Math.cos(a1) * r, y: cy + Math.sin(a1) * r },
        )
      }
    },
    addRing(cx, cy, rOuter, rInner, segments = 24) {
      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2
        const a1 = ((i + 1) / segments) * Math.PI * 2
        const o0 = { x: cx + Math.cos(a0) * rOuter, y: cy + Math.sin(a0) * rOuter }
        const o1 = { x: cx + Math.cos(a1) * rOuter, y: cy + Math.sin(a1) * rOuter }
        const i0 = { x: cx + Math.cos(a0) * rInner, y: cy + Math.sin(a0) * rInner }
        const i1 = { x: cx + Math.cos(a1) * rInner, y: cy + Math.sin(a1) * rInner }
        this.addQuad(o0, o1, i1, i0)
      }
    },
    addPolyline(points, widthMm, closed) {
      if (points.length < 2) return
      const half = widthMm / 2
      const n = points.length
      const count = closed ? n : n - 1
      /** 取第 i 段单位方向与法线 */
      const seg = (i: number) => {
        const a = points[i]
        const b = points[(i + 1) % n]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const len = Math.hypot(dx, dy) || 1
        const ux = dx / len
        const uy = dy / len
        // 左侧法线
        return { ux, uy, nx: -uy, ny: ux }
      }
      /** 第 i 个节点的左右偏移点 */
      const joint = (i: number): [Vec2, Vec2] => {
        const p = points[i]
        const prevIdx = (i - 1 + count) % count
        const nextIdx = i % count
        const sp = seg(prevIdx)
        const isEnd = !closed && (i === 0 || i === n - 1)
        if (isEnd) {
          const s = i === 0 ? seg(0) : seg(count - 1)
          return [
            { x: p.x + s.nx * half, y: p.y + s.ny * half },
            { x: p.x - s.nx * half, y: p.y - s.ny * half },
          ]
        }
        const sn = seg(nextIdx)
        // 切线 = 相邻段方向平均
        let tx = sp.ux + sn.ux
        let ty = sp.uy + sn.uy
        const tlen = Math.hypot(tx, ty)
        if (tlen < 1e-6) {
          return [
            { x: p.x + sn.nx * half, y: p.y + sn.ny * half },
            { x: p.x - sn.nx * half, y: p.y - sn.ny * half },
          ]
        }
        tx /= tlen
        ty /= tlen
        const mx = -ty
        const my = tx
        // miter 长度
        let miter = half / Math.max(0.2, Math.abs(mx * sp.nx + my * sp.ny))
        miter = Math.min(miter, half * 2.5) // clamp，尖角退化为近似 bevel
        return [
          { x: p.x + mx * miter, y: p.y + my * miter },
          { x: p.x - mx * miter, y: p.y - my * miter },
        ]
      }
      const left: Vec2[] = []
      const right: Vec2[] = []
      const jointCount = closed ? n : n
      for (let i = 0; i < jointCount; i++) {
        const [l, r] = joint(i)
        left.push(l)
        right.push(r)
      }
      for (let i = 0; i < count; i++) {
        const j = (i + 1) % n
        this.addQuad(left[i], right[i], right[j], left[j])
      }
    },
    addArrowHead(end, prev, sizeMm) {
      const dx = end.x - prev.x
      const dy = end.y - prev.y
      const len = Math.hypot(dx, dy) || 1
      const ux = dx / len
      const uy = dy / len
      const nx = -uy
      const ny = ux
      const base = { x: end.x - ux * sizeMm, y: end.y - uy * sizeMm }
      const w = sizeMm * 0.45
      this.addTri(
        end,
        { x: base.x + nx * w, y: base.y + ny * w },
        { x: base.x - nx * w, y: base.y - ny * w },
      )
    },
  }
}
