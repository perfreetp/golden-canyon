import type { Vec3 } from '../types'

const NAMED: [Vec3, string][] = [
  [[1, 0, 0], '+X'],
  [[-1, 0, 0], '−X'],
  [[0, 1, 0], '+Y'],
  [[0, -1, 0], '−Y'],
  [[0, 0, 1], '+Z'],
  [[0, 0, -1], '−Z'],
]

/** Short human label for a rotation axis, e.g. "+X" or "(-0.7, 0, 0.7)". */
export function axisLabel(axis: Vec3): string {
  const hit = NAMED.find(([v]) => v.every((x, i) => Math.abs(x - axis[i]) < 1e-6))
  if (hit) return hit[1]
  return `(${axis.map((x) => (Math.abs(x) < 1e-6 ? 0 : x)).join(', ')})`
}

/** Plain-language meaning of an axis for a doll joint, relative to the body frame. */
export function axisHint(axis: Vec3): string {
  const label = axisLabel(axis)
  switch (label) {
    case '+X':
    case '−X':
      return '左右轴 · 前后摆动'
    case '+Y':
    case '−Y':
      return '垂直轴 · 扭转'
    case '+Z':
    case '−Z':
      return '前后轴 · 左右侧摆'
    default:
      return '复合轴'
  }
}
