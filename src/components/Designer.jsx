// 技术员工作台：左侧图层与措施库、中间地图、右侧图斑与工程量
import { useEffect, useMemo, useRef, useState } from 'react'
import MapCanvas from './MapCanvas.jsx'
import ConflictDialog from './ConflictDialog.jsx'
import ReviewCommentsModal from './ReviewCommentsModal.jsx'
import { Icon, SlopeBars, Field, Modal, fmtArea, fmtNum } from './ui.jsx'
import { MEASURE_TYPES, MEASURE_LIST, LAND_TYPES, RECOMMENDATION, measureExtent } from '../lib/measures.js'
import { areaSlopeStats } from '../lib/dem.js'
import { polygonArea, polygonCentroid } from '../lib/geometry.js'
import { LAND_TYPE_ORDER, uidMeasure, patchSlope, suggestFor, contourAngleAt } from './designerUtils.js'

export default function Designer({ project, setProject, dem, ctx, measures, validation, api, notify }) {
  const [activeWs, setActiveWs] = useState(project.watersheds[0]?.id || null)
  const [tool, setTool] = useState('select')
  const [pendingType, setPendingType] = useState(null)
  const [selection, setSelection] = useState(null)
  const [tab, setTab] = useState('patch')
  const [showSlope, setShowSlope] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showPatches, setShowPatches] = useState(true)
  const [importOpen, setImportOpen] = useState(false)
  const [dragging, setDragging] = useState(null)
  const [collapsedConflicts, setCollapsedConflicts] = useState(false)
  const [conflictMuted, setConflictMuted] = useState(false)
  const [conflictForced, setConflictForced] = useState(0)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [fitToken, setFitToken] = useState(0)
  useEffect(() => {
    setFitToken((t) => t + 1)
  }, [project.survey])

  const watersheds = project.watersheds
  const patches = project.patches
  const activePatches = useMemo(() => patches.filter((p) => p.watershedId === activeWs), [patches, activeWs])

  const patchStats = useMemo(() => {
    const m = new Map()
    for (const p of patches) {
      const st = dem ? areaSlopeStats(dem, p.points) : null
      m.set(p.id, st)
    }
    return m
  }, [patches, dem])

  const selectedPatch = selection?.kind === 'patch' ? patches.find((p) => p.id === selection.id) : null
  const selectedMeasure = selection?.kind === 'measure' ? measures.find((m) => m.id === selection.id) : null

  const errors = validation.errors
  const warnings = validation.warnings
  const latestVersion = project.versions?.[project.versions.length - 1] || null

  const handleAddWatershed = (pts) => {
    const id = `ws-${Date.now().toString(36)}`
    const name = `新建小流域${watersheds.length + 1}`
    api.addWatershed({ id, name, code: `WS-${String(watersheds.length + 1).padStart(2, '0')}`, color: '#4f7cac', points: pts, outlet: polygonCentroid(pts) })
    setActiveWs(id)
    setTool('select')
    notify(`已新增「${name}」，请为图斑勾绘治理范围`, 'ok')
  }

  const handleAddPatch = (pts) => {
    if (!activeWs) {
      notify('请先在左侧选择一个小流域', 'warn')
      return
    }
    const id = `p-${Date.now().toString(36)}`
    const n = activePatches.length + 1
    api.addPatch({
      id,
      watershedId: activeWs,
      name: `图斑 ${n}`,
      landType: 'slopeFarm',
      landTypeName: LAND_TYPES.slopeFarm.name,
      points: pts,
      createdAt: new Date().toISOString(),
    })
    setSelection({ kind: 'patch', id })
    setTab('patch')
    setTool('select')
  }

  const handlePlaceMeasure = (data, fromClick = false) => {
    const type = MEASURE_TYPES[data.type]
    const centerPoint = data.shape.center || (data.rect ? data.rect.center : null) || polygonCentroid(data.shape.points)
    const patch = patches.find((p) => pointInPoly(p.points, centerPoint)) || null
    if (!patch) {
      notify('请将措施布设在某个图斑范围内（先选择图斑或落在图斑内）', 'warn')
      return
    }
    const id = uidMeasure()
    const m = {
      id,
      type: data.type,
      patchId: patch.id,
      watershedId: patch.watershedId,
      params: { ...type.defaults, ...(data.params || {}) },
      shape:
        data.shape.kind === 'polygon'
          ? { kind: 'rect', center: data.rect.center, angle: data.rect.angle, L: data.rect.L, W: data.rect.W }
          : data.shape,
      channelId: data.channelId,
      s: data.s,
      createdAt: new Date().toISOString(),
    }
    // 布设前检查梯田坡度
    if (m.type === 'terrace' && dem) {
      const st = patchSlope(dem, measureExtent(m))
      if (st.mean > 25 || st.shares[3] > 0.35) {
        notify(`该位置平均坡度 ${st.mean.toFixed(1)}°，超过 25°，梯田将标红并提示退耕还林`, 'warn')
      }
    }
    api.addMeasure(m)
    setSelection({ kind: 'measure', id })
    setPendingType(null)
    setTool('select')
    notify(`已布设 ${type.name} 于「${patch.name}」`, 'ok')
  }

  const renderLeft = () => (
    <>
      <div className="sidebar-head">
        <h2>小流域</h2>
        <p>共 {watersheds.length} 个小流域 · {patches.length} 个图斑</p>
      </div>
      <div className="sidebar-scroll">
        <div className="lib-section">
          {watersheds.map((w) => {
            const list = patches.filter((p) => p.watershedId === w.id)
            const area = list.reduce((s, p) => s + polygonArea(p.points), 0)
            return (
              <div
                key={w.id}
                className={`layer-row ${w.id === activeWs ? 'sel' : ''}`}
                onClick={() => setActiveWs(w.id)}
              >
                <span className="sw" style={{ background: w.color || '#4f7cac' }} />
                <span className="nm">{w.name}</span>
                <span className="val">{list.length} 图斑 · {(area / 10000).toFixed(1)} hm²</span>
              </div>
            )
          })}
          <button
            className={`tool-btn ${tool === 'draw-watershed' ? 'active' : ''}`}
            style={{ width: '100%', marginTop: 6, justifyContent: 'center' }}
            onClick={() => {
              setTool(tool === 'draw-watershed' ? 'select' : 'draw-watershed')
              setPendingType(null)
            }}
          >
            <Icon name="draw" size={13} /> 勾绘小流域边界
          </button>
        </div>

        <div className="lib-section">
          <h3>措施库（拖入图斑）</h3>
          {MEASURE_LIST.map((t) => (
            <div
              key={t.id}
              className={`measure-card ${pendingType === t.id ? 'active' : ''} ${dragging === t.id ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => {
                window.__dragMeasureType = t.id
                e.dataTransfer.setData('text/measure-type', t.id)
                e.dataTransfer.effectAllowed = 'copy'
                setDragging(t.id)
              }}
              onDragEnd={() => {
                setDragging(null)
                window.__dragMeasureType = null
              }}
              onClick={() => {
                setPendingType(pendingType === t.id ? null : t.id)
                setTool(pendingType === t.id ? 'select' : 'place')
              }}
              title={t.hint}
            >
              <span className="m-icon" style={{ background: `${t.color}26`, color: t.color }}>
                <Icon name={t.icon} />
              </span>
              <span className="m-body">
                <strong>{t.name}</strong>
                <span>{t.hint}</span>
              </span>
              <span className="m-tag">{t.category.replace('措施', '').replace('工程+植物', '工程+植物')}</span>
            </div>
          ))}
          <p className="tiny-note">拖到图上即按当前位置的等高线方向自动吸附对齐；按住 Shift 拖动可自由旋转。</p>
        </div>

        <div className="lib-section">
          <h3>图层</h3>
          {[
            ['坡度分级着色', showSlope, setShowSlope],
            ['地类图斑', showPatches, setShowPatches],
            ['高程/名称注记', showLabels, setShowLabels],
          ].map(([label, val, set]) => (
            <label key={label} className={`toggle-chip ${val ? 'on' : ''}`} style={{ display: 'flex', marginBottom: 4 }}>
              <input className="check" type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} />
              {label}
            </label>
          ))}
        </div>

        <div className="lib-section">
          <h3>
            测绘成果 <span className="grow" />
            <button className="link-btn" onClick={() => setImportOpen(true)}>导入 / 更换</button>
          </h3>
          <div className="kv"><span className="k">成果名称</span><span className="v" style={{ maxWidth: 168, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.survey.name}</span></div>
          <div className="kv"><span className="k">等高距</span><span className="v">{project.survey.interval} m</span></div>
          <div className="kv"><span className="k">等高线 / 节点</span><span className="v">{project.survey.stats?.contourCount} 条 / {fmtNum(project.survey.stats?.pointCount)} 点</span></div>
          <div className="kv"><span className="k">高程范围</span><span className="v">{project.survey.minLevel} – {project.survey.maxLevel} m</span></div>
          <div className="kv"><span className="k">沟道</span><span className="v">{project.survey.channels?.length || 0} 条</span></div>
        </div>
      </div>
    </>
  )

  return (
    <div className="app-body">
      <aside className="sidebar">{renderLeft()}</aside>

      <section className="center-col">
        <div className="toolbar">
          <button className={`tool-btn ${tool === 'select' ? 'active' : ''}`} onClick={() => { setTool('select'); setPendingType(null) }}>选择</button>
          <button
            className={`tool-btn ${tool === 'draw-patch' ? 'active' : ''}`}
            onClick={() => { setTool(tool === 'draw-patch' ? 'select' : 'draw-patch'); setPendingType(null) }}
          >
            <Icon name="draw" size={13} /> 勾绘图斑
          </button>
          <div className="tool-sep" />
          <button className="tool-btn" disabled={!selectedPatchesCanFit} onClick={() => autoRecommend()}>
            按建议自动布设
          </button>
          <div className="tool-sep" />
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            当前小流域：<b style={{ color: 'var(--ink-2)' }}>{watersheds.find((w) => w.id === activeWs)?.name || '未选择'}</b>
          </span>
          <div style={{ flex: 1 }} />
          {latestVersion?.status === 'returned' && (
            <button className="chip err" style={{ cursor: 'pointer' }} onClick={() => setCommentsOpen(true)}>
              第 {latestVersion.no} 版已退回 · 查看意见
            </button>
          )}
          <span className={`chip ${errors.length ? 'err' : warnings.length ? 'warn' : 'ok'}`}>
            {errors.length ? `${errors.length} 项错误` : warnings.length ? `${warnings.length} 项提醒` : '校核通过'}
          </span>
        </div>
        {project.status === 'pending' && (
          <div className="status-banner">
            方案第 {latestVersion.no} 版已于 {new Date(latestVersion.submittedAt).toLocaleString('zh-CN', { hour12: false })} 提交，正在等待复核。
            复核以提交时的版本快照为准，此后的修改需重新提交才会进入复核。
          </div>
        )}
        {project.status === 'returned' && (
          <div className="status-banner returned">
            第 {latestVersion.no} 版已退回（{new Date(latestVersion.reviewedAt).toLocaleString('zh-CN', { hour12: false })}）：
            {latestVersion.overall || '请查看图斑意见后修改'}
            <button className="link-btn" style={{ marginLeft: 8 }} onClick={() => setCommentsOpen(true)}>查看全部意见</button>
          </div>
        )}
        <MapCanvas
          survey={project.survey}
          dem={dem}
          watersheds={watersheds}
          patches={patches}
          measures={measures}
          issues={validation.issues}
          activeWatershedId={activeWs}
          tool={tool}
          pendingMeasure={pendingType ? { type: pendingType, params: MEASURE_TYPES[pendingType].defaults } : null}
          onAddWatershed={handleAddWatershed}
          onAddPatch={handleAddPatch}
          onPlaceMeasure={handlePlaceMeasure}
          onUpdateMeasure={(id, patch) => api.updateMeasure(id, patch)}
          onSelect={(sel) => {
            setSelection(sel)
            if (sel?.kind === 'patch') setTab('patch')
            if (sel?.kind === 'measure') setTab('measure')
          }}
          selection={selection}
          showSlope={showSlope}
          showLabels={showLabels}
          showPatches={showPatches}
          notify={notify}
          canEdit
          fitToken={fitToken}
        />
      </section>

      <aside className="rightbar">
        <div className="panel-header">
          <h2>工程量与校核</h2>
          <span className="sub">{measures.length} 项措施</span>
          <span className="grow" />
        </div>
        <div className="tabs">
          {[
            ['patch', '图斑与建议'],
            ['measure', '措施参数'],
            ['check', '校核'],
          ].map(([id, label]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {label}
              {id === 'check' && (errors.length || warnings.length) ? <span className="badge">{errors.length + warnings.length}</span> : null}
            </button>
          ))}
        </div>
        <div className="pane-scroll">
          {tab === 'patch' && (
            <>
              {selectedPatch ? (
                <PatchPanel
                  patch={selectedPatch}
                  stats={patchStats.get(selectedPatch.id)}
                  dem={dem}
                  onUpdate={(patch) => api.updatePatch(selectedPatch.id, patch)}
                  onDelete={() => {
                    api.removePatch(selectedPatch.id)
                    setSelection(null)
                  }}
                  measures={measures.filter((m) => m.patchId === selectedPatch.id)}
                  onSelectMeasure={(id) => { setSelection({ kind: 'measure', id }); setTab('measure') }}
                  notify={notify}
                  setPendingType={(t) => { setPendingType(t); setTool(t ? 'place' : 'select') }}
                  boundaries={activePatches.filter((p) => p.id !== selectedPatch.id)}
                />
              ) : (
                <div className="empty">
                  <span className="ico">◎</span>
                  在图上单击图斑，查看坡度分级统计与措施建议
                </div>
              )}
              <div className="sec">
                <h3>本流域图斑 <span className="grow" /><span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>{activePatches.length} 个</span></h3>
                {activePatches.map((p) => {
                  const st = patchStats.get(p.id)
                  const ms = measures.filter((m) => m.patchId === p.id)
                  const rec = RECOMMENDATION[p.landType]
                  return (
                    <div
                      key={p.id}
                      className={`layer-row ${selection?.id === p.id ? 'sel' : ''}`}
                      onClick={() => setSelection({ kind: 'patch', id: p.id })}
                    >
                      <span className="sw" style={{ background: LAND_TYPES[p.landType].color }} />
                      <span className="nm">
                        {p.name}
                        <br />
                        <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{LAND_TYPES[p.landType].name} · {fmtArea(st?.area ?? polygonArea(p.points))}</span>
                      </span>
                      <span className="val">
                        {ms.length ? `${ms.length} 项` : <span style={{ color: 'var(--warn)' }}>未布设</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="sec">
                <h3>措施清单</h3>
                {measures.length === 0 && <div className="empty">尚未布设措施</div>}
                {measures.map((m) => {
                  const errs = validation.issues.filter((i) => i.measureId === m.id && i.level === 'error')
                  const t = MEASURE_TYPES[m.type]
                  return (
                    <div
                      key={m.id}
                      className={`layer-row ${selection?.id === m.id ? 'sel' : ''}`}
                      onClick={() => { setSelection({ kind: 'measure', id: m.id }); setTab('measure') }}
                    >
                      <span className="sw" style={{ background: errs.length ? '#c02f24' : t.color }} />
                      <span className="nm">
                        {t.name} · {patches.find((p) => p.id === m.patchId)?.name || '未知图斑'}
                      </span>
                      <span className="val">
                        {m.calc?.ditchLength > 0 ? `${fmtNum(m.calc.ditchLength, 0)} m` : m.calc?.area ? fmtArea(m.calc.area) : `${m.calc?.earthwork ? fmtNum(m.calc.earthwork, 0) + ' m³' : '—'}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'measure' && (
            <>
              {selectedMeasure ? (
                <MeasurePanel
                  measure={selectedMeasure}
                  dem={dem}
                  ctx={ctx}
                  onUpdate={(patch) => api.updateMeasure(selectedMeasure.id, patch)}
                  onDelete={() => {
                    api.removeMeasure(selectedMeasure.id)
                    setSelection(null)
                  }}
                  issues={validation.issues.filter((i) => i.measureId === selectedMeasure.id || i.measureId2 === selectedMeasure.id)}
                  onConvertForest={() => {
                    api.convertToForest(selectedMeasure.id)
                    notify('已改为退耕还林（水保林），可继续调整株行距', 'ok')
                  }}
                  patches={patches}
                  channels={project.survey.channels}
                />
              ) : (
                <div className="empty"><span className="ico">◇</span>选择一项措施查看并填写参数</div>
              )}
              <div className="sec">
                <h3>全区工程量汇总</h3>
                <TotalSummary measures={measures} />
              </div>
            </>
          )}

          {tab === 'check' && (
            <CheckPanel
              validation={validation}
              measures={measures}
              patches={patches}
              onSelect={(id) => { setSelection({ kind: 'measure', id }); setTab('measure') }}
              onConvertForest={(id) => { api.convertToForest(id); notify('已改为退耕还林（水保林）', 'ok') }}
              collapsed={collapsedConflicts}
              setCollapsed={setCollapsedConflicts}
              project={project}
              dem={dem}
            />
          )}
        </div>
        <div className="actions-row">
          {project.status === 'pending' ? (
            <button className="btn block" disabled>
              第 {latestVersion.no} 版待复核中
            </button>
          ) : (
            <button className="btn primary block" onClick={() => submitPlan()}>
              {project.status === 'returned' ? '修改后重新提交复核' : '提交复核'}
            </button>
          )}
        </div>
      </aside>

      <ReviewCommentsModal
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        versions={project.versions}
        patches={patches}
        onLocatePatch={(id) => { setSelection({ kind: 'patch', id }); setTab('patch') }}
      />

      <ConflictDialog
        conflicts={validation.issues.filter((i) => i.type === 'overlap' || i.type === 'dam-spacing')}
        onLocate={(id) => { setSelection({ kind: 'measure', id }); setTab('measure') }}
        onDelete={(id) => { api.removeMeasure(id); notify('已删除冲突措施', 'ok') }}
        onClose={() => { setConflictMuted(true); setConflictOpen(true) }}
        muted={conflictMuted}
        setMuted={(v) => { setConflictMuted(v); if (!v) setConflictOpen(false) }}
        forceOpen={conflictForced}
      />

      <Modal
        open={importOpen}
        title="导入测绘成果"
        onClose={() => setImportOpen(false)}
        footer={<button className="btn" onClick={() => setImportOpen(false)}>关闭</button>}
        width={560}
      >
        <ImportSurvey
          onDone={(survey, clearAll) => {
            api.setSurvey(survey)
            if (clearAll) api.update((s) => ({ ...s, watersheds: [], patches: [], measures: [], versions: [] }))
            setImportOpen(false)
            setSelection(null)
            notify(
              `已载入测绘成果：${survey.contours.length} 条等高线，${survey.channels.length} 条沟道${clearAll ? '（已清空原有数据）' : ''}`,
              'ok',
            )
          }}
          notify={notify}
        />
      </Modal>
    </div>
  )

  function selectedPatchesCanFit() {
    return activePatches.length > 0
  }

  function autoRecommend() {
    if (!dem) return
    let added = 0
    for (const p of activePatches) {
      if (measures.some((m) => m.patchId === p.id)) continue
      const st = patchStats.get(p.id)
      const rec = suggestFor(p, st, dem)
      if (!rec) continue
      const c = polygonCentroid(p.points)
      const type = MEASURE_TYPES[rec.type]
      if (type.shape === 'area') {
        const bb = polygonArea(p.points)
        const L = Math.sqrt(bb) * 1.02
        const W = Math.sqrt(bb) * 0.8
        api.addMeasure({
          id: uidMeasure(),
          type: rec.type,
          patchId: p.id,
          watershedId: p.watershedId,
          params: { ...type.defaults },
          shape: { kind: 'rect', center: c, angle: contourAngleAt(dem, c[0], c[1]), L, W },
          createdAt: new Date().toISOString(),
        })
        added++
      }
    }
    notify(added ? `已按建议自动布设 ${added} 项措施，可继续调整` : '当前图斑均已有措施或坡度不适宜自动布设', added ? 'ok' : 'warn')
  }

  function submitPlan() {
    if (validation.errors.length) {
      setTab('check')
      const conflicts = validation.issues.filter((i) => i.type === 'overlap' || i.type === 'dam-spacing')
      if (conflicts.length) {
        setConflictMuted(false)
        setConflictForced((n) => n + 1)
      }
      notify(`存在 ${validation.errors.length} 项校核错误，须处理后才能提交复核`, 'error')
      return
    }
    api.submitReview('')
    notify('方案已提交复核，进入待复核状态', 'ok')
  }
}

function pointInPoly(poly, pt) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function PatchPanel({ patch, stats, dem, onUpdate, onDelete, measures, onSelectMeasure, notify, setPendingType, boundaries }) {
  const [recType, setRecType] = useState(null)
  const rec = RECOMMENDATION[patch.landType]
  const steepShare = stats?.shares[3] || 0
  const meanSlope = stats?.meanSlope || 0
  const advice = []
  if (patch.landType === 'slopeFarm') {
    if (meanSlope > 25 || steepShare > 0.4) {
      advice.push({ level: 'error', text: '坡度大于 25°，不宜修水平梯田，应退耕还林（水保林）', type: 'forest' })
    } else {
      advice.push({ level: 'ok', text: '适宜修筑水平梯田，沿等高线布设田面', type: 'terrace' })
    }
  } else if (patch.landType === 'wasteGrass') {
    advice.push({ level: 'ok', text: '鱼鳞坑整地造林，坑间撒播植草', type: 'fishpit' })
    advice.push({ level: 'info', text: '缓坡地段可纯植草覆盖', type: 'grass' })
  } else if (patch.landType === 'outlet') {
    advice.push({ level: 'ok', text: '沟道出口布设谷坊群，逐级拦沙消能', type: 'checkdam' })
  } else if (patch.landType === 'forest') {
    advice.push({ level: 'info', text: '封山育林，坡面配套截水沟', type: 'ditch' })
  } else {
    advice.push({ level: 'info', text: '补植水保林，鱼鳞坑整地', type: 'forest' })
  }
  const area = stats?.area ?? 0

  return (
    <>
      <div className="sec">
        <h3>
          图斑属性 <span className="grow" />
          <button className="btn sm danger" onClick={onDelete}>删除</button>
        </h3>
        <Field label="图斑名称">
          <input type="text" value={patch.name} onChange={(e) => onUpdate({ name: e.target.value })} />
        </Field>
        <Field label="地类">
          <select
            value={patch.landType}
            onChange={(e) => onUpdate({ landType: e.target.value, landTypeName: LAND_TYPES[e.target.value].name })}
          >
            {LAND_TYPE_ORDER.map((k) => (
              <option key={k} value={k}>{LAND_TYPES[k].name}</option>
            ))}
          </select>
        </Field>
        <div className="kv"><span className="k">图斑面积</span><span className="v">{fmtArea(area)}</span></div>
        <div className="kv"><span className="k">平均坡度</span><span className="v">{meanSlope.toFixed(1)}°</span></div>
        <div className="kv"><span className="k">高程范围</span><span className="v">{stats ? `${stats.minZ.toFixed(0)} – ${stats.maxZ.toFixed(0)} m` : '—'}</span></div>
      </div>
      <div className="sec">
        <h3>坡度分级面积占比</h3>
        {stats ? (
          <>
            <SlopeBars shares={stats.shares} />
            <div className="divider" />
            {stats.sharesByClass.map((c, i) => (
              <div className="kv" key={c.id}>
                <span className="k">
                  <span style={{ display: 'inline-block', width: 9, height: 9, background: c.color, borderRadius: 2, marginRight: 5 }} />
                  {c.label} {c.name}
                </span>
                <span className="v">{fmtArea(c.area)}（{(c.share * 100).toFixed(1)}%）</span>
              </div>
            ))}
          </>
        ) : (
          <div className="tiny-note">未生成坡度栅格</div>
        )}
      </div>
      <div className="sec">
        <h3>措施建议</h3>
        {advice.map((a, i) => (
          <div className={`msg ${a.level === 'error' ? 'error' : a.level === 'warn' ? 'warn' : a.level === 'info' ? 'info' : 'ok'}`} key={i}>
            <div className="grow">{a.text}</div>
            <button className="act" onClick={() => setPendingType(a.type)}>布设「{MEASURE_TYPES[a.type].short}」</button>
          </div>
        ))}
        {rec?.alt && patch.landType !== 'slopeFarm' && (
          <div className="msg info">
            <div className="grow">{rec.alt.text}</div>
            <button className="act" onClick={() => setPendingType(rec.alt.types[0])}>布设</button>
          </div>
        )}
        <p className="tiny-note">建议依据：地类 + 坡度分级。坡度大于 25° 的坡耕地系统将强制提示退耕还林。</p>
      </div>
      <div className="sec">
        <h3>该图斑措施 <span className="grow" /><span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>{measures.length} 项</span></h3>
        {measures.length === 0 && <div className="tiny-note">尚未布设措施</div>}
        {measures.map((m) => (
          <div className="layer-row" key={m.id} onClick={() => onSelectMeasure(m.id)}>
            <span className="sw" style={{ background: MEASURE_TYPES[m.type].color }} />
            <span className="nm">{MEASURE_TYPES[m.type].name}</span>
            <span className="val">{fmtNum(m.calc?.earthwork, 0)} m³</span>
          </div>
        ))}
        {measures.length > 0 && (
          <>
            <div className="divider" />
            <div className="kv"><span className="k">图斑土方量合计</span><span className="v">{fmtNum(measures.reduce((s, m) => s + (m.calc?.earthwork || 0), 0), 1)} m³</span></div>
            <div className="kv"><span className="k">图斑苗木合计</span><span className="v">{fmtNum(measures.reduce((s, m) => s + (m.calc?.seedlings || 0), 0), 0)} 株</span></div>
            <div className="kv"><span className="k">图斑沟渠长度</span><span className="v">{fmtNum(measures.reduce((s, m) => s + (m.calc?.ditchLength || 0), 0), 0)} m</span></div>
            <div className="kv"><span className="k">措施覆盖面积</span><span className="v">{fmtNum(measures.reduce((s, m) => s + (m.calc?.area || 0), 0), 0)} m²</span></div>
          </>
        )}
      </div>
    </>
  )
}

function MeasurePanel({ measure, dem, ctx, onUpdate, onDelete, issues, onConvertForest, patches, channels }) {
  const t = MEASURE_TYPES[measure.type]
  const errs = issues.filter((i) => i.level === 'error')
  const calc = measure.calc
  const [showJson, setShowJson] = useState(false)
  const setParam = (k, v) => onUpdate({ params: { ...measure.params, [k]: v } })
  return (
    <>
      <div className="sec">
        <h3>
          <span className="m-icon" style={{ background: `${t.color}26`, color: t.color, width: 20, height: 20, flex: '0 0 20px' }}>
            <Icon name={t.icon} size={12} />
          </span>
          {t.name}
          <span className="grow" />
          <span className="chip">{t.category}</span>
        </h3>
        <div className="kv"><span className="k">所属图斑</span><span className="v">{patches.find((p) => p.id === measure.patchId)?.name || '—'}</span></div>
        <div className="kv"><span className="k">布设面积</span><span className="v">{fmtArea(calc?.area)}</span></div>
        <div className="kv"><span className="k">图斑内占比</span><span className="v">{((calc?.coverage ?? 1) * 100).toFixed(0)}%</span></div>
        {measure.createdAt && <div className="kv"><span className="k">布设时间</span><span className="v">{new Date(measure.createdAt).toLocaleString('zh-CN', { hour12: false })}</span></div>}
        {measure.type === 'checkdam' && (
          <>
            <div className="kv"><span className="k">所在沟道</span><span className="v">{channels.find((c) => c.id === measure.channelId)?.name || '—'}</span></div>
            <div className="kv"><span className="k">沟道桩号</span><span className="v">{(measure.s || 0).toFixed(0)} m</span></div>
            <div className="kv"><span className="k">沟底比降</span><span className="v">{calc?.channelGradient ? `${(calc.channelGradient * 100).toFixed(2)}%` : '—'}</span></div>
            <div className="kv"><span className="k">允许最大间距</span><span className="v">{Number.isFinite(calc?.maxSpacing) ? `${calc.maxSpacing.toFixed(0)} m` : '—'}</span></div>
          </>
        )}
      </div>

      {errs.length > 0 && (
        <div className="sec" style={{ background: '#fdf4f2' }}>
          {errs.map((e) => (
            <div className="msg error" key={e.id}>
              <div className="grow">
                <div className="title">{e.title}</div>
                {e.message}
              </div>
              {e.action === 'convert-forest' && (
                <button className="act" onClick={onConvertForest}>改退耕还林</button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="sec">
        <h3>参数填写</h3>
        <div className="grid2">
          {t.fields.map((f) => (
            <Field key={f.key} label={f.label} unit={f.unit}>
              <input
                type="number"
                value={measure.params[f.key]}
                step={f.step}
                min={f.min}
                max={f.max}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v)) setParam(f.key, v)
                }}
              />
            </Field>
          ))}
        </div>
        {measure.type === 'terrace' && (
          <p className="tiny-note">
            筑埂土方 = 田埂长 × 埂高 ×（埂顶宽 + 边坡×埂高）；田埂长按布设面积 ÷ 田面宽计算。田面宽越大，田埂越少但削坡量越大。
          </p>
        )}
        {measure.type === 'fishpit' && (
          <p className="tiny-note">鱼鳞坑数按布设面积 ÷（行距 × 株距）计算，单坑土方按 60% 有效容积计。</p>
        )}
        {measure.type === 'checkdam' && (
          <p className="tiny-note">谷坊间距按 H / i 校核（H 为谷坊高、i 为沟底比降），保证回水相互衔接。</p>
        )}
      </div>

      <div className="sec">
        <h3>工程量</h3>
        {calc?.items?.map((it) => (
          <div className="kv" key={it.label}>
            <span className="k">{it.label}</span>
            <span className="v">
              {fmtNum(it.value, it.digits ?? 0)} {it.unit}
            </span>
          </div>
        ))}
        {!calc?.items?.length && <div className="tiny-note">无</div>}
      </div>

      <div className="actions-row" style={{ borderTop: 0, background: 'transparent', paddingTop: 0 }}>
        <button className="btn danger" onClick={onDelete}>删除该措施</button>
      </div>
    </>
  )
}

function TotalSummary({ measures }) {
  const totals = measures.reduce(
    (a, m) => {
      a.earthwork += m.calc?.earthwork || 0
      a.seedlings += m.calc?.seedlings || 0
      a.ditch += m.calc?.ditchLength || 0
      if (m.calc?.area) a.area += m.calc.area
      return a
    },
    { earthwork: 0, seedlings: 0, ditch: 0, area: 0 },
  )
  return (
    <>
      <div className="stat-grid">
        <div className="stat-card"><div className="n">{fmtNum(totals.earthwork, 0)}<small>m³</small></div><div className="l">土方量合计</div></div>
        <div className="stat-card"><div className="n">{fmtNum(totals.seedlings, 0)}<small>株</small></div><div className="l">苗木合计</div></div>
        <div className="stat-card"><div className="n">{fmtNum(totals.ditch, 0)}<small>m</small></div><div className="l">沟渠长度</div></div>
        <div className="stat-card"><div className="n">{(totals.area / 10000).toFixed(2)}<small>hm²</small></div><div className="l">布设面积</div></div>
      </div>
    </>
  )
}

function CheckPanel({ validation, measures, patches, onSelect, onConvertForest, collapsed, setCollapsed, project, dem }) {
  const { issues, errors, warnings } = validation
  const [showWarn, setShowWarn] = useState(true)
  return (
    <>
      <div className="sec">
        <h3>校核结果</h3>
        {errors.length === 0 && warnings.length === 0 && (
          <div className="msg ok"><div className="grow">全部措施均通过校核，可提交复核。</div></div>
        )}
        {errors.length > 0 && (
          <div className="msg error">
            <div className="grow">
              <div className="title">存在 {errors.length} 项错误</div>
              错误未处理前无法提交复核。
            </div>
          </div>
        )}
        {errors.map((e) => (
          <div className="msg error" key={e.id}>
            <div className="grow">
              <div className="title">{e.title}</div>
              {e.message}
              {e.measureId && (
                <div style={{ marginTop: 4 }}>
                  <button className="link-btn" onClick={() => onSelect(e.measureId)}>定位措施</button>
                </div>
              )}
            </div>
            {e.action === 'convert-forest' && <button className="act" onClick={() => onConvertForest(e.measureId)}>改退耕还林</button>}
          </div>
        ))}
      </div>
      <div className="sec">
        <h3>
          提醒 <span className="grow" />
          <button className="link-btn" onClick={() => setShowWarn(!showWarn)}>{showWarn ? '收起' : '展开'}</button>
        </h3>
        {showWarn && (
          <>
            {warnings.length === 0 && <div className="tiny-note">无提醒</div>}
            {warnings.map((w) => (
              <div className="msg warn" key={w.id}>
                <div className="grow">
                  <div className="title">{w.title}</div>
                  {w.message}
                  {w.measureId && <div style={{ marginTop: 4 }}><button className="link-btn" onClick={() => onSelect(w.measureId)}>定位措施</button></div>}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="sec">
        <h3>提交前自检</h3>
        <div className="kv"><span className="k">图斑总数</span><span className="v">{patches.length}</span></div>
        <div className="kv"><span className="k">已布设措施图斑</span><span className="v">{new Set(measures.map((m) => m.patchId)).size} / {patches.length}</span></div>
        <div className="kv"><span className="k">措施总数</span><span className="v">{measures.length} 项</span></div>
        <div className="kv"><span className="k">冲突/间距问题</span><span className="v">{issues.filter((i) => i.type === 'overlap' || i.type === 'dam-spacing').length} 项</span></div>
      </div>
    </>
  )
}

function ImportSurvey({ onDone, notify }) {
  const [drag, setDrag] = useState(false)
  const [err, setErr] = useState(null)
  const [preview, setPreview] = useState(null)
  const [clearAll, setClearAll] = useState(false)
  const inputRef = useRef(null)

  const readFile = async (file) => {
    setErr(null)
    try {
      const text = await file.text()
      const { parseSurvey } = await import('../lib/survey.js')
      const survey = parseSurvey(text, file.name)
      if (!survey.contours.length) throw new Error('未解析到等高线')
      setPreview(survey)
      notify?.(`解析成功：${survey.contours.length} 条等高线`, 'ok')
    } catch (e) {
      setErr(e.message)
      setPreview(null)
    }
  }

  return (
    <>
      <div
        className={`import-zone ${drag ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          const f = e.dataTransfer.files?.[0]
          if (f) readFile(f)
        }}
        onClick={() => inputRef.current?.click()}
        style={{ cursor: 'pointer' }}
      >
        <input ref={inputRef} type="file" accept=".json,.geojson,.csv,.txt" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
        <b>拖入或点击选择测绘成果文件</b>
        <div style={{ marginTop: 6 }}>支持本系统 JSON、GeoJSON（等高线 LineString，含 elevation 属性）、CSV（level,x1,y1,x2,y2,…）</div>
      </div>
      {err && <div className="msg error" style={{ marginTop: 10 }}><div className="grow">{err}</div></div>}
      {preview && (
        <div style={{ marginTop: 12 }}>
          <div className="kv"><span className="k">文件</span><span className="v">{preview.name}</span></div>
          <div className="kv"><span className="k">等高线</span><span className="v">{preview.contours.length} 条 / {fmtNum(preview.stats.pointCount)} 节点</span></div>
          <div className="kv"><span className="k">高程范围</span><span className="v">{preview.minLevel} – {preview.maxLevel} m（等高距 {preview.interval} m）</span></div>
          <div className="kv"><span className="k">沟道</span><span className="v">{preview.channels.length} 条</span></div>
          <div className="kv"><span className="k">范围</span><span className="v">{preview.bounds ? `${(preview.bounds.maxX - preview.bounds.minX).toFixed(0)} × ${(preview.bounds.maxY - preview.bounds.minY).toFixed(0)} m` : '—'}</span></div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: 'var(--ink-2)', marginTop: 10 }}>
            <input className="check" type="checkbox" checked={clearAll} onChange={(e) => setClearAll(e.target.checked)} />
            载入同时清空现有小流域、图斑与措施
          </label>
          <button className="btn primary block" style={{ marginTop: 8 }} onClick={() => onDone(preview, clearAll)}>载入该测绘成果</button>
        </div>
      )}
    </>
  )
}

