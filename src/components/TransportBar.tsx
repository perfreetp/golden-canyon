import { activeAnim, setBreath, setDuration, setPlayer, state } from '../store/store';
import { fmtTime } from '../util/math';

const SPEEDS = [0.25, 0.5, 1];

export function TransportBar(props: { onCaptureKeyframe: () => void }) {
  const anim = activeAnim;
  return (
    <div class="panel transport">
      <div class="transport-left">
        <button class="btn primary" onClick={() => setPlayer({ playing: !state.player.playing })}>
          {state.player.playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button class="btn" onClick={() => setPlayer({ time: 0, playing: false })}>⏹ 复位</button>
        <div class="seg">
          {SPEEDS.map(s => (
            <button class="btn-mini" classList={{ active: state.player.speed === s }}
              onClick={() => setPlayer({ speed: s })}>{s}x</button>
          ))}
        </div>
        <label class="loop-ctl">
          <input type="checkbox" checked={state.player.loop}
            onChange={e => setPlayer({ loop: e.currentTarget.checked })} />
          循环预览
        </label>
      </div>

      <div class="transport-right">
        <span class="time-readout">{fmtTime(state.player.time)} / {fmtTime(anim().duration)}s</span>
        <label class="ctl inline">
          动作总时长
          <input type="number" min="1" max="120" value={anim().duration}
            onInput={e => setDuration(Number(e.currentTarget.value))} /> 秒
        </label>
        <button class="btn warn" onClick={props.onCaptureKeyframe}>◆ 在 {state.player.time.toFixed(1)}s 打关键帧</button>
      </div>

      <div class="breath-controls">
        <span class="breath-title">呼吸节奏：</span>
        <label class="ctl inline">吸气
          <input type="number" min="0" max="30" step="0.5" value={anim().breath.inhale}
            onInput={e => setBreath({ ...anim().breath, inhale: Number(e.currentTarget.value) })} />秒
        </label>
        <label class="ctl inline">屏息
          <input type="number" min="0" max="30" step="0.5" value={anim().breath.hold}
            onInput={e => setBreath({ ...anim().breath, hold: Number(e.currentTarget.value) })} />秒
        </label>
        <label class="ctl inline">呼气
          <input type="number" min="0" max="30" step="0.5" value={anim().breath.exhale}
            onInput={e => setBreath({ ...anim().breath, exhale: Number(e.currentTarget.value) })} />秒
        </label>
        <span class="hint">一个呼吸周期 {anim().breath.inhale + anim().breath.hold + anim().breath.exhale} 秒，已在时间轴着色标记</span>
      </div>
    </div>
  );
}
