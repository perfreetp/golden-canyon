import { createMemo, createSignal, Show } from 'solid-js';
import {
  PIPELINE_META,
  POINT_TYPE_META,
  RULE_META,
  SEVERITY_META
} from '../lib/spec';
import { findHostPipeline } from '../lib/rules';
import {
  currentDrawing,
  issueById,
  markFixed,
  reviewIssue,
  selectedIssueId,
  selectedPointId
} from '../store';
import type { Issue } from '../types';

export default function ReviewPanel() {
  const drawing = createMemo(() => currentDrawing());
  const point = createMemo(() => {
    const d = drawing();
    const id = selectedPointId();
    return d && id ? d.points.find((p) => p.id === id) : undefined;
  });
  const issue = createMemo(() => issueById(selectedIssueId()));
  const host = createMemo(() => {
    const d = drawing();
    const p = point();
    return d && p ? findHostPipeline(d, p) : undefined;
  });

  return (
    <div class="panel review-panel">
      <Show when={issue()} fallback={<PointDetail />}>
        {(iss) => <IssueDetail issue={iss()} />}
      </Show>
      <Show when={!issue() && point()}>
        <PointDetail />
      </Show>
      <Show when={!issue() && !point()}>
        <div class="empty-tip pad">
          在平面图上单击点位可查看属性与挂靠管线；单击问题标记可进入复核。
        </div>
      </Show>
    </div>
  );
}

function PointDetail() {
  const drawing = createMemo(() => currentDrawing());
  const point = createMemo(() => {
    const d = drawing();
    const id = selectedPointId();
    return d && id ? d.points.find((p) => p.id === id) : undefined;
  });
  const host = createMemo(() => {
    const d = drawing();
    const p = point();
    return d && p ? findHostPipeline(d, p) : undefined;
  });
  const room = createMemo(() => {
    const d = drawing();
    const p = point();
    return d && p ? d.rooms.find((r) => r.id === p!.roomId) : undefined;
  });

  return (
    <Show when={point()}>
      {(p) => (
        <div class="detail-body">
          <div class="panel-head">
            <h3>{POINT_TYPE_META[p().type].label}</h3>
            <span class="mono">{p().id}</span>
          </div>
          <dl class="prop-list">
            <div>
              <dt>编号</dt>
              <dd>{p().label}</dd>
            </div>
            <div>
              <dt>所在房间</dt>
              <dd>{room()?.label ?? p().roomId}</dd>
            </div>
            <div>
              <dt>坐标</dt>
              <dd class="mono">
                X={Math.round(p().x)} / Y={Math.round(p().y)} mm
              </dd>
            </div>
            <Show when={p().heightMm !== undefined}>
              <div>
                <dt>安装高度</dt>
                <dd
                  style={{
                    color: p().heightMm === 1350 ? '#16a34a' : '#d83931',
                    'font-weight': 700
                  }}
                >
                  {p().heightMm} mm
                </dd>
              </div>
            </Show>
            <div>
              <dt>挂靠管线</dt>
              <dd>
                <Show when={host()} fallback={<span class="muted">无（末端固定设施）</span>}>
                  <b style={{ color: PIPELINE_META[host()!.system].color }}>
                    {PIPELINE_META[host()!.system].label}
                  </b>
                  <span class="mono small">（{host()!.id}）</span>
                  <Show when={host()!.status === 'warn'}>
                    <span class="warn-chip">路由异常</span>
                  </Show>
                </Show>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </Show>
  );
}

function IssueDetail(props: { issue: Issue }) {
  const iss = () => props.issue;
  const [note, setNote] = createSignal('');
  const editable = createMemo(() => iss().status === 'open');

  const submit = (action: 'confirmed' | 'rejected') => {
    if (!note().trim()) {
      alert('请先填写复核依据，再执行确认或驳回。');
      return;
    }
    reviewIssue(iss().id, action, note().trim());
    setNote('');
  };

  return (
    <div class="detail-body">
      <div class="panel-head">
        <h3>
          <span
            class="issue-tag"
            style={{
              background: SEVERITY_META[iss().severity].bg,
              color: SEVERITY_META[iss().severity].color
            }}
          >
            {SEVERITY_META[iss().severity].label}
          </span>
          {RULE_META[iss().rule].name}
        </h3>
      </div>
      <p class="issue-detail strong">{iss().detail}</p>
      <div class="basis-box">
        <div class="basis-title">判定依据（规范）</div>
        <p>{iss().basis}</p>
      </div>
      <dl class="prop-list compact">
        <div>
          <dt>问题编号</dt>
          <dd class="mono">{iss().id}</dd>
        </div>
        <div>
          <dt>检查轮次</dt>
          <dd>第 {iss().round} 轮</dd>
        </div>
        <div>
          <dt>当前状态</dt>
          <dd>{statusLabel(iss().status)}</dd>
        </div>
        <Show when={iss().reviewer}>
          <div>
            <dt>复核人</dt>
            <dd>{reviewerName(iss().reviewer!)}</dd>
          </div>
        </Show>
      </dl>
      <Show when={iss().reviewNote}>
        <div class="basis-box done">
          <div class="basis-title">已填复核依据</div>
          <p>{iss().reviewNote}</p>
        </div>
      </Show>
      <Show when={editable()}>
        <div class="review-form">
          <textarea
            placeholder="填写复核依据：现场量测数据、规范条款、与设计院沟通结论……"
            value={note()}
            onInput={(e) => setNote(e.currentTarget.value)}
            rows={3}
          />
          <div class="review-actions">
            <button class="btn btn-primary" onClick={() => submit('confirmed')}>
              确认问题
            </button>
            <button class="btn btn-warn" onClick={() => submit('rejected')}>
              驳回
            </button>
          </div>
        </div>
      </Show>
      <Show when={iss().status === 'confirmed'}>
        <div class="review-actions">
          <button
            class="btn btn-ghost"
            onClick={() => {
              const n = prompt('请填写整改闭环说明：', '设计院已修订并重新出图，复核满足规范要求。');
              if (n) markFixed(iss().id, n);
            }}
          >
            标记已整改闭环
          </button>
        </div>
      </Show>
      <Show when={iss().pipelineId}>
        <p class="host-note">
          关联管线：<b class="mono">{iss().pipelineId}</b>
        </p>
      </Show>
    </div>
  );
}

function statusLabel(s: Issue['status']): string {
  return { open: '待复核', confirmed: '已确认', rejected: '已驳回', fixed: '已整改闭环' }[s];
}

function reviewerName(id: string): string {
  const names: Record<string, string> = { RV01: '王建国', RV02: '李晓敏', RV03: '陈睿' };
  return names[id] ?? id;
}
