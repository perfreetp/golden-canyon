/**
 * 均匀网格空间索引：按图元 bbox 分桶，视口裁剪与点选时只扫描候选桶。
 * 面向 2 万图元量级的静态/半静态数据，每次数据变更整体重建（O(n)）。
 */
import type { DrawingEntity, Rect, Vec2 } from '@/types'
import { pointInRect, rectsOverlap } from './geometry'

export class SpatialGrid {
  private cell = 1000 // mm
  private cols = 0
  private rows = 0
  private originX = 0
  private originY = 0
  private buckets: DrawingEntity[][] = []
  private all: DrawingEntity[] = []

  build(entities: DrawingEntity[]): void {
    this.all = entities
    if (entities.length === 0) {
      this.buckets = []
      this.cols = this.rows = 0
      return
    }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const e of entities) {
      minX = Math.min(minX, e.bbox.x)
      minY = Math.min(minY, e.bbox.y)
      maxX = Math.max(maxX, e.bbox.x + e.bbox.w)
      maxY = Math.max(maxY, e.bbox.y + e.bbox.h)
    }
    this.originX = minX
    this.originY = minY
    this.cell = Math.max(500, Math.round(Math.max(maxX - minX, maxY - minY) / 32) || 1000)
    this.cols = Math.max(1, Math.ceil((maxX - minX) / this.cell) + 1)
    this.rows = Math.max(1, Math.ceil((maxY - minY) / this.cell) + 1)
    this.buckets = new Array(this.cols * this.rows)
    for (const e of entities) {
      const { x0, y0, x1, y1 } = this.rangeOf(e.bbox)
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          const idx = cy * this.cols + cx
          ;(this.buckets[idx] ??= []).push(e)
        }
      }
    }
  }

  private rangeOf(r: Rect) {
    const x0 = Math.max(0, Math.floor((r.x - this.originX) / this.cell))
    const y0 = Math.max(0, Math.floor((r.y - this.originY) / this.cell))
    const x1 = Math.min(
      this.cols - 1,
      Math.floor((r.x + r.w - this.originX) / this.cell),
    )
    const y1 = Math.min(
      this.rows - 1,
      Math.floor((r.y + r.h - this.originY) / this.cell),
    )
    return { x0, y0, x1, y1 }
  }

  /** 视口矩形内候选图元（去重） */
  queryRect(view: Rect): DrawingEntity[] {
    if (this.all.length === 0) return []
    if (this.buckets.length === 0) return this.all
    const { x0, y0, x1, y1 } = this.rangeOf(view)
    const seen = new Set<DrawingEntity>()
    const out: DrawingEntity[] = []
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const bucket = this.buckets[cy * this.cols + cx]
        if (!bucket) continue
        for (const e of bucket) {
          if (!seen.has(e) && rectsOverlap(e.bbox, view)) {
            seen.add(e)
            out.push(e)
          }
        }
      }
    }
    return out
  }

  /** 点附近候选图元（bbox 粗筛，精确判定由 hitTest 完成） */
  queryPoint(p: Vec2, pad: number): DrawingEntity[] {
    const view: Rect = { x: p.x - pad, y: p.y - pad, w: pad * 2, h: pad * 2 }
    if (this.buckets.length === 0) return this.all.filter((e) => pointInRect(p, e.bbox, pad))
    return this.queryRect(view)
  }

  get size(): number {
    return this.all.length
  }
}
