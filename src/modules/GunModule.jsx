import { useCallback, useMemo, useRef, useState } from 'react';
import { Viewport } from '../components/Viewport.jsx';
import { TrailList } from '../components/panels.jsx';
import { Icon } from '../components/ui.jsx';
import { GUN_TYPES, LEVELS } from '../lib/trailMath.js';
import { heightAt } from '../lib/terrain.js';

export function GunModule({ ops, push }) {
  const {
    trails, guns, analyses, conflictsByTrail, selectedTrailId, setSelectedTrailId,
    selectedGunId, setSelectedGunId, addGun, removeGun, saveGunPlan,
  } = ops;

  const [filter, setFilter] = useState('all');
  const [placing, setPlacing] = useState(null); // 'fan' | 'lance' | null
  const [hoverIdx, setHoverIdx] = useState(null);
  const sceneApi = useRef(null);

  const trail = trails.find((t) => t.id === selectedTrailId) || null;
  const analysis = trail ? analyses[trail.id] : null;
  const trailGuns = useMemo(
    () => guns.filter((g) => g.trailId === selectedTrailId),
    [guns, selectedTrailId],
  );
  const selectedGun = guns.find((g) => g.id === selectedGunId) || null;

  const sceneData = useMemo(
    () => ({
      trails,
      analyses,
      guns,
      selectedTrailId,
      selectedGunId,
      conflicts: ops.conflicts,
      mode: placing ? 'place' : 'select',
      draft: null,
    }),
    [trails, analyses, guns, selectedTrailId, selectedGunId, ops.conflicts, placing],
  );

  const onCommand = useCallback((scene) => { sceneApi.current = scene; }, []);

  const handleTerrain = useCallback((p) => {
    if (!placing || !trail) return;
    const gun = addGun(trail.id, placing, p.x, p.z);
    setSelectedGunId(gun.id);
    push(`已布设${GUN_TYPES[placing].label} ${gun.id}`, 'ok');
  }, [placing, trail, addGun, push, setSelectedGunId]);

  const coverageDelta = useMemo(() => {
    if (!analysis || !trail) return 0;
    return 100 - analysis.coveredPct;
  }, [analysis, trail]);

  const uncoveredTotal = analysis ? analysis.uncovered.reduce((s, u) => s + u.length, 0) : 0;

  return (
    <div className="module">
      <div className="grid-3d with-strip">
        <aside className="side">
          <TrailList
            trails={trails}
            analyses={analyses}
            conflictsByTrail={conflictsByTrail}
            selectedId={selectedTrailId}
            onSelect={(id) => { setSelectedTrailId(id); setSelectedGunId(null); }}
            filter={filter}
            setFilter={setFilter}
          />
          <div className="pad" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <div className="sec-label">布设工具</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn ${placing === 'fan' ? 'primary' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setPlacing(placing === 'fan' ? null : 'fan')}
              >
                <Icon name="snow" size={13} />
                造雪炮
              </button>
              <button
                className={`btn ${placing === 'lance' ? 'primary' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setPlacing(placing === 'lance' ? null : 'lance')}
              >
                水枪
              </button>
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 9, lineHeight: 1.6 }}>
              {placing
                ? `在地形上单击即可落点；${GUN_TYPES[placing].label}有效射程 ${GUN_TYPES[placing].range} m。`
                : '选择设备类型后，在地形任意位置单击布设。'}
            </div>
          </div>
        </aside>

        <div className="stage">
        <Viewport
          data={sceneData}
          onPickTrail={(id) => { setSelectedTrailId(id); setSelectedGunId(null); }}
          onPickGun={(gunId, trailId) => { setSelectedGunId(gunId); setSelectedTrailId(trailId); }}
          onPickTerrain={placing ? handleTerrain : null}
          onCommand={onCommand}
        />

        <div className="vp-overlay">
          <div className="vp-toolbar">
            <button className={`tool-btn ${placing ? 'on' : ''}`} onClick={() => setPlacing(placing ? null : 'fan')}>
              <Icon name="plus" size={13} />
              {placing ? '布点中' : '布设设备'}
            </button>
            <div className="tool-sep" />
            <button className="tool-btn" onClick={() => sceneApi.current?.focusTrail(analysis)}>定位雪道</button>
            <button className="tool-btn" onClick={() => sceneApi.current?.resetCamera()}>全览</button>
            <button className="tool-btn" onClick={() => sceneApi.current?.topView()}>俯视</button>
          </div>

          <div className="vp-badge">
            <span>设备 <b>{trailGuns.length}</b></span>
            <span>射程 <b>{trailGuns.length ? `${Math.round(Math.max(...trailGuns.map((g) => GUN_TYPES[g.type].range)))} m` : '—'}</b></span>
            <span>覆盖 <b style={{ color: coverageDelta > 5 ? 'var(--red)' : 'var(--teal)' }}>{analysis ? `${analysis.coveredPct.toFixed(0)}%` : '—'}</b></span>
          </div>

          {placing ? (
            <div className="vp-badge" style={{ top: 58, right: 14, borderColor: 'rgba(79,227,193,.3)', color: '#bff7ec' }}>
              <span>{GUN_TYPES[placing].label} · 单击落点 · Esc 结束</span>
            </div>
          ) : null}

          <div className="vp-hud">
            <div className="legend">
              <div className="legend-row">
                <span className="legend-swatch" style={{ background: 'repeating-linear-gradient(45deg,#ff5b5b,#ff5b5b 2px,transparent 2px,transparent 5px)', outline: '1px solid rgba(255,91,91,.4)' }} />
                射程未覆盖（红色斜纹）
              </div>
              <div className="legend-row">
                <span className="legend-swatch" style={{ background: 'rgba(79,227,193,.5)', outline: '1px solid rgba(79,227,193,.8)' }} />
                设备有效覆盖环
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
          {trail && analysis ? (
            <>
              <div className="ins-head">
                <div className="ins-title">{trail.name}</div>
                <div className="ins-sub">
                  {trail.id} · {LEVELS[trail.level].label} · 长度 {analysis.length.toFixed(0)} m
                </div>
                <div className="metrics" style={{ margin: '12px 0 0', gridTemplateColumns: '1fr 1fr' }}>
                  <div className="metric">
                    <div className="metric-k">覆盖率</div>
                    <div className={`metric-v ${analysis.coveredPct > 99 ? 'good' : analysis.coveredPct > 85 ? 'warn' : 'bad'}`}>
                      {analysis.coveredPct.toFixed(1)}
                      <span className="u">%</span>
                    </div>
                  </div>
                  <div className="metric">
                    <div className="metric-k">未覆盖长度</div>
                    <div className={`metric-v ${uncoveredTotal > 1 ? 'bad' : 'good'}`}>
                      {uncoveredTotal.toFixed(0)}
                      <span className="u">m</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ins-section">
                <div className="sec-label">
                  覆盖检查
                  <span style={{ fontFamily: 'var(--mono)', color: uncoveredTotal > 1 ? 'var(--red)' : 'var(--teal)' }}>
                    {analysis.uncovered.length ? `${analysis.uncovered.length} 段缺口` : '无缺口'}
                  </span>
                </div>
                {analysis.uncovered.length ? (
                  analysis.uncovered.map((u, i) => (
                    <div className="issue bad" key={i}>
                      <div className="issue-title">
                        <Icon name="alert" size={13} />
                        造雪射程未覆盖
                      </div>
                      <div className="issue-body">
                        里程 {u.startS.toFixed(0)}–{u.endS.toFixed(0)} m 区段不在任何设备有效射程内，需补设设备或改用大射程造雪炮。
                      </div>
                      <div className="issue-meta">
                        <span>缺口 {(u.endS - u.startS).toFixed(0)} m</span>
                        <span>占全长 {(((u.endS - u.startS) / analysis.length) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="hint" style={{ borderColor: 'rgba(79,227,193,.2)', background: 'rgba(79,227,193,.05)', color: '#a9efe0' }}>
                    全线在设备射程之内，可提交造雪作业方案。
                  </div>
                )}
              </div>

              <div className="ins-section">
                <div className="sec-label">
                  设备清单
                  <span style={{ fontFamily: 'var(--mono)' }}>{trailGuns.length}</span>
                </div>
                {trailGuns.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {analysis.gunStats.map((g) => {
                      const share = analysis.samples.length ? (g.covered / analysis.samples.length) * 100 : 0;
                      const isSel = g.id === selectedGunId;
                      return (
                        <div
                          key={g.id}
                          onClick={() => setSelectedGunId(isSel ? null : g.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 9,
                            padding: '7px 9px',
                            borderRadius: 7,
                            border: `1px solid ${isSel ? 'rgba(79,227,193,.4)' : 'var(--line)'}`,
                            background: isSel ? 'rgba(79,227,193,.07)' : 'rgba(255,255,255,.015)',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ width: 22, height: 22, borderRadius: 5, display: 'grid', placeItems: 'center', background: 'rgba(79,227,193,.12)', color: 'var(--teal)' }}>
                            <Icon name={g.type === 'fan' ? 'snow' : 'pin'} size={11} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5 }}>{g.id}</div>
                            <div style={{ fontSize: 9.5, color: 'var(--text-3)' }}>
                              {g.typeLabel} · 射程 {g.range} m · X {g.x.toFixed(0)} Z {g.z.toFixed(0)}
                            </div>
                          </div>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: share > 22 ? 'var(--teal)' : 'var(--text-3)' }}>
                            {share.toFixed(0)}%
                          </span>
                          <button
                            className="btn ghost sm"
                            title="撤除"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeGun(g.id);
                              push(`已撤除 ${g.id}`, 'warn');
                            }}
                          >
                            <Icon name="x" size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty">该雪道尚未布设造雪设备</div>
                )}
              </div>

              <div className="ins-section">
                <div className="sec-label">定点布设</div>
                <GunQuickPlace trail={trail} analysis={analysis} onPlace={(type, s, side) => {
                  const pt = analysis.segments.reduce((best, seg) =>
                    Math.abs(seg.s - s) < Math.abs(best.s - s) ? seg : best, analysis.segments[0]);
                  const idx = analysis.segments.indexOf(pt);
                  const prev = analysis.segments[Math.max(0, idx - 1)];
                  const next = analysis.segments[Math.min(analysis.segments.length - 1, idx + 1)];
                  const dx = next.x - prev.x;
                  const dz = next.z - prev.z;
                  const len = Math.hypot(dx, dz) || 1;
                  const nx = -dz / len;
                  const nz = dx / len;
                  const off = pt.width / 2 + 4;
                  const gx = pt.x + nx * off * side;
                  const gz = pt.z + nz * off * side;
                  const gun = addGun(trail.id, type, gx, gz);
                  setSelectedGunId(gun.id);
                  push(`已在 ${s.toFixed(0)} m 处布设${GUN_TYPES[type].label} ${gun.id}`, 'ok');
                }} />
              </div>

              <div className="ins-section" style={{ paddingBottom: 26 }}>
                <button
                  className="btn primary block"
                  disabled={trail.status !== 'draft' && trail.status !== 'review'}
                  onClick={() => {
                    saveGunPlan(trail.id);
                    push(`「${trail.name}」造雪布点方案已提交`, 'ok');
                  }}
                >
                  提交造雪布点方案
                </button>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.6 }}>
                  方案与覆盖检查结果一并归档，安全审核时作为核对依据。
                </div>
              </div>
            </>
          ) : (
            <div className="empty">选择一条雪道</div>
          )}
        </aside>

        <div className="strip">
          <div className="strip-head">
            <span className="eyebrow">射程覆盖剖面</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
              {trail ? `平均间距 ${trailGuns.length > 1 ? (analysis.length / (trailGuns.length + 1)).toFixed(0) : '—'} m` : ''}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <span className="chip blue">造雪炮 {GUN_TYPES.fan.range} m</span>
              <span className="chip blue">水枪 {GUN_TYPES.lance.range} m</span>
              {uncoveredTotal > 1 ? <span className="chip red">缺口 {uncoveredTotal.toFixed(0)} m</span> : <span className="chip teal">全覆盖</span>}
            </div>
          </div>
          <div className="strip-body" style={{ padding: '8px 12px' }}>
            {analysis ? (
              <CoverageBar analysis={analysis} onHover={setHoverIdx} hoverIdx={hoverIdx} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CoverageBar({ analysis, onHover, hoverIdx }) {
  const segs = analysis.segments;
  const W = 1000;
  const H = 68;
  const len = analysis.length || 1;
  const xOf = (s) => (s / len) * W;

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H }}>
        <defs>
          <pattern id="gapHatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="rgba(255,70,70,0.1)" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,70,70,0.8)" strokeWidth="2.4" />
          </pattern>
        </defs>
        {segs.map((s, i) => {
          if (i === 0) return null;
          const prev = segs[i - 1];
          return (
            <rect
              key={i}
              x={xOf(prev.s)}
              y={12}
              width={Math.max(0.7, xOf(s.s) - xOf(prev.s))}
              height={26}
              fill={s.covered ? 'rgba(79,227,193,0.38)' : 'url(#gapHatch)'}
              onPointerEnter={() => onHover?.(i)}
            />
          );
        })}
        {analysis.uncovered.map((u, i) => (
          <rect key={`u${i}`} x={xOf(u.startS)} y={44} width={Math.max(1, xOf(u.endS) - xOf(u.startS))} height={9} fill="rgba(255,90,90,.72)" />
        ))}
        {analysis.gunStats.map((g) => {
          // project gun position onto the nearest sample
          let best = segs[0];
          for (const s of segs) {
            if (Math.hypot(s.x - g.x, s.z - g.z) < Math.hypot(best.x - g.x, best.z - g.z)) best = s;
          }
          return (
            <g key={g.id}>
              <line x1={xOf(best.s)} y1={0} x2={xOf(best.s)} y2={12} stroke="rgba(79,227,193,.6)" strokeWidth="1" />
              <circle cx={xOf(best.s)} cy={6} r="2.5" fill="#4fe3c1" />
            </g>
          );
        })}
        {hoverIdx != null && segs[hoverIdx] ? (
          <line x1={xOf(segs[hoverIdx].s)} y1={0} x2={xOf(segs[hoverIdx].s)} y2={H} stroke="rgba(255,255,255,.3)" strokeWidth="1" />
        ) : null}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-3)', marginTop: 2 }}>
        <span>0 m</span>
        <span>{(len * 0.25).toFixed(0)}</span>
        <span>{(len * 0.5).toFixed(0)}</span>
        <span>{(len * 0.75).toFixed(0)}</span>
        <span>{len.toFixed(0)} m</span>
      </div>
    </div>
  );
}

function GunQuickPlace({ trail, analysis, onPlace }) {
  const [type, setType] = useState('fan');
  const [s, setS] = useState(Math.round(analysis.length * 0.35));
  const [side, setSide] = useState(1);
  return (
    <div>
      <div className="row2">
        <div className="field" style={{ marginBottom: 8 }}>
          <label>设备类型</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="fan">造雪炮 · {GUN_TYPES.fan.range} m</option>
            <option value="lance">水枪 · {GUN_TYPES.lance.range} m</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>侧向</label>
          <select className="select" value={side} onChange={(e) => setSide(Number(e.target.value))}>
            <option value={1}>左侧</option>
            <option value={-1}>右侧</option>
          </select>
        </div>
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label>里程位置 {s} m</label>
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.round(analysis.length))}
          value={s}
          onChange={(e) => setS(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#4fe3c1' }}
        />
      </div>
      <button className="btn block" onClick={() => onPlace(type, s, side)}>
        <Icon name="plus" size={12} />
        在该里程布设
      </button>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.6 }}>
        设备沿雪道边缘 4 m 处架设，射程覆盖雪道内侧。
      </div>
    </div>
  );
}
