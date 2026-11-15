import { LEVELS } from '../lib/trailMath.js';
import { LevelDot, StatusPill, Icon, LevelTag } from './ui.jsx';

export function TrailList({ trails, analyses, conflictsByTrail, selectedId, onSelect, filter, setFilter }) {
  const counts = {
    all: trails.length,
    draft: trails.filter((t) => t.status === 'draft').length,
    review: trails.filter((t) => t.status === 'review').length,
    open: trails.filter((t) => t.status === 'open').length,
    closed: trails.filter((t) => t.status === 'closed').length,
  };
  const list = trails.filter((t) => filter === 'all' || t.status === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div className="panel-head" style={{ paddingBottom: 8 }}>
        <span className="eyebrow">雪道清单 · {trails.length}</span>
      </div>
      <div style={{ padding: '0 10px 10px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {[
          ['all', '全部'],
          ['draft', '设计中'],
          ['review', '待审核'],
          ['open', '已开放'],
          ['closed', '封闭'],
        ].map(([k, label]) => (
          <button
            key={k}
            className={`btn sm ${filter === k ? '' : 'ghost'}`}
            style={filter === k ? { borderColor: 'var(--line-strong)', background: 'rgba(255,255,255,.06)' } : undefined}
            onClick={() => setFilter(k)}
          >
            {label}
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-3)' }}>{counts[k]}</span>
          </button>
        ))}
      </div>
      <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 12 }}>
        {list.map((t) => {
          const a = analyses[t.id];
          const warnCount = (a?.warnings.length || 0);
          const gapPct = a ? Math.max(0, 100 - a.coveredPct) : 0;
          const conflicts = conflictsByTrail[t.id] || [];
          return (
            <div
              key={t.id}
              className={`trail-row ${t.id === selectedId ? 'on' : ''}`}
              onClick={() => onSelect(t.id)}
            >
              <LevelDot level={t.level} />
              <div className="trail-row-main">
                <div className="trail-row-name">{t.name}</div>
                <div className="trail-row-sub">
                  <span>{t.id}</span>
                  <span>{a ? `${a.length.toFixed(0)} m` : '—'}</span>
                  <span>{a ? `${a.maxGrade.toFixed(0)}°` : '—'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {warnCount > 0 ? (
                  <span className="trail-row-flag" style={{ background: 'var(--amber)' }} title={`${warnCount} 项线位提醒`} />
                ) : null}
                {gapPct > 1 ? (
                  <span className="trail-row-flag" style={{ background: 'var(--red)' }} title={`${gapPct.toFixed(0)}% 未覆盖`} />
                ) : null}
                {conflicts.length > 0 ? (
                  <span className="trail-row-flag" style={{ background: 'var(--blue)' }} title={`${conflicts.length} 项冲突`} />
                ) : null}
                <StatusPill status={t.status} />
              </div>
            </div>
          );
        })}
        {!list.length ? <div className="empty">该状态下暂无雪道</div> : null}
      </div>
    </div>
  );
}

