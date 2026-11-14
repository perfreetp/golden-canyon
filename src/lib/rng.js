// 确定性伪随机数生成器（mulberry32），保证每次导入生成的解剖数据一致
export function makeRng(seed) {
  let a = seed >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 由 rng 派生区间随机数
export function range(rng, min, max) {
  return min + rng() * (max - min)
}

export function intRange(rng, min, max) {
  return Math.floor(range(rng, min, max + 1))
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}
