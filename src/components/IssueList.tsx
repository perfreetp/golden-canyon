import { createMemo, For, Show } from 'solid-js';
import type { Issue, Severity } from '../types';
import { RULE_META, SEVERITY_META } from '../lib/spec';
import { fmtDate } from '../lib/geometry';
import {
  currentDrawing,
  issuesOfDrawing,
  selectIssue,
  selectPoint,
  selectedIssueId
} from '../store';

const STATUS_META: Record<Issue['status'], { label: string; cls: string }> = {
  open: { label: '待复核', cls: 'st-open' },
  confirmed: { label: '已确认', cls: 'st-confirmed' },
  rejected: { label: '已驳回', cls: 'st-rejected' },
  fixed: { label: '已整改', cls: 'st-fixed' }
};

export default function IssueList() {
  const issues = createMemo(() => {
    const d = currentDrawing();
    return d ? issuesOfDrawing(d.id) : [];
  });

  const grouped = createMemo(() => {
    const order: Severity[] = ['severe', 'major', 'minor'];
    const map = new Map<Severity, Issue[]>();
    for (const s of order) {
      map.set(
        s,
        issues()
          .filter((i) => i.severity === s)
          .sort((a, b) => a.rule.localeCompare(b.rule))
      );
    }
    return map;
  });

  return (
    <div class="panel issue-panel">
      <div class="panel-head">
        <h3>问题清单</h3>
        <span class="issue-count">
          共 {issues().length} 项 · 待复核 {issues().filter((i) => i.status === 'open').length}
        </span>
      </div>
      <div class="issue-list">
        <For each={['severe', 'major', 'minor'] as Severity[]}>
          {(sev) => (
            <Show when={(grouped().get(sev)?.length ?? 0) > 0}>
              <div class="issue-group-head" style={{ color: SEVERITY_META[sev].color }}>
                <i class="sev-bar" style={{ background: SEVERITY_META[sev].color }} />
                {SEVERITY_META[sev].label}（{grouped().get(sev)!.length}）
              </div>
              <For each={grouped().get(sev)}>
                {(iss) => (
                  <div
                    class="issue-card"
                    classList={{ active: selectedIssueId() === iss.id }}
                    onClick={() => {
                      selectIssue(iss.id);
                      selectPoint(iss.pointIds[0] ?? null);
                    }}
                  >
                    <div class="issue-card-head">
                      <span
                        class="issue-tag"
                        style={{
                          background: SEVERITY_META[iss.severity].bg,
                          color: SEVERITY_META[iss.severity].color
                        }}
                      >
                        {SEVERITY_META[iss.severity].label}
                      </span>
                      <span class="issue-rule">{RULE_META[iss.rule].name}</span>
                      <span class={`issue-status ${STATUS_META[iss.status].cls}`}>
                        {STATUS_META[iss.status].label}
                      </span>
                    </div>
                    <p class="issue-detail">{iss.detail}</p>
                    <Show when={iss.reviewNote}>
                      <p class="issue-note">
                        复核依据：{iss.reviewNote}
                        <Show when={iss.reviewedAt}>（{fmtDate(iss.reviewedAt!)}）</Show>
                      </p>
                    </Show>
                  </div>
                )}
              </For>
            </Show>
          )}
        </For>
        <Show when={issues().length === 0}>
          <div class="empty-tip">该图纸尚未执行规范检查，或检查后无问题</div>
        </Show>
      </div>
    </div>
  );
}