export function TrailSummary({ trail, analysis, conflicts, onFocus }) {
  if (!trail || !analysis) return <div className="empty">选择一条雪道查看详情</div>;

  return (
    <>
      <div className="ins-head">
        <div className="ins-title">
          <LevelDot level={trail.level} size={9} />
          {trail.name}
        </div>
        <div className="ins-sub">
          {trail.id} · {trail.centerline.length} 控制点 · 下站 {trail.baseStation}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <StatusPill status={trail.status} />
          <LevelTag level={trail.level} />
          <span className="chip">{trail.season.start} → {trail.season.end}</span>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="metric-k">雪道长度</div>
          <div className="metric-v">
            {analysis.length.toFixed(0)}
            <span className="u">m</span>
          </div>
        </div>
        <div className="metric">
          <div className="metric-k">落差</div>
          <div className="metric-v">
            {analysis.drop.toFixed(0)}
            <span className="u">m</span>
          </div>
        </div>
        <div className="metric">
          <div className="metric-k">平均坡度</div>
          <div className="metric-v">
            {analysis.avgGrade.toFixed(1)}
            <span className="u">°</span>
          </div>
        </div>
        <div className="metric">
          <div className="metric-k">最大坡度</div>
          <div className={`metric-v ${analysis.maxGrade > 33 ? 'warn' : ''}`}>
            {analysis.maxGrade.toFixed(1)}
            <span className="u">°</span>
          </div>
        </div>
        <div className="metric">
          <div className="metric-k">最小宽度</div>
          <div className={`metric-v ${analysis.minWidth < 30 ? 'warn' : ''}`}>
            {analysis.minWidth.toFixed(0)}
            <span className="u">m</span>
          </div>
        </div>
        <div className="metric">
          <div className="metric-k">造雪覆盖</div>
          <div className={`metric-v ${analysis.coveredPct > 99 ? 'good' : analysis.coveredPct > 85 ? 'warn' : 'bad'}`}>
            {analysis.coveredPct.toFixed(0)}
            <span className="u">%</span>
          </div>
        </div>
      </div>

      <div className="ins-section">
        <div className="sec-label">
          线位校核
          <span style={{ fontFamily: 'var(--mono)', color: analysis.warnings.length ? 'var(--amber)' : 'var(--teal)' }}>
            {analysis.warnings.length ? `${analysis.warnings.length} 项提醒` : '通过'}
          </span>
        </div>
        {analysis.warnings.length ? (
          analysis.warnings.map((w, i) => (
            <div className="issue" key={i}>
              <div className="issue-title">
                <Icon name="alert" size={13} />
                {w.title}
              </div>
              <div className="issue-body">{w.detail}</div>
              <div className="issue-meta">
                <span>
                  里程 {w.startS.toFixed(0)}–{w.endS.toFixed(0)} m
                </span>
                <span>长 {(w.endS - w.startS).toFixed(0)} m</span>
              </div>
            </div>
          ))
        ) : (
          <div className="hint" style={{ borderColor: 'rgba(79,227,193,.2)', background: 'rgba(79,227,193,.05)', color: '#a9efe0' }}>
            坡度、宽度与反坡检查均满足 {LEVELS[trail.level].label}标准。
          </div>
        )}
      </div>

      {trail.review && trail.review.action === 'reject' ? (
        <div className="ins-section">
          <div className="sec-label">审核意见</div>
          <div className="issue bad">
            <div className="issue-title">
              <Icon name="alert" size={13} />
              已退回整改
            </div>
            <div className="issue-body">{trail.review.comment}</div>
            <div className="issue-meta">
              <span>{trail.review.by}</span>
              <span>{trail.review.at}</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="ins-section">
        <div className="sec-label">
          交叉口与汇入冲突
          <span style={{ fontFamily: 'var(--mono)' }}>{conflicts.length}</span>
        </div>
        {conflicts.length ? (
          conflicts.map((c) => (
            <div className={`issue ${c.severity === 'severe' ? 'bad' : c.severity === 'warn' ? '' : 'info'}`} key={c.id}>
              <div className="issue-title">
                <Icon name={c.kind === 'queue' ? 'clock' : 'split'} size={12} />
                {c.label}
              </div>
              <div className="issue-body">{c.detail}</div>
            </div>
          ))
        ) : (
          <div className="empty" style={{ padding: '10px 0' }}>未检出与其他雪道的交叉或汇入冲突</div>
        )}
      </div>

      <div className="ins-section">
        <div className="sec-label">造雪设备</div>
        {analysis.gunStats.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {analysis.gunStats.map((g) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                <span className="chip" style={{ minWidth: 64, justifyContent: 'center' }}>{g.typeLabel}</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>{g.id}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>
                  射程 {g.range} m
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ padding: '8px 0' }}>尚未布设造雪设备</div>
        )}
      </div>

      {onFocus ? (
        <div className="ins-section" style={{ paddingBottom: 24 }}>
          <button className="btn block" onClick={onFocus}>
            <Icon name="pin" size={13} />
            定位到该雪道
          </button>
        </div>
      ) : null}
    </>
  );
}
