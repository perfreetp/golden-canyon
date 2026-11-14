// 供 esbuild 打包的测试入口（纯逻辑，无 DOM 依赖）
import { bezierEase, easeInOutCubic, lerpAngle, easeValue, TAU } from './util/math';
import { forwardKinematics, samplePose, keyframeFromRest, restPose } from './rig/kinematics';
import { DEFAULT_JOINTS } from './rig/skeleton';
import type { Keyframe, SegmentEase } from './types';

interface TestResult { name: string; ok: boolean; detail?: string }
const eq = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;

export function runTests(): TestResult[] {
  const out: TestResult[] = [];
  const check = (name: string, cond: boolean, detail = '') => out.push({ name, ok: cond, detail });

  // 1. 贝塞尔缓动端点固定
  const cp: [number, number][] = [[0.7, 0], [0.2, 1]];
  check('贝塞尔 t=0 -> 0', eq(bezierEase(cp[0], cp[1], 0), 0));
  check('贝塞尔 t=1 -> 1', eq(bezierEase(cp[0], cp[1], 1), 1));

  // 2. 缓入缓出单调递增且经过中点
  let mono = true;
  for (let i = 1; i <= 100; i++) {
    if (easeInOutCubic(i / 100) < easeInOutCubic((i - 1) / 100) - 1e-12) mono = false;
  }
  check('缓入缓出单调递增', mono);
  check('缓入缓出 t=0.5 -> 0.5', eq(easeInOutCubic(0.5), 0.5));

  // 3. 线性缓动恒等
  check('线性缓动恒等', eq(easeValue('linear', [0, 0], [1, 1], 0.37), 0.37));

  // 4. 最短弧夹角插值
  check('lerpAngle 跨 0 点走短弧', eq(lerpAngle(-0.1, 0.1, 0.5), 0));
  check('lerpAngle 跨 PI 走短弧', Math.abs(lerpAngle(3.1, -3.1, 0.5) - Math.PI) < 0.01);

  // 5. FK：静止角度应还原默认骨架坐标
  const kf0 = keyframeFromRest(DEFAULT_JOINTS, 0, 'k0');
  const pose = forwardKinematics(DEFAULT_JOINTS, kf0.angles, kf0.rootX, kf0.rootY);
  let fkOk = true; let fkDetail = '';
  for (const j of DEFAULT_JOINTS) {
    const p = pose.joints.get(j.id)!;
    if (!eq(p.x, j.x, 0.01) || !eq(p.y, j.y, 0.01)) {
      fkOk = false; fkDetail = `${j.name} got (${p.x.toFixed(2)},${p.y.toFixed(2)}) want (${j.x},${j.y})`;
      break;
    }
  }
  check('FK 静止角还原骨架坐标', fkOk, fkDetail);

  // 6. samplePose 在关键帧时刻等于该关键帧姿势
  const kf1: Keyframe = {
    id: 'k1', time: 4, rootX: kf0.rootX, rootY: kf0.rootY - 30,
    angles: { ...kf0.angles, shoulderR: -1.29, elbowR: -1.52 },
  };
  const ease: SegmentEase = { type: 'easeInOut', cp1: [0.42, 0], cp2: [0.58, 1] };
  const s0 = samplePose(DEFAULT_JOINTS, [kf0, kf1], { k0: ease }, 4);
  const target = forwardKinematics(DEFAULT_JOINTS, kf1.angles, kf1.rootX, kf1.rootY);
  let sampleOk = true;
  for (const j of DEFAULT_JOINTS) {
    const a = s0.joints.get(j.id)!; const b = target.joints.get(j.id)!;
    if (!eq(a.x, b.x, 1e-6) || !eq(a.y, b.y, 1e-6)) sampleOk = false;
  }
  check('samplePose 命中关键帧姿势', sampleOk);

  // 7. 插值中段：缓入缓出在 t=0.5 时恰为半程，关节角度应为短弧中点
  const sm = samplePose(DEFAULT_JOINTS, [kf0, kf1], { k0: ease }, 2);
  const expectAngle = lerpAngle(kf0.angles.elbowR, kf1.angles.elbowR, easeInOutCubic(0.5));
  const midOk = Math.abs(sm.joints.get('elbowR')!.angle - expectAngle) < 1e-9;
  check('插值中段角度为短弧半程', midOk, `got ${sm.joints.get('elbowR')!.angle} want ${expectAngle}`);

  // 8. restPose 与 FK 静止一致
  const rp = restPose(DEFAULT_JOINTS);
  check('restPose 骨盆位置', eq(rp.joints.get('pelvis')!.x, 300) && eq(rp.joints.get('pelvis')!.y, 300));

  // 9. 角度周期性
  check('lerpAngle 周期一致', eq(lerpAngle(0, TAU, 0.5) % TAU, 0, 1e-9));

  return out;
}
