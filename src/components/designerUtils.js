// 技术员工作台的辅助函数
import { LAND_TYPES, MEASURE_TYPES } from '../lib/measures.js'
import { regionSlopeStats } from '../lib/measures.js'
import { polygonArea } from '../lib/geometry.js'

export const LAND_TYPE_ORDER = ['slopeFarm', 'wasteGrass', 'outlet', 'forest', 'shrub']

export function uidMeasure() {
  return `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000).toString(36)}`
}

export function patchSlope(dem, poly) {
  if (!dem || !poly?.length) return { mean: 0, shares: [0, 0, 0, 0] }
  return regionSlopeStats(dem, poly, 4)
}

// 该点等高线切向（长轴沿等高线）
export function contourAngleAt(dem, x, y) {
  if (!dem) return 0
  try {
    return contourTangent(dem, x, y)
  } catch {
    return 0
  }
}

// 依据地类与坡度给出建议措施
export function suggestFor(patch, stats) {
  const area = polygonArea(patch.points)
  if (area < 300) return null
  const steep = stats?.shares?.[3] || 0
  const mean = stats?.meanSlope || 0
  if (patch.landType === 'slopeFarm') {
    if (mean > 25 || steep > 0.4) return { type: 'forest', reason: '坡度大于25°，退耕还林' }
    return { type: 'terrace', reason: '坡耕地修筑水平梯田' }
  }
  if (patch.landType === 'wasteGrass') return { type: 'fishpit', reason: '荒草地鱼鳞坑整地+植草' }
  if (patch.landType === 'outlet') return null
  if (patch.landType === 'forest') return { type: 'ditch', reason: '有林地配套截水沟' }
  if (patch.landType === 'shrub') return { type: 'forest', reason: '补植水保林' }
  return null
}
