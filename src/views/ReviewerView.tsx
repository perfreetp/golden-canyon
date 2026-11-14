import { createSignal, For, Show } from 'solid-js';
import { reviewCourse, state } from '../store/store';
import type { Course } from '../types';
import { ActionPreview } from '../components/ActionPreview';

const REVIEWER = '审查员 · 林清和';

export function ReviewerView() {
  const [comment, setComment] = createSignal('');
  const [openId, setOpenId] = createSignal<string | null>(null);

  const pending = () => state.courses.filter(c => c.status === 'pending');
  const decided = () => state.courses.filter(c => c.status === 'approved' || c.status === 'rejected');

  const act = (id: string) => state.actions.find(a => a.id === id);

  const decide = (course: Course, approved: boolean) => {
    if (!approved && !comment().trim()) { alert('驳回必须填写修改意见'); return; }
    reviewCourse(course.id, approved, comment().trim() || '审查通过', REVIEWER);
    setComment('');
    setOpenId(null);
  };

  return (
    <div class="view reviewer-view">
      <div class="view-head"><h2>课程审查台</h2><span class="hint">仅审查通过的课程可在学员端上架</span></div>

      <h3 class="section-title">待审查（{pending().length}）</h3>
      <Show when={pending().length} fallback={<div class="empty">暂无待审查课程</div>}>
        <For each={pending()}>{c => (
          <div class="panel review-card">
            <div class="review-head">
              <div>
                <b>{c.title}</b>
                <div class="card-meta">{c.coach} 提交 · {c.audience} · 每周 {c.weeklySessions} 练次 · {c.totalMinutes} 分钟</div>
              </div>
              <button class="btn-mini" onClick={() => setOpenId(openId() === c.id ? null : c.id)}>
                {openId() === c.id ? '收起明细' : '查看动作明细'}
              </button>
            </div>
            <For each={c.chapters}>{ch => (
              <div class="review-chapter">
                <span class="chapter-chip">{ch.name} · {ch.durationMin} 分钟</span>
                <Show when={openId() === c.id}>
                  <div class="review-previews">
                    <For each={ch.actionIds}>{id => {
                      const a = act(id);
                      return a ? (
                        <div class="review-action">
                          <ActionPreview action={a} size={150} />
                          <span>{a.name}（吸 {a.snapshot.animation.breath.inhale}s / 呼 {a.snapshot.animation.breath.exhale}s）</span>
                        </div>
                      ) : null;
                    }}</For>
                  </div>
                </Show>
              </div>
            )}</For>
            <textarea class="review-comment" rows="2" placeholder="审查意见（驳回时必填），如：呼气节奏超过学员耐受，请调整后重新提交"
              value={comment()} onInput={e => setComment(e.currentTarget.value)} />
            <div class="review-actions">
              <button class="btn danger" onClick={() => decide(c, false)}>逐条驳回</button>
              <button class="btn primary" onClick={() => decide(c, true)}>审查通过并上架</button>
            </div>
          </div>
        )}</For>
      </Show>

      <h3 class="section-title">已决课程（{decided().length}）</h3>
      <For each={decided()}>{c => (
        <div class="panel history-card">
          <div class="card-head">
            <b>{c.title}</b>
            <span class={`status ${c.status}`}>{c.status === 'approved' ? '已上架' : '已驳回'}</span>
          </div>
          <For each={c.notes}>{n => (
            <div class="note-line">
              <span class={n.approved ? 'ok-text' : 'bad-text'}>{n.approved ? '✓ 通过' : '✗ 驳回'}</span>
              {n.reviewer}：{n.comment}
              <span class="hint">{new Date(n.at).toLocaleString('zh-CN')}</span>
            </div>
          )}</For>
        </div>
      )}</For>
    </div>
  );
}
