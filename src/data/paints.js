// 漆号库(标准色卡)与色差计算(CIE76 ΔE)
export const PAINT_CATALOG = [
  { no: 'FS-101', name: '肌肤色',   hex: '#f2c9a8', type: '哑光' },
  { no: 'FS-102', name: '深肤阴影', hex: '#d9a075', type: '哑光' },
  { no: 'FS-201', name: '曜石黑',   hex: '#1c1c22', type: '半光' },
  { no: 'FS-202', name: '珍珠白',   hex: '#f4f1ea', type: '珠光' },
  { no: 'FS-203', name: '钢灰',     hex: '#8a8f98', type: '金属' },
  { no: 'FS-301', name: '绯红',     hex: '#c0272d', type: '亮光' },
  { no: 'FS-302', name: '酒红',     hex: '#7b1e2b', type: '半光' },
  { no: 'FS-401', name: '藏青',     hex: '#1f3a6e', type: '哑光' },
  { no: 'FS-402', name: '天青',     hex: '#6fa8dc', type: '亮光' },
  { no: 'FS-501', name: '鎏金',     hex: '#c9a227', type: '金属' },
  { no: 'FS-502', name: '古铜',     hex: '#8c6239', type: '金属' },
  { no: 'FS-601', name: '墨绿',     hex: '#2e5d3a', type: '哑光' },
  { no: 'FS-701', name: '紫罗兰',   hex: '#6b4a9e', type: '半光' },
  { no: 'FS-801', name: '炭棕',     hex: '#4a3526', type: '哑光' },
  { no: 'FS-901', name: '透明光油', hex: '#e8e6df', type: '亮光' }
]

export const GLOSS_LEVELS = ['哑光', '半光', '亮光', '珠光', '金属']

// 分色区定义:area 用于漆号用量估算(相对用量系数)
export const REGIONS = [
  { key: 'head',  name: '头雕', area: 1.0 },
  { key: 'torso', name: '躯干', area: 1.6 },
  { key: 'cape',  name: '披风', area: 2.2 },
  { key: 'base',  name: '底座', area: 1.8 }
]

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex(r, g, b) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return '#' + c(r) + c(g) + c(b)
}

function rgbToLab(r, g, b) {
  const lin = v => {
    v /= 255
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92
  }
  const rl = lin(r), gl = lin(g), bl = lin(b)
  let xx = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047
  let yy = (rl * 0.2126 + gl * 0.7152 + bl * 0.0722) / 1.0
  let zz = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883
  const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(xx), fy = f(yy), fz = f(zz)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

// CIE76 色差
export function deltaE(hexA, hexB) {
  const [r1, g1, b1] = hexToRgb(hexA)
  const [r2, g2, b2] = hexToRgb(hexB)
  const [L1, a1, b1l] = rgbToLab(r1, g1, b1)
  const [L2, a2, b2l] = rgbToLab(r2, g2, b2)
  return Math.sqrt((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1l - b2l) ** 2)
}

// 确定性伪随机(用于模拟样件实拍色差,同一单同一区域结果稳定)
export function seededRand(seedStr) {
  let h = 2166136261
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5
    return ((h >>> 0) % 10000) / 10000
  }
}

// 模拟"样件实拍"颜色:在标准色基础上加扰动,返工次数越多扰动越小(工艺改进)
export function simulateSampleColor(orderId, regionKey, standardHex, reworkCount) {
  const rnd = seededRand(`${orderId}:${regionKey}:r${reworkCount}`)
  const [r, g, b] = hexToRgb(standardHex)
  // 扰动幅度:首版可能超差(ΔE>3),返工后收敛
  const amp = [14, 9, 5, 2.5][Math.min(reworkCount, 3)]
  const dr = (rnd() - 0.5) * 2 * amp
  const dg = (rnd() - 0.5) * 2 * amp
  const db = (rnd() - 0.5) * 2 * amp
  return rgbToHex(r + dr, g + dg, b + db)
}

export function paintByNo(no) {
  return PAINT_CATALOG.find(p => p.no === no) || null
}
