// 运营后台：脑区模板管理、术语库、图示配色规范
import { BaseComponent, css } from './base';
import { store } from '../core/store';
import { uid } from '../core/geometry';
import type { TermEntry } from '../types';

type Tab = 'template' | 'terms' | 'colors';

export class AdminPage extends BaseComponent {
  private tab: Tab = 'template';

  protected render(): string {
    return `
    <style>${css}
      .page { padding: 26px 30px; }
      .tabs { display: flex; gap: 8px; margin-bottom: 20px; }
      .tabs button { padding: 9px 20px; border-radius: 10px 10px 0 0; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; font-size: 14px; }
      .tabs button.active { background: #4f46e5; color: #fff; border-color: #4f46e5; font-weight: 700; }
      .panel-card { padding: 20px; }
      .tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 14px; }
      .tpl-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
      .tpl-card svg { width: 100%; height: 200px; background: #f8fafc; border-radius: 8px; }
      .region-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
      .region-chip { font-size: 11.5px; padding: 3px 8px; border-radius: 999px; color: #334155; }
      .term-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; }
      .term-head { display: flex; gap: 10px; align-items: center; margin-bottom: 6px; }
      .term-head b { font-size: 15px; }
      .color-row { display: flex; align-items: center; gap: 14px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; }
      .color-row input[type=color] { width: 52px; height: 38px; padding: 2px; }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      dialog { border: none; border-radius: 14px; padding: 0; width: 520px; max-width: 92vw; }
      dialog::backdrop { background: rgba(15,23,42,.45); }
      .dlg { padding: 22px; }
      .dlg label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; color: #475569; margin-top: 10px; }
    </style>
    <div class="page">
      <h2>运营后台</h2>
      <p class="muted" style="margin-bottom:18px">维护标准脑区模板、患者向术语库与图示配色规范，所有编辑端与患者端实时生效。</p>
      <div class="tabs">
        <button class="${this.tab === 'template' ? 'active' : ''}" data-action="tab" data-tab="template">脑区模板</button>
        <button class="${this.tab === 'terms' ? 'active' : ''}" data-action="tab" data-tab="terms">术语库</button>
        <button class="${this.tab === 'colors' ? 'active' : ''}" data-action="tab" data-tab="colors">配色规范</button>
      </div>
      <div class="card panel-card">
        ${this.tab === 'template' ? this.templateTab() : this.tab === 'terms' ? this.termsTab() : this.colorsTab()}
      </div>
    </div>`;
  }

  private templateTab(): string {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h3 style="margin:0">脑区模板（${store.templates.length}）</h3>
        <button class="btn small" data-action="new-template">＋ 复制当前模板为新版本</button>
      </div>
      <div class="tpl-grid">
        ${store.templates.map((t) => `
          <div class="tpl-card">
            <svg viewBox="0 0 ${t.width} ${t.height}" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#f8fafc"/>
              <path d="${t.headOutline.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} Z" fill="#eef2ff" stroke="#94a3b8" stroke-width="3"/>
              ${t.regions.map((r) => `
                <path d="${r.outline.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} Z"
                  fill="${r.color}" fill-opacity=".25" stroke="${r.color}" stroke-width="2"/>`).join('')}
            </svg>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
              <b>${t.name}</b>
              <span class="muted">${t.version} · 网格 ${t.gridSize}px · ${t.regions.length} 脑区</span>
            </div>
            <div class="region-chips">
              ${t.regions.map((r) => `<span class="region-chip" style="background:${r.color}33;border:1px solid ${r.color}">${r.name}</span>`).join('')}
            </div>
            <div style="display:flex;gap:8px;margin-top:10px">
              <button class="btn small" data-action="edit-region" data-id="${t.id}">维护脑区说明</button>
              <button class="btn small danger" data-action="del-template" data-id="${t.id}" ${store.templates.length <= 1 ? 'disabled' : ''}>删除</button>
            </div>
          </div>`).join('')}
      </div>`;
  }

  private termsTab(): string {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h3 style="margin:0">术语库（${store.terms.length} 条，患者端通俗说明数据源）</h3>
        <button class="btn small primary" data-action="new-term">＋ 新增术语</button>
      </div>
      ${store.terms.map((t) => `
        <div class="term-card">
          <div class="term-head">
            <b>${t.term}</b>
            <span class="muted">${t.alias}</span>
            <span style="margin-left:auto;display:flex;gap:8px">
              <button class="btn small" data-action="edit-term" data-id="${t.id}">编辑</button>
              <button class="btn small danger" data-action="del-term" data-id="${t.id}">删除</button>
            </span>
          </div>
          <div style="font-size:13px;color:#334155">通俗说明：${t.plain}</div>
          <div style="font-size:13px;color:#b91c1c;margin-top:4px">风险提示：${t.risk}</div>
        </div>`).join('')}`;
  }

