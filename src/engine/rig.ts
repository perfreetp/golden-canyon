import type { FigureModel, JointDef, PartDef, Pose, Vec3 } from '../types'
import type { PlacedAccessory } from './assembly'
import {
  QUAT_ID,
  type Capsule,
  type Quat,
  capsulePenetration,
  quatAxisAngle,
  quatMul,
  quatRotate,
  vadd,
} from './math'

export interface JointTransform {
  id: string
  pos: Vec3
  quat: Quat
  localQuat: Quat
  parent: string | null
}

export interface WorldCapsule extends Capsule {
  key: string
  name: string
  color: string
  group: string
  jointId: string
  source: 'model' | 'accessory'
  accessoryId?: string
  /** rest-space endpoints & orientation, used for gizmos */
  ownerJoint: string
}

export interface Clash {
  aKey: string
  bKey: string
  aName: string
  bName: string
  aGroup: string
  bGroup: string
  aSource: 'model' | 'accessory'
  bSource: 'model' | 'accessory'
  depth: number
  gap: number
  point: Vec3
}

export const DEG2RAD = Math.PI / 180

/** Build a pose object with every DOF at 0 where the range allows it, else nearest bound. */
export function neutralPose(model: FigureModel): Pose {
  const pose: Pose = {}
  for (const j of model.joints) {
    pose[j.id] = j.dofs.map((d) => Math.min(d.max, Math.max(d.min, 0)))
  }
  return pose
}

export function clampPose(model: FigureModel, pose: Pose): Pose {
  const out: Pose = {}
  for (const j of model.joints) {
    const src = pose[j.id] ?? []
    out[j.id] = j.dofs.map((d, i) => {
      const raw = Number.isFinite(src[i]) ? src[i] : 0
      return Math.min(d.max, Math.max(d.min, raw))
    })
  }
  return out
}

export function localQuat(joint: JointDef, angles: number[] = []): Quat {
  let q: Quat = QUAT_ID
  joint.dofs.forEach((d, i) => {
    const a = angles[i] ?? 0
    if (Math.abs(a) > 1e-6) q = quatMul(q, quatAxisAngle(d.axis, a * DEG2RAD))
  })
  return q
}

/** World-space axis for DOF `index`, accounting for the DOFs applied before it. */
export function dofWorldAxis(joint: JointDef, parentQuat: Quat, angles: number[], index: number): Vec3 {
  let q: Quat = parentQuat
  for (let i = 0; i < index; i++) {
    const a = angles[i] ?? 0
    if (Math.abs(a) > 1e-6) q = quatMul(q, quatAxisAngle(joint.dofs[i].axis, a * DEG2RAD))
  }
  return quatRotate(q, joint.dofs[index].axis)
}

export class Rig {
  model: FigureModel
  jointMap = new Map<string, JointDef>()
  partMap = new Map<string, PartDef>()
  order: string[] = []
  children = new Map<string, string[]>()
  roots: string[] = []
  /** Opposite of children: joint -> parent joint id */
  parentOf = new Map<string, string | null>()

  constructor(model: FigureModel) {
    this.model = model
    for (const j of model.joints) {
      this.jointMap.set(j.id, j)
      this.children.set(j.id, [])
    }
    for (const p of model.parts) this.partMap.set(p.id, p)
    for (const j of model.joints) {
      this.parentOf.set(j.id, j.parent)
      if (j.parent) this.children.get(j.parent)?.push(j.id)
      else this.roots.push(j.id)
    }
    // topological order (breadth first from roots)
    const seen = new Set<string>()
    const queue = [...this.roots]
    while (queue.length) {
      const id = queue.shift()!
      if (seen.has(id)) continue
      seen.add(id)
      this.order.push(id)
      for (const c of this.children.get(id) ?? []) queue.push(c)
    }
    // orphan safety
    for (const j of model.joints) if (!seen.has(j.id)) this.order.push(j.id)
  }

  ancestors(id: string | null): string[] {
    const out: string[] = []
    let cur = id
    while (cur) {
      out.push(cur)
      cur = this.parentOf.get(cur) ?? null
    }
    return out
  }

  isRelated(a: string, b: string): boolean {
    if (a === b) return true
    return this.ancestors(a).includes(b) || this.ancestors(b).includes(a)
  }

