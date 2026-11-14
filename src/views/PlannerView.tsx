import { createMemo, createSignal, For, Show } from 'solid-js';
import { state, upsertCourse } from '../store/store';
import type { Chapter, Course } from '../types';
import { ActionPreview } from '../components/ActionPreview';
import { uid } from '../util/math';

const STATUS_LABEL: Record<Course['status'], string> = {
  draft: '草稿', pending: '待审查', approved: '已上架', rejected: '已驳回',
};

export function PlannerView() {
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [title, setTitle] = createSignal('');
  const [coach, setCoach] = createSignal('陈鹤鸣');
  const [audience, setAudience] = createSignal('');
  const [weekly, setWeekly] = createSignal(5);
  const [chapters, setChapters] = createSignal<Chapter[]>([]);

  const editing = createMemo(() => state.courses.find(c => c.id === editingId()) ?? null);

  const startNew = () => {
    setEditingId('__new__');
    setTitle(''); setAudience(''); setWeekly(5);
    setChapters([{ id: uid('ch'), name: '第一章', actionIds: [], durationMin: 10 }]);
  };

  const startEdit = (c: Course) => {
    setEditingId(c.id);
    setTitle(c.title); setCoach(c.coach); setAudience(c.audience);
    setWeekly(c.weeklySessions); setChapters(JSON.parse(JSON.stringify(c.chapters)));
  };

  const totalMin = () => chapters().reduce((s, c) => s + c.durationMin, 0);

  const save = (submit: boolean) => {
    if (!title().trim()) { alert('请填写课程标题'); return; }
    if (chapters().some(c => c.actionIds.length === 0)) { alert('每个章节至少选择一个动作'); return; }
    const existing = editing();
    const course: Course = {
      id: existing && editingId() !== '__new__' ? existing.id : uid('course'),
      title: title(), coach: coach(), audience: audience(),
      weeklySessions: weekly(), chapters: chapters(), totalMinutes: totalMin(),
      status: submit ? 'pending' : (existing?.status === 'rejected' ? 'pending' : 'draft'),
      notes: existing?.notes ?? [],
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    upsertCourse(course);
    setEditingId(null);
    alert(submit ? '已提交审查员审查' : '草稿已保存');
  };

  return (
    <div class="view planner-view">
      <div class="view-head">
        <h2>课程策划后台</h2>
        <button class="btn primary" onClick={startNew}>＋ 组合新课程</button>
      </div>

      <Show when={editingId()} fallback={
        <div class="card-grid">
          <For each={state.courses}>{c => (
            <div class="card course-card">
              <div class="card-head">
                <b>{c.title}</b>
                <span class={`status ${c.status}`}>{STATUS_LABEL[c.status]}</span>
              </div>
              <div class="card-meta">教练：{c.coach} · 每周 {c.weeklySessions} 练次 · 共 {c.totalMinutes} 分钟</div>
              <div class="card-meta">适用人群：{c.audience}</div>
              <div class="chapter-list">
                <For each={c.chapters}>{ch => (
                  <div class="chapter-chip">{ch.name}（{ch.durationMin} 分钟 · {ch.actionIds.length} 动作）</div>
                )}</For>
              </div>
              <Show when={c.status === 'rejected' && c.notes.length}>
                <div class="reject-box">最近驳回：{c.notes[c.notes.length - 1].comment}</div>
              </Show>
              <div class="card-actions">
                <button class="btn-mini" onClick={() => startEdit(c)}>编辑</button>
                <Show when={c.status === 'draft' || c.status === 'rejected'}>
                  <button class="btn-mini warn" onClick={() => { startEdit(c); setTimeout(() => save(true), 0); }}>提交审查</button>
                </Show>
              </div>
            </div>
          )}</For>
        </div>
      }>
        <div class="panel editor-panel">
          <h3>{editingId() === '__new__' ? '组合新课程' : `编辑 · ${editing()?.title ?? ''}`}</h3>
          <div class="form-grid">
            <label class="ctl">课程标题
              <input value={title()} onInput={e => setTitle(e.currentTarget.value)} placeholder="如：八段锦导引基础课" />
            </label>
            <label class="ctl">带教教练
              <input value={coach()} onInput={e => setCoach(e.currentTarget.value)} />
            </label>
            <label class="ctl">适用人群
              <input value={audience()} onInput={e => setAudience(e.currentTarget.value)} placeholder="如：久坐伏案、肩颈僵硬人群" />
            </label>
            <label class="ctl">每周练次
              <input type="number" min="1" max="14" value={weekly()} onInput={e => setWeekly(Number(e.currentTarget.value))} />
            </label>
          </div>

          <h4>章节编排（从课程库勾选动作）</h4>
          <div class="chapter-editor">
            <For each={chapters()}>{(ch, idx) => (
              <div class="chapter-edit-row">
                <div class="ch-head">
                  <input class="ch-name" value={ch.name}
                    onInput={e => setChapters(list => list.map((x, i) => i === idx() ? { ...x, name: e.currentTarget.value } : x))} />
                  <label class="ctl inline">时长
                    <input type="number" min="1" value={ch.durationMin}
                      onInput={e => setChapters(list => list.map((x, i) => i === idx() ? { ...x, durationMin: Number(e.currentTarget.value) } : x))} /> 分钟
                  </label>
                  <button class="btn-mini danger" disabled={chapters().length <= 1}
                    onClick={() => setChapters(list => list.filter((_, i) => i !== idx()))}>删章节</button>
                </div>
                <div class="action-pick-grid">
                  <For each={state.actions}>{act => {
                    const picked = () => ch.actionIds.includes(act.id);
                    return (
                      <div class="action-pick" classList={{ picked: picked() }}
                        onClick={() => setChapters(list => list.map((x, i) => {
                          if (i !== idx()) return x;
                          const has = x.actionIds.includes(act.id);
                          return { ...x, actionIds: has ? x.actionIds.filter(id => id !== act.id) : [...x.actionIds, act.id] };
                        }))}>
                        <ActionPreview action={act} size={110} />
                        <label class="pick-label">
                          <input type="checkbox" checked={picked()} readonly /> {act.name}
                        </label>
                      </div>
                    );
                  }}</For>
                </div>
              </div>
            )}</For>
          </div>
          <button class="btn-mini" onClick={() => setChapters(l => [...l, { id: uid('ch'), name: `第${l.length + 1}章`, actionIds: [], durationMin: 10 }])}>
            ＋ 增加章节
          </button>

          <div class="editor-footer">
            <span>合计 <b>{totalMin()}</b> 分钟 · {chapters().length} 个章节</span>
            <div>
              <button class="btn" onClick={() => save(false)}>存草稿</button>
              <button class="btn primary" onClick={() => save(true)}>提交审查员</button>
              <button class="btn-mini" onClick={() => setEditingId(null)}>取消</button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
