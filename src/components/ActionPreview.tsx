import { createEffect, createSignal, onCleanup, Show } from 'solid-js';
import type { ActionRecord } from '../types';
import { samplePose } from '../rig/kinematics';
import { Figure } from './Figure';

/** 用快照数据在小画布上循环播放课程库动作 */
export function ActionPreview(props: { action: ActionRecord; size?: number; autoplay?: boolean }) {
  const [t, setT] = createSignal(0);
  let raf = 0;
  let last = performance.now();

  createEffect(() => {
    const snap = props.action.snapshot;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (props.autoplay !== false) {
        setT(v => (v + dt) % snap.animation.duration);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    onCleanup(() => cancelAnimationFrame(raf));
  });

  const pose = () =>
    samplePose(props.action.snapshot.joints, props.action.snapshot.animation.keyframes,
      props.action.snapshot.animation.eases, t());

  const s = () => props.size ?? 180;

  return (
    <div class="action-preview" style={{ width: `${s()}px`, height: `${s()}px` }}>
      <svg viewBox="0 0 600 600" width={s()} height={s()}>
        <rect width="600" height="600" fill="#f8fafc" />
        <Figure
          joints={props.action.snapshot.joints}
          parts={props.action.snapshot.parts}
          pose={pose()}
        />
      </svg>
      <Show when={props.action.spriteSheet}>
        <img class="sprite-strip" src={props.action.spriteSheet} alt="精灵图" title="导出的精灵图" />
      </Show>
    </div>
  );
}
