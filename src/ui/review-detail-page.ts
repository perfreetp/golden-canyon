// 审核详情：图示预览 + 逐条核对清单 + 通过/退回（退回强制写明修改项）
import { BaseComponent, css } from './base';
import { store } from '../core/store';
import { router } from '../core/router';
import { buildSvg } from '../core/svg-export';
import type { ReviewChecklistItem } from '../types';

const CHECKLIST_TEMPLATE = [
  { key: 'anatomy', label: '解剖标注完整（每个图形关联标准脑区）' },
  { key: 'color', label: '配色符合图示配色规范' },
  { key: 'risk', label: '风险提示齐全且与脑区对应' },
  { key: 'label', label: '文字标注清晰、无错别字' },
];

export class ReviewDetailPage extends BaseComponent {
  private docId = '';
  private checks: ReviewChecklistItem[] = [];
  private comment = '';
  private changeRequests: string[] = [''];
  private initialized = false;

  protected render(): string {
    this.docId = this.getAttribute('doc-id') ?? router.current.params.id;
    const doc = store.getDoc(this.docId);
    if (!doc) return '<p style="padding:30px">图示不存在</p>';
    const tpl = store.getTemplate(doc.templateId);

    if (!this.initialized) {
      const pre = store.precheck(doc);
      this.checks = CHECKLIST_TEMPLATE.map((c) => {
        let hint: 'ok' | 'warn' | undefined;
        if (c.key === 'anatomy') hint = pre.missingAnatomy.length ? 'warn' : 'ok';
        if (c.key === 'color') hint = pre.badColor.length ? 'warn' : 'ok';
        return { ...c, passed: doc.review?.checklist.find((x) => x.key === c.key)?.passed ?? null, autoHint: hint };
      });
      this.comment = doc.review?.comment ?? '';
      this.changeRequests = doc.review?.changeRequests?.length ? [...doc.review.changeRequests] : [''];
      this.initialized = true;
    }

    const svg = buildSvg(doc, tpl);
    void svg;
    const pre = store.precheck(doc);

    return `
    <style>${css}
      .page { padding: 24px 28px; }
      .layout { display: grid; grid-template-columns: 1fr 380px; gap: 18px; align-items: start; }
      .preview { padding: 14px; }
      .preview .svg-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
      .check-card { padding: 18px; position: sticky; top: 16px; }
      .check-row { display: flex; align-items: flex-start; gap: 10px; padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 13.5px; }
      .check-row .opts { margin-left: auto; display: flex; gap: 6px; }
      .opt { padding: 4px 12px; border-radius: 999px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font-size: 12.5px; }
      .opt.pass.active { background: #16a34a; border-color: #16a34a; color: #fff; }
      .opt.fail.active { background: #dc2626; border-color: #dc2626; color: #fff; }
      .hint { font-size: 11.5px; margin-top: 4px; }
      .hint.warn { color: #b45309; } .hint.ok { color: #15803d; }
      textarea { width: 100%; min-height: 72px; resize: vertical; }
      .cr { display: flex; gap: 8px; margin-bottom: 8px; }
      .cr input { flex: 1; }
      .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; font-size: 13px; margin-bottom: 12px; }
      .meta-grid span { color: #64748b; }
      .shape-table td, .shape-table th { padding: 8px 10px; font-size: 12.5px; }
      .swatch { display: inline-block; width: 14px; height: 14px; border-radius: 4px; vertical-align: middle; margin-right: 5px; }
      .actions { display: flex; gap: 10px; margin-top: 16px; }
      .prewarn { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 10px 12px; font-size: 12.5px; color: #92400e; margin-bottom: 14px; }
    </style>
    <div class="page">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <button class="btn small" data-action="back">← 队列</button>
        <h2 style="margin:0">${doc.title}</h2>
        <span class="tag ${doc.status}">${({ draft: '草稿', submitted: '待审核', approved: '已通过', rejected: '已退回' })[doc.status]}</span>
      </div>

      <div class="layout">
        <div>
          <div class="card preview">
            <div class="meta-grid">
              <div><span>患者：</span>${doc.patientName || '—'}</div>
              <div><span>住院号：</span>${doc.patientNo || '—'}</div>
              <div><span>提交医师：</span>${doc.author}</div>
              <div><span>模板：</span>${tpl.name} ${tpl.version}</div>
            </div>
            <div id="svg-host"></div>
          </div>

          <div class="card preview" style="margin-top:14px">
            <h3>图形清单（${doc.shapes.length}）</h3>
            <table class="shape-table">
              <thead><tr><th>名称</th><th>类型</th><th>解剖标注</th><th>配色</th></tr></thead>
              <tbody>
                ${doc.shapes.map((s) => {
                  const rg = s.kind === 'note' ? undefined : tpl.regions.find((r) => r.id === s.anatomyTag);
                  const color = s.kind === 'note' ? s.color : s.kind === 'region' ? s.fill : s.stroke;
                  const typeName = { lesion: '病变', eloquent: '功能区', vessel: '血管', approach: '入路', annotation: '标注' }[s.semantic];
                  return `<tr>
                    <td>${s.kind === 'note' ? s.text : s.label ?? '—'}</td>
                    <td>${typeName}</td>
                    <td>${rg ? rg.name : s.kind === 'note' ? '—' : '<span style="color:#dc2626;font-weight:700">✕ 缺失</span>'}</td>
                    <td><span class="swatch" style="background:${color}"></span>${color}</td>
                  </tr>`;
                }).join('') || '<tr><td colspan="4" class="muted">空白图示</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card check-card">
          <h3>逐条核对</h3>
          ${pre.missingAnatomy.length || pre.badColor.length ? `
            <div class="prewarn">
              系统预检发现：
              ${pre.missingAnatomy.length ? `<br/>• 缺解剖标注：${pre.missingAnatomy.join('、')}` : ''}
              ${pre.badColor.length ? `<br/>• 颜色不符规范：${pre.badColor.join('、')}` : ''}
            </div>` : '<div class="prewarn" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534">系统预检通过，仍请人工逐条确认。</div>'}

          ${this.checks.map((c, i) => `
            <div class="check-row">
              <div>
                <div>${c.label}</div>
                ${c.autoHint ? `<div class="hint ${c.autoHint === 'warn' ? 'warn' : 'ok'}">
                  自动预检：${c.autoHint === 'warn' ? '存在问题' : '通过'}</div>` : '<div class="hint muted">需人工判断</div>'}
              </div>
              <div class="opts">
                <button class="opt pass ${c.passed === true ? 'active' : ''}" data-action="check" data-index="${i}" data-value="true">通过</button>
                <button class="opt fail ${c.passed === false ? 'active' : ''}" data-action="check" data-index="${i}" data-value="false">不符</button>
              </div>
            </div>`).join('')}

          <h3 style="margin-top:16px">退回修改项（退回时必填）</h3>
          ${this.changeRequests.map((cr, i) => `
            <div class="cr">
              <input placeholder="例如：病变区域请改为规范红色 #e5484d" data-input="cr" data-index="${i}" value="${escapeAttr(cr)}"/>
              ${this.changeRequests.length > 1 ? `<button class="btn small danger" data-action="rm-cr" data-index="${i}">✕</button>` : ''}
            </div>`).join('')}
          <button class="btn small" data-action="add-cr">＋ 添加修改项</button>

          <h3 style="margin-top:16px">审核意见</h3>
          <textarea placeholder="总体意见…" data-input="comment">${escapeAttr(this.comment)}</textarea>

          <div class="actions">
            <button class="btn primary" style="flex:1" data-action="approve">✓ 审核通过并允许发布</button>
            <button class="btn danger" style="flex:1" data-action="reject">↩ 退回修改</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  protected afterMount(): void {
    const host = this.root.getElementById('svg-host');
    if (host) {
      const doc = store.getDoc(this.docId)!;
      host.innerHTML = buildSvg(doc, store.getTemplate(doc.templateId));
      const svgEl = host.querySelector('svg');
      if (svgEl) {
        svgEl.setAttribute('width', '100%');
        svgEl.style.borderRadius = '10px';
      }
    }
  }

  protected onAction(action: string, el: HTMLElement): void {
    if (action === 'back') return router.go('/review');
    if (action === 'check') {
      const i = Number(el.dataset.index);
      this.checks[i].passed = el.dataset.value === 'true';
      this.rerender();
    }
    if (action === 'add-cr') {
      this.changeRequests.push('');
      this.rerender();
    }
    if (action === 'rm-cr') {
      this.changeRequests.splice(Number(el.dataset.index), 1);
      this.rerender();
    }
    if (action === 'approve') {
      if (!this.checks.every((c) => c.passed === true)) {
        alert('存在未通过或未核对的条目，不能通过审核。');
        return;
      }
      store.reviewDoc(this.docId, {
        checklist: this.checks,
        comment: this.comment || '核对无误，同意发布。',
        changeRequests: [],
        result: 'approved',
      });
      alert('已通过审核，医师可发布到病房平板。');
      router.go('/review');
    }
    if (action === 'reject') {
      const requests = this.changeRequests.map((s) => s.trim()).filter(Boolean);
      if (!requests.length) {
        alert('退回必须写明至少一条具体修改项。');
        return;
      }
      store.reviewDoc(this.docId, {
        checklist: this.checks.map((c) => ({ ...c, passed: c.passed ?? false })),
        comment: this.comment || '请按修改项调整后重新提交。',
        changeRequests: requests,
        result: 'rejected',
      });
      alert('已退回，修改项已同步给提交医师。');
      router.go('/review');
    }
  }

  protected onInput(key: string, el: HTMLElement): void {
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    if (key === 'comment') this.comment = input.value;
    if (key === 'cr') this.changeRequests[Number(el.dataset.index)] = input.value;
  }
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
