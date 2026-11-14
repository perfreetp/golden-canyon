import { createSignal, For, Show } from 'solid-js';
import {
  activeAnim, addAnimation, deleteAnimation, renameAnimation, state, switchAnimation,
  upsertKeyframe,
} from '../store/store';
import { RigStage, type StageMode } from '../components/RigStage';
import { LayerPanel } from '../components/LayerPanel';
import { Timeline } from '../components/Timeline';
import { EaseEditor } from '../components/EaseEditor';
import { TransportBar } from '../components/TransportBar';
import { ExportPanel } from '../components/ExportPanel';
import { keyframeFromPose, forwardKinematics } from '../rig/kinematics';
import { uid } from '../util/math';
import { useAnimationClock } from '../hooks/useAnimationClock';

export function AnimatorView() {
  const [mode, setMode] = createSignal<StageMode>('bind');
  const [editing, setEditing] = createSignal<Record<string, number> | null>(null);
  const [segKf, setSegKf] = createSignal<string | null>(null);
  const [libOpen, setLibOpen] = createSignal(false);

  useAnimationClock(() => activeAnim().duration);

  const enterMode = (m: StageMode) => {
    setMode(m);
    if (m === 'pose') {
      // 以当前播放时刻的姿势作为编辑起点
      const a = activeAnim();
      const t = state.player.time;
      const kfs = [...a.keyframes].sort((x, y) => x.time - y.time);
      let angles: Record<string, number>;
      if (kfs.length === 0) {
        const k0 = initFirstKeyframe();
        angles = k0.angles;
      } else {
        const pose = poseAt(t);
        angles = {};
        pose.joints.forEach((v, k) => (angles[k] = v.angle));
      }
      setEditing(angles);
    }
  };

  const poseAt = (t: number) => {
    const a = activeAnim();
    const kfs = [...a.keyframes].sort((x, y) => x.time - y.time);
    if (!kfs.length) {
      const root = state.project.joints.find(j => !j.parent)!;
      return forwardKinematics(state.project.joints, {}, root.x, root.y);
    }
    // 简化：找最近关键帧
    let k = kfs[0];
    for (const kf of kfs) if (kf.time <= t) k = kf;
    return forwardKinematics(state.project.joints, k.angles, k.rootX, k.rootY);
  };

  const initFirstKeyframe = () => {
    const a = activeAnim();
    const root = state.project.joints.find(j => !j.parent)!;
    const kf = {
      id: uid('kf'), time: 0, rootX: root.x, rootY: root.y,
      angles: Object.fromEntries(state.project.joints.map(j => [j.id, j.parent
        ? Math.atan2(j.y - state.project.joints.find(p => p.id === j.parent)!.y,
                     j.x - state.project.joints.find(p => p.id === j.parent)!.x)
        : -Math.PI / 2])),
    };
    upsertKeyframe(kf);
    return kf;
  };

  const captureKeyframe = () => {
    const a = activeAnim();
    const t = state.player.time;
    if (mode() === 'pose' && editing()) {
      const root = state.project.joints.find(j => !j.parent)!;
      const pose = forwardKinematics(state.project.joints, editing()!, a.keyframes[0]?.rootX ?? root.x, a.keyframes[0]?.rootY ?? root.y);
      upsertKeyframe(keyframeFromPose(pose, Math.round(t * 10) / 10, uid('kf')));
    } else {
      const pose = poseAt(t);
      upsertKeyframe(keyframeFromPose(pose, Math.round(t * 10) / 10, uid('kf')));
    }
  };

  return (
    <div class="view animator-view">
      <div class="anim-topbar">
        <div class="mode-switch">
          <button class="btn-mini" classList={{ active: mode() === 'bind' }} onClick={() => enterMode('bind')}>① 骨架绑定</button>
          <button class="btn-mini" classList={{ active: mode() === 'pose' }} onClick={() => enterMode('pose')}>② 姿势调整</button>
          <button class="btn-mini" classList={{ active: mode() === 'preview' }} onClick={() => setMode('preview')}>③ 动作预览</button>
        </div>
        <div class="anim-select">
          <select value={state.project.activeAnimationId} onChange={e => switchAnimation(e.currentTarget.value)}>
            <For each={state.project.animations}>{a => <option value={a.id}>{a.name}（{a.keyframes.length} 帧）</option>}</For>
          </select>
          <button class="btn-mini" onClick={() => addAnimation()}>＋ 新建动作</button>
          <button class="btn-mini danger" onClick={() => deleteAnimation(activeAnim().id)}>删除</button>
          <button class="btn-mini" onClick={() => {
            const name = prompt('重命名动作', activeAnim().name);
            if (name) renameAnimation(activeAnim().id, name);
          }}>重命名</button>
        </div>
        <button class="btn-mini" onClick={() => setLibOpen(v => !v)}>
          {libOpen() ? '隐藏课程库' : `课程库（${state.actions.length} 个动作）`}
        </button>
      </div>

      <div class="anim-body">
        <div class="anim-left">
          <LayerPanel />
        </div>
        <div class="anim-center">
          <RigStage
            mode={mode()}
            editingAngles={editing()}
            onEditingAnglesChange={angles => setEditing(angles)}
            sampleTime={state.player.time}
          />
          <TransportBar onCaptureKeyframe={captureKeyframe} />
          <Timeline selectedSegment={segKf()} onSelectSegment={id => setSegKf(id)} />
        </div>
        <div class="anim-right">
          <EaseEditor segmentKfId={segKf()} onClose={() => setSegKf(null)} />
          <ExportPanel />
          <Show when={libOpen()}>
            <div class="panel library-panel">
              <div class="panel-title">课程库 · 已导出动作</div>
              <For each={state.actions}>{act => (
                <div class="lib-item">
                  <Show when={act.spriteSheet} fallback={<div class="lib-thumb placeholder">无精灵图</div>}>
                    <img class="lib-thumb" src={act.spriteSheet} alt={act.name} />
                  </Show>
                  <div>
                    <b>{act.name}</b>
                    <div class="hint">{act.duration}s · {act.atlas?.fps ?? act.fps}fps · {act.atlas?.count ?? '—'} 帧</div>
                  </div>
                </div>
              )}</For>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
