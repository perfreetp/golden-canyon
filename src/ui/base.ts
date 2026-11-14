// Web Component 基类：Shadow DOM + store 订阅 + 事件委托
import { store } from '../core/store';

export abstract class BaseComponent extends HTMLElement {
  protected root: ShadowRoot;
  private unsubscribe: (() => void) | null = null;
  private connected = false;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.connected = true;
    this.root.innerHTML = this.render();
    this.bindEvents();
    this.unsubscribe = store.subscribe(() => this.onStoreChange());
    this.afterMount();
  }

  disconnectedCallback(): void {
    this.connected = false;
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** store 变更后默认整体重渲染；含本地输入态的组件可覆盖 */
  protected onStoreChange(): void {
    if (!this.connected) return;
    this.rerender();
  }

  protected rerender(): void {
    if (!this.connected) return;
    this.root.innerHTML = this.render();
    this.bindEvents();
    this.afterMount();
  }

  protected abstract render(): string;

  /** 基于 data-action 的点击委托 */
  protected bindEvents(): void {
    this.root.querySelectorAll<HTMLElement>('[data-action]').forEach((el) => {
      el.addEventListener('click', (ev) => {
        const action = el.dataset.action!;
        this.onAction(action, el, ev);
      });
    });
    this.root.querySelectorAll<HTMLElement>('[data-input]').forEach((el) => {
      el.addEventListener('input', () => {
        this.onInput(el.dataset.input!, el);
      });
      el.addEventListener('change', () => {
        this.onChange(el.dataset.input!, el);
      });
    });
  }

  protected onAction(_action: string, _el: HTMLElement, _ev: Event): void {}
  protected onInput(_key: string, _el: HTMLElement): void {}
  protected onChange(_key: string, _el: HTMLElement): void {}
  protected afterMount(): void {}

  /** 全局样式片段，各组件可引入 */
  protected static commonCss(): string {
    return css;
  }
}

export const css = `
  :host { display: block; }
  * { box-sizing: border-box; }
  button { font-family: inherit; }
  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1;
    background: #fff; color: #1e293b; font-size: 14px; cursor: pointer;
    transition: all .15s;
  }
  .btn:hover { border-color: #6366f1; color: #4f46e5; }
  .btn.primary { background: #4f46e5; border-color: #4f46e5; color: #fff; }
  .btn.primary:hover { background: #4338ca; color: #fff; }
  .btn.danger { color: #dc2626; border-color: #fca5a5; }
  .btn.danger:hover { background: #fef2f2; }
  .btn.ghost { border-color: transparent; }
  .btn.small { padding: 4px 10px; font-size: 12.5px; }
  .btn:disabled { opacity: .45; cursor: not-allowed; }
  .card {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
    box-shadow: 0 1px 3px rgba(15,23,42,.06);
  }
  .tag { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .tag.draft { background: #f1f5f9; color: #475569; }
  .tag.submitted { background: #dbeafe; color: #1d4ed8; }
  .tag.approved { background: #dcfce7; color: #15803d; }
  .tag.rejected { background: #fee2e2; color: #b91c1c; }
  input, select, textarea {
    font-family: inherit; font-size: 14px; padding: 8px 10px;
    border: 1px solid #cbd5e1; border-radius: 8px; outline: none; background: #fff;
    color: #0f172a;
  }
  input:focus, select:focus, textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; color: #64748b; font-weight: 600; font-size: 12.5px; padding: 10px 12px; background: #f8fafc; }
  td { padding: 12px; border-top: 1px solid #f1f5f9; color: #1e293b; }
  h2 { margin: 0 0 4px; font-size: 20px; color: #0f172a; }
  h3 { margin: 0 0 10px; font-size: 15px; color: #334155; }
  .muted { color: #64748b; font-size: 13px; }
  .scroll { overflow: auto; }
`;
