import { createSignal, Show } from 'solid-js';
import { activeAnim, addLibraryAction, state } from '../store/store';
import { exportFrames } from '../rig/exportFrames';
import { uid } from '../util/math';

export function ExportPanel(props: { onExported?: () => void }) {
  const [fps, setFps] = createSignal(12);
  const [busy, setBusy] = createSignal(false);
  const [pct, setPct] = createSignal(0);
  const [done, setDone] = createSignal<string | null>(null);

  const doExport = async () => {
    setBusy(true); setPct(0); setDone(null);
    try {
      const p = state.project;
      const anim = activeAnim();
      const result = await exportFrames(p.joints, p.parts, anim, fps(), v => setPct(Math.round(v)));
      const recId = uid('act');
      addLibraryAction({
        id: recId,
        name: anim.name,
        projectId: p.id,
        createdAt: new Date().toISOString(),
        duration: anim.duration,
        fps: fps(),
        spriteSheet: result.spriteSheet,
        atlas: result.atlas,
        // Solid Store 是响应式 Proxy，不能用 structuredClone，这里数据均为纯 JSON 结构
        snapshot: JSON.parse(JSON.stringify({ joints: p.joints, parts: p.parts, animation: anim })),
      });
      setDone(`已导出 ${result.count} 帧并入库「课程库」，精灵图 ${result.atlas.cols} 列网格`);
      props.onExported?.();
    } catch (err) {
      setDone(`导出失败：${(err as Error).message}（请确认浏览器允许本站点下载多个文件）`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="panel export-panel">
      <div class="panel-title">导出序列帧 / 精灵图</div>
      <div class="export-row">
        <label class="ctl inline">帧率
          <select value={fps()} onChange={e => setFps(Number(e.currentTarget.value))}>
            <option value="8">8 fps</option>
            <option value="12">12 fps</option>
            <option value="24">24 fps</option>
          </select>
        </label>
        <button class="btn primary" disabled={busy()} onClick={doExport}>
          {busy() ? `渲染中 ${pct()}%` : '导出 PNG 序列帧 + 精灵图'}
        </button>
      </div>
      <Show when={busy()}>
        <div class="progress"><div style={{ width: `${pct()}%` }} /></div>
      </Show>
      <Show when={done()}>
        <p class="export-done">{done()}</p>
      </Show>
      <p class="hint">序列帧逐张下载（frame_0000.png …），另合成一张 spritesheet.png 并自动登记进课程库。浏览器首次会询问“是否允许下载多个文件”，请选择允许。</p>
    </div>
  );
}
