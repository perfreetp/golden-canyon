import { createEffect, onCleanup } from 'solid-js';
import { setPlayer, state } from '../store/store';

/** requestAnimationFrame 驱动的全局播放时钟，速度 0.25/0.5/1，支持循环 */
export function useAnimationClock(getDuration: () => number) {
  let last = performance.now();
  let raf = 0;

  const tick = (now: number) => {
    const dt = (now - last) / 1000;
    last = now;
    if (state.player.playing) {
      const dur = getDuration();
      let t = state.player.time + dt * state.player.speed;
      if (t >= dur) {
        if (state.player.loop) {
          t = t % dur;
        } else {
          t = dur;
          setPlayer({ playing: false });
        }
      }
      setPlayer({ time: t });
    }
    raf = requestAnimationFrame(tick);
  };

  createEffect(() => {
    raf = requestAnimationFrame(tick);
    onCleanup(() => cancelAnimationFrame(raf));
  });
}
