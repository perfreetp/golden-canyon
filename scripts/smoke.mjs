// 纯逻辑冒烟测试（node --input-type=module 风格，独立运行）
import { generateSeries, LAYERS } from '../src/lib/data.js'
import { scoreAnswer, hitTest, polygonArea, bboxOf } from '../src/lib/geometry.js'

const series = generateSeries(20261115)
console.log('层数:', series.sliceCount)
console.log('要素总数:', series.structures.length)
console.log('各图层:', series.countByLayer)

let low = 0, high = 0
const perSlice = new Array(series.sliceCount).fill(0)
for (const s of series.structures) {
  if (s.lod === 'low') low++; else high++
  perSlice[s.slice]++
  if (!s.bbox) throw new Error('缺少 bbox: ' + s.id)
}
console.log('低倍要素:', low, '高倍要素:', high)
console.log('每层 min/max 要素:', Math.min(...perSlice), Math.max(...perSlice))

// 结构 id 唯一性
const ids = new Set(series.structures.map((s) => s.id))
if (ids.size !== series.structures.length) throw new Error('id 重复')

// 点选命中测试
const sample = series.structures.find((s) => s.shape.kind === 'ellipse')
const center = { x: sample.shape.cx, y: sample.shape.cy }
if (!hitTest(sample.shape, center.x, center.y, 4)) throw new Error('椭圆中心应命中')
const line = series.structures.find((s) => s.shape.kind === 'polyline')
const p0 = line.shape.points[0]
if (!hitTest(line.shape, p0.x, p0.y, 4)) throw new Error('血管端点应命中')

// 评分：完全重合应得满分
const q = { pts: null }
const poly = series.structures.find((s) => s.shape.kind === 'polygon').shape.points
const perfect = scoreAnswer(poly, poly, 16, 10)
console.log('完全重合:', perfect.autoScore, 'IoU', perfect.iou.toFixed(3), '超差区', perfect.referenceRegions.length)
if (perfect.autoScore !== 10) throw new Error('完全重合应满分')

// 评分：偏移答案应扣分
const shifted = poly.map((p) => ({ x: p.x + 60, y: p.y + 40 }))
const shiftedScore = scoreAnswer(shifted, poly, 16, 10)
console.log('偏移作答:', shiftedScore.autoScore, 'IoU', shiftedScore.iou.toFixed(3),
  '召回', shiftedScore.recall.toFixed(3), '超差区', shiftedScore.referenceRegions.length)
if (shiftedScore.autoScore >= 10) throw new Error('偏移作答不应满分')
if (shiftedScore.referenceRegions.length === 0) throw new Error('偏移作答应有超差参考区')

// 容差放大应提分
const loose = scoreAnswer(shifted, poly, 80, 10)
console.log('宽容差:', loose.autoScore, 'vs 标准容差:', shiftedScore.autoScore)
if (loose.autoScore <= shiftedScore.autoScore) throw new Error('容差半径增大应提分')

// 空答案
const empty = scoreAnswer([{ x: 0, y: 0 }], poly, 16, 10)
console.log('退化答案评分:', empty.autoScore)

console.log('bbox 面积示例:', Math.round(polygonArea(poly)), 'bbox:', JSON.stringify(bboxOf({ kind: 'polygon', points: poly })))
console.log('\\n✅ 全部冒烟测试通过')