  solve(pose: Pose): Map<string, JointTransform> {
    const out = new Map<string, JointTransform>()
    for (const id of this.order) {
      const j = this.jointMap.get(id)!
      const angles = pose[id] ?? []
      const lq = localQuat(j, angles)
      const parentId = j.parent
      const parentT = parentId ? out.get(parentId) : undefined
      if (!parentT || !parentId) {
        out.set(id, { id, pos: j.pivot, quat: lq, localQuat: lq, parent: null })
      } else {
        const pj = this.jointMap.get(parentId)!
        const offset: Vec3 = [j.pivot[0] - pj.pivot[0], j.pivot[1] - pj.pivot[1], j.pivot[2] - pj.pivot[2]]
        const pos = vadd(parentT.pos, quatRotate(parentT.quat, offset))
        out.set(id, { id, pos, quat: quatMul(parentT.quat, lq), localQuat: lq, parent: parentId })
      }
    }
    return out
  }

  partCapsules(transforms: Map<string, JointTransform>, skipJoints: Set<string>): WorldCapsule[] {
    const out: WorldCapsule[] = []
    for (const part of this.model.parts) {
      if (skipJoints.has(part.jointId)) continue
      const t = transforms.get(part.jointId)
      if (!t) continue
      out.push({
        key: part.id,
        name: part.name,
        color: part.color,
        group: part.group,
        jointId: part.jointId,
        source: 'model',
        ownerJoint: part.jointId,
        a: vadd(t.pos, quatRotate(t.quat, part.a)),
        b: vadd(t.pos, quatRotate(t.quat, part.b)),
        r: part.radius,
      })
    }
    return out
  }

  /** World capsules for every equipped accessory, using resolved frames. */
  accessoryCapsules(placed: PlacedAccessory[]): WorldCapsule[] {
    const out: WorldCapsule[] = []
    for (const p of placed) {
      for (let i = 0; i < p.acc.proxies.length; i++) {
        const px = p.acc.proxies[i]
        if (!px.collide) continue
        out.push({
          key: `acc:${p.acc.id}:${i}:${p.slot}`,
          name: px.name && px.name !== p.acc.name ? `${p.acc.name}·${px.name}` : p.acc.name,
          color: px.color,
          group: '配件',
          jointId: p.jointId,
          source: 'accessory',
          accessoryId: p.acc.id,
          ownerJoint: p.jointId,
          a: vadd(p.pos, quatRotate(p.quat, px.a)),
          b: vadd(p.pos, quatRotate(p.quat, px.b)),
          r: px.radius,
        })
      }
    }
    return out
  }

  /** Key set for model-declared mated seams. */
  matedPairs(): Set<string> {
    const s = new Set<string>()
    for (const p of this.model.ignorePairs) {
      s.add(`${p.pair[0]}|${p.pair[1]}`)
      s.add(`${p.pair[1]}|${p.pair[0]}`)
    }
    return s
  }

  /**
   * Candidate collision pairs.
   * - rigidly co-located capsules (same joint) never collide
   * - model-declared mated seams are skipped
   * - an accessory's declared mated parts (the wrist it sleeves onto, the
   *   fist a weapon sits in) are skipped
   * - ancestor/descendant parts ARE checked: forearm folding into biceps,
   *   thigh driving into the skirt is exactly what we are here to catch
   */
  pairList(caps: WorldCapsule[], matedKeys: Set<string> = new Set()): [number, number][] {
    const ignored = this.matedPairs()
    const pairs: [number, number][] = []
    for (let i = 0; i < caps.length; i++) {
      for (let j = i + 1; j < caps.length; j++) {
        const A = caps[i]
        const B = caps[j]
        if (A.jointId === B.jointId) continue
        if (A.source === 'accessory' && B.source === 'accessory' && A.accessoryId === B.accessoryId)
          continue
        if (ignored.has(`${A.key}|${B.key}`)) continue
        if (matedKeys.has(`${A.key}|${B.key}`) || matedKeys.has(`${B.key}|${A.key}`)) continue
        pairs.push([i, j])
      }
    }
    return pairs
  }

  detect(caps: WorldCapsule[], pairs: [number, number][]): Clash[] {
    const out: Clash[] = []
    for (const [i, j] of pairs) {
      const A = caps[i]
      const B = caps[j]
      const res = capsulePenetration(A, B)
      if (res.depth > 0) {
        out.push({
          aKey: A.key,
          bKey: B.key,
          aName: A.name,
          bName: B.name,
          aGroup: A.group,
          bGroup: B.group,
          aSource: A.source,
          bSource: B.source,
          depth: res.depth,
          gap: res.gap,
          point: res.point,
        })
      }
    }
    out.sort((x, y) => y.depth - x.depth)
    return out
  }
}

/** Minimum signed clearance across checked pairs (mm). */
export function minClearance(caps: WorldCapsule[], pairs: [number, number][]): number {
  let min = Infinity
  for (const [i, j] of pairs) {
    const res = capsulePenetration(caps[i], caps[j])
    if (res.gap < min) min = res.gap
  }
  return Number.isFinite(min) ? min : 0
}

