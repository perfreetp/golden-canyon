import { createSignal, For, Show } from 'solid-js';
import { state, updateJoint, updatePart, updateProject } from '../store/store';
import type { PartLayer } from '../types';

export function LayerPanel() {
  const [openId, setOpenId] = createSignal<string | null>(null);

  const onFile = (part: PartLayer, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const img = new Image();
      img.onload = () => updatePart(part.id, {
        imageDataUrl: url,
        width: Math.round(img.width / 2),
        height: Math.round(img.height / 2),
      });
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div class="panel layer-panel">
      <div class="panel-title">拆件图层（14 件）<span class="hint">上传 PNG 分层图</span></div>
      <For each={state.project.parts}>{part => (
        <div class="layer-item" classList={{ open: openId() === part.id }}>
          <div class="layer-head" onClick={() => setOpenId(openId() === part.id ? null : part.id)}>
            <span class="swatch" style={{ background: part.imageDataUrl ? `url(${part.imageDataUrl}) center/cover` : part.color }} />
            <span class="layer-name">{part.name}</span>
            <Show when={part.imageDataUrl}><span class="tag ok">已上传</span></Show>
            <span class="chev">{openId() === part.id ? '▾' : '▸'}</span>
          </div>
          <Show when={openId() === part.id}>
            <div class="layer-body">
              <label class="upload-btn">
                选择拆件图
                <input type="file" accept="image/png,image/jpeg" hidden onChange={e => {
                  const f = e.currentTarget.files?.[0];
                  if (f) onFile(part, f);
                }} />
              </label>
              <label class="ctl">
                蒙皮权重 <b>{part.weight.toFixed(2)}</b>
                <input type="range" min="0" max="1" step="0.05" value={part.weight}
                  onInput={e => updatePart(part.id, { weight: Number(e.currentTarget.value) })} />
              </label>
              <div class="ctl-row">
                <label class="ctl">
                  偏移 X
                  <input type="number" value={part.offsetX}
                    onInput={e => updatePart(part.id, { offsetX: Number(e.currentTarget.value) })} />
                </label>
                <label class="ctl">
                  偏移 Y
                  <input type="number" value={part.offsetY}
                    onInput={e => updatePart(part.id, { offsetY: Number(e.currentTarget.value) })} />
                </label>
              </div>
              <div class="ctl-row">
                <label class="ctl">
                  宽
                  <input type="number" value={part.width}
                    onInput={e => updatePart(part.id, { width: Number(e.currentTarget.value) })} />
                </label>
                <label class="ctl">
                  高
                  <input type="number" value={part.height}
                    onInput={e => updatePart(part.id, { height: Number(e.currentTarget.value) })} />
                </label>
              </div>
            </div>
          </Show>
        </div>
      )}</For>

      <div class="panel-title" style={{ margin: '10px 0 6px' }}>骨骼关节</div>
      <For each={state.project.joints}>{j => (
        <div class="joint-row">
          <span class={j.custom ? 'custom-joint' : ''}>{j.name}{j.custom ? '（自定义）' : ''}</span>
          <span class="joint-xy">{Math.round(j.x)}, {Math.round(j.y)}</span>
          <Show when={j.custom}>
            <button class="btn-mini danger" onClick={() => updateProject(p => { p.joints = p.joints.filter(x => x.id !== j.id); })}>删</button>
          </Show>
        </div>
      )}</For>
    </div>
  );
}
