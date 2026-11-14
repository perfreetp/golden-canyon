import { LAYERS, layerMeta } from '../lib/data.js'

const hex = (n) => '#' + n.toString(16).padStart(6, '0')

export default function ElementSidebar({ element }) {
  return (
    <div className="panel">
      <div className="panel-title">要素属性</div>
      {!element && <div className="empty-tip">在画布上单击任意要素查看名称与所属图层</div>}
      {element && (
        <div className="element-detail">
          <div className="element-name">{element.name}</div>
          {(() => {
            const meta = layerMeta(element.layer)
            return (
              <div className="element-badge" style={{ background: hex(meta.color) }}>
                {meta.name}
              </div>
            )
          })()}
          <div className="kv"><span>要素编号</span><code>{element.id}</code></div>
          <div className="kv"><span>所在层号</span><code>第 {element.slice + 1} 层 / 共 60 层</code></div>
          <div className="kv"><span>细节级别</span><code>{element.lod === 'low' ? '低倍（主干/轮廓）' : '高倍（细小分支）'}</code></div>
          <div className="kv"><span>几何类型</span>
            <code>{element.shape.kind === 'ellipse' ? '椭圆/类圆区域' : element.shape.kind === 'polygon' ? '多边形区域' : '走形线'}</code>
          </div>
        </div>
      )}
      <div className="panel-title" style={{ marginTop: 16 }}>图层图例</div>
      <div className="legend-grid">
        {LAYERS.map((l) => (
          <div key={l.id} className="legend-item">
            <span className="layer-dot" style={{ background: hex(l.color) }} />{l.name}
          </div>
        ))}
      </div>
    </div>
  )
}
