import type { JointDef, PartLayer } from '../types';
import type { Pose } from './kinematics';
import { angleTo, lerp, TAU } from '../util/math';

export interface PartPlacement {
  x: number; y: number; rotation: number; opacity: number;
}

const boneMapCache = new WeakMap<JointDef[], Map<string, { parent: string; child: string }>>();

export function getBoneMap(joints: JointDef[]) {
  let m = boneMapCache.get(joints);
  if (!m) {
    m = new Map();
    for (const j of joints) {
      if (j.parent) m.set(j.id, { parent: j.parent, child: j.id });
    }
    boneMapCache.set(joints, m);
  }
  return m;
}

/** 静止骨架中每根骨的世界角（低权重部件向静止角回退） */
export function restAngles(joints: JointDef[]) {
  const byId = new Map(joints.map(j => [j.id, j]));
  const out = new Map<string, number>();
  for (const j of joints) {
    if (j.parent) {
      const p = byId.get(j.parent)!;
      out.set(j.id, angleTo(p.x, p.y, j.x, j.y));
    }
  }
  return out;
}

/**
 * 计算部件在画布上的位姿：
 * 部件挂在骨骼的父关节上，沿骨骼方向（局部 +y）生长；
 * 权重决定跟随骨骼旋转的程度，0 = 保持静止朝向，1 = 完全跟随。
 */
export function placePart(
  part: PartLayer,
  joints: JointDef[],
  pose: Pose,
  rest: Map<string, number>,
): PartPlacement | null {
  // boneId 形如 b_xxx，直接由部件 boneId 反查它锚定的关节：
  // 在骨架数据里 boneId 与关节 id 不同体系，这里由调用方传入锚点映射
  const anchorId = ANCHOR_OF_BONE[part.boneId];
  if (!anchorId) return null;
  const anchor = pose.joints.get(anchorId);
  if (!anchor) return null;
  const cur = anchor.angle;
  const restA = rest.get(anchorId) ?? cur;
  const rot = lerp(restA, cur, part.weight);
  return { x: anchor.x + part.offsetX, y: anchor.y + part.offsetY, rotation: (rot * 180) / Math.PI + 90, opacity: 0.3 + 0.7 * part.weight };
}

// 骨骼 id -> 锚定关节 id（与 skeleton.ts 中 BONES 的 parent 对应）
export const ANCHOR_OF_BONE: Record<string, string> = {
  b_head: 'neck',
  b_spine: 'pelvis',
  b_upperArmL: 'shoulderL',
  b_forearmL: 'elbowL',
  b_upperArmR: 'shoulderR',
  b_forearmR: 'elbowR',
  b_thighL: 'hipL',
  b_shinL: 'kneeL',
  b_thighR: 'hipR',
  b_shinR: 'kneeR',
};

export { TAU };
