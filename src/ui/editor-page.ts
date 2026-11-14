// 编辑端：画布工作台
import { BaseComponent, css } from '../ui/base';
import { store } from '../core/store';
import { router } from '../core/router';
import { HistoryStack } from '../core/history';
import { CanvasEngine, type Tool } from '../editor/canvas-engine';
import { downloadSvg } from '../core/svg-export';
import type { DiagramDoc, Shape } from '../types';

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: 'select', label: '选择', hint: 'V' },
  { id: 'lesion', label: '病变范围', hint: '1' },
  { id: 'eloquent', label: '功能区', hint: '2' },
  { id: 'vessel', label: '血管走行', hint: '3' },
  { id: 'approach', label: '手术入路', hint: '4' },
  { id: 'note', label: '文字标注', hint: '5' },
];

export class EditorPage extends BaseComponent {
  private engine: CanvasEngine | null = null;
  private history: HistoryStack<DiagramDoc>;
  private docId = '';
  private toast = '';

  constructor() {
    super();
    this.history = new HistoryStack<DiagramDoc>(100, (d) => structuredClone(d));
  }

  private doc(): DiagramDoc {
    return store.getDoc(this.docId)!;
  }

  /** 任何修改前调用：把当前引擎文档快照压入历史栈（撤销至少保留 100 步） */
  private pushHistory(label: string): void {
    if (!this.engine) return;
    this.history.push(structuredClone(this.engine.doc), label);
  }

  protected render(): string {
    this.docId = router.current.params.id;
    const doc = store.getDoc(this.docId);
    if (!doc) {
      return `<div class="wrap"><p>图示不存在，<a href="#/">返回列表</a></p></div>`;
    }
    const tpl = store.getTemplate(doc.templateId);
    const sel = this.engine?.shape ?? null;
    const booleanTargets = doc.shapes.filter(
      (s): s is Extract<Shape, { kind: 'region' }> => s.kind === 'region' && s.id !== sel?.id,
    );

    return `
    <style>${css}${this.localCss()}</style>
    <div class="editor">
      <header class="topbar">
        <div class="brand">🧠 图示工作台</div>
        <input class="title-input" data-input="title" value="${escapeAttr(doc.title)}" />
        <div class="top-actions">
          <button class="btn small" data-action="undo" ${this.history.canUndo ? '' : 'disabled'}>↶ 撤销<span class="kbd">${this.history.size}</span></button>
          <button class="btn small" data-action="redo" ${this.history.canRedo ? '' : 'disabled'}>↷ 重做</button>
          <button class="btn small" data-action="export">导出 SVG</button>
          <button class="btn small" data-action="share">发布并生成分享链接</button>
          <button class="btn small primary" data-action="submit">提交审核</button>
          <button class="btn small ghost" data-action="back">← 返回</button>
        </div>
      </header>

      <div class="body">
        <aside class="left panel">
          <h3>绘图工具</h3>
          <div class="tools">
            ${TOOLS.map((t) => `
              <button class="tool ${this.engine?.tool === t.id ? 'active' : ''}" data-action="tool" data-tool="${t.id}">
                <span>${t.label}</span><span class="hint">${t.hint}</span>
              </button>`).join('')}
          </div>
          <p class="muted tip">面状工具：单击逐个落点，<b>双击或回车</b>闭合；右键取消草稿。双击边线加节点，拖拽节点调整，双击节点删除。</p>
          <label class="switch"><input type="checkbox" data-input="snap" ${this.engine?.snapEnabled ?? true ? 'checked' : ''}/> 网格与端点吸附</label>
          <label class="switch"><input type="checkbox" data-input="tpl" ${doc.showTemplate ? 'checked' : ''}/> 显示模板网格</label>

          <h3 style="margin-top:18px">图层</h3>
          <div class="layers">
            ${doc.layers.map((l) => `
              <div class="layer ${l.locked ? 'locked' : ''}">
                <div class="layer-head">
                  <button class="icon-btn" data-action="layer-vis" data-id="${l.id}" title="隐藏/显示">${l.visible ? '👁' : '🚫'}</button>
                  <span class="layer-name">${l.name}</span>
                  <button class="icon-btn" data-action="layer-lock" data-id="${l.id}" title="锁定/解锁">${l.locked ? '🔒' : '🔓'}</button>
                </div>
                <div class="opacity">
                  <span>透明度</span>
                  <input type="range" min="0.1" max="1" step="0.05" value="${l.opacity}"
                    data-input="opacity" data-id="${l.id}" ${l.locked ? 'disabled' : ''}/>
                  <span class="op-val">${Math.round(l.opacity * 100)}%</span>
                </div>
              </div>`).join('')}
          </div>
        </aside>

        <main class="stage">
          <div class="canvas-wrap">
            <svg id="canvas-svg" viewBox="0 0 ${tpl.width} ${tpl.height}"
              xmlns="http://www.w3.org/2000/svg"></svg>
            ${this.toast ? `<div class="toast">${this.toast}</div>` : ''}
            <div class="statusbar">
              <span>状态：${statusLabel(doc.status)}</span>
              <span>患者：${doc.patientName || '—'}（${doc.patientNo || '—'}）</span>
              <span>图形数：${doc.shapes.length}</span>
              <span>历史：${this.history.size} 步</span>
            </div>
          </div>
        </main>

        <aside class="right panel">
          ${this.renderInspector(sel, booleanTargets.map((s) => ({ id: s.id, label: s.label ?? s.id })))}
        </aside>
      </div>
    </div>`;
  }

