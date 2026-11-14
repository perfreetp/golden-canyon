// 应用外壳：顶部导航 + 路由分发（编辑端 / 患者端 / 运营后台）
import { BaseComponent, css } from './base';
import { router } from '../core/router';
import { store } from '../core/store';
import '../ui/dashboard-page';
import '../ui/editor-page';
import '../ui/review-list-page';
import '../ui/review-detail-page';
import '../ui/admin-page';
import '../ui/stats-page';
import '../ui/patient-page';

export class AppRoot extends BaseComponent {
  connectedCallback(): void {
    router.onChange(() => this.rerender());
    super.connectedCallback();
  }

  /** 仅由路由变化驱动重渲染；store 广播交给各页面自行处理，避免重建编辑器丢失历史 */
  protected onStoreChange(): void {
    // no-op
  }

  protected render(): string {
    const route = router.current;
    const isPatient = route.name === 'share';

    if (isPatient) {
      return `<style>${css}</style><patient-page token="${route.params.token}"></patient-page>`;
    }

    let page = '<dashboard-page></dashboard-page>';
    if (route.name === 'editor') page = `<editor-page></editor-page>`;
    else if (route.name === 'review') page = '<review-list-page></review-list-page>';
    else if (route.name === 'review-detail') page = `<review-detail-page doc-id="${route.params.id}"></review-detail-page>`;
    else if (route.name === 'admin') page = '<admin-page></admin-page>';
    else if (route.name === 'stats') page = '<stats-page></stats-page>';

    return `
      <style>${css}
        :host { display: block; min-height: 100vh; background: #f1f5f9; }
        .shell { display: flex; min-height: 100vh; }
        main.content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        main.content > * { flex: 1; }
        nav.side {
          width: 218px; flex-shrink: 0; background: #0f172a; color: #cbd5e1;
          padding: 20px 12px; display: flex; flex-direction: column; gap: 4px;
        }
        .logo { font-size: 17px; font-weight: 800; color: #fff; padding: 0 10px 18px; line-height: 1.4; }
        .nav-item {
          display: block; padding: 10px 12px; border-radius: 8px; color: #cbd5e1;
          text-decoration: none; font-size: 14px; margin-bottom: 2px;
        }
        .nav-item:hover { background: #1e293b; color: #fff; }
        .nav-item.active { background: #4f46e5; color: #fff; font-weight: 700; }
        .nav-group { font-size: 11px; color: #64748b; padding: 14px 12px 4px; letter-spacing: .08em; }
        main.content { flex: 1; min-width: 0; }
        .doctor { margin-top: auto; padding: 12px; font-size: 12.5px; color: #94a3b8; border-top: 1px solid #1e293b; }
      </style>
      <div class="shell">
        <nav class="side">
          <div class="logo">🧠 神外术前<br/>谈话图示平台</div>
          <div class="nav-group">编辑端</div>
          <a class="nav-item ${route.name === 'dashboard' || route.name === 'editor' ? 'active' : ''}" href="#/">我的图示</a>
          <div class="nav-group">审核端</div>
          <a class="nav-item ${route.name.startsWith('review') ? 'active' : ''}" href="#/review">审核队列</a>
          <div class="nav-group">运营后台</div>
          <a class="nav-item ${route.name === 'admin' ? 'active' : ''}" href="#/admin">模板 / 术语 / 配色</a>
          <a class="nav-item ${route.name === 'stats' ? 'active' : ''}" href="#/stats">数据统计</a>
          <div class="doctor">当前医师：${store.snapshot.currentDoctor}<br/>审核员：${store.snapshot.currentReviewer}</div>
        </nav>
        <main class="content">${page}</main>
      </div>`;
  }
}
