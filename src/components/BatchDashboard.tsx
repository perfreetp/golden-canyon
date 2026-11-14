import { createMemo, For, Show } from 'solid-js';
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { createEffect } from 'solid-js';
import type { RuleCode, Severity } from '../types';
import { RULE_META, RULE_THRESHOLDS, SEVERITY_META } from '../lib/spec';
import { summarize } from '../lib/rules';
import { fmtDate } from '../lib/geometry';
import {
  batchProgress,
  canRelease,
  checkRunsOf,
  currentBatch,
  drawingsOf,
  issuesOf,
  rectificationList,
  releaseBatch,
  reuploadBatch,
  returnBatch,
  state
} from '../store';

export default function BatchDashboard(props: { onExport: (kind: 'rect' | 'log') => void }) {
  const batch = createMemo(() => currentBatch());
  const issues = createMemo(() => (batch() ? issuesOf(batch()!.id) : []));
  const summary = createMemo(() => summarize(issues()));
  const progress = createMemo(() => (batch() ? batchProgress(batch()!.id) : undefined));
  const runs = createMemo(() => (batch() ? checkRunsOf(batch()!.id) : []));
  const logs = createMemo(() =>
    state.db.releaseLogs.filter((l) => l.batchId === batch()?.id)
  );

  const donePct = createMemo(() => {
    const p = progress();
    if (!p || p.total === 0) return 100;
    return Math.round(((p.total - p.open) / p.total) * 100);
  });

  const doReturn = () => {
    const note = prompt(
      '整批退回设计院，请填写整改要求（将随整改清单一并下发）：',
      '请按本批问题清单逐项整改后重新报审，重点处理严重级管线穿梁及设备带高度问题。'
    );
    if (note === null) return;
    const list = returnBatch(batch()!.id, note, currentReviewerName());
    alert(`已生成整改清单 ${list.length} 项，批次状态置为「已退回」。`);
    props.onExport('rect');
  };

  const doRelease = () => {
    if (!confirm('确认整批放行？系统将记录放行时间与问题处理留档。')) return;
    releaseBatch(batch()!.id, currentReviewerName());
  };

  return (
    <Show when={batch()}>
      {(b) => (
        <div class="dashboard">
          <div class="dash-header">
            <div>
              <h2>
                {b().id} · {b().name}
              </h2>
              <p class="dash-meta">
                {b().designInstitute} · {b().building} · {b().floors.join('/')} ·
                建档 {fmtDate(b().createdAt)} · 当前第 {b().round} 轮
                <Show when={b().releasedAt}> · 放行时间 {fmtDate(b().releasedAt!)}</Show>
                <Show when={b().returnedAt}> · 退回时间 {fmtDate(b().returnedAt!)}</Show>
              </p>
            </div>
            <div class="dash-actions">
              <Show when={b().status === 'checking'}>
                <button class="btn btn-warn" onClick={doReturn}>
                  整批退回并生成整改清单
                </button>
                <button
                  class="btn btn-primary"
                  disabled={!canRelease(b().id)}
                  title={canRelease(b().id) ? '' : '所有问题处理完毕后才能放行'}
                  onClick={doRelease}
                >
                  整批放行
                </button>
              </Show>
              <Show when={b().status === 'returned'}>
                <button class="btn btn-primary" onClick={() => reuploadBatch(b().id)}>
                  设计院重传 · 进入第 {b().round + 1} 轮
                </button>
              </Show>
              <button class="btn btn-ghost" onClick={() => props.onExport('rect')}>
                导出整改清单
              </button>
              <button class="btn btn-ghost" onClick={() => props.onExport('log')}>
                导出发行留档
              </button>
            </div>
          </div>

          <Show when={!canRelease(b().id) && b().status === 'checking'}>
            <div class="gate-tip">
              放行门禁：仍有 <b>{progress()?.open ?? 0}</b> 项问题待复核，全部确认/驳回/整改闭环后方可放行。
            </div>
          </Show>
          <Show when={b().status === 'returned'}>
            <div class="gate-tip danger">
              本批已整批退回设计院。退回说明：{b().returnNote}
            </div>
          </Show>

          <div class="dash-grid">
            <section class="dash-card">
              <h3>复核进度</h3>
              <div class="progress-ring-wrap">
                <ProgressRing pct={donePct()} />
                <div class="progress-side">
                  <div>问题总数 <b>{summary().total}</b></div>
                  <div>待复核 <b class="c-open">{progress()?.open ?? 0}</b></div>
                  <div>图纸 <b>{drawingsOf(b().id).length}</b> 张</div>
                </div>
              </div>
              <div class="sev-bars">
                <For each={['severe', 'major', 'minor'] as Severity[]}>
                  {(sev) => {
                    const total = summary().severityCounts[sev];
                    const open = progress()?.openBySev[sev] ?? 0;
                    return (
                      <div class="sev-bar-row">
                        <span class="sev-label" style={{ color: SEVERITY_META[sev].color }}>
                          {SEVERITY_META[sev].label}
                        </span>
                        <div class="sev-track">
                          <div
                            class="sev-fill"
                            style={{
                              width: `${summary().total ? (total / summary().total) * 100 : 0}%`,
                              background: SEVERITY_META[sev].color
                            }}
                          />
                        </div>
                        <span class="sev-num">
                          {total}（待办 {open}）
                        </span>
                      </div>
                    );
                  }}
                </For>
              </div>
            </section>

            <section class="dash-card wide">
              <h3>检查项问题分布</h3>
              <RuleBarChart ruleCounts={summary().ruleCounts} />
            </section>

            <section class="dash-card">
              <h3>规范阈值（本系统执行标准）</h3>
              <ul class="threshold-list">
                <li>设备带中心高度 <b>{RULE_THRESHOLDS.belt.nominal}mm</b>，偏差 ±{RULE_THRESHOLDS.belt.tolerance}mm；超 {RULE_THRESHOLDS.belt.majorDelta}mm 判严重</li>
                <li>病床净距 ≥ <b>{RULE_THRESHOLDS.bedSpacing.min}mm</b>；低于 {RULE_THRESHOLDS.bedSpacing.severeBelow}mm 判严重</li>
                <li>强弱电终端间距 ≥ <b>{RULE_THRESHOLDS.ewSpacing.min}mm</b>；低于 {RULE_THRESHOLDS.ewSpacing.severeBelow}mm 判严重</li>
                <li>机电管线与结构梁投影相交一律判 <b style={{ color: SEVERITY_META.severe.color }}>严重</b></li>
              </ul>
            </section>

            <section class="dash-card wide">
              <h3>检查轮次留档</h3>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>记录号</th>
                    <th>轮次</th>
                    <th>检查时间</th>
                    <th>问题总数</th>
                    <th>严重/一般/提示</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={runs()}>
                    {(run) => (
                      <tr>
                        <td class="mono">{run.id}</td>
                        <td>第 {run.round} 轮</td>
                        <td>{fmtDate(run.at)}</td>
                        <td>{run.total}</td>
                        <td>
                          <span style={{ color: SEVERITY_META.severe.color }}>{run.severityCounts.severe}</span> /
                          <span style={{ color: SEVERITY_META.major.color }}> {run.severityCounts.major}</span> /
                          <span style={{ color: SEVERITY_META.minor.color }}> {run.severityCounts.minor}</span>
                        </td>
                      </tr>
                    )}
                  </For>
                  <Show when={runs().length === 0}>
                    <tr>
                      <td colSpan={5} class="empty-tip">暂无检查记录</td>
                    </tr>
                  </Show>
                </tbody>
              </table>
            </section>

            <section class="dash-card wide">
              <h3>放行 / 退回留档</h3>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>动作</th>
                    <th>操作人</th>
                    <th>轮次</th>
                    <th>问题分布（严重/一般/提示）</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={logs()}>
                    {(log) => (
                      <tr>
                        <td>{fmtDate(log.at)}</td>
                        <td>
                          <span class={`log-action ${log.action}`}>
                            {log.action === 'released' ? '整批放行' : '整批退回'}
                          </span>
                        </td>
                        <td>{log.operator}</td>
                        <td>第 {log.round} 轮</td>
                        <td>
                          {log.issueSummary.severe} / {log.issueSummary.major} / {log.issueSummary.minor}
                        </td>
                        <td class="note-cell">{log.note ?? '—'}</td>
                      </tr>
                    )}
                  </For>
                  <Show when={logs().length === 0}>
                    <tr>
                      <td colSpan={6} class="empty-tip">暂无放行/退回记录</td>
                    </tr>
                  </Show>
                </tbody>
              </table>
            </section>

            <section class="dash-card wide">
              <h3>整改清单预览（{rectificationList(b().id).length} 项，驳回项不纳入）</h3>
              <table class="data-table compact">
                <thead>
                  <tr>
                    <th>级别</th>
                    <th>检查项</th>
                    <th>问题描述</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={rectificationList(b().id)}>
                    {(iss) => (
                      <tr>
                        <td style={{ color: SEVERITY_META[iss.severity].color }}>
                          {SEVERITY_META[iss.severity].label}
                        </td>
                        <td>{RULE_META[iss.rule as RuleCode].name}</td>
                        <td>{iss.detail}</td>
                        <td>{iss.status === 'open' ? '待复核' : iss.status === 'fixed' ? '已整改' : '已确认'}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </section>
          </div>
        </div>
      )}
    </Show>
  );
}

function currentReviewerName(): string {
  const r = state.db.reviewers.find((x) => x.id === state.activeReviewer());
  return r?.name ?? '复核员';
}

function ProgressRing(props: { pct: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#e6e9ee" stroke-width="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="#2f6fdd"
        stroke-width="10"
        stroke-linecap="round"
        stroke-dasharray={`${c}`}
        stroke-dashoffset={`${c * (1 - props.pct / 100)}`}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="66" text-anchor="middle" font-size="22" font-weight="700" fill="#1f2937">
        {props.pct}%
      </text>
    </svg>
  );
}

function RuleBarChart(props: { ruleCounts: Record<RuleCode, number> }) {
  let gx: SVGGElement | undefined;
  const W = 560;
  const H = 240;
  const margin = { top: 16, right: 16, bottom: 78, left: 40 };

  const data = createMemo(() =>
    (Object.keys(props.ruleCounts) as RuleCode[]).map((k) => ({
      code: k,
      name: RULE_META[k].name,
      value: props.ruleCounts[k]
    }))
  );

  createEffect(() => {
    if (!gx) return;
    const vals = data();
    const x = scaleBand()
      .domain(vals.map((d) => d.code))
      .range([margin.left, W - margin.right])
      .padding(0.28);
    const y = scaleLinear()
      .domain([0, Math.max(4, ...vals.map((d) => d.value))])
      .range([H - margin.bottom, margin.top]);
    const node = select(gx);
    node.selectAll('*').remove();
    node.append('g').attr('transform', `translate(0,${H - margin.bottom})`).call(axisBottom(x).tickFormat((d) => RULE_META[d as RuleCode].name)).selectAll('text').attr('transform', 'rotate(-18)').style('text-anchor', 'end').style('font-size', '11px');
    node.append('g').attr('transform', `translate(${margin.left},0)`).call(axisLeft(y).ticks(5).tickSize(-W + margin.left + margin.right)).call((g) => g.select('.domain').remove());
    const bars = node.selectAll('.bar').data(vals).join('g').attr('class', 'bar');
    bars
      .append('rect')
      .attr('x', (d) => x(d.code)!)
      .attr('width', x.bandwidth())
      .attr('y', (d) => y(d.value))
      .attr('height', (d) => y(0) - y(d.value))
      .attr('fill', (d) => SEVERITY_META[RULE_META[d.code].defaultSeverity].color)
      .attr('rx', 3);
    bars
      .append('text')
      .attr('x', (d) => x(d.code)! + x.bandwidth() / 2)
      .attr('y', (d) => y(d.value) - 6)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 700)
      .text((d) => d.value);
  });

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} class="rule-chart">
      <g ref={gx} />
    </svg>
  );
}