  private renderInspector(sel: Shape | null, targets: { id: string; label: string }[]): string {
    if (!sel) {
      return `<h3>属性</h3><p class="muted">未选中图形。选择画布上的图形后可编辑标签、解剖标注、颜色与节点圆滑度。</p>
        <h3 style="margin-top:18px">解剖脑区速查</h3>
        <div class="region-list">
          ${store.getTemplate(this.doc().templateId).regions.map((r) => `
            <div class="region-item" style="border-left-color:${r.color}">
              <b>${r.name}</b><span class="muted">${r.plainText.slice(0, 22)}…</span>
            </div>`).join('')}
        </div>`;
    }
    const tpl = store.getTemplate(this.doc().templateId);
    const nodes = sel.kind === 'note' ? [] : sel.points;
    return `
      <h3>属性 · ${sel.kind === 'region' ? '面状区域' : sel.kind === 'path' ? '路径' : '标注'}</h3>
      ${sel.kind === 'note' ? `
        <label class="field">文字<input data-input="note-text" value="${escapeAttr(sel.text)}"/></label>
      ` : `
        <label class="field">名称<input data-input="label" value="${escapeAttr(sel.label ?? '')}"/></label>
        <label class="field">解剖标注（关联标准脑区）
          <select data-input="anatomy">
            <option value="">— 请选择 —</option>
            ${tpl.regions.map((r) => `<option value="${r.id}" ${sel.anatomyTag === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
          </select>
        </label>
        ${sel.kind === 'region' ? `
          <label class="field">填充色<input type="color" data-input="fill" value="${sel.fill}"/></label>
          <label class="field">描边色<input type="color" data-input="stroke" value="${sel.stroke}"/></label>
        ` : `
          <label class="field">线条色<input type="color" data-input="stroke" value="${sel.stroke}"/></label>
          <label class="field">线宽<input type="range" min="1" max="10" step="0.5" data-input="width" value="${sel.width}"/></label>
          <label class="switch"><input type="checkbox" data-input="dashed" ${sel.dashed ? 'checked' : ''}/> 虚线</label>
        `}
        <h3 style="margin-top:16px">节点（${nodes.length}）</h3>
        <div class="nodes scroll">
          ${nodes.map((n, i) => `
            <div class="node-row">
              <span class="node-idx">${i + 1}</span>
              <span class="muted">(${Math.round(n.x)}, ${Math.round(n.y)})</span>
              <input type="range" min="0" max="1" step="0.05" value="${n.smooth}"
                data-input="smooth" data-shape="${sel.id}" data-index="${i}" title="圆弧程度"/>
              <button class="icon-btn" data-action="del-node" data-shape="${sel.id}" data-index="${i}" title="删除节点">✕</button>
            </div>`).join('')}
        </div>
        ${sel.kind === 'region' ? `
          <h3 style="margin-top:16px">路径布尔运算</h3>
          <p class="muted">与另一块重叠区域求并集或差集，剪出不规则形状。</p>
          <select data-input="boolean-target">
            <option value="">选择另一块区域…</option>
            ${targets.map((t) => `<option value="${t.id}">${t.label}</option>`).join('')}
          </select>
          <div class="bool-btns">
            <button class="btn small" data-action="bool-union">∪ 求并</button>
            <button class="btn small danger" data-action="bool-subtract">− 求差</button>
          </div>
          ${sel.booleanSource ? `<p class="muted">来源：${sel.booleanSource.op === 'union' ? '并集' : '差集'}运算</p>` : ''}
        ` : ''}
      `}
      <button class="btn danger small" style="margin-top:16px;width:100%" data-action="delete">删除该图形</button>
    `;
  }

  /** 编辑器自带引擎与历史，忽略 store 广播，避免重渲染替换已绑定事件的 SVG */
  protected onStoreChange(): void {
    // no-op
  }

  protected afterMount(): void {
    const doc = store.getDoc(this.docId);
    if (!doc) return;
    if (!this.engine) {
      const tpl = store.getTemplate(doc.templateId);
      this.engine = new CanvasEngine(structuredClone(doc), tpl, {
        beforeChange: (label) => this.pushHistory(label),
        onChange: () => this.flush(),
        onSelect: () => this.rerender(),
      });
    }
    if (!this.keyBound) {
      window.addEventListener('keydown', this.keyHandler);
      this.keyBound = true;
    }
    const svg = this.root.getElementById('canvas-svg') as SVGSVGElement | null;
    if (svg && svg !== this.engineSvg) {
      this.engine.attach(svg);
      this.engineSvg = svg;
    }
    this.engine.render();
  }

  private engineSvg: SVGSVGElement | null = null;
  private keyBound = false;
  private destroyed = false;
  private flushing = false;

  disconnectedCallback(): void {
    this.destroyed = true;
    super.disconnectedCallback();
    if (this.keyBound) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyBound = false;
    }
    // 仅在正常离开时保存一次；销毁/重渲染过程中不再触发 store，避免递归
    if (!this.flushing) this.flush();
  }

  private keyHandler = (ev: KeyboardEvent): void => {
    if (!this.engine) return;
    const tag = (ev.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const map: Record<string, Tool> = {
      v: 'select', '1': 'lesion', '2': 'eloquent', '3': 'vessel', '4': 'approach', '5': 'note',
    };
    if (map[ev.key]) this.engine.setTool(map[ev.key]);
    if (ev.key === 'Enter') this.engine.commitDraft();
    if (ev.key === 'Escape') this.engine.cancelDraft();
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'z' && !ev.shiftKey) { ev.preventDefault(); this.undo(); }
    if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'y' || (ev.shiftKey && ev.key === 'z'))) { ev.preventDefault(); this.redo(); }
    if (ev.key === 'Delete' || ev.key === 'Backspace') this.engine.deleteSelected();
    this.rerender();
  };

  private flush(): void {
    if (!this.engine || this.flushing || this.destroyed) return;
    this.flushing = true;
    try {
      const live = this.doc();
      const ed = this.engine.doc;
      live.layers = ed.layers;
      live.shapes = ed.shapes;
      live.showTemplate = ed.showTemplate;
      live.title = ed.title;
      live.updatedAt = Date.now();
      store.saveDoc(live);
    } finally {
      this.flushing = false;
    }
  }

  private undo(): void {
    const r = this.history.undo(this.engine!.doc);
    if (r) {
      this.engine!.doc = structuredClone(r.state);
      this.engine!.select(null);
      this.flush();
      this.showToast(`已撤销：${r.label}`);
    }
  }

  private redo(): void {
    const r = this.history.redo(this.engine!.doc);
    if (r) {
      this.engine!.doc = structuredClone(r.state);
      this.engine!.select(null);
      this.flush();
      this.showToast(`已重做：${r.label}`);
    }
  }

  private showToast(msg: string): void {
    this.toast = msg;
    this.rerender();
    setTimeout(() => {
      this.toast = '';
      this.rerender();
    }, 1800);
  }

  protected onAction(action: string, el: HTMLElement): void {
    const e = this.engine!;
    switch (action) {
      case 'back':
        this.flush();
        router.go('/');
        break;
      case 'tool':
        e.setTool((el.dataset.tool as Tool) ?? 'select');
        break;
      case 'undo': this.undo(); break;
      case 'redo': this.redo(); break;
      case 'export':
        this.flush();
        downloadSvg(this.doc(), store.getTemplate(this.doc().templateId));
        this.showToast('SVG 已导出，可用于打印与课件');
        break;
      case 'share': {
        this.flush();
        const token = store.publishDoc(this.docId);
        const url = `${location.origin}${location.pathname}#/share/${token}`;
        navigator.clipboard?.writeText(url).catch(() => undefined);
        this.showToast(`已发布并推送至病房平板，链接已复制：${url}`);
        break;
      }
      case 'submit': {
        this.flush();
        const { missingAnatomy, badColor } = store.precheck(this.doc());
        if (missingAnatomy.length || badColor.length) {
          const warns: string[] = [];
          if (missingAnatomy.length) warns.push(`缺解剖标注：${missingAnatomy.join('、')}`);
          if (badColor.length) warns.push(`颜色不符规范：${badColor.join('、')}`);
          if (!window.confirm(`${warns.join('\n')}\n\n仍要提交审核吗？（审核员将逐条核对）`)) break;
        }
        store.submitDoc(this.docId);
        this.showToast('已提交，等待审核员核对');
        break;
      }
      case 'layer-vis': e.toggleLayer(el.dataset.id!, 'visible'); this.flush(); break;
      case 'layer-lock': e.toggleLayer(el.dataset.id!, 'locked'); this.flush(); break;
      case 'del-node':
        e.deleteNode(el.dataset.shape!, Number(el.dataset.index));
        this.flush();
        break;
      case 'bool-union': this.applyBool('union'); break;
      case 'bool-subtract': this.applyBool('subtract'); break;
      case 'delete':
        e.deleteSelected();
        this.flush();
        break;
    }
    this.rerender();
  }

  private applyBool(op: 'union' | 'subtract'): void {
    const sel = this.root.querySelector('[data-input="boolean-target"]') as HTMLSelectElement | null;
    const otherId = sel?.value;
    if (!otherId) {
      this.showToast('请先选择另一块区域');
      return;
    }
    // booleanWith 内部会触发引擎 onChange，统一在那里入历史
    this.engine!.booleanWith(otherId, op);
    this.showToast(op === 'union' ? '已完成求并' : '已完成求差（镂空）');
  }

  protected onInput(key: string, el: HTMLElement): void {
    const e = this.engine;
    if (!e) return;
    const input = el as HTMLInputElement;
    const doc = e.doc;
    switch (key) {
      case 'title':
        doc.title = input.value;
        this.flush();
        return; // 不整体重渲染，避免打断输入
      case 'snap': e.snapEnabled = input.checked; break;
      case 'tpl':
        this.pushHistory('切换模板显示');
        doc.showTemplate = input.checked;
        this.flush();
        break;
      case 'opacity': e.setLayerOpacity(el.dataset.id!, Number(input.value)); this.flush(); break;
      case 'label':
        if (e.shape && e.shape.kind !== 'note') e.shape.label = input.value;
        break;
      case 'anatomy':
        this.pushHistory('设置解剖标注');
        if (e.shape && e.shape.kind !== 'note') e.shape.anatomyTag = input.value || undefined;
        break;
      case 'fill':
        if (e.shape?.kind === 'region') e.shape.fill = input.value;
        break;
      case 'stroke':
        if (e.shape && e.shape.kind !== 'note') e.shape.stroke = input.value;
        break;
      case 'width':
        if (e.shape?.kind === 'path') e.shape.width = Number(input.value);
        break;
      case 'dashed':
        this.pushHistory('切换虚线');
        if (e.shape?.kind === 'path') e.shape.dashed = input.checked;
        break;
      case 'smooth':
        e.setNodeSmooth(el.dataset.shape!, Number(el.dataset.index), Number(input.value));
        this.flush();
        return;
      case 'note-text':
        if (e.shape?.kind === 'note') e.shape.text = input.value;
        break;
    }
    this.flush();
    this.rerender();
  }

  /** 颜色/文字类控件在获得焦点时压一次快照，保证一次编辑手势只占一步历史 */
  protected onChange(key: string, _el: HTMLElement): void {
    if (['fill', 'stroke', 'width', 'label', 'note-text'].includes(key)) {
      this.pushHistory('修改属性');
    }
  }

  private localCss(): string {
    return `
      .editor { display: flex; flex-direction: column; height: 100vh; background: #f1f5f9; overflow: hidden; }
      .topbar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: #0f172a; color: #fff; flex-shrink: 0; }
      .brand { font-weight: 700; white-space: nowrap; font-size: 15px; }
      .title-input { flex: 1; min-width: 120px; max-width: 360px; background: #1e293b; border-color: #334155; color: #fff; }
      .top-actions { display: flex; gap: 6px; margin-left: auto; flex-shrink: 0; }
      .top-actions .btn { white-space: nowrap; padding: 7px 10px; }
      .kbd { background: #e2e8f0; border-radius: 4px; padding: 0 5px; margin-left: 4px; font-size: 11px; color: #475569; }
      .body { flex: 1; min-width: 0; display: grid; grid-template-columns: 220px minmax(180px, 1fr) 290px; gap: 12px; padding: 12px; min-height: 0; width: 100%; }
      .panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; overflow: auto; min-height: 0; min-width: 0; max-width: 100%; }
      @media (max-width: 1100px) {
        .body { grid-template-columns: 180px minmax(160px, 1fr) 240px; gap: 8px; padding: 8px; }
      }
      .tools { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .tool { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 6px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; cursor: pointer; font-size: 13px; }
      .tool.active { border-color: #4f46e5; background: #eef2ff; color: #4338ca; font-weight: 700; }
      .tool .hint { font-size: 10.5px; color: #94a3b8; }
      .tip { line-height: 1.6; margin-top: 10px; }
      .switch { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; margin-top: 10px; }
      .layers { display: flex; flex-direction: column; gap: 8px; }
      .layer { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; }
      .layer.locked { background: #fefce8; }
      .layer-head { display: flex; align-items: center; gap: 8px; }
      .layer-name { flex: 1; font-size: 13.5px; font-weight: 600; }
      .icon-btn { border: none; background: none; cursor: pointer; font-size: 15px; padding: 2px 4px; }
      .opacity { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; margin-top: 4px; }
      .opacity input { flex: 1; }
      .stage { display: flex; min-width: 0; min-height: 0; }
      .canvas-wrap { flex: 1; position: relative; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
      #canvas-svg { flex: 1; width: 100%; min-height: 0; touch-action: none; }
      .statusbar { display: flex; gap: 18px; padding: 8px 14px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12.5px; color: #64748b; }
      .toast { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); background: #0f172a; color: #fff; padding: 10px 18px; border-radius: 999px; font-size: 13px; max-width: 80%; z-index: 5; box-shadow: 0 8px 24px rgba(0,0,0,.25); }
      .field { display: flex; flex-direction: column; gap: 5px; font-size: 13px; color: #475569; margin-top: 10px; }
      .nodes { max-height: 220px; display: flex; flex-direction: column; gap: 6px; }
      .node-row { display: grid; grid-template-columns: 24px 78px 1fr 26px; align-items: center; gap: 6px; font-size: 12px; }
      .node-idx { background: #eef2ff; color: #4338ca; border-radius: 6px; text-align: center; font-weight: 700; }
      .bool-btns { display: flex; gap: 8px; margin-top: 8px; }
      .region-list { display: flex; flex-direction: column; gap: 6px; }
      .region-item { display: flex; flex-direction: column; border-left: 4px solid #94a3b8; background: #f8fafc; padding: 6px 8px; border-radius: 0 8px 8px 0; font-size: 12.5px; }
      .grid line { stroke: #eef2f7; stroke-width: 1; }
      .head { fill: #eef2ff; stroke: #94a3b8; stroke-width: 2.5; }
      .tpl-region { fill-opacity: .14; stroke-width: 1.4; stroke-dasharray: 6 4; cursor: pointer; }
      .tpl-label { font-size: 13px; fill: #64748b; text-anchor: middle; pointer-events: none; }
      .shape { cursor: pointer; }
      .shape.region { fill-opacity: .42; stroke-width: 2.5; stroke-linejoin: round; }
      .shape.path { fill: none; stroke-linecap: round; cursor: pointer; }
      .shape.selected { stroke-width: 3.5; filter: drop-shadow(0 0 5px rgba(79,70,229,.55)); }
      .shape-label { font-size: 15px; font-weight: 700; fill: #0f172a; text-anchor: middle; pointer-events: none; }
      .path-end { cursor: pointer; }
      .note text { font-size: 15px; }
      .handle circle { fill: #fff; stroke: #4f46e5; stroke-width: 2; cursor: grab; }
      .handle-tip { font-size: 10.5px; fill: #4f46e5; pointer-events: none; }
      .draft { fill: rgba(99,102,241,.12); stroke: #6366f1; stroke-width: 2; stroke-dasharray: 5 4; pointer-events: none; }
      .draft-node { fill: #6366f1; pointer-events: none; }
      .guide { stroke: #f59e0b; stroke-width: 1.5; stroke-dasharray: 4 3; pointer-events: none; }
    `;
  }
}

function statusLabel(s: string): string {
  return ({ draft: '草稿', submitted: '待审核', approved: '已通过', rejected: '已退回' } as Record<string, string>)[s] ?? s;
}
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
