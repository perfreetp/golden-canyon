import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Viewport } from '../components/Viewport.jsx';
import { TrailList, TrailSummary } from '../components/panels.jsx';
import { ProfileStrip } from '../components/ProfileStrip.jsx';
import { Icon, Modal } from '../components/ui.jsx';
import { LEVELS } from '../lib/trailMath.js';
import { heightAt, BASE_STATIONS } from '../lib/terrain.js';

export function DesignModule({ ops, push }) {
  const {
    trails, guns, analyses, conflictsByTrail, selectedTrailId, setSelectedTrailId,
    updateTrail, setCenterline, createTrail, deleteTrail, submitForReview,
  } = ops;

  const [filter, setFilter] = useState('all');
  const [mode, setMode] = useState('select'); // select | edit | draw
  const [drawPoints, setDrawPoints] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [newForm, setNewForm] = useState({ name: '', level: 'intermediate', width: 36, baseStation: 'A' });
  const sceneApi = useRef(null);

  const trail = trails.find((t) => t.id === selectedTrailId) || null;
  const analysis = trail ? analyses[trail.id] : null;
  const conflicts = trail ? conflictsByTrail[trail.id] || [] : [];

  const sceneData = useMemo(
    () => ({
      trails,
      analyses,
      guns,
      selectedTrailId,
      selectedGunId: null,
      conflicts: ops.conflicts,
      mode,
      draft: mode === 'draw' && drawPoints.length ? { trailId: '__new__', points: drawPoints, cursor } : null,
    }),
    [trails, analyses, guns, selectedTrailId, ops.conflicts, mode, drawPoints, cursor],
  );

  const onCommand = useCallback((scene) => {
    sceneApi.current = scene;
  }, []);

  const finishDraw = useCallback((points) => {
    if (points.length < 2) {
      push('至少需要两个控制点才能成线', 'warn');
      return;
    }
    const name = window.prompt('雪道名称', `新建雪道 ${trails.length + 1}`);
    if (!name) return;
    const t = createTrail({
      name,
      level: 'intermediate',
      width: 36,
      baseStation: 'A',
      centerline: points.map((p) => ({ x: p.x, z: p.z, w: 36 })),
    });
    setDrawPoints([]);
    setCursor(null);
    setMode('select');
    push(`已生成雪道「${t.name}」，可继续调整线位`, 'ok');
  }, [createTrail, push, trails.length]);

  const handleDrawPoint = useCallback((p) => {
    if (mode !== 'draw') return;
    setDrawPoints((prev) => [...prev, { x: p.x, z: p.z }]);
  }, [mode]);

  const handleMoveNode = useCallback((trailId, nodeIndex, x, z) => {
    const t = trails.find((tt) => tt.id === trailId);
    if (!t) return;
    const cl = t.centerline.map((p, i) => (i === nodeIndex ? { ...p, x, z } : p));
    setCenterline(trailId, cl);
  }, [trails, setCenterline]);

  // keyboard: esc ends drawing / edit mode
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (mode === 'draw') {
        setDrawPoints([]);
        setCursor(null);
        setMode('select');
      } else if (mode === 'edit') {
        setMode('select');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  const handleSelectTrail = (id) => {
    setSelectedTrailId(id);
    if (mode === 'draw') {
      setDrawPoints([]);
      setCursor(null);
      setMode('select');
    }
  };

  const warningsCount = analysis?.warnings.length || 0;
  const gapCount = analysis?.uncovered.length || 0;

  const scratchPoints = analysis?.segments || [];
  const perKm = analysis && analysis.length > 0
    ? ((analysis.length / 1000) * 60).toFixed(1)
    : '—';

  return (
    <div className="module">
      <div className="grid-3d with-strip">
        <aside className="side">
          <TrailList
            trails={trails}
            analyses={analyses}
            conflictsByTrail={conflictsByTrail}
            selectedId={selectedTrailId}
            onSelect={handleSelectTrail}
            filter={filter}
            setFilter={setFilter}
          />
          <div className="pad" style={{ paddingTop: 6, borderTop: '1px solid var(--line)' }}>
            <button className="btn block primary" onClick={() => { setShowNew(true); }}>
              <Icon name="plus" size={13} />
              新建雪道
            </button>
          </div>
        </aside>

        <div className="stage">
        <Viewport
          data={sceneData}
          drawMode={mode === 'draw'}
          cursorPreview={mode === 'draw' ? setCursor : null}
          onPickTrail={handleSelectTrail}
          onPickTerrain={null}
          onMoveNode={handleMoveNode}
          onCommand={onCommand}
          onDrawPoint={handleDrawPoint}
        />

        <div className="vp-overlay">
          <div className="vp-toolbar">
            <button className={`tool-btn ${mode === 'select' ? 'on' : ''}`} onClick={() => { setMode('select'); setDrawPoints([]); }}>
              <Icon name="pin" size={13} />
              浏览
            </button>
            <button
              className={`tool-btn ${mode === 'edit' ? 'on' : ''}`}
              disabled={!trail}
              onClick={() => setMode(mode === 'edit' ? 'select' : 'edit')}
            >
              <Icon name="pen" size={13} />
              编辑线位
            </button>
            <button
              className={`tool-btn ${mode === 'draw' ? 'on' : ''}`}
              onClick={() => {
                setMode(mode === 'draw' ? 'select' : 'draw');
                setDrawPoints([]);
                setCursor(null);
              }}
            >
              <Icon name="plus" size={13} />
              绘制线位
            </button>
            <div className="tool-sep" />
            <button className="tool-btn" onClick={() => sceneApi.current?.focusTrail(analysis)}>定位雪道</button>
            <button className="tool-btn" onClick={() => sceneApi.current?.resetCamera()}>全览</button>
            <button className="tool-btn" onClick={() => sceneApi.current?.topView()}>俯视</button>
          </div>

          <div className="vp-badge">
            <span>控制点 <b>{trail?.centerline.length ?? 0}</b></span>
            <span>提醒 <b style={{ color: warningsCount ? 'var(--amber)' : 'var(--text)' }}>{warningsCount}</b></span>
            <span>未覆盖 <b style={{ color: gapCount ? 'var(--red)' : 'var(--text)' }}>{gapCount}</b></span>
          </div>

          {mode === 'draw' ? (
            <div
              className="vp-badge"
              style={{ top: 58, right: 14, borderColor: 'rgba(79,227,193,.3)', color: '#bff7ec', fontSize: 10.5, gap: 12 }}
            >
              <span>绘制中：在地形上单击落点 · 双击成线 · Esc 取消</span>
              <b>{drawPoints.length} 点</b>
              <button className="btn sm primary" disabled={drawPoints.length < 2} onClick={() => finishDraw(drawPoints)}>
                成线
              </button>
            </div>
          ) : null}

          <div className="vp-hud">
            <div className="legend">
              <div className="legend-row">
                <span className="legend-swatch" style={{ background: LEVELS.beginner.color }} />初级道
                <span className="legend-swatch" style={{ background: LEVELS.intermediate.color, marginLeft: 10 }} />中级道
                <span className="legend-swatch" style={{ background: LEVELS.advanced.color, marginLeft: 10 }} />高级道
              </div>
              <div className="legend-row">
                <span className="legend-swatch" style={{ background: 'repeating-linear-gradient(45deg,#ff5b5b,#ff5b5b 2px,transparent 2px,transparent 5px)', outline: '1px solid rgba(255,91,91,.4)' }} />
                造雪未覆盖区段
                <span className="legend-swatch" style={{ background: '#ffc24d', marginLeft: 10 }} />线位提醒
              </div>
            </div>
          </div>

          <div className="compass">
            <span style={{ position: 'absolute', top: 3, fontSize: 8 }}>N</span>
            <span className="needle" />
          </div>
        </div>
        </div>

        <aside className="inspector">
          <TrailSummary
            trail={trail}
            analysis={analysis}
            conflicts={conflicts}
            onFocus={() => sceneApi.current?.focusTrail(analysis)}
          />

          {trail ? (
            <>
              <div className="ins-section">
                <div className="sec-label">属性</div>
                <div className="row2">
                  <div className="field">
                    <label>难度等级</label>
                    <select
                      className="select"
                      value={trail.level}
                      onChange={(e) => updateTrail(trail.id, { level: e.target.value }, {
                        kind: 'design',
                        summary: `难度等级调整为${LEVELS[e.target.value].label}`,
                      })}
                    >
                      {Object.values(LEVELS).map((l) => (
                        <option key={l.key} value={l.key}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>基准宽度 (m)</label>
                    <input
                      className="input"
                      type="number"
                      min="12"
                      max="90"
                      value={Math.round(trail.width)}
                      onChange={(e) => {
                        const w = Number(e.target.value) || 24;
                        updateTrail(trail.id, {
                          width: w,
                          centerline: trail.centerline.map((p) => ({ ...p, w })),
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="row2">
                  <div className="field">
                    <label>开放季节起</label>
                    <input
                      className="input"
                      value={trail.season.start}
                      onChange={(e) => updateTrail(trail.id, { season: { ...trail.season, start: e.target.value } })}
                    />
                  </div>
                  <div className="field">
                    <label>开放季节止</label>
                    <input
                      className="input"
                      value={trail.season.end}
                      onChange={(e) => updateTrail(trail.id, { season: { ...trail.season, end: e.target.value } })}
                    />
                  </div>
                </div>
                <div className="row2">
                  <div className="field">
                    <label>日均承载 (人次)</label>
                    <input
                      className="input"
                      type="number"
                      value={trail.dailyCapacity}
                      onChange={(e) => updateTrail(trail.id, { dailyCapacity: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="field">
                    <label>下站</label>
                    <select
                      className="select"
                      value={trail.baseStation}
                      onChange={(e) => updateTrail(trail.id, { baseStation: e.target.value })}
                    >
                      {BASE_STATIONS.map((s) => (
                        <option key={s.id} value={s.id}>{s.id} · {s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="ins-section">
                <div className="sec-label">流程</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn primary"
                    style={{ flex: 1 }}
                    disabled={trail.status === 'review' || trail.status === 'open'}
                    onClick={() => {
                      submitForReview(trail.id);
                      push(`「${trail.name}」已提交安全审核`, 'ok');
                    }}
                  >
                    <Icon name="check" size={13} />
                    提交审核
                  </button>
                  {trail.status === 'open' ? (
                    <button className="btn danger" onClick={() => setShowClose(true)}>封闭</button>
                  ) : null}
                  <button
                    className="btn ghost"
                    title="删除雪道"
                    onClick={() => {
                      if (window.confirm(`确认删除「${trail.name}」及其造雪点位？`)) {
                        deleteTrail(trail.id);
                        push('雪道已删除', 'warn');
                      }
                    }}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
                <div style={{ marginTop: 10, fontSize: 10.5, color: 'var(--text-3)', lineHeight: 1.65 }}>
                  仅「已开放」与「封闭」状态可执行运营操作；设计中 / 待审核的雪道不能生成作业单。
                </div>
              </div>

              <div className="ins-section">
                <div className="sec-label">控制点</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {trail.centerline.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '4px 7px', borderRadius: 5,
                        background: hoverIndex === null ? 'transparent' : 'rgba(255,255,255,.03)',
                        fontFamily: 'var(--mono)', fontSize: 10,
                        color: 'var(--text-3)',
                      }}
                    >
                      <span style={{ color: i === 0 ? 'var(--teal)' : i === trail.centerline.length - 1 ? '#ff9f6b' : 'var(--text-3)' }}>
                        {i === 0 ? 'TOP' : i === trail.centerline.length - 1 ? 'BOT' : String(i + 1).padStart(2, '0')}
                      </span>
                      <span>X {p.x.toFixed(0)}</span>
                      <span>Z {p.z.toFixed(0)}</span>
                      <span style={{ marginLeft: 'auto' }}>H {heightAt(p.x, p.z).toFixed(0)} m</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ins-section" style={{ paddingBottom: 28 }}>
                <div className="sec-label">设计备注</div>
                <textarea
                  className="textarea"
                  value={trail.notes}
                  placeholder="记录线位调整原因、现场勘察情况等"
                  onChange={(e) => updateTrail(trail.id, { notes: e.target.value })}
                />
              </div>
            </>
          ) : null}
        </aside>

        <div className="strip">
          <div className="strip-head">
            <span className="eyebrow">纵剖面</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
              {trail ? `${trail.name} · 平均 ${analysis.avgGrade.toFixed(1)}° · 最大 ${analysis.maxGrade.toFixed(1)}° · 每公里落差 ${perKm} m` : ''}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              {analysis && analysis.warnings.length ? (
                <span className="chip amber">{analysis.warnings.map((w) => w.title).filter((v, i, a) => a.indexOf(v) === i).join(' / ')}</span>
              ) : (
                <span className="chip teal">坡度校核通过</span>
              )}
              {gapCount ? <span className="chip red">{gapCount} 段造雪未覆盖</span> : <span className="chip teal">造雪全覆盖</span>}
            </div>
          </div>
          <div className="strip-body" style={{ padding: '4px 6px 6px' }}>
            {trail ? <ProfileStrip trail={trail} analysis={analysis} height={100} onHoverIndex={setHoverIndex} /> : null}
          </div>
        </div>
      </div>

      {showNew ? (
        <NewTrailModal
          form={newForm}
          setForm={setNewForm}
          onClose={() => setShowNew(false)}
          onCreate={() => {
            const t = createTrail({
              ...newForm,
              width: Number(newForm.width),
              centerline: [],
            });
            setShowNew(false);
            setMode('draw');
            setDrawPoints([]);
            setSelectedTrailId(t.id);
            push('已创建空白雪道，请在地形上绘制中心线', 'ok');
          }}
        />
      ) : null}

      {showClose ? (
        <Modal
          title="封闭雪道"
          onClose={() => setShowClose(false)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setShowClose(false)}>取消</button>
              <button
                className="btn danger"
                onClick={() => {
                  ops.closeTrail(trail.id, closeReason);
                  setShowClose(false);
                  setCloseReason('');
                  push(`「${trail.name}」已封闭`, 'warn');
                }}
              >
                确认封闭
              </button>
            </>
          }
        >
          <div className="field">
            <label>封闭原因</label>
            <textarea
              className="textarea"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="如：雪崩防治施工、缺雪、赛事占用"
            />
          </div>
          <div className="hint">封闭后该雪道不再计入排队冲突与承载统计，重新开放需安全主管确认。</div>
        </Modal>
      ) : null}
    </div>
  );
}

function NewTrailModal({ form, setForm, onClose, onCreate }) {
  return (
    <Modal
      title="新建雪道"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>取消</button>
          <button className="btn primary" disabled={!form.name.trim()} onClick={onCreate}>创建并绘制</button>
        </>
      }
    >
      <div className="field">
        <label>雪道名称</label>
        <input
          className="input"
          value={form.name}
          placeholder="如：白桦林道"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoFocus
        />
      </div>
      <div className="row2">
        <div className="field">
          <label>难度等级</label>
          <select className="select" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
            {Object.values(LEVELS).map((l) => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>基准宽度 (m)</label>
          <input
            className="input"
            type="number"
            value={form.width}
            onChange={(e) => setForm({ ...form, width: e.target.value })}
          />
        </div>
      </div>
      <div className="field">
        <label>下站</label>
        <select className="select" value={form.baseStation} onChange={(e) => setForm({ ...form, baseStation: e.target.value })}>
          {BASE_STATIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.id} · {s.name}</option>
          ))}
        </select>
      </div>
      <div className="hint">创建后进入绘制模式：在地形上单击落点，双击成线。首点建议选在山脊，末点落在下站附近。</div>
    </Modal>
  );
}
