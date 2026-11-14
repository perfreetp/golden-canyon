// 工作台首页：图示列表、新建、状态筛选、缩略预览
import { BaseComponent, css } from './base';
import { store } from '../core/store';
import { router } from '../core/router';
import type { DiagramDoc } from '../types';

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'draft' },
  submitted: { label: '待审核', cls: 'submitted' },
  approved: { label: '已通过', cls: 'approved' },
  rejected: { label: '已退回', cls: 'rejected' },
};

export class DashboardPage extends BaseComponent {
  private filter = 'all';

  protected render(): string {
    const docs = store.docs.filter((d) => this.filter === 'all' || d.status === this.filter);
    return `
    <style>${css}
      .page { padding: 26px 30px; }
      .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
      .filters { display: flex; gap: 8px; }
      .filters button { padding: 6px 14px; border-radius: 999px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font-size: 13px; }
      .filters button.active { background: #4f46e5; border-color: #4f46e5; color: #fff; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; }
      .doc-card { padding: 0; overflow: hidden; cursor: pointer; transition: transform .15s, box-shadow .15s; }
      .doc-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(15,23,42,.12); }
      .thumb { height: 170px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; }
      .thumb svg { width: 92%; height: 92%; }
      .meta { padding: 14px; }
      .meta .title { font-weight: 700; font-size: 15px; margin-bottom: 6px; color: #0f172a; }
      .row { display: flex; justify-content: space-between; font-size: 12.5px; color: #64748b; margin-top: 4px; }
      .reject-note { margin-top: 8px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 8px; padding: 8px; font-size: 12px; }
      .stats-row { display: flex; gap: 14px; margin-bottom: 20px; }
      .stat { flex: 1; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
      .stat b { font-size: 26px; color: #4f46e5; }
    </style>
    <div class="page">
      <div class="head">
        <div>
          <h2>我的术前图示</h2>
          <p class="muted">在标准脑区模板上绘制病变、功能区、血管与手术入路，提交审核后发布到病房平板</p>
        </div>
        <button class="btn primary" data-action="new">＋ 新建图示</button>
      </div>

      <div class="stats-row">
        <div class="stat"><b>${store.docs.length}</b><div class="muted">图示总数</div></div>
        <div class="stat"><b>${store.docs.filter((d) => d.status === 'submitted').length}</b><div class="muted">待审核</div></div>
        <div class="stat"><b>${store.docs.filter((d) => d.status === 'approved').length}</b><div class="muted">已通过</div></div>
        <div class="stat"><b>${store.docs.filter((d) => d.status === 'rejected').length}</b><div class="muted">被退回</div></div>
      </div>

      <div class="filters" style="margin-bottom:16px">
        ${['all', 'draft', 'submitted', 'approved', 'rejected'].map((f) => `
          <button class="${this.filter === f ? 'active' : ''}" data-action="filter" data-filter="${f}">
            ${f === 'all' ? '全部' : STATUS[f].label}
          </button>`).join('')}
      </div>

      <div class="grid">
        ${docs.map((d) => this.card(d)).join('') || '<p class="muted">暂无图示，点击右上角新建。</p>'}
      </div>
    </div>`;
  }

  private card(d: DiagramDoc): string {
    const tpl = store.getTemplate(d.templateId);
    const regionShapes = d.shapes.filter((s) => s.kind === 'region');
    const pathShapes = d.shapes.filter((s) => s.kind === 'path');
    const miniSvg = `
      <svg viewBox="0 0 ${tpl.width} ${tpl.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <path d="${miniHead(tpl.headOutline)}" fill="#eef2ff" stroke="#cbd5e1" stroke-width="3"/>
        ${regionShapes.map((s) => s.kind === 'region' ? `<path d="${miniPath(s.points, true)}" fill="${s.fill}" fill-opacity=".5" stroke="${s.stroke}" stroke-width="3"/>` : '').join('')}
        ${pathShapes.map((s) => s.kind === 'path' ? `<path d="${miniPath(s.points, false)}" fill="none" stroke="${s.stroke}" stroke-width="4" ${s.dashed ? 'stroke-dasharray="10 8"' : ''}/>` : '').join('')}
      </svg>`;
    const st = STATUS[d.status];
    return `
      <div class="card doc-card" data-action="open" data-id="${d.id}">
        <div class="thumb">${miniSvg}</div>
        <div class="meta">
          <div class="title">${d.title}</div>
          <div class="row"><span>患者：${d.patientName || '—'}</span><span class="tag ${st.cls}">${st.label}</span></div>
          <div class="row"><span>${d.author}</span><span>${new Date(d.updatedAt).toLocaleDateString('zh-CN')}</span></div>
          <div class="row"><span>图形 ${d.shapes.length} 个 · 图层 ${d.layers.length} 个</span></div>
          ${d.status === 'rejected' && d.review ? `
            <div class="reject-note">退回修改项：${d.review.changeRequests[0] ?? d.review.comment}${d.review.changeRequests.length > 1 ? ` 等 ${d.review.changeRequests.length} 项` : ''}</div>` : ''}
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn small" data-action="open" data-id="${d.id}">打开编辑</button>
            <button class="btn small danger" data-action="delete" data-id="${d.id}">删除</button>
          </div>
        </div>
      </div>`;
  }

  protected onAction(action: string, el: HTMLElement): void {
    if (action === 'new') {
      const doc = store.createDoc({ title: `术前图示 ${store.docs.length + 1}` });
      router.go(`/editor/${doc.id}`);
    } else if (action === 'filter') {
      this.filter = el.dataset.filter!;
      this.rerender();
    } else if (action === 'open') {
      router.go(`/editor/${el.dataset.id}`);
    } else if (action === 'delete') {
      if (confirm('确定删除该图示？此操作不可恢复。')) {
        store.deleteDoc(el.dataset.id!);
      }
    }
  }
}

function miniPath(points: { x: number; y: number }[], closed: boolean): string {
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return closed ? `${d} Z` : d;
}
function miniHead(points: { x: number; y: number }[]): string {
  return miniPath(points, true);
}
