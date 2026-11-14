import { createMemo, createSignal, For, Show } from 'solid-js';
import { addFeedback, state } from '../store/store';
import { ActionPreview } from '../components/ActionPreview';
import { uid } from '../util/math';

const WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const BODY_PARTS = '头 颈 肩 上臂 前臂 手 胸胁 后腰 腰 髋 大腿 膝 小腿 脚'.split(' ');

export function StudentView() {
  const [stuId, setStuId] = createSignal(state.students[0].id);
  const [painPart, setPainPart] = createSignal(BODY_PARTS[0]);
  const [painNote, setPainNote] = createSignal('');

  const student = createMemo(() => state.students.find(s => s.id === stuId())!);
  const course = createMemo(() => state.courses.find(c => c.id === student().courseId && c.status === 'approved'));

  const chapterById = (id: string) => course()?.chapters.find(ch => ch.id === id);
  const firstAction = (chId: string) => {
    const ch = chapterById(chId);
    return state.actions.find(a => ch?.actionIds.includes(a.id));
  };

  const submitFeedback = () => {
    addFeedback(stuId(), painPart(), painNote().trim() || '（未填写说明）');
    setPainNote('');
  };

  return (
    <div class="view student-view">
      <div class="view-head">
        <h2>学员端 · 周计划导引</h2>
        <label class="ctl inline">切换学员
          <select value={stuId()} onChange={e => setStuId(e.currentTarget.value)}>
            <For each={state.students}>{s => <option value={s.id}>{s.name}</option>}</For>
          </select>
        </label>
      </div>

      <Show when={course()} fallback={<div class="empty">暂无可上架课程，等待审查通过后由治未病中心分配。</div>}>
        {c => (
          <>
            <div class="panel">
              <div class="card-head">
                <b>{c().title}</b>
                <span class="status approved">已上架</span>
              </div>
              <div class="card-meta">教练 {c().coach} · 适用 {c().audience} · 每周 {c().weeklySessions} 练次</div>
            </div>

            <h3 class="section-title">本周练习计划（点击当天卡片播放）</h3>
            <div class="week-grid">
              <For each={student().weekPlan}>{(dayPlan, i) => (
                <div class="day-card" classList={{ rest: dayPlan.length === 0 }}>
                  <div class="day-name">{WEEK[i()]}</div>
                  <Show when={dayPlan.length} fallback={<div class="rest-text">休息日</div>}>
                    <For each={dayPlan}>{chId => {
                      const ch = chapterById(chId);
                      const act = firstAction(chId);
                      return (
                        <Show when={ch && act}>
                          <div class="day-action">
                            <ActionPreview action={act!} size={130} />
                            <div class="day-chapter">{ch!.name}</div>
                            <div class="hint">{ch!.durationMin} 分钟</div>
                          </div>
                        </Show>
                      );
                    }}</For>
                  </Show>
                </div>
              )}</For>
            </div>

            <div class="panel feedback-panel">
              <h3 class="section-title">练习后不适反馈</h3>
              <div class="feedback-form">
                <label class="ctl inline">不适部位
                  <select value={painPart()} onChange={e => setPainPart(e.currentTarget.value)}>
                    <For each={BODY_PARTS}>{p => <option>{p}</option>}</For>
                  </select>
                </label>
                <input class="feedback-note" placeholder="补充感受，如：上托时牵拉感明显"
                  value={painNote()} onInput={e => setPainNote(e.currentTarget.value)} />
                <button class="btn warn" onClick={submitFeedback}>提交反馈</button>
              </div>
              <div class="feedback-list">
                <For each={student().feedback}>{f => (
                  <div class="feedback-item">
                    <span class="pain-tag">{f.part}</span>
                    {f.note}
                    <span class="hint">{new Date(f.at).toLocaleDateString('zh-CN')}</span>
                  </div>
                )}</For>
                <Show when={student().feedback.length === 0}><span class="hint">暂无反馈记录</span></Show>
              </div>
            </div>
          </>
        )}
      </Show>
    </div>
  );
}
