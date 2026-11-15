import { useEffect, useMemo, useRef, useState } from 'react';
import { Viewport } from '../components/Viewport.jsx';
import { Icon, Modal, StatusPill, LevelTag } from '../components/ui.jsx';
import { ProfileStrip } from '../components/ProfileStrip.jsx';
import { LEVELS, GUN_TYPES, buildOperations } from '../lib/trailMath.js';

export function ReviewModule({ ops, push }) {
  const { trails, guns, analyses, conflicts, conflictsByTrail, selectedTrailId, setSelectedTrailId, approve, reject } = ops;
  const [rejectFor, setRejectFor] = useState(null);
  const [comment, setComment] = useState('');
  const [genFor, setGenFor] = useState(null);
  const sceneApi = useRef(null);

  const queue = trails.filter((t) => t.status === 'review');
  const trail = trails.find((t) => t.id === selectedTrailId) || queue[0] || trails[0] || null;
  const analysis = trail ? analyses[trail.id] : null;
  const trailConflicts = trail ? conflictsByTrail[trail.id] || [] : [];

  useEffect(() => {
    if (trail && !queue.some((q) => q.id === selectedTrailId) && queue.length && !trails.some((t) => t.id === selectedTrailId)) {
      setSelectedTrailId(queue[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length]);

  const sceneData = useMemo(
    () => ({
      trails, analyses, guns,
      selectedTrailId: trail?.id || null,
      selectedGunId: null,
      conflicts,
      mode: 'select',
      draft: null,
    }),
    [trails, analyses, guns, trail, conflicts],
  );

  const checks = useMemo(() => {
    if (!trail || !analysis) return [];
    const out = [];
    const gradeWarn = analysis.warnings.filter((w) => w.type === 'grade');
    const reverseWarn = analysis.warnings.filter((w) => w.type === 'reverse');
    const widthWarn = analysis.warnings.filter((w) => w.type === 'width');
    const gap = analysis.uncovered;

    if (trail.level === 'beginner') {
      out.push({
        key: 'grade',
        title: '初级道坡度 ≤ 15°',
        status: gradeWarn.length ? 'bad' : 'ok',
        detail: gradeWarn.length
          ? `${gradeWarn.length} 段超限，峰值 ${Math.max(...gradeWarn.map((w) => w.peak)).toFixed(1)}°，位于里程 ${gradeWarn[0].startS.toFixed(0)}–${gradeWarn[0].endS.toFixed(0)} m。`
          : `全线最大坡度 ${analysis.maxGrade.toFixed(1)}°，满足初级道标准。`,
      });
    }
    if (trail.level === 'advanced') {
      out.push({
        key: 'reverse',
        title: '高级道无反坡',
        status: reverseWarn.length ? 'bad' : 'ok',
        detail: reverseWarn.length
          ? `${reverseWarn.length} 段存在反坡，最陡上坡 ${Math.abs(Math.min(...reverseWarn.map((w) => w.peak))).toFixed(1)}°，位于里程 ${reverseWarn[0].startS.toFixed(0)}–${reverseWarn[0].endS.toFixed(0)} m。`
          : '全线无上坡段，重心连续，符合高速滑行要求。',
      });
    }
    out.push({
      key: 'width',
      title: '会车宽度 ≥ 30 m',
      status: widthWarn.length ? (analysis.minWidth < 24 ? 'bad' : 'warn') : 'ok',
      detail: widthWarn.length
        ? `最窄处 ${analysis.minWidth.toFixed(0)} m，低于 30 m 会车标准，位于里程 ${widthWarn[0].startS.toFixed(0)}–${widthWarn[0].endS.toFixed(0)} m。`
        : `全线最小宽度 ${analysis.minWidth.toFixed(0)} m，满足双向会车与救护通行。`,
    });
    out.push({
      key: 'snow',
      title: '造雪覆盖完整',
      status: gap.length === 0 ? 'ok' : analysis.coveredPct > 90 ? 'warn' : 'bad',
      detail: gap.length
        ? `${gap.length} 段射程未覆盖，合计 ${gap.reduce((s, u) => s + (u.endS - u.startS), 0).toFixed(0)} m，覆盖率 ${analysis.coveredPct.toFixed(1)}%。`
        : `覆盖率 ${analysis.coveredPct.toFixed(1)}%，全线在设备射程内。`,
    });
    const severe = trailConflicts.filter((c) => c.severity === 'severe');
    out.push({
      key: 'conflict',
      title: '交叉口 / 汇入冲突已评估',
      status: severe.length ? 'bad' : trailConflicts.length ? 'warn' : 'ok',
      detail: trailConflicts.length
        ? `${trailConflicts.length} 项冲突：${trailConflicts.map((c) => c.label).join('；')}`
        : '未检出与其他雪道的平面交叉、汇入或下站排队冲突。',
    });
    out.push({
      key: 'capacity',
      title: '下站承载匹配',
      status: (() => {
        const q = trailConflicts.find((c) => c.kind === 'queue');
        if (!q) return 'ok';
        return q.severity === 'severe' ? 'bad' : 'warn';
      })(),
      detail: (() => {
        const q = trailConflicts.find((c) => c.kind === 'queue');
        return q ? q.detail : `日均承载 ${trail.dailyCapacity.toLocaleString('zh-CN')} 人次，下站通行能力充足。`;
      })(),
    });

    return out;
  }, [trail, analysis, trailConflicts]);

  const blockers = checks.filter((c) => c.status === 'bad');
  const warns = checks.filter((c) => c.status === 'warn');
  const canApprove = trail && trail.status === 'review' && blockers.length === 0;

  const action = (type) => {
    if (type === 'approve') {
      approve(trail.id);
      push(`「${trail.name}」审核通过，已转为开放状态`, 'ok');
      const next = queue.filter((q) => q.id !== trail.id);
      if (next.length) setSelectedTrailId(next[0].id);
    }
  };

  return (
    <div className="module">
      <div className="review-grid">
        <div className="queue">
          <div className="panel-head">
            <span className="eyebrow">待审核队列 · {queue.length}</span>
            <span className="chip blue">{queue.length ? '需逐条处理' : '已清空'}</span>
          </div>
          {queue.map((t) => {
            const a = analyses[t.id];
            const warn = a?.warnings.length || 0;
            const gap = a ? 100 - a.coveredPct : 0;
            const cf = conflictsByTrail[t.id] || [];
            return (
              <div
                key={t.id}
                className={`queue-item ${t.id === trail?.id ? 'on' : ''}`}
                onClick={() => setSelectedTrailId(t.id)}
              >
                <div className="queue-name">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LevelTag level={t.level} />
                    {t.name}
                  </span>
                  <StatusPill status={t.status} />
                </div>
                <div className="queue-meta">
                  <span>{t.id}</span>
                  <span>{a ? `${a.length.toFixed(0)} m` : '—'}</span>
                  <span>{a ? `${a.maxGrade.toFixed(0)}°` : '—'}</span>
                  <span>{t.dailyCapacity.toLocaleString('zh-CN')} 人次</span>
                </div>
                <div className="queue-flags">
                  {warn ? <span className="chip amber"><Icon name="alert" size={10} />线位 {warn}</span> : null}
                  {gap > 1 ? <span className="chip red">未覆盖 {gap.toFixed(0)}%</span> : null}
                  {cf.length ? <span className="chip blue">冲突 {cf.length}</span> : null}
                  {!warn && gap <= 1 && !cf.length ? <span className="chip teal">校核通过</span> : null}
                </div>
              </div>
            );
          })}
          {!queue.length ? (
            <div className="empty">
              当前没有待审核的雪道。
              <br />
              设计员提交后会自动进入此队列。
            </div>
          ) : null}

          <div className="panel-head" style={{ marginTop: 6, borderTop: '1px solid var(--line)' }}>
            <span className="eyebrow">已开放 · 可生成作业单</span>
          </div>
          {trails.filter((t) => t.status === 'open').map((t) => (
            <div
              key={t.id}
              className={`queue-item ${t.id === trail?.id ? 'on' : ''}`}
              onClick={() => setSelectedTrailId(t.id)}
              style={{ paddingTop: 10, paddingBottom: 10 }}
            >
              <div className="queue-name">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LevelTag level={t.level} />
                  {t.name}
                </span>
                <button
                  className="btn sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGenFor(t);
                  }}
                >
                  作业单
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="review-scroll-col">
          {trail && analysis ? (
            <>
              <div style={{ padding: '0 0 12px' }}>
                <div style={{ padding: '14px 20px 0' }}>
                  <div className="review-head">
                    <div>
                      <div className="review-title">
                        <span style={{ color: LEVELS[trail.level].color }}>■</span>
                        {trail.name}
                        <StatusPill status={trail.status} />
                      </div>
                      <div className="review-sub">
                        {trail.id} · {LEVELS[trail.level].label} · 长度 {analysis.length.toFixed(0)} m · 落差{' '}
                        {analysis.drop.toFixed(0)} m · 日均 {trail.dailyCapacity.toLocaleString('zh-CN')} 人次 · 下站{' '}
                        {trail.baseStation} · 雪季 {trail.season.start} → {trail.season.end}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn ghost" onClick={() => sceneApi.current?.focusTrail(analysis)}>
                        <Icon name="pin" size={12} /> 定位
                      </button>
                      <button
                        className="btn danger"
                        disabled={trail.status !== 'review'}
                        onClick={() => { setRejectFor(trail); setComment(''); }}
                      >
                        <Icon name="x" size={12} /> 退回整改
                      </button>
                      <button className="btn primary" disabled={!canApprove} onClick={() => action('approve')}>
                        <Icon name="check" size={12} /> 审核通过
                      </button>
                    </div>
                  </div>
                </div>

                <div className="review-map">
                  <Viewport
                    data={sceneData}
                    onPickTrail={setSelectedTrailId}
                    onCommand={(s) => {
                      sceneApi.current = s;
                      // frame the run once the panel has its final size
                      window.setTimeout(() => s.focusTrail(analysis), 380);
                    }}
                  />
                </div>
              </div>

              <div style={{ padding: '0 20px 10px' }}>
                <div className="sec-label" style={{ marginBottom: 8 }}>剖面</div>
                <div style={{ height: 96, border: '1px solid var(--line)', borderRadius: 9, background: 'rgba(4,10,16,.5)' }}>
                  <ProfileStrip trail={trail} analysis={analysis} height={90} />
                </div>
              </div>

              <div style={{ padding: '10px 20px 40px' }}>
                <div className="sec-label" style={{ marginBottom: 9 }}>
                  安全核查清单
                  <span style={{ fontFamily: 'var(--mono)', color: blockers.length ? 'var(--red)' : 'var(--teal)' }}>
                    {blockers.length ? `${blockers.length} 项不通过` : '全部通过'}
                    {warns.length ? ` · ${warns.length} 项需关注` : ''}
                  </span>
                </div>
                <div className="checklist">
                  {checks.map((c) => (
                    <div className="check" key={c.key}>
                      <span className={`check-icon ${c.status}`}>
                        {c.status === 'ok' ? <Icon name="check" size={9} /> : <Icon name="alert" size={9} />}
                      </span>
                      <div className="check-main">
                        <div className="check-t">{c.title}</div>
                        <div className="check-d">{c.detail}</div>
                      </div>
                      <span className="chip" style={{ alignSelf: 'center' }}>
                        {c.status === 'ok' ? '通过' : c.status === 'warn' ? '需关注' : '不通过'}
                      </span>
                    </div>
                  ))}
                </div>

                {trail.review ? (
                  <div className="reject-box" style={trail.review.action === 'approve' ? { borderColor: 'rgba(79,227,193,.3)', background: 'rgba(79,227,193,.05)' } : undefined}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Icon name={trail.review.action === 'approve' ? 'check' : 'alert'} size={12} />
                      {trail.review.action === 'approve' ? '上轮审核：通过' : '上轮审核：退回'}
                    </div>
                    {trail.review.comment ? <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.65 }}>{trail.review.comment}</div> : null}
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-3)', marginTop: 6 }}>
                      {trail.review.by} · {trail.review.at}
                    </div>
                  </div>
                ) : null}

                {trail.status === 'review' && blockers.length ? (
                  <div className="hint" style={{ marginTop: 12, borderColor: 'rgba(255,107,107,.28)', background: 'rgba(255,107,107,.06)', color: '#ffc2c2' }}>
                    存在 {blockers.length} 项不通过项，无法审核通过。请填写整改意见后退回，或通知设计组调整线位。
                  </div>
                ) : null}

                {trail.status === 'open' ? (
                  <div className="hint" style={{ marginTop: 12 }}>
                    该雪道已开放，可生成压雪车作业单与巡逻排班。
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="empty">从左侧队列选择一条雪道进行审核</div>
          )}
        </div>
      </div>

      {rejectFor ? (
        <Modal
          title={`退回整改 · ${rejectFor.name}`}
          onClose={() => setRejectFor(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setRejectFor(null)}>取消</button>
              <button
                className="btn danger"
                disabled={!comment.trim()}
                onClick={() => {
                  reject(rejectFor.id, comment.trim());
                  setRejectFor(null);
                  push(`「${rejectFor.name}」已退回，整改意见已发送设计组`, 'warn');
                }}
              >
                确认退回
              </button>
            </>
          }
        >
          <div className="field">
            <label>整改意见（必填）</label>
            <textarea
              className="textarea"
              style={{ minHeight: 110 }}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="例如：松涛环线 118 m 处沟槽宽度仅 26 m，请加宽至 30 m 以上，并在汇入主槽前增设 80 m 缓冲段。"
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {[
              '窄段宽度不足 30 m，请加宽后重报',
              '存在反坡，需调整线位消除上坡段',
              '造雪射程有缺口，请补设设备',
              '汇入主道处缺少缓冲段',
            ].map((s) => (
              <button key={s} className="btn sm" onClick={() => setComment((c) => (c ? `${c}\n${s}` : s))}>
                {s}
              </button>
            ))}
          </div>
          <div className="hint">退回后雪道回到「设计中」，整改意见会显示在设计员的工作台上。</div>
        </Modal>
      ) : null}

      {genFor ? <OpsSheetModal trail={genFor} analysis={analyses[genFor.id]} conflicts={conflictsByTrail[genFor.id] || []} onClose={() => setGenFor(null)} push={push} /> : null}
    </div>
  );
}

function OpsSheetModal({ trail, analysis, conflicts, onClose, push }) {
  const ops = useMemo(() => buildOperations(trail, analysis, conflicts), [trail, analysis, conflicts]);
  const guns = analysis?.gunStats || [];
  return (
    <Modal
      title="压雪车作业单 / 巡逻排班"
      width="640px"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>关闭</button>
          <button
            className="btn primary"
            onClick={() => {
              push(`已生成「${trail.name}」作业单与排班表`, 'ok');
              onClose();
            }}
          >
            <Icon name="doc" size={12} /> 签发
          </button>
        </>
      }
    >
      <div className="doc">
        <div className="doc-head">
          <div>
            <div className="doc-title">夜间压雪车作业单</div>
            <div className="doc-no">NO. GX-{trail.id}-{new Date().getFullYear()}</div>
          </div>
          <span className="chip teal">{trail.name}</span>
        </div>
        <table className="doc-table">
          <thead>
            <tr>
              <th>车组</th>
              <th>作业区段</th>
              <th>时段</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {ops.cats.map((c) => (
              <tr key={c.id}>
                <td>{c.machine}</td>
                <td>{c.from}–{c.to} m</td>
                <td>{c.window}</td>
                <td>{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="chip">长度 {analysis.length.toFixed(0)} m</span>
          <span className="chip">最大坡度 {analysis.maxGrade.toFixed(1)}°</span>
          <span className="chip">设备 {guns.length} 台</span>
          <span className="chip">覆盖率 {analysis.coveredPct.toFixed(0)}%</span>
        </div>
      </div>

      <div className="doc" style={{ marginTop: 12 }}>
        <div className="doc-head">
          <div>
            <div className="doc-title">巡逻排班表</div>
            <div className="doc-no">NO. XL-{trail.id}-{new Date().getFullYear()}</div>
          </div>
          <span className="chip blue">{ops.patrol.reduce((s, p) => s + p.headcount, 0)} 人次/日</span>
        </div>
        <table className="doc-table">
          <thead>
            <tr>
              <th>岗位</th>
              <th>驻点</th>
              <th>班次</th>
              <th>人数</th>
              <th>职责</th>
            </tr>
          </thead>
          <tbody>
            {ops.patrol.map((p) => (
              <tr key={p.id}>
                <td>{p.post}</td>
                <td>{p.station}</td>
                <td>{p.shift}</td>
                <td>{p.headcount}</td>
                <td>{p.duty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ops.conflictNotes.length ? (
        <div style={{ marginTop: 12 }}>
          <div className="sec-label">随单冲突提示</div>
          {ops.conflictNotes.map((c) => (
            <div className={`issue ${c.severity === 'severe' ? 'bad' : c.severity === 'warn' ? '' : 'info'}`} key={c.id}>
              <div className="issue-title"><Icon name="split" size={12} />{c.label}</div>
              <div className="issue-body">{c.detail}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="doc-sign" style={{ marginTop: 14 }}>
        <span>编制：规划组</span>
        <span>审核：{trail.review?.by || '安全主管'}</span>
        <span>签发日期：{new Date().toLocaleDateString('zh-CN')}</span>
      </div>
      <div className="hint" style={{ marginTop: 10 }}>
        作业单仅在审核通过后签发；造雪设备 {GUN_TYPES.fan.label} {GUN_TYPES.fan.range} m 射程、{GUN_TYPES.lance.label} {GUN_TYPES.lance.range} m 射程已按覆盖结果排入。
      </div>
    </Modal>
  );
}
