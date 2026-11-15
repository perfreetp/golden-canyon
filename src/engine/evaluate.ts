import type {
  Accessory,
  Assembly,
  FigureModel,
  InterferenceRecord,
  InterfaceRecord,
  JointMarginRow,
  Pose,
} from '../types'
import { resolveAssembly } from './assembly'
import type { PlacedAccessory } from './assembly'
import { Rig, type WorldCapsule } from './rig'
import { capsulePenetration, round2, vdist } from './math'

/** a penetration deeper than this is a release blocker */
export const PENETRATION_LIMIT = 0.3
/** joints closer than this to a limit are flagged as low margin */
export const MARGIN_WARN = 8

export interface BuildResult {
  rig: Rig
  transforms: ReturnType<Rig['solve']>
  placed: PlacedAccessory[]
  interfaces: InterfaceRecord[]
  notices: string[]
  capsules: WorldCapsule[]
  matedKeys: Set<string>
}

/**
 * Build world geometry and the set of pairs that are intentionally in contact.
 * Seated joints are exempt: a hand sleeves over its wrist, a weapon's grip sits
 * inside the fist that holds it.
 */
export function buildGeometry(
  model: FigureModel,
  accessories: Accessory[],
  pose: Pose,
  assembly: Assembly,
): BuildResult {
  const rig = new Rig(model)
  const transforms = rig.solve(pose)
  const { placed, interfaces, notices } = resolveAssembly(model, accessories, assembly, transforms)

  const body = rig.partCapsules(transforms, new Set())
  const acc = rig.accessoryCapsules(placed)
  const capsules = [...body, ...acc]

  const mated = new Set<string>()
  for (const p of placed) {
    for (let i = 0; i < p.acc.proxies.length; i++) {
      const key = `acc:${p.acc.id}:${i}:${p.slot}`
      for (const partId of p.acc.matedParts) mated.add(`${key}|${partId}`)
    }
  }
  // weapon ↔ the hand holding it
  const hand = placed.find((p) => p.acc.category === '手型' && p.slot === 'wrist_R')
  const weapon = placed.find((p) => p.acc.category === '武器')
  if (hand && weapon) {
    for (let i = 0; i < weapon.acc.proxies.length; i++) {
      for (let j = 0; j < hand.acc.proxies.length; j++) {
        mated.add(
          `acc:${weapon.acc.id}:${i}:${weapon.slot}|acc:${hand.acc.id}:${j}:${hand.slot}`,
        )
      }
    }
  }
  // a pedestal is a fixture the figure stands on; hide it from the sole check
  const base = placed.find((p) => p.acc.category === '底座')
  if (base) {
    for (let i = 0; i < base.acc.proxies.length; i++) {
      for (const partId of ['p_foot_L', 'p_foot_R']) {
        mated.add(`acc:${base.acc.id}:${i}:${base.slot}|${partId}`)
      }
    }
  }

  return { rig, transforms, placed, interfaces, notices, capsules, matedKeys: mated }
}

export function detectInterferences(build: BuildResult): InterferenceRecord[] {
  const { rig, capsules, matedKeys } = build
  const pairs = rig.pairList(capsules, matedKeys)
  const clashes = rig.detect(capsules, pairs)
  const seen = new Set<string>()
  const out: InterferenceRecord[] = []
  for (const c of clashes) {
    const id = [c.aKey, c.bKey].sort().join('~')
    if (seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      partA: c.aName,
      partB: c.bName,
      aKey: c.aKey,
      bKey: c.bKey,
      depth: round2(c.depth),
      groupA: c.aGroup as InterferenceRecord['groupA'],
      groupB: c.bGroup as InterferenceRecord['groupB'],
      severity: c.depth > PENETRATION_LIMIT ? 'severe' : 'minor',
      source: c.aSource === 'accessory' || c.bSource === 'accessory' ? 'accessory' : 'model',
    })
  }
  return out
}

export function computeClearance(build: BuildResult): number {
  const { rig, capsules, matedKeys } = build
  const pairs = rig.pairList(capsules, matedKeys)
  let min = Infinity
  for (const [i, j] of pairs) {
    const res = capsulePenetration(capsules[i], capsules[j])
    if (res.gap < min) min = res.gap
  }
  return Number.isFinite(min) ? round2(min) : 0
}

