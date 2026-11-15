// 站长：小流域治理面积、工程量汇总、复核通过率、导出
import { useMemo, useRef, useState } from 'react'
import { fmtArea, fmtNum, SlopeStack } from './ui.jsx'
import { LAND_TYPES, MEASURE_TYPES, summarize } from '../lib/measures.js'
import { areaSlopeStats } from '../lib/dem.js'
import { polygonArea, bbox } from '../lib/geometry.js'
import { EXPORT_MEASURE_ORDER, buildQuantityRows, downloadCanvas, downloadText, quantityCSV, renderPlan } from '../lib/planRender.js'

export default function Manager({ project, dem, ctx, measures, validation, notify, api }) {
  const { watersheds, patches } = project
  const [exportWs, setExportWs] = useState('all')
  const [exportType, setExportType] = useState('all')
  const [exportOpen, setExportOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [planWs, setPlanWs] = useState('all')

  const perWs = useMemo(() => {
    return watersheds.map((w) => {
      const plist = patches.filter((p) => p.watershedId === w.id)
      const mlist = measures.filter((m) => m.watershedId === w.id)
      const totalArea = plist.reduce((s, p) => s + polygonArea(p.points), 0)
      const treatedArea = plist.reduce((s, p) => {
        const has = mlist.some((m) => m.patchId === p.id)
        return s + (has ? polygonArea(p.points) : 0)
      }, 0)
      const ew = mlist.reduce((s, m) => s + (m.calc?.earthwork || 0), 0)
      const seed = mlist.reduce((s, m) => s + (m.calc?.seedlings || 0), 0)
      const ditch = mlist.reduce((s, m) => s + (m.calc?.ditchLength || 0), 0)
      const byType = {}
      for (const m of mlist) {
        byType[m.type] = byType[m.type] || { count: 0, earthwork: 0, area: 0, seedlings: 0, ditchLength: 0 }
        byType[m.type].count++
        byType[m.type].earthwork += m.calc?.earthwork || 0
        byType[m.type].area += m.calc?.area || 0
        byType[m.type].seedlings += m.calc?.seedlings || 0
        byType[m.type].ditchLength += m.calc?.ditchLength || 0
      }
      let slopeAgg = null
      if (dem) {
        const acc = [0, 0, 0, 0]
        let area = 0
        for (const p of plist) {
          const st = areaSlopeStats(dem, p.points)
          st.shares.forEach((s2, i) => (acc[i] += s2 * st.area))
          area += st.area
        }
        slopeAgg = acc.map((a) => (area ? a / area : 0))
      }
      return { w, patches: plist, measures: mlist, totalArea, treatedArea, ew, seed, ditch, byType, slopeAgg, rate: totalArea ? treatedArea / totalArea : 0 }
    })
  }, [watersheds, patches, measures, dem])

  const totalArea = perWs.reduce((s, x) => s + x.totalArea, 0)
  const treatedArea = perWs.reduce((s, x) => s + x.treatedArea, 0)
  const totalEw = perWs.reduce((s, x) => s + x.ew, 0)
  const totalSeed = perWs.reduce((s, x) => s + x.seed, 0)
  const totalDitch = perWs.reduce((s, x) => s + x.ditch, 0)

  const versions = project.versions || []
  const reviewed = versions.filter((v) => v.status === 'returned' || v.status === 'approved')
  const approved = versions.filter((v) => v.status === 'approved')
  const passRate = reviewed.length ? approved.length / reviewed.length : 0
  const pending = versions.filter((v) => v.status === 'pending')

  const rows = useMemo(
    () => buildQuantityRows({ measures, patches, watersheds, ctx }),
    [measures, patches, watersheds, ctx],
  )

  const filteredRows = rows.filter((r) => (exportWs === 'all' || r.watershed === exportWs) && (exportType === 'all' || r.type === exportType))

  const doExportCSV = () => {
    const list = exportWs === 'all' ? measures : measures.filter((m) => m.watershedId === exportWs)
    const wsList = exportWs === 'all' ? watersheds : watersheds.filter((w) => w.id === exportWs)
    let csv = quantityCSV({ measures: list, patches, watersheds: wsList, ctx, project })
    if (exportType !== 'all') {
      const lines = csv.replace(/^﻿/, '').split(/\r?\n/)
      const head = lines.shift()
      const foot = lines.pop()
      const keep = lines.filter((l) => l.includes(`"${MEASURE_TYPES[exportType].name}"`))
      csv = '﻿' + [head, ...keep, foot].join('\r\n')
    }
    const wsName = exportWs === 'all' ? '全部小流域' : watersheds.find((w) => w.id === exportWs)?.name
    const typeName = exportType === 'all' ? '全部措施' : MEASURE_TYPES[exportType].name
    downloadText(csv, `工程量清单_${wsName}_${typeName}.csv`)
    notify?.(`已导出工程量清单（${wsName} / ${typeName}）`, 'ok')
    setExportOpen(false)
  }

  const doExportPlan = () => {
    const canvas = document.createElement('canvas')
    const wsList = planWs === 'all' ? watersheds : watersheds.filter((w) => w.id === planWs)
    renderPlan(canvas, {
      survey: project.survey,
      dem,
      watersheds,
      patches,
      measures,
      ctx,
      title: `${planWs === 'all' ? '青山沟、柳树沟' : wsList[0]?.name} 坡面治理措施布设平面图`,
      subtitle: `小流域面积 ${wsList.reduce((s, w) => s + polygonArea(w.points), 0).toFixed(0)} m² · 措施 ${measures.filter((m) => planWs === 'all' || m.watershedId === planWs).length} 项 · 高程系统 1985 国家高程基准`,
      filterWatershed: planWs === 'all' ? null : planWs,
      projectName: project.name,
      station: project.county,
      when: new Date().toLocaleDateString('zh-CN'),
    })
    downloadCanvas(canvas, `治理平面图_${planWs === 'all' ? '全部' : wsList[0]?.name}.png`)
    notify?.('平面图已导出（PNG）', 'ok')
    setPlanOpen(false)
  }

  const previewPlan = (which) => {
    setPlanWs(which)
    setPlanOpen(true)
  }

  return (
    <div className="center-col" style={{ flex: 1, minWidth: 0 }}>
      <div className="workspace">
        <div className="ws-head">
          <div>
            <h2>治理成效总览</h2>
            <p>{project.name} · {project.county}</p>
          </div>
          <div className="grow" />
          <button className="btn" onClick={() => setExportOpen(true)}>导出工程量清单</button>
          <button className="btn primary" onClick={() => previewPlan('all')}>导出平面图</button>
        </div>

        <div className="cards">
          <div className="metric">
            <div className="l">治理总面积</div>
            <div className="v">{(totalArea / 10000).toFixed(2)}<small>hm²</small></div>
            <div className="d">{watersheds.length} 个小流域 · {patches.length} 个图斑</div>
          </div>
          <div className="metric">
            <div className="l">已布设措施面积</div>
            <div className="v">{(treatedArea / 10000).toFixed(2)}<small>hm²</small></div>
            <div className="d up">措施覆盖率 {(totalArea ? (treatedArea / totalArea) * 100 : 0).toFixed(1)}%</div>
          </div>
          <div className="metric">
            <div className="l">土方量合计</div>
            <div className="v">{fmtNum(totalEw, 0)}<small>m³</small></div>
            <div className="d">苗木 {fmtNum(totalSeed, 0)} 株 · 沟渠 {fmtNum(totalDitch, 0)} m</div>
          </div>
          <div className="metric">
            <div className="l">复核通过率</div>
            <div className="v">{(passRate * 100).toFixed(0)}<small>%</small></div>
            <div className="d">{approved.length} / {reviewed.length} 个已审版本 · {pending.length} 个待复核</div>
          </div>
        </div>

        <div className="block">
          <div className="block-head">
            <h3>各小流域治理情况</h3>
            <span className="grow" />
            <span className="hint">面积单位 hm²，土方 m³</span>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>小流域</th>
                  <th>编号</th>
                  <th className="num">流域面积</th>
                  <th className="num">已治理</th>
                  <th className="num">治理度</th>
                  <th>坡度分级（&lt;5 / 5–15 / 15–25 / &gt;25）</th>
                  <th className="num">土方量</th>
                  <th className="num">苗木</th>
                  <th className="num">沟渠</th>
                  <th className="num">措施</th>
                </tr>
              </thead>
              <tbody>
                {perWs.map(({ w, totalArea: ta, treatedArea: tr, rate, ew, seed, ditch, measures: ml, slopeAgg }) => (
                  <tr key={w.id}>
                    <td><b>{w.name}</b></td>
                    <td>{w.code}</td>
                    <td className="num">{(ta / 10000).toFixed(2)}</td>
                    <td className="num">{(tr / 10000).toFixed(2)}</td>
                    <td className="num">{(rate * 100).toFixed(1)}%</td>
                    <td>
                      {slopeAgg ? <SlopeStack shares={slopeAgg} width={176} /> : '—'}
                    </td>
                    <td className="num">{fmtNum(ew, 0)}</td>
                    <td className="num">{fmtNum(seed, 0)}</td>
                    <td className="num">{fmtNum(ditch, 0)}</td>
                    <td className="num">{ml.length} 项</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>合计</td>
                  <td />
                  <td className="num">{(totalArea / 10000).toFixed(2)}</td>
                  <td className="num">{(treatedArea / 10000).toFixed(2)}</td>
                  <td className="num">{(totalArea ? (treatedArea / totalArea) * 100 : 0).toFixed(1)}%</td>
                  <td />
                  <td className="num">{fmtNum(totalEw, 0)}</td>
                  <td className="num">{fmtNum(totalSeed, 0)}</td>
                  <td className="num">{fmtNum(totalDitch, 0)}</td>
                  <td className="num">{measures.length} 项</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 16 }}>
          <div className="block" style={{ marginBottom: 0 }}>
            <div className="block-head">
              <h3>工程量汇总（按措施类型）</h3>
              <span className="grow" />
              <button className="link-btn" onClick={() => setExportOpen(true)}>导出清单</button>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>措施类型</th>
                    <th className="num">处数</th>
                    <th className="num">面积(m²)</th>
                    <th className="num">土方(m³)</th>
                    <th className="num">苗木(株)</th>
                    <th className="num">沟渠(m)</th>
                  </tr>
                </thead>
                <tbody>
                  {EXPORT_MEASURE_ORDER.map((t) => {
                    const list = measures.filter((m) => m.type === t)
                    if (!list.length) return null
                    return (
                      <tr key={t}>
                        <td>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: MEASURE_TYPES[t].color, marginRight: 6 }} />
                          {MEASURE_TYPES[t].name}
                        </td>
                        <td className="num">{list.length}</td>
                        <td className="num">{fmtNum(list.reduce((s, m) => s + (m.calc?.area || 0), 0), 0)}</td>
                        <td className="num">{fmtNum(list.reduce((s, m) => s + (m.calc?.earthwork || 0), 0), 1)}</td>
                        <td className="num">{fmtNum(list.reduce((s, m) => s + (m.calc?.seedlings || 0), 0), 0)}</td>
                        <td className="num">{fmtNum(list.reduce((s, m) => s + (m.calc?.ditchLength || 0), 0), 0)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>合计</td>
                    <td className="num">{measures.length}</td>
                    <td className="num">{fmtNum(measures.reduce((s, m) => s + (m.calc?.area || 0), 0), 0)}</td>
                    <td className="num">{fmtNum(totalEw, 1)}</td>
                    <td className="num">{fmtNum(totalSeed, 0)}</td>
                    <td className="num">{fmtNum(totalDitch, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="block" style={{ marginBottom: 0 }}>
            <div className="block-head"><h3>复核通过率</h3></div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <div style={{ fontSize: 34, fontWeight: 600, lineHeight: 1, color: '#265c42' }}>{(passRate * 100).toFixed(0)}%</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', paddingBottom: 3 }}>
                  已审 {reviewed.length} 版通过 {approved.length} 版
                </div>
              </div>
              <div style={{ height: 10, background: '#e7e1d3', borderRadius: 3, marginTop: 12, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${passRate * 100}%`, background: '#4f8a68' }} />
                <div style={{ width: `${reviewed.length ? (reviewed.filter((v) => v.status === 'returned').length / reviewed.length) * 100 : 0}%`, background: '#c8887a' }} />
              </div>
              <div style={{ marginTop: 14 }}>
                {versions.map((v) => (
                  <div className="kv" key={v.id}>
                    <span className="k">第 {v.no} 版 · {v.submittedAt ? new Date(v.submittedAt).toLocaleDateString('zh-CN') : '—'}</span>
                    <span className="v">
                      <span className={`chip ${v.status === 'approved' ? 'ok' : v.status === 'returned' ? 'err' : 'pending'}`}>
                        {v.status === 'approved' ? '通过' : v.status === 'returned' ? '退回' : '待复核'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="block" style={{ marginTop: 16 }}>
          <div className="block-head">
            <h3>平面图与清单导出</h3>
            <span className="grow" />
            <span className="hint">可按小流域与措施类型筛选</span>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ marginBottom: 0, minWidth: 180 }}>
              <label>小流域</label>
              <select value={exportWs} onChange={(e) => setExportWs(e.target.value)}>
                <option value="all">全部小流域</option>
                {watersheds.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
              <label>措施类型</label>
              <select value={exportType} onChange={(e) => setExportType(e.target.value)}>
                <option value="all">全部措施</option>
                {EXPORT_MEASURE_ORDER.map((t) => <option key={t} value={t}>{MEASURE_TYPES[t].name}</option>)}
              </select>
            </div>
            <button className="btn" onClick={() => setExportOpen(true)}>导出工程量清单（CSV）</button>
            <div style={{ width: 1, height: 32, background: 'var(--line)' }} />
            <div className="field" style={{ marginBottom: 0, minWidth: 180 }}>
              <label>平面图范围</label>
              <select value={planWs} onChange={(e) => setPlanWs(e.target.value)}>
                <option value="all">全部小流域</option>
                {watersheds.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <button className="btn primary" onClick={() => previewPlan(planWs)}>生成平面图（PNG）</button>
          </div>
          <div style={{ padding: '0 16px 14px' }}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>小流域</th>
                    <th>措施类型</th>
                    <th className="num">处数</th>
                    <th className="num">面积(m²)</th>
                    <th className="num">土方(m³)</th>
                    <th className="num">苗木(株)</th>
                    <th className="num">沟渠(m)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.watershed}</td>
                      <td>{r.typeName}</td>
                      <td className="num">{r.count}</td>
                      <td className="num">{fmtNum(r.area, 0)}</td>
                      <td className="num">{fmtNum(r.earthwork, 1)}</td>
                      <td className="num">{fmtNum(r.seedlings, 0)}</td>
                      <td className="num">{fmtNum(r.ditchLength, 0)}</td>
                    </tr>
                  ))}
                  {!filteredRows.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 18 }}>无符合条件的记录</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {exportOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(35,33,26,0.42)', display: 'grid', placeItems: 'center', zIndex: 40 }} onClick={() => setExportOpen(false)}>
          <div className="block" style={{ width: 520, margin: 0, background: 'var(--panel)' }} onClick={(e) => e.stopPropagation()}>
            <div className="block-head"><h3>导出工程量清单</h3></div>
            <div style={{ padding: 16 }}>
              <div className="field">
                <label>小流域</label>
                <select value={exportWs} onChange={(e) => setExportWs(e.target.value)}>
                  <option value="all">全部小流域</option>
                  {watersheds.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>措施类型</label>
                <select value={exportType} onChange={(e) => setExportType(e.target.value)}>
                  <option value="all">全部措施</option>
                  {EXPORT_MEASURE_ORDER.map((t) => <option key={t} value={t}>{MEASURE_TYPES[t].name}</option>)}
                </select>
              </div>
              <p className="tiny-note">CSV 含小流域、措施类型、处数、面积、土方、苗木、沟渠长度等列，可直接用于概算编制。</p>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setExportOpen(false)}>取消</button>
              <button className="btn primary" onClick={doExportCSV}>导出 CSV</button>
            </div>
          </div>
        </div>
      )}

      {planOpen && (
        <PlanModal
          project={project}
          dem={dem}
          ctx={ctx}
          measures={measures}
          patches={patches}
          watersheds={watersheds}
          planWs={planWs}
          setPlanWs={setPlanWs}
          onClose={() => setPlanOpen(false)}
          onExport={doExportPlan}
        />
      )}
    </div>
  )
}

function PlanModal({ project, dem, ctx, measures, patches, watersheds, planWs, setPlanWs, onClose, onExport }) {
  const canvasRef = useRef(null)
  const [v, setV] = useState(0)
  const ref = (el) => {
    if (!el) return
    canvasRef.current = el
    const wsList = planWs === 'all' ? watersheds : watersheds.filter((w) => w.id === planWs)
    renderPlan(el, {
      survey: project.survey,
      dem,
      watersheds,
      patches,
      measures,
      ctx,
      title: `${planWs === 'all' ? '青山沟、柳树沟' : wsList[0]?.name} 坡面治理措施布设平面图`,
      subtitle: `小流域面积 ${wsList.reduce((s, w) => s + polygonArea(w.points), 0).toFixed(0)} m² · 措施 ${measures.filter((m) => planWs === 'all' || m.watershedId === planWs).length} 项 · 1985 国家高程基准`,
      filterWatershed: planWs === 'all' ? null : planWs,
      projectName: project.name,
      station: project.county,
      when: new Date().toLocaleDateString('zh-CN'),
    })
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(35,33,26,0.5)', display: 'grid', placeItems: 'center', zIndex: 40, padding: 24 }} onClick={onClose}>
      <div className="block" style={{ margin: 0, width: 'min(1100px, 94vw)', background: 'var(--panel)' }} onClick={(e) => e.stopPropagation()}>
        <div className="block-head">
          <h3>平面图预览</h3>
          <span className="grow" />
          <select value={planWs} onChange={(e) => { setPlanWs(e.target.value); setV((x) => x + 1) }} style={{ padding: '3px 6px', border: '1px solid var(--line)', borderRadius: 3 }}>
            <option value="all">全部小流域</option>
            {watersheds.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div style={{ padding: 12, background: '#efeade', maxHeight: '66vh', overflow: 'auto' }}>
          <canvas ref={ref} style={{ width: '100%', height: 'auto', display: 'block', boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }} />
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>关闭</button>
          <button className="btn primary" onClick={onExport}>下载 PNG</button>
        </div>
      </div>
    </div>
  )
}
