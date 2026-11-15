export type Vec3 = [number, number, number]
export type Quat = [number, number, number, number] // x,y,z,w

export const v = (x: number, y: number, z: number): Vec3 => [x, y, z]

export const vadd = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const vsub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const vmul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
export const vdot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const vcross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
export const vlen = (a: Vec3): number => Math.hypot(a[0], a[1], a[2])
export const vdist = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
export function vnorm(a: Vec3): Vec3 {
  const l = vlen(a)
  return l < 1e-9 ? [0, 1, 0] : [a[0] / l, a[1] / l, a[2] / l]
}
export const vlerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]
export const vround = (a: Vec3, d = 1): Vec3 => {
  const p = 10 ** d
  return [Math.round(a[0] * p) / p, Math.round(a[1] * p) / p, Math.round(a[2] * p) / p]
}

export const DEG = Math.PI / 180
export const RAD = 180 / Math.PI

export function quatAxisAngle(axis: Vec3, rad: number): Quat {
  const n = vnorm(axis)
  const s = Math.sin(rad / 2)
  return [n[0] * s, n[1] * s, n[2] * s, Math.cos(rad / 2)]
}

export function quatMul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a
  const [bx, by, bz, bw] = b
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ]
}

export function quatRotate(q: Quat, p: Vec3): Vec3 {
  const [x, y, z, w] = q
  // t = 2 * cross(q.xyz, p)
  const tx = 2 * (y * p[2] - z * p[1])
  const ty = 2 * (z * p[0] - x * p[2])
  const tz = 2 * (x * p[1] - y * p[0])
  return [
    p[0] + w * tx + (y * tz - z * ty),
    p[1] + w * ty + (z * tx - x * tz),
    p[2] + w * tz + (x * ty - y * tx),
  ]
}

export const QUAT_ID: Quat = [0, 0, 0, 1]

export function quatFromEulerDeg(e: Vec3): Quat {
  const qx = quatAxisAngle([1, 0, 0], e[0] * DEG)
  const qy = quatAxisAngle([0, 1, 0], e[1] * DEG)
  const qz = quatAxisAngle([0, 0, 1], e[2] * DEG)
  return quatMul(quatMul(qz, qy), qx)
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x
}

export const round2 = (x: number) => Math.round(x * 100) / 100

// --- segment / capsule ---

export interface Capsule {
  a: Vec3
  b: Vec3
  r: number
}

/** Closest points between two segments (Ericson, Real-Time Collision Detection 5.1.9). */
export function closestSegSeg(
  p1: Vec3,
  q1: Vec3,
  p2: Vec3,
  q2: Vec3,
): { c1: Vec3; c2: Vec3; dist: number } {
  const d1 = vsub(q1, p1)
  const d2 = vsub(q2, p2)
  const r = vsub(p1, p2)
  const a = vdot(d1, d1)
  const e = vdot(d2, d2)
  const f = vdot(d2, r)
  const EPS = 1e-9
  let s: number
  let t: number
  if (a <= EPS && e <= EPS) {
    s = 0
    t = 0
  } else if (a <= EPS) {
    s = 0
    t = clamp(f / e, 0, 1)
  } else {
    const c = vdot(d1, r)
    if (e <= EPS) {
      t = 0
      s = clamp(-c / a, 0, 1)
    } else {
      const b = vdot(d1, d2)
      const denom = a * e - b * b
      s = denom !== 0 ? clamp((b * f - c * e) / denom, 0, 1) : 0
      t = (b * s + f) / e
      if (t < 0) {
        t = 0
        s = clamp(-c / a, 0, 1)
      } else if (t > 1) {
        t = 1
        s = clamp((b - c) / a, 0, 1)
      }
    }
  }
  const c1 = vadd(p1, vmul(d1, s))
  const c2 = vadd(p2, vmul(d2, t))
  return { c1, c2, dist: vdist(c1, c2) }
}

/** Penetration depth of two capsules; 0 when separated. */
export function capsulePenetration(A: Capsule, B: Capsule) {
  const { c1, c2, dist } = closestSegSeg(A.a, A.b, B.a, B.b)
  const depth = A.r + B.r - dist
  return {
    depth: depth > 0 ? depth : 0,
    gap: dist - A.r - B.r,
    point: vlerp(c1, c2, A.r + B.r > 1e-9 ? A.r / (A.r + B.r) : 0.5),
  }
}
