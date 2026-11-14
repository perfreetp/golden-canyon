import { useMemo, useState } from 'react'
import SliceCanvas from '../components/SliceCanvas.jsx'
import LayerPanel from '../components/LayerPanel.jsx'
import ElementSidebar from '../components/ElementSidebar.jsx'
import { useStore } from '../lib/store.jsx'
import { LOD_THRESHOLD } from '../lib/data.js'

export default function AnatomyView() {
  const { series, state, dispatch } = useStore()
  const [sliceIdx, setSliceIdx] = useState(28)
  const [selected, setSelected] = useState(null)
  const [lodHigh, setLodHigh] = useState(false)

  const structureMap = useMemo(() => new Map(series.structures.map((s) => [s.id, s])), [series])
  const slice = series.slices[sliceIdx]
  const layerCountOnSlice = useMemo(() => {
    const c = { artery: 0, vein: 0, nerve: 0, functional: 0, lesion: 0 }
    for (const id of slice.structures) {
      const el = structureMap.get(id)
      if (el) c[el.layer]++
    }
    return c
  }, [slice, structureMap])

  return (
    <div className="layout-3">
      <LayerPanel
        visibility={state.layerVisibility}
        onToggle={(l) => dispatch({ type: 'TOGGLE_LAYER', layer: l })}
        counts={layerCountOnSlice}
      />
      <div>
        <div className="canvas-toolbar">
          <button className="tool-btn" onClick={() => setSliceIdx((i) => Math.max(0, i - 1))}>‹ 上层</button>
          <input
            className="slice-slider" type="range" min={0} max={series.sliceCount - 1}
            value={sliceIdx}
            onChange={(e) => { setSliceIdx(Number(e.target.value)); setSelected(null) }}
          />
          <button className="tool-btn" onClick={() => setSliceIdx((i) => Math.min(series.sliceCount - 1, i + 1))}>下层 ›</button>
          <div className="slice-meta">
            层号 <b>{sliceIdx + 1}</b> / {series.sliceCount}　·　Z = {slice.z} mm
          </div>
          <span className={`lod-badge`} style={{ position: 'static' }}>
            {lodHigh ? '高倍细节：细小分支与神经走形已铺开' : `低倍概览：仅脑叶轮廓与主要血管（缩放 ≥ ${LOD_THRESHOLD.toFixed(2)}× 展开细节）`}
          </span>
        </div>
        <div style={{ position: 'relative' }}>
          <SliceCanvas
            slice={slice}
            structureMap={structureMap}
            visibleLayers={state.layerVisibility}
            mode="browse"
            selectedId={selected?.id}
            onSelect={(el) => setSelected(el)}
            onZoomChange={(high) => setLodHigh(high)}
            height={640}
          />
        </div>
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="q-meta">
            <span>本层要素 {slice.structures.length} 个</span>
            <span>全序列 {series.structures.length.toLocaleString()} 个要素，按层/图层/LOD 批量绘制并按视口裁剪</span>
            <span>滚轮缩放以光标为锚点，拖动平移保持帧率稳定</span>
          </div>
        </div>
      </div>
      <ElementSidebar element={selected} />
    </div>
  )
}
