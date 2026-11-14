// 确定性随机数（mulberry32），保证每次刷新生成的平面图与演示数据一致
export function createRng(seed) {
  let a = seed >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1))
}

export function chance(rng, p) {
  return rng() < p
}

let uidCounter = 0
export function uid(prefix = 'id') {
  uidCounter += 1
  return `${prefix}-${uidCounter.toString(36)}${Date.now().toString(36).slice(-4)}`
}

// 简单中文姓名生成（演示用，脱敏假名）
const SURNAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章'
const GIVEN = '伟芳娜敏静丽强磊军洋勇艳杰娟涛明超秀兰霞平刚桂英华玉萍红娥玲芬燕鹏浩宇欣怡子轩'
export function fakeName(rng) {
  return SURNAMES[Math.floor(rng() * SURNAMES.length)] +
    GIVEN[Math.floor(rng() * GIVEN.length)] +
    (rng() < 0.35 ? GIVEN[Math.floor(rng() * GIVEN.length)] : '')
}

export function maskName(name) {
  if (!name) return ''
  if (name.length <= 1) return name
  return name[0] + '*'.repeat(name.length - 1)
}
