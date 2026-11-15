// 界面③：复核 —— 复核员逐档核对、填写意见、审定或退回
import { For, Show, createMemo } from 'solid-js';
import { analyze, modifiedSpans } from '../lib/calc';

export default function ReviewView(props) {
  const store = props.store;
  const an = () => analyze(store.scheme());
  const scheme = () => store.scheme();
  const mod = () => modifiedSpans(scheme());

  const spanCount = () => an().spans.length;
  const filled = createMemo(() => {
    const d = scheme().draft || {};
    let n = 0;
    for (let i = 0; i < spanCount(); i++) if (d[i] && d[i].result) n++;
    return n;
  });
  const anyReject = createMemo(() => {
    const d = scheme().draft || {};
    return Object.values(d).some((v) => v.result === '退回');
  });
  const allPass = createMemo(() => filled() === spanCount() && spanCount() > 0 && !anyReject());

  return (
    <main>
      <div class="full">
        <Show when={scheme().status === '待复核'}>
          <div class="card">
            <h3>
              复核工作台 —— {scheme().name}（{scheme().voltage} · {scheme().weather}）
              <span class="hint" style="margin-left:10px">
                请逐档核对并给出结论，已填 {filled()}/{spanCount()} 档
              </span>
            </h3>
            <div style="overflow-x:auto">
              <table class="data">
                <thead>
                  <tr>
                    <th>档号</th><th>档距(m)</th><th>高差(m)</th><th>弧垂(m)</th><th>最小对地(m)</th>
                    <th>系统判定</th><th>砍伐株数</th><th>红线(m)</th><th>复核结论</th><th style="min-width:220px">校核意见</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={an().spans}>
                    {(s) => {
                      const d = () => (scheme().draft || {})[s.idx] || { result: '', comment: '' };
                      return (
                        <tr class={s.bad ? 'bad' : ''}>
                          <td class="c">第{s.idx + 1}档</td>
                          <td>{s.L.toFixed(1)}</td>
                          <td>{s.dh.toFixed(1)}</td>
                          <td>{s.sag.toFixed(2)}</td>
                          <td>{s.minClear.toFixed(2)}</td>
                          <td class="c">
                            <Show when={s.spanOver}><span class="tag red">档距超标</span></Show>
                            <Show when={s.clearBad}><span class="tag red">对地不足</span></Show>
                            <Show when={!s.bad}><span class="tag green">合格</span></Show>
                          </td>
                          <td>{s.trees || '—'}</td>
                          <td>{s.redlineLen ? s.redlineLen.toFixed(0) : '—'}</td>
                          <td class="c">
                            <div class="radio-group">
                              <label>
                                <input
                                  type="radio"
                                  name={`rv-${s.idx}`}
                                  checked={d().result === '通过'}
                                  onChange={() => store.setDraft(s.idx, { result: '通过' })}
                                />
                                通过
                              </label>
                              <label>
                                <input
                                  type="radio"
                                  name={`rv-${s.idx}`}
                                  checked={d().result === '退回'}
                                  onChange={() => store.setDraft(s.idx, { result: '退回' })}
                                />
                                退回
                              </label>
                            </div>
                          </td>
                          <td>
                            <input
                              type="text"
                              class="cmt"
                              placeholder="校核意见…"
                              value={d().comment}
                              onInput={(e) => store.setDraft(s.idx, { comment: e.currentTarget.value })}
                            />
                          </td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>
            <div class="footer-actions">
              <button
                class="primary"
                disabled={!allPass()}
                title={allPass() ? '' : '须全部档核对为「通过」方可审定'}
                onClick={() => store.decideReview('审定')}
              >
                审定通过
              </button>
              <button
                class="danger"
                disabled={!anyReject()}
                title={anyReject() ? '' : '至少一档结论为「退回」'}
                onClick={() => { store.decideReview('退回'); store.setView('plan'); }}
              >
                退回设计员修改
              </button>
              <span class="hint">存在退回档时不可审定；退回后设计员可看到逐档意见与后续改动标记。</span>
            </div>
          </div>
        </Show>

        <Show when={scheme().status === '草稿'}>
          <div class="empty-state">
            <Show
              when={scheme().review && scheme().review.decision === '退回'}
              fallback="方案尚未提交复核。请在「路径规划」中完成布塔后点击「提交复核」。"
            >
              <div style="text-align:left; max-width:720px; margin:0 auto">
                <div class="section-title">第 {scheme().review.round} 轮复核已退回，逐档意见如下：</div>
                <For each={an().spans}>
                  {(s) => {
                    const rv = () => scheme().review.spans[s.idx];
                    return (
                      <Show when={rv()}>
                        <div class="review-note">
                          <span class="who">第{s.idx + 1}档 · {rv().result}</span>：{rv().comment || '（无文字意见）'}
                          <Show when={mod().has(s.idx)}><span class="tag orange">已修改</span></Show>
                        </div>
                      </Show>
                    );
                  }}
                </For>
                <div class="hint" style="margin-top:8px">修改塔位后可再次「提交复核」。</div>
              </div>
            </Show>
          </div>
        </Show>

        <Show when={scheme().status === '已审定'}>
          <div class="empty-state">
            本方案已于第 {scheme().round} 轮复核审定通过，请前往「审定输出」查看塔位明细表与施工交底图。
          </div>
        </Show>

        <Show when={(scheme().history || []).length > 0}>
          <div class="card" style="margin-top:12px">
            <h3>复核历史</h3>
            <For each={scheme().history}>
              {(h) => (
                <div class="kv">
                  <span>第 {h.round} 轮</span>
                  <b>
                    {h.decision}（退回 {Object.values(h.spans).filter((v) => v.result === '退回').length} 档 /
                    共 {Object.keys(h.spans).length} 档）
                  </b>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </main>
  );
}
