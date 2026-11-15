import { useMemo, useState } from 'react';
import { Icon, LevelTag, StatusPill } from '../components/ui.jsx';
import { LEVELS } from '../lib/trailMath.js';

const KIND_META = {
  design: { color: '#5aa9ff', label: '设计' },
  gun: { color: '#4fe3c1', label: '造雪' },
  review: { color: '#a78bfa', label: '审核' },
  status: { color: '#f7c05a', label: '状态' },
};

const INC_META = {
  碰撞: { color: '#ff8f6b', bg: 'rgba(255,143,107,.13)' },
  摔伤: { color: '#ff6b6b', bg: 'rgba(255,107,107,.13)' },
  越界: { color: '#f7c05a', bg: 'rgba(247,192,90,.13)' },
  设备: { color: '#5aa9ff', bg: 'rgba(90,169,255,.13)' },
};

export function DashboardModule({ ops }) {
  const { trails, analyses, snow, incidents, log, conflicts, conflictsByTrail } = ops;
  const [incidentFilter, setIncidentFilter] = useState('all');

  const open = trails.filter((t) => t.status === 'open');
  const review = trails.filter((t) => t.status === 'review');
  const draft = trails.filter((t) => t.status === 'draft');
  const closed = trails.filter((t) => t.status === 'closed');

  const capacity = open.reduce((s, t) => s + t.dailyCapacity, 0);
  const snowPct = useMemo(() => {
    const list = trails.filter((t) => t.status !== 'closed');
    if (!list.length) return 0;
    return list.reduce((s, t) => s + (snow[t.id]?.pct || 0), 0) / list.length;
  }, [trails, snow]);

  const totalCoverage = useMemo(() => {
    const list = trails.filter((t) => t.status !== 'closed');
    if (!list.length) return 0;
    return list.reduce((s, t) => s + (analyses[t.id]?.coveredPct || 0), 0) / list.length;
  }, [trails, analyses]);

  const severityCount = conflicts.filter((c) => c.severity === 'severe').length;
  const incidents30 = incidents.length;

  const incidentTrail = (id) => trails.find((t) => t.id === id)?.name || id;

  return (
    <div className="module is-scroll">
      <div className="dash">
        <div className="dash-head">
          <div>
            <div className="dash-title">运营看板</div>
            <div className="dash-sub">2026–27 雪季 · 数据截至 11-18 08:00 · 全部 {trails.length} 条雪道</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="chip blue">雪季进行中</span>
            <span className="chip">今日 -8.4°C · 湿度 72%</span>
          </div>
        </div>

        <div className="kpis">
          <div className="kpi" style={{ '--kpi-accent': 'var(--teal)' }}>
            <div className="kpi-k">已开放雪道</div>
            <div className="kpi-v">
              {open.length}
              <span className="u">/ {trails.length}</span>
            </div>
            <div className="kpi-f">
              <span style={{ color: 'var(--teal)' }}>●</span> 待审 {review.length} · 设计中 {draft.length} · 封闭 {closed.length}
            </div>
          </div>
          <div className="kpi" style={{ '--kpi-accent': 'var(--blue)' }}>
            <div className="kpi-k">开放日承载</div>
            <div className="kpi-v">
              {capacity.toLocaleString('zh-CN')}
              <span className="u">人次</span>
            </div>
            <div className="kpi-f">下站设计通行 8,600 人次/日</div>
          </div>
          <div className="kpi" style={{ '--kpi-accent': 'var(--amber)' }}>
            <div className="kpi-k">造雪完成率</div>
            <div className="kpi-v">
              {snowPct.toFixed(0)}
              <span className="u">%</span>
            </div>
            <div className="kpi-f">设备射程覆盖 {totalCoverage.toFixed(0)}%</div>
          </div>
          <div className="kpi" style={{ '--kpi-accent': 'var(--red)' }}>
            <div className="kpi-k">事故记录（本月）</div>
            <div className="kpi-v">
              {incidents30}
              <span className="u">起</span>
            </div>
            <div className="kpi-f">
              <span style={{ color: severityCount ? 'var(--red)' : 'var(--teal)' }}>●</span> 严重冲突 {severityCount} 项待处理
            </div>
          </div>
        </div>

        <div className="dash-grid">
          <div className="panel">
            <div className="panel-top">
              <div className="panel-title"><span className="dot" />雪道开放状态</div>
              <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>点击状态可筛选下方事故记录</span>
            </div>
            <div
              className="board-row"
              style={{ fontSize: 9.5, letterSpacing: '.1em', color: 'var(--text-3)', textTransform: 'uppercase', paddingTop: 8, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}
            >
              <span>雪道</span>
              <span>状态</span>
              <span>造雪完成</span>
              <span>坡度</span>
              <span style={{ textAlign: 'right' }}>承载</span>
            </div>
            {trails.map((t) => {
              const a = analyses[t.id];
              const s = snow[t.id];
              const pct = s?.pct ?? 0;
              const barCls = pct > 80 ? '' : pct > 40 ? 'amber' : 'red';
              return (
                <div className="board-row" key={t.id}>
                  <div className="board-name">
                    <span style={{ width: 3, height: 15, borderRadius: 2, background: LEVELS[t.level].color, flex: 'none' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                  </div>
                  <div><StatusPill status={t.status} /></div>
                  <div className="bar-wrap">
                    <div className={`bar ${barCls}`}><i style={{ width: `${pct}%` }} /></div>
                    <span className="bar-pct">{pct}%</span>
                  </div>
                  <div className="board-mono">
                    {a ? `${a.avgGrade.toFixed(0)}° / ${a.maxGrade.toFixed(0)}°` : '—'}
                  </div>
                  <div className="board-mono" style={{ textAlign: 'right' }}>
                    {t.dailyCapacity.toLocaleString('zh-CN')}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="panel">
              <div className="panel-top">
                <div className="panel-title"><span className="dot" style={{ background: 'var(--amber)' }} />冲突与风险</div>
                <span className="chip amber">{conflicts.length}</span>
              </div>
              <div style={{ maxHeight: 246, overflowY: 'auto' }}>
                {conflicts.slice(0, 8).map((c) => (
                  <div key={c.id} style={{ padding: '9px 15px', borderBottom: '1px solid rgba(148,178,214,.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 6, height: 6, borderRadius: '50%', flex: 'none',
                          background: c.severity === 'severe' ? 'var(--red)' : c.severity === 'warn' ? 'var(--amber)' : 'var(--blue)',
                        }}
                      />
                      <span style={{ fontSize: 11, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                      <span className="chip" style={{ fontSize: 9 }}>
                        {c.kind === 'crossing' ? '交叉' : c.kind === 'merge' ? '汇入' : '排队'}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.55, marginTop: 4, paddingLeft: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {c.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel" style={{ flex: 1 }}>
              <div className="panel-top">
                <div className="panel-title"><span className="dot" style={{ background: 'var(--blue)' }} />造雪完成率</div>
                <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>目标 100%</span>
              </div>
              <div style={{ padding: '12px 15px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {trails.filter((t) => t.status !== 'closed').map((t) => {
                  const s = snow[t.id];
                  const pct = s?.pct ?? 0;
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 10.5 }}>
                      <span style={{ width: 78, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                      <div className={`bar ${pct > 80 ? '' : pct > 40 ? 'amber' : 'red'}`} style={{ flex: 1 }}><i style={{ width: `${pct}%` }} /></div>
                      <span className="bar-pct">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="dash-grid even">
          <div className="panel">
            <div className="panel-top">
              <div className="panel-title"><span className="dot" style={{ background: 'var(--red)' }} />事故记录</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', '碰撞', '摔伤', '设备'].map((k) => (
                  <button
                    key={k}
                    className={`btn sm ${incidentFilter === k ? '' : 'ghost'}`}
                    onClick={() => setIncidentFilter(k)}
                  >
                    {k === 'all' ? '全部' : k}
                  </button>
                ))}
              </div>
            </div>
            {incidents
              .filter((i) => incidentFilter === 'all' || i.type === incidentFilter)
              .map((inc) => {
                const meta = INC_META[inc.type] || INC_META.摔伤;
                return (
                  <div className="incident" key={inc.id}>
                    <div className="inc-icon" style={{ background: meta.bg, color: meta.color }}>
                      <Icon name="alert" size={12} />
                    </div>
                    <div className="inc-main">
                      <div className="inc-title">
                        {inc.type}
                        <span className="chip" style={{ height: 17, fontSize: 9 }}>{inc.severity === 'minor' ? '轻微' : '中等'}</span>
                        <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>{incidentTrail(inc.trailId)}</span>
                      </div>
                      <div className="inc-body">{inc.note}</div>
                    </div>
                    <div className="inc-time">{inc.at}</div>
                  </div>
                );
              })}
            {!incidents.filter((i) => incidentFilter === 'all' || i.type === incidentFilter).length ? (
              <div className="empty">该类型暂无记录</div>
            ) : null}
          </div>

          <div className="panel">
            <div className="panel-top">
              <div className="panel-title"><span className="dot" style={{ background: 'var(--violet)' }} />变更留痕</div>
              <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{log.length} 条记录</span>
            </div>
            <div className="log" style={{ maxHeight: 340, overflowY: 'auto' }}>
              {log.map((l) => {
                const meta = KIND_META[l.kind] || KIND_META.design;
                return (
                  <div className="log-item" key={l.id}>
                    <span className="log-dot"><i style={{ '--c': meta.color }} /></span>
                    <div className="log-main">
                      <div className="log-txt">
                        <span style={{ color: meta.color, fontWeight: 500 }}>{l.trailName || l.trailId || '全局'}</span>
                        <span style={{ color: 'var(--text-3)' }}> · </span>
                        {l.summary}
                      </div>
                      <div className="log-meta">
                        <span>{l.at}</span>
                        <span>{l.actor}</span>
                        <span style={{ color: meta.color }}>{meta.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-top">
            <div className="panel-title"><span className="dot" />雪道台帐</div>
            <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>难度 · 雪季 · 承载 · 造雪 · 冲突</span>
          </div>
          <div
            className="board-row"
            style={{ gridTemplateColumns: '150px 84px 100px 130px 90px 90px 1fr', fontSize: 9.5, letterSpacing: '.1em', color: 'var(--text-3)', textTransform: 'uppercase', paddingTop: 8, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}
          >
            <span>雪道</span>
            <span>等级</span>
            <span>状态</span>
            <span>雪季</span>
            <span>平均坡度</span>
            <span>日均承载</span>
            <span>备注</span>
          </div>
          {trails.map((t) => (
            <div className="board-row" key={t.id} style={{ gridTemplateColumns: '150px 84px 100px 130px 90px 90px 1fr' }}>
              <div className="board-name" style={{ overflow: 'hidden' }}>
                <span style={{ width: 3, height: 15, borderRadius: 2, background: LEVELS[t.level].color, flex: 'none' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
              </div>
              <div><LevelTag level={t.level} /></div>
              <div><StatusPill status={t.status} /></div>
              <div className="board-mono">{t.season.start} → {t.season.end}</div>
              <div className="board-mono">{analyses[t.id] ? `${analyses[t.id].avgGrade.toFixed(1)}°` : '—'}</div>
              <div className="board-mono">{t.dailyCapacity.toLocaleString('zh-CN')}</div>
              <div style={{ color: 'var(--text-3)', fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {conflictsByTrail[t.id]?.length ? `${conflictsByTrail[t.id].length} 项冲突 · ` : ''}
                {t.notes || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
