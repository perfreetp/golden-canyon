export const W = 1600
export const H = 1200
export const CHANNELS = [
  { id: 'c1', name: '青山沟主沟', pts: [[600,0,1032],[640,180,1026],[700,360,1020],[660,540,1014],[700,720,1008],[640,900,1002],[600,1080,996],[590,1200,992]] },
  { id: 'c2', name: '柳树沟主沟', pts: [[1300,0,1036],[1250,200,1030],[1190,420,1024],[1230,640,1018],[1280,860,1012],[1250,1080,1006],[1250,1200,1002]] },
  { id: 'c3', name: '青山沟西支沟', pts: [[700,360,1020],[560,480,1016],[400,600,1010],[250,700,1005]] },
]
const SEGS = []
for (const c of CHANNELS) {
  for (let i = 1; i < c.pts.length; i++) {
    const a = c.pts[i - 1], b = c.pts[i]
    SEGS.push({ c: c.id, ax: a[0], ay: a[1], az: a[2], bx: b[0], by: b[1], bz: b[2] })
  }
}
function segInfo(s, x, y) {
  const vx = s.bx - s.ax, vy = s.by - s.ay
  const t = Math.max(0, Math.min(1, ((x - s.ax) * vx + (y - s.ay) * vy) / (vx * vx + vy * vy)))
  const px = s.ax + vx * t, py = s.ay + vy * t
  return { d: Math.hypot(x - px, y - py), z: s.az + (s.bz - s.az) * t, c: s.c }
}
function channelInfo(x, y) {
  let dmin = Infinity
  const list = []
  for (const s of SEGS) {
    const r = segInfo(s, x, y)
    if (r.d < dmin) dmin = r.d
    list.push(r)
  }
  let ws = 0, zs = 0
  for (const r of list) {
    const w = Math.exp(-(r.d - dmin) / 85)
    ws += w
    zs += w * r.z
  }
  return { d: dmin, z: zs / ws }
}
const rise = (d) => {
  const seg = (a, b, ang) => Math.max(0, Math.min(d, b) - a) * Math.tan((ang * Math.PI) / 180)
  return seg(0, 60, 2.0) + seg(60, 175, 9.0) + seg(175, 300, 19) + seg(270, 5000, 28.5)
}
function hash(i, j) { const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h) }
function vnoise(x, y) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1)
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy
}
function fbm(x, y) { let s = 0, a = 0.5, f = 1; for (let k = 0; k < 4; k++) { s += a * (vnoise(x * f, y * f) - 0.5); f *= 2.03; a *= 0.5 } return s }
const g2 = (x, y, cx, cy, sx, sy) => Math.exp(-Math.pow((x - cx) / sx, 2) - Math.pow((y - cy) / sy, 2))
const shelfAmt = (x, y) => Math.max(
  g2(x, y, 890, 268, 108, 84), g2(x, y, 352, 792, 104, 86), g2(x, y, 1074, 764, 96, 78),
  g2(x, y, 1236, 452, 82, 72), g2(x, y, 252, 316, 82, 70))

const smoothstep=(t)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
export function elev(x, y) {
  const { d, z } = channelInfo(x, y)
  const mod = 1 + 0.22 * fbm(x / 300, y / 300)
  const hillside = z + rise(d) * mod
  // 天然缓坡台地：局部坡度约 3°
  const sh = smoothstep((shelfAmt(x, y) - 0.12) / 0.78) * 0.85
  const shelfZ = z + rise(Math.min(d, 260)) * 0.13 + 6 * smoothstep(d / 300)
  let zz = hillside * (1 - sh) + shelfZ * sh
  zz += fbm(x / 420, y / 420) * 3.0 + fbm(x / 150, y / 150) * 0.9
  return zz
}
export function slopeDeg(x, y) {
  const h = 4
  return Math.atan(Math.hypot((elev(x + h, y) - elev(x - h, y)) / (2 * h), (elev(x, y + h) - elev(x, y - h)) / (2 * h))) * 180 / Math.PI
}