/**
 * Remaining travel for one DOF at `cur`.
 * A one-sided range (0..75° abduction, 0..120° elbow flexion) rests ON its
 * lower bound, so only the far bound is a real constraint; measuring to the
 * rest bound would report 0° margin for every neutral pose.
 */
export function dofMargin(d: { min: number; max: number }, cur: number): number {
  if (d.min === 0 && d.max > 0) return d.max - cur
  if (d.max === 0 && d.min < 0) return cur - d.min
  return Math.min(cur - d.min, d.max - cur)
}

/**
 * Angle margin per DOF.
 * A one-sided range (0..75° abduction, 0..120° elbow flexion) has its rest
 * position ON the lower bound, so only the far bound is a real constraint —
 * measuring distance to the rest bound would warn on every neutral pose.
 */
export function computeMargins(model: FigureModel, pose: Pose): JointMarginRow[] {
  const rows: JointMarginRow[] = []
  for (const j of model.joints) {
    const angles = pose[j.id] ?? []
    j.dofs.forEach((d, i) => {
      const cur = angles[i] ?? 0
      const margin = dofMargin(d, cur)
      rows.push({
        jointId: j.id,
        jointName: j.name,
        code: j.code,
        kind: j.kind,
        dofLabel: d.label,
        axis: d.axis,
        current: round2(cur),
        min: d.min,
        max: d.max,
        margin: round2(margin),
        status: margin < 0 ? 'over' : margin < MARGIN_WARN ? 'warn' : 'ok',
      })
    })
  }
  return rows
}

export interface CheckResult {
  margins: JointMarginRow[]
  interferences: InterferenceRecord[]
  interfaces: InterfaceRecord[]
  minClearance: number
  severe: InterferenceRecord[]
  lowMargin: JointMarginRow[]
  uncalibrated: string[]
  interfaceFails: InterfaceRecord[]
  pass: boolean
  blockers: string[]
  warnings: string[]
}

export function runCheck(
  model: FigureModel,
  accessories: Accessory[],
  pose: Pose,
  assembly: Assembly,
): { result: CheckResult; build: BuildResult } {
  const build = buildGeometry(model, accessories, pose, assembly)
  const margins = computeMargins(model, pose)
  const interferences = detectInterferences(build)
  const minClearance = computeClearance(build)
  const severe = interferences.filter((i) => i.severity === 'severe')
  const lowMargin = margins.filter((m) => m.status !== 'ok')
  const uncalibrated = model.joints.filter((j) => !j.calibrated).map((j) => j.name)
  const interfaceFails = build.interfaces.filter((i) => !i.ok)

  // Hard blockers stop submission. Low angle margin is deliberately NOT one:
  // it is a judgement call for QC (mould tolerance, PVC flex), so it travels
  // with the card as an advisory the reviewer must look at.
  const blockers: string[] = []
  if (severe.length) blockers.push(`${severe.length} 处穿透深度超过 ${PENETRATION_LIMIT}mm`)
  if (interfaceFails.length) blockers.push(`${interfaceFails.length} 项配件接口不匹配`)
  if (uncalibrated.length) blockers.push(`${uncalibrated.length} 个关节未标定`)

  const warnings: string[] = []
  if (lowMargin.length) {
    const over = lowMargin.filter((m) => m.status === 'over').length
    warnings.push(
      over
        ? `${over} 项关节超出活动范围`
        : `${lowMargin.length} 项关节角度余量低于 ${MARGIN_WARN}°`,
    )
  }

  return {
    build,
    result: {
      margins,
      interferences,
      interfaces: build.interfaces,
      minClearance,
      severe,
      lowMargin,
      uncalibrated,
      interfaceFails,
      pass: blockers.length === 0,
      blockers,
      warnings,
    },
  }
}

/** Smallest world-space distance between two part keys, for the inspector. */
export function pairGap(build: BuildResult, keyA: string, keyB: string): number {
  const A = build.capsules.find((c) => c.key === keyA)
  const B = build.capsules.find((c) => c.key === keyB)
  if (!A || !B) return vdist([0, 0, 0], [0, 0, 0])
  return round2(capsulePenetration(A, B).gap)
}
