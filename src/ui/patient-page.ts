// 患者端：病房平板视图。旋转 3D 头模，点脑区标签看通俗说明与风险提示
import { BaseComponent, css } from './base';
import { store } from '../core/store';
import type { BrainRegion } from '../types';
// 3D 引擎动态加载，Babylon 被拆进独立 chunk，不拖慢其它界面
import type { Head3D } from '../core/head3d';
import type { Engine as BEngine } from '@babylonjs/core/Engines/engine';

export class PatientPage extends BaseComponent {
  private token = '';
  private head: Head3D | null = null;
  private bEngine: BEngine | null = null;
  private activeRegion: BrainRegion | null = null;
  private startedAt = Date.now();
  private opened = new Set<string>();
  private recorded = false;

  connectedCallback(): void {
    this.token = this.getAttribute('token') ?? '';
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this.timerHandle);
    this.recordSession();
    this.head?.dispose();
    this.head = null;
    this.bEngine = null;
  }

  /** 患者端画布一旦建立就不能整体重渲染（会替换 Babylon 绑定的 canvas），忽略 store 推送 */
  protected onStoreChange(): void {
    // no-op：会话内状态自洽，统计上报不影响当前视图
  }

  private recordSession(): void {
    if (this.recorded) return;
    this.recorded = true;
    const doc = store.getDocByToken(this.token);
    if (!doc) return;
    store.recordSession({
      token: this.token,
      docId: doc.id,
      startedAt: this.startedAt,
      endedAt: Date.now(),
      durationSec: Math.max(5, Math.round((Date.now() - this.startedAt) / 1000)),
      regionsOpened: [...this.opened],
    });
  }

  protected render(): string {
    const doc = store.getDocByToken(this.token);
    if (!doc) {
      return `<style>${css}</style>
        <div style="padding:60px;text-align:center">
          <h2>链接无效或图示已撤回</h2>
          <p class="muted">请联系主管医师重新获取病房平板分享链接。</p>
        </div>`;
    }
    const tpl = store.getTemplate(doc.templateId);

    return `
    <style>${css}
      :host { display: block; min-height: 100vh; background: linear-gradient(160deg,#0b1020,#1e1b4b); color: #e2e8f0; }
      .patient { display: flex; flex-direction: column; min-height: 100vh; }
      .p-head { padding: 18px 26px; display: flex; align-items: center; gap: 16px; }
      .p-head h1 { font-size: 21px; margin: 0; color: #fff; }
      .p-head .sub { color: #a5b4fc; font-size: 13.5px; margin-top: 3px; }
      .p-body { flex: 1; display: grid; grid-template-columns: 1fr 380px; gap: 18px; padding: 0 26px 24px; min-height: 0; }
      .stage3d { position: relative; border-radius: 18px; overflow: hidden; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); min-height: 560px; }
      canvas#head-canvas { width: 100%; height: 100%; display: block; touch-action: none; outline: none; }
      .stage-tip { position: absolute; left: 18px; bottom: 16px; background: rgba(15,23,42,.72); padding: 10px 14px; border-radius: 10px; font-size: 13px; color: #c7d2fe; }
      .stage-btns { position: absolute; right: 18px; top: 16px; display: flex; flex-direction: column; gap: 8px; }
      .stage-btns button { padding: 9px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.18); background: rgba(15,23,42,.7); color: #e2e8f0; cursor: pointer; font-size: 13px; }
      .side { display: flex; flex-direction: column; gap: 14px; overflow: auto; }
      .p-card { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.09); border-radius: 16px; padding: 18px; }
      .region-detail { min-height: 200px; }
      .region-detail h2 { color: #fff; display: flex; align-items: center; gap: 10px; }
      .dot { width: 14px; height: 14px; border-radius: 50%; }
      .plain { font-size: 14.5px; line-height: 1.75; color: #e0e7ff; }
      .risk { margin-top: 12px; background: rgba(239,68,68,.14); border: 1px solid rgba(248,113,113,.35); color: #fecaca; border-radius: 12px; padding: 12px 14px; font-size: 13.5px; line-height: 1.7; }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .chip-btn { border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.05); color: #e2e8f0; padding: 7px 13px; border-radius: 999px; font-size: 12.5px; cursor: pointer; }
      .chip-btn.active { outline: 2px solid #818cf8; }
      .term { background: rgba(255,255,255,.05); border-radius: 12px; padding: 10px 12px; margin-top: 8px; font-size: 12.5px; }
      .term b { color: #c7d2fe; }
      .empty { color: #94a3b8; font-size: 13.5px; line-height: 1.8; }
      .view-meta { font-size: 12.5px; color: #a5b4fc; }
      .timer { margin-left: auto; font-variant-numeric: tabular-nums; background: rgba(99,102,241,.25); padding: 6px 12px; border-radius: 999px; font-size: 13px; }
    </style>
    <div class="patient">
      <div class="p-head">
        <div>
          <h1>🧠 ${doc.title}</h1>
          <div class="sub">患者：${doc.patientName || '—'}　住院号：${doc.patientNo || '—'}　主治：${doc.author}</div>
        </div>
        <div class="timer" id="view-timer">查看 0 秒</div>
      </div>

      <div class="p-body">
        <div class="stage3d">
          <canvas id="head-canvas"></canvas>
          <div class="stage-btns">
            <button data-action="reset">复位视角</button>
            <button data-action="record">结束查看</button>
          </div>
          <div class="stage-tip">👆 单指拖动旋转头颅，双指捏合缩放；点击发亮的脑区查看通俗说明</div>
        </div>

        <div class="side">
          <div class="p-card region-detail" id="region-detail">
            ${this.renderDetail()}
          </div>

          <div class="p-card">
            <h3 style="color:#fff;margin:0 0 10px">脑区标签（点击定位）</h3>
            <div class="chips">
              ${tpl.regions.map((rg) => `
                <button class="chip-btn ${this.activeRegion?.id === rg.id ? 'active' : ''}"
                  data-action="region" data-id="${rg.id}">${rg.name}</button>`).join('')}
            </div>
          </div>

          <div class="p-card">
            <h3 style="color:#fff;margin:0 0 6px">术语小词典</h3>
            ${store.terms.slice(0, 4).map((t) => `
              <div class="term"><b>${t.term}</b>（${t.alias}）<br/>${t.plain}</div>`).join('')}
          </div>

          <div class="p-card view-meta">分享编号：${this.token}　·　本页面为患者知情谈话辅助材料，不替代医师当面说明</div>
        </div>
      </div>
    </div>`;
  }

  private loading3d = false;

  protected afterMount(): void {
    const doc = store.getDocByToken(this.token);
    if (!doc) return;
    const canvas = this.root.getElementById('head-canvas') as HTMLCanvasElement | null;
    if (canvas && !this.head && !this.loading3d) {
      this.loading3d = true;
      const tpl = store.getTemplate(doc.templateId);
      // 按需加载 Babylon 3D 引擎（独立 chunk）
      void import('../core/head3d').then(({ Head3D, BEngine }) => {
        if (!this.isConnected || this.head) return;
        this.bEngine = new BEngine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
        this.head = new Head3D(canvas, tpl, this.bEngine, {
          onRegionClick: (id) => this.selectRegion(id),
        });
        this.head.start();
        this.startTimer();
      });
    }
  }

  private timerHandle = 0;
  private startTimer(): void {
    this.timerHandle = window.setInterval(() => {
      const el = this.root.getElementById('view-timer');
      if (el) {
        const sec = Math.round((Date.now() - this.startedAt) / 1000);
        el.textContent = `查看 ${sec} 秒`;
      }
    }, 1000);
  }

  private renderDetail(): string {
    const r = this.activeRegion;
    if (!r) {
      return `
        <h2 style="color:#fff">这是什么？</h2>
        <p class="empty">这是根据您的术前图示生成的三维头模。<br/>用手指转动它，点击任意发亮的脑区，就可以看到：<br/>① 这个脑区是做什么的（通俗说明）<br/>② 手术可能带来的风险提示。<br/><br/>您看过的脑区会被记录，方便医师了解谈话重点。</p>`;
    }
    return `
      <h2><span class="dot" style="background:${r.color}"></span>${r.name}</h2>
      <p class="plain">${r.plainText}</p>
      <div class="risk">⚠ 风险提示：${r.risk}</div>`;
  }

  private selectRegion(id: string): void {
    const doc = store.getDocByToken(this.token);
    if (!doc) return;
    const tpl = store.getTemplate(doc.templateId);
    const rg = tpl.regions.find((x) => x.id === id);
    if (!rg) return;
    this.activeRegion = rg;
    this.opened.add(id);
    this.head?.highlight(id);
    // 局部更新，避免替换 Babylon 绑定的 canvas
    const detail = this.root.getElementById('region-detail');
    if (detail) detail.innerHTML = this.renderDetail();
    this.root.querySelectorAll<HTMLElement>('.chip-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.id === id);
    });
  }

  protected onAction(action: string, el: HTMLElement): void {
    if (action === 'region') {
      this.selectRegion(el.dataset.id!);
    }
    if (action === 'reset') {
      this.head?.resetView();
      this.activeRegion = null;
      const detail = this.root.getElementById('region-detail');
      if (detail) detail.innerHTML = this.renderDetail();
      this.root.querySelectorAll<HTMLElement>('.chip-btn').forEach((b) => b.classList.remove('active'));
    }
    if (action === 'record') {
      this.recordSession();
      alert(`查看记录已上报（时长 ${Math.round((Date.now() - this.startedAt) / 1000)} 秒，查看脑区 ${this.opened.size} 个），统计页可查。`);
    }
  }
}
