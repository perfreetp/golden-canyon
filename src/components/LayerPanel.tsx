import { For } from 'solid-js';
import { LAYER_META, POINT_LAYERS, type PointLayer } from '../lib/spec';
import { layerVisible, resetLayers, toggleLayer } from '../store';

export default function LayerPanel() {
  return (
    <div class="panel layer-panel">
      <div class="panel-head">
        <h3>图层开关</h3>
        <button class="btn-link" onClick={resetLayers}>
          全部显示
        </button>
      </div>
      <div class="layer-list">
        <For each={POINT_LAYERS}>
          {(layer: PointLayer) => (
            <label class="layer-row" classList={{ off: !layerVisible[layer] }}>
              <input
                type="checkbox"
                checked={layerVisible[layer]}
                onChange={() => toggleLayer(layer)}
              />
              <i class="layer-dot" style={{ background: LAYER_META[layer].color }} />
              <span>{LAYER_META[layer].label}</span>
            </label>
          )}
        </For>
      </div>
      <p class="panel-note">关闭图层后对应要素与管线不再参与渲染</p>
    </div>
  );
}
