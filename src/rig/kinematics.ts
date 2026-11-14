import type { JointDef, Keyframe } from '../types';
import { angleTo, lerp, lerpAngle, easeValue, TAU } from '../util/math';
import type { SegmentEase } from '../types';

export interface PoseJoint {
  id: string;
  x: number;
  y: number;
  angle: number; // 该关节指向子节点的世界角
}

export interface Pose {
  joints: Map<string, PoseJoint>;
}

/** 静止姿势：直接使用关节坐标，角度由父子坐标推算 */
export function restPose(joints: JointDef[], rootDX = 0, rootDY = 0): Pose {
  const map = new Map<string, PoseJoint>();
  const byId = new Map(joints.map(j => [j.id, j]));
  for (const j of joints) {
    const px = (j.parent ? byId.get(j.parent)!.x : j.x) + (j.parent ? 0 : rootDX);
    const py = (j.parent ? byId.get(j.parent)!.y : j.y) + (j.parent ? 0 : rootDY);
    const children = joints.filter(c => c.parent === j.id);
    const angle = children.length ? angleTo(j.x + (j.parent ? 0 : rootDX), j.y + (j.parent ? 0 : rootDY),
      children[0].x + (children[0].parent ? 0 : rootDX), children[0].y + (children[0].parent ? 0 : rootDY))
      : (map.get(j.parent!)?.angle ?? 0);
    map.set(j.id, { id: j.id, x: j.x + (j.parent ? 0 : rootDX), y: j.y + (j.parent ? 0 : rootDY), angle });
  }
  return { joints: map };
}

/**
 * 正向运动学：根据关键帧角度求各关节坐标。
 * 根关节（pelvis）用 rootX/rootY，其余关节沿父关节角度方向、按静止骨架的骨长摆放。
 */
export function forwardKinematics(
  joints: JointDef[],
  angles: Record<string, number>,
  rootX: number,
  rootY: number,
): Pose {
  const byId = new Map(joints.map(j => [j.id, j]));
  const lengths = new Map<string, number>();
  for (const j of joints) {
    if (j.parent) {
      const p = byId.get(j.parent)!;
      lengths.set(j.id, Math.hypot(j.x - p.x, j.y - p.y));
    }
  }
  const restAngle = new Map<string, number>();
  for (const j of joints) {
    if (j.parent) {
      const p = byId.get(j.parent)!;
      restAngle.set(j.id, angleTo(p.x, p.y, j.x, j.y));
    }
  }
  const out = new Map<string, PoseJoint>();
  const visit = (j: JointDef) => {
    if (!j.parent) {
      out.set(j.id, { id: j.id, x: rootX, y: rootY, angle: angles[j.id] ?? restAngle.get(j.id) ?? 0 });
      return;
    }
    const parent = out.get(j.parent)!;
    const len = lengths.get(j.id)!;
    const a = angles[j.id] ?? restAngle.get(j.id)!;
    const x = parent.x + Math.cos(a) * len;
    const y = parent.y + Math.sin(a) * len;
    out.set(j.id, { id: j.id, x, y, angle: a });
  };
  // 按父依赖顺序遍历
  for (const j of joints) visit(j);
  return { joints: out };
}

/** 两关键帧之间的插值姿势 */
export function interpolatePose(
  joints: JointDef[],
  k0: Keyframe,
  k1: Keyframe,
  t: number,
  ease: SegmentEase,
): Pose {
  const e = easeValue(ease.type, ease.cp1, ease.cp2, t);
  const angles: Record<string, number> = {};
  for (const j of joints) {
    const a0 = k0.angles[j.id];
    const a1 = k1.angles[j.id];
    angles[j.id] = a0 === undefined || a1 === undefined ? (a0 ?? a1 ?? 0) : lerpAngle(a0, a1, e);
  }
  return forwardKinematics(joints, angles, lerp(k0.rootX, k1.rootX, e), lerp(k0.rootY, k1.rootY, e));
}

/** 从关键帧序列求任意时刻 t 的姿势（带逐段缓动） */
export function samplePose(
  joints: JointDef[],
  keyframes: Keyframe[],
  eases: Record<string, SegmentEase>,
  t: number,
): Pose {
  const kfs = [...keyframes].sort((a, b) => a.time - b.time);
  if (kfs.length === 0) return restPose(joints);
  if (t <= kfs[0].time) {
    return forwardKinematics(joints, kfs[0].angles, kfs[0].rootX, kfs[0].rootY);
  }
  const last = kfs[kfs.length - 1];
  if (t >= last.time) {
    return forwardKinematics(joints, last.angles, last.rootX, last.rootY);
  }
  for (let i = 0; i < kfs.length - 1; i++) {
    const k0 = kfs[i], k1 = kfs[i + 1];
    if (t >= k0.time && t <= k1.time) {
      const localT = (t - k0.time) / Math.max(1e-6, k1.time - k0.time);
      return interpolatePose(joints, k0, k1, localT, eases[k0.id] ?? { type: 'easeInOut', cp1: [0.42, 0], cp2: [0.58, 1] });
    }
  }
  return restPose(joints);
}

/** 从静止骨架生成一张关键帧（角度取静止世界角） */
export function keyframeFromRest(joints: JointDef[], time: number, id: string): Keyframe {
  const byId = new Map(joints.map(j => [j.id, j]));
  const angles: Record<string, number> = {};
  for (const j of joints) {
    if (j.parent) {
      const p = byId.get(j.parent)!;
      angles[j.id] = angleTo(p.x, p.y, j.x, j.y);
    } else {
      angles[j.id] = -Math.PI / 2;
    }
  }
  const root = joints.find(j => !j.parent)!;
  return { id, time, rootX: root.x, rootY: root.y, angles };
}

/** 把当前 FK 姿势转成关键帧数据 */
export function keyframeFromPose(pose: Pose, time: number, id: string): Keyframe {
  const root = pose.joints.get('pelvis')!;
  const angles: Record<string, number> = {};
  pose.joints.forEach((v, k) => (angles[k] = ((v.angle % TAU) + TAU) % TAU));
  return { id, time, rootX: root.x, rootY: root.y, angles };
}