  private colorsTab(): string {
    return `
      <h3>图示配色规范（编辑端取色与审核预检的唯一依据）</h3>
      ${store.colors.map((c) => `
        <div class="color-row">
          <input type="color" value="${c.fill}" data-input="fill" data-id="${c.id}"/>
          <input type="color" value="${c.stroke}" data-input="stroke" data-id="${c.id}"/>
          <div style="width:130px"><b>${c.semanticLabel}</b><div class="muted">${c.semantic}${c.required ? ' · 强制' : ''}</div></div>
          <code style="flex:1">fill:${c.fill}　stroke:${c.stroke}</code>
          <button class="btn small" data-action="apply-color" data-id="${c.id}">保存规范</button>
        </div>`).join('')}`;
  }

  protected onAction(action: string, el: HTMLElement): void {
    if (action === 'tab') {
      this.tab = el.dataset.tab as Tab;
      this.rerender();
    }
    if (action === 'new-term') this.openTermDialog(null);
    if (action === 'edit-term') this.openTermDialog(store.terms.find((t) => t.id === el.dataset.id)!);
    if (action === 'del-term' && confirm('删除该术语？')) store.deleteTerm(el.dataset.id!);
    if (action === 'apply-color') {
      const id = el.dataset.id!;
      const spec = store.colors.find((c) => c.id === id)!;
      const fill = (this.root.querySelector(`[data-input="fill"][data-id="${id}"]`) as HTMLInputElement).value;
      const stroke = (this.root.querySelector(`[data-input="stroke"][data-id="${id}"]`) as HTMLInputElement).value;
      store.saveColor({ ...spec, fill, stroke });
      alert('配色规范已更新，编辑端新图形与审核预检将按新规范执行。');
    }
    if (action === 'new-template') {
      const src = store.templates[0];
      const copy = structuredClone(src);
      copy.id = uid('tpl');
      copy.name = `${src.name}（副本）`;
      copy.version = 'v0.1-draft';
      copy.updatedAt = Date.now();
      store.saveTemplate(copy);
    }
    if (action === 'del-template' && confirm('删除该模板？使用该模板的历史图示不受影响。')) {
      store.deleteTemplate(el.dataset.id!);
    }
    if (action === 'edit-region') this.openRegionDialog(el.dataset.id!);
  }

  /** 术语新增/编辑弹窗（原生 dialog） */
  private openTermDialog(term: TermEntry | null): void {
    const isEdit = !!term;
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `
      <form method="dialog" class="dlg">
        <h3>${isEdit ? '编辑术语' : '新增术语'}</h3>
        <label>术语名称<input name="term" value="${escapeAttr(term?.term ?? '')}" required/></label>
        <label>英文 / 别名<input name="alias" value="${escapeAttr(term?.alias ?? '')}"/></label>
        <label>患者向通俗说明<textarea name="plain" required>${escapeAttr(term?.plain ?? '')}</textarea></label>
        <label>风险提示<textarea name="risk" required>${escapeAttr(term?.risk ?? '')}</textarea></label>
        <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end">
          <button value="cancel" class="btn">取消</button>
          <button value="ok" class="btn primary">保存</button>
        </div>
      </form>`;
    document.body.appendChild(dlg);
    dlg.showModal();
    dlg.addEventListener('close', () => {
      if (dlg.returnValue === 'ok') {
        const f = new FormData(dlg.querySelector('form')!);
        store.saveTerm({
          id: term?.id ?? uid('term'),
          term: String(f.get('term')),
          alias: String(f.get('alias') ?? ''),
          plain: String(f.get('plain')),
          risk: String(f.get('risk')),
        });
      }
      dlg.remove();
    });
  }

  /** 维护模板内每个脑区的通俗说明与风险提示 */
  private openRegionDialog(tplId: string): void {
    const tpl = store.templates.find((t) => t.id === tplId)!;
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `
      <form method="dialog" class="dlg" style="width:620px">
        <h3>脑区说明维护 · ${tpl.name}</h3>
        <div style="max-height:60vh;overflow:auto">
        ${tpl.regions.map((r, i) => `
          <fieldset style="border:1px solid #e2e8f0;border-radius:10px;margin-top:10px;padding:10px">
            <legend style="font-weight:700;color:${r.color}">${r.name}</legend>
            <label style="display:flex;flex-direction:column;gap:4px;font-size:12.5px">通俗说明
              <textarea name="plain-${i}">${escapeAttr(r.plainText)}</textarea></label>
            <label style="display:flex;flex-direction:column;gap:4px;font-size:12.5px;margin-top:6px">风险提示
              <textarea name="risk-${i}">${escapeAttr(r.risk)}</textarea></label>
          </fieldset>`).join('')}
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end">
          <button value="cancel" class="btn">取消</button>
          <button value="ok" class="btn primary">保存全部</button>
        </div>
      </form>`;
    document.body.appendChild(dlg);
    dlg.showModal();
    dlg.addEventListener('close', () => {
      if (dlg.returnValue === 'ok') {
        const form = dlg.querySelector('form')!;
        tpl.regions.forEach((r, i) => {
          r.plainText = String(new FormData(form).get(`plain-${i}`));
          r.risk = String(new FormData(form).get(`risk-${i}`));
        });
        store.saveTemplate(structuredClone(tpl));
      }
      dlg.remove();
    });
  }

  protected onInput(key: string, _el: HTMLElement): void {
    // 配色通过“保存规范”按钮统一提交，此处无需实时处理
    void key;
  }
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
