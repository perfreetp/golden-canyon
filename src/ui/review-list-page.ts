// 审核队列：待审核图示列表，含自动预检提示
import { BaseComponent, css } from './base';
import { store } from '../core/store';
import { router } from '../core/router';

export class ReviewListPage extends BaseComponent {
  protected render(): string {
    const pending = store.docs.filter((d) => d.status === 'submitted');
    const handled = store.docs.filter((d) => d.status === 'approved' || d.status === 'rejected');
    return `
    <style>${css}
      .page { padding: 26px 30px; }
      .queue { display: flex; flex-direction: column; gap: 12px; }
      .item { display: flex; align-items: center; gap: 16px; padding: 16px 18px; }
      .item .info { flex: 1; }
      .item .title { font-weight: 700; font-size: 15px; }
      .warns { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
      .chip { font-size: 12px; padding: 3px 10px; border-radius: 999px; }
      .chip.warn { background: #fef3c7; color: #b45309; }
      .chip.ok { background: #dcfce7; color: #15803d; }
      .history-item { opacity: .9; }
    </style>
    <div class="page">
      <h2>审核队列</h2>
      <p class="muted" style="margin-bottom:20px">逐条核对解剖标注、配色规范、风险提示与文字标注；退回时必须写明修改项。</p>

      <h3>待核对（${pending.length}）</h3>
      <div class="queue" style="margin-bottom:28px">
        ${pending.map((d) => {
          const { missingAnatomy, badColor } = store.precheck(d);
          return `
          <div class="card item">
            <div class="info">
              <div class="title">${d.title}</div>
              <div class="muted">${d.author} · 患者 ${d.patientName || '—'}（${d.patientNo || '—'}） · 提交于 ${new Date(d.updatedAt).toLocaleString('zh-CN')}</div>
              <div class="warns">
                ${missingAnatomy.length ? `<span class="chip warn">⚠ 缺解剖标注：${missingAnatomy.join('、')}</span>` : '<span class="chip ok">✓ 解剖标注完整</span>'}
                ${badColor.length ? `<span class="chip warn">⚠ 颜色不符规范：${badColor.join('、')}</span>` : '<span class="chip ok">✓ 配色合规</span>'}
                <span class="chip ${d.shapes.some((s) => s.kind !== 'note' && s.label) ? 'ok' : 'warn'}">文字标注 ${d.shapes.filter((s) => s.kind !== 'note' && s.label).length} 处</span>
              </div>
            </div>
            <button class="btn primary" data-action="open" data-id="${d.id}">进入核对</button>
          </div>`;
        }).join('') || '<p class="muted">队列为空。</p>'}
      </div>

      <h3>已处理（${handled.length}）</h3>
      <div class="queue">
        ${handled.map((d) => `
          <div class="card item history-item">
            <div class="info">
              <div class="title">${d.title} <span class="tag ${d.status}">${d.status === 'approved' ? '已通过' : '已退回'}</span></div>
              <div class="muted">${d.author} · 审核：${d.review?.reviewer ?? '—'} · ${d.review ? new Date(d.review.at).toLocaleString('zh-CN') : ''}</div>
            </div>
            <button class="btn" data-action="open" data-id="${d.id}">查看记录</button>
          </div>`).join('')}
      </div>
    </div>`;
  }

  protected onAction(action: string, el: HTMLElement): void {
    if (action === 'open') router.go(`/review/${el.dataset.id}`);
  }
}
