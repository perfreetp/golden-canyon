import { createMemo, createSignal, For, Show } from 'solid-js';
import type { ReleaseLog } from '../types';
import { SEVERITY_META } from '../lib/spec';
import { fmtDate } from '../lib/geometry';
import { state } from '../store';

interface Filters {
  building: string;
  floor: string;
  batch: string;
  reviewer: string;
}

export default function ArchiveView() {
  const [filters, setFilters] = createSignal<Filters>({
    building: '',
    floor: '',
    batch: '',
    reviewer: ''
  });

  const buildings = createMemo(() =>
    Array.from(new Set(state.db.batches.map((b) => b.building))).sort()
  );
  const floors = createMemo(() =>
    Array.from(new Set(state.db.batches.flatMap((b) => b.floors))).sort()
  );
  const reviewerIds = createMemo(() => state.db.reviewers.map((r) => r.id));
  const reviewerName = (id: string) =>
    state.db.reviewers.find((r) => r.id === id)?.name ?? id;

  // 放行/退回留档：按楼栋/楼层/批次过滤
  const logs = createMemo<ReleaseLog[]>(() =>
    state.db.releaseLogs
      .filter((l) => {
        const f = filters();
        if (f.building && l.building !== f.building) return false;
        if (f.floor && !l.floors.includes(f.floor)) return false;
        if (f.batch && l.batchId !== f.batch) return false;
        return true;
      })
      .sort((a, b) => b.at.localeCompare(a.at))
  );

  // 复核记录：再叠加复核员过滤
  const reviewRecords = createMemo(() => {
    const f = filters();
    return state.db.issues
      .filter((i) => i.reviewedAt && i.reviewer)
      .filter((i) => {
        const batch = state.db.batches.find((b) => b.id === i.batchId);
        if (!batch) return false;
        if (f.building && batch.building !== f.building) return false;
        if (f.floor && !batch.floors.some((fl) => fl === f.floor)) return false;
        if (f.batch && i.batchId !== f.batch) return false;
        if (f.reviewer && i.reviewer !== f.reviewer) return false;
        return true;
      })
      .sort((a, b) => (b.reviewedAt ?? '').localeCompare(a.reviewedAt ?? ''));
  });

  // 检查留档
  const runs = createMemo(() =>
    state.db.checkRuns
      .filter((r) => {
        const batch = state.db.batches.find((b) => b.id === r.batchId);
        const f = filters();
        if (!batch) return false;
        if (f.building && batch.building !== f.building) return false;
        if (f.floor && !batch.floors.some((fl) => fl === f.floor)) return false;
        if (f.batch && r.batchId !== f.batch) return false;
        return true;
      })
      .sort((a, b) => b.at.localeCompare(a.at))
  );

  const set = (k: keyof Filters, v: string) => setFilters((f) => ({ ...f, [k]: v }));

  const stats = createMemo(() => {
    const byReviewer = new Map<string, number>();
    for (const iss of reviewRecords()) {
      byReviewer.set(iss.reviewer!, (byReviewer.get(iss.reviewer!) ?? 0) + 1);
    }
    const released = logs().filter((l) => l.action === 'released').length;
    const returned = logs().filter((l) => l.action === 'returned').length;
    return { byReviewer, released, returned };
  });

  return (
    <div class="archive">
      <div class="archive-head">
        <h2>质检留档与检索</h2>
        <div class="filter-bar">
          <label>
            楼栋
            <select value={filters().building} onChange={(e) => set('building', e.currentTarget.value)}>
              <option value="">全部楼栋</option>
              <For each={buildings()}>{(b) => <option value={b}>{b}</option>}</For>
            </select>
          </label>
          <label>
            楼层
            <select value={filters().floor} onChange={(e) => set('floor', e.currentTarget.value)}>
              <option value="">全部楼层</option>
              <For each={floors()}>{(f) => <option value={f}>{f}</option>}</For>
            </select>
          </label>
          <label>
            批次
            <select value={filters().batch} onChange={(e) => set('batch', e.currentTarget.value)}>
              <option value="">全部批次</option>
              <For each={state.db.batches}>{(b) => <option value={b.id}>{b.id}</option>}</For>
            </select>
          </label>
          <label>
            复核员
            <select value={filters().reviewer} onChange={(e) => set('reviewer', e.currentTarget.value)}>
              <option value="">全部复核员</option>
              <For each={reviewerIds()}>
                {(id) => <option value={id}>{reviewerName(id)}</option>}
              </For>
            </select>
          </label>
          <button class="btn btn-ghost btn-sm" onClick={() => setFilters({ building: '', floor: '', batch: '', reviewer: '' })}>
            重置
          </button>
        </div>
      </div>

      <div class="stat-cards">
        <div class="stat-card">
          <span class="stat-num">{stats().released}</span>
          <span class="stat-label">放行批次</span>
        </div>
        <div class="stat-card danger">
          <span class="stat-num">{stats().returned}</span>
          <span class="stat-label">退回批次</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{runs().length}</span>
          <span class="stat-label">检查留档</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{reviewRecords().length}</span>
          <span class="stat-label">复核记录</span>
        </div>
      </div>

      <section class="dash-card">
        <h3>放行 / 退回记录</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>批次</th>
              <th>楼栋/楼层</th>
              <th>动作</th>
              <th>操作人</th>
              <th>问题分布（严重/一般/提示）</th>
            </tr>
          </thead>
          <tbody>
            <For each={logs()}>
              {(log) => (
                <tr>
                  <td>{fmtDate(log.at)}</td>
                  <td class="mono">{log.batchId}</td>
                  <td>{log.building} / {log.floors.join(',')}</td>
                  <td>
                    <span class={`log-action ${log.action}`}>
                      {log.action === 'released' ? '整批放行' : '整批退回'}
                    </span>
                  </td>
                  <td>{log.operator}</td>
                  <td>
                    <span style={{ color: SEVERITY_META.severe.color }}>{log.issueSummary.severe}</span> /
                    <span style={{ color: SEVERITY_META.major.color }}> {log.issueSummary.major}</span> /
                    <span style={{ color: SEVERITY_META.minor.color }}> {log.issueSummary.minor}</span>
                  </td>
                </tr>
              )}
            </For>
            <Show when={logs().length === 0}>
              <tr><td colSpan={6} class="empty-tip">无匹配留档</td></tr>
            </Show>
          </tbody>
        </table>
      </section>

      <section class="dash-card">
        <h3>检查项留档（每次跑检查的规则命中数）</h3>
        <table class="data-table compact">
          <thead>
            <tr>
              <th>检查时间</th>
              <th>批次</th>
              <th>轮次</th>
              <th>设备带高度</th>
              <th>床位间距</th>
              <th>强弱电间距</th>
              <th>管线穿梁</th>
              <th>终端缺失</th>
            </tr>
          </thead>
          <tbody>
            <For each={runs()}>
              {(r) => (
                <tr>
                  <td>{fmtDate(r.at)}</td>
                  <td class="mono">{r.batchId}</td>
                  <td>第 {r.round} 轮</td>
                  <td>{r.ruleCounts.BELT_HEIGHT}</td>
                  <td>{r.ruleCounts.BED_SPACING}</td>
                  <td>{r.ruleCounts.EW_SPACING}</td>
                  <td style={{ color: r.ruleCounts.PIPE_BEAM ? SEVERITY_META.severe.color : undefined }}>
                    {r.ruleCounts.PIPE_BEAM}
                  </td>
                  <td>{r.ruleCounts.MISSING_TERMINAL}</td>
                </tr>
              )}
            </For>
            <Show when={runs().length === 0}>
              <tr><td colSpan={8} class="empty-tip">无匹配检查记录</td></tr>
            </Show>
          </tbody>
        </table>
      </section>

      <section class="dash-card">
        <h3>复核员工作量（当前筛选 {reviewRecords().length} 条）</h3>
        <div class="reviewer-stats">
          <For each={state.db.reviewers}>
            {(r) => (
              <div class="reviewer-chip">
                <b>{r.name}</b>
                <span>{r.role}</span>
                <span class="count">{stats().byReviewer.get(r.id) ?? 0} 条复核</span>
              </div>
            )}
          </For>
        </div>
      </section>
    </div>
  );
}
