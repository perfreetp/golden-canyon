// 数据统计：各医生提交量、退回率、患者端平均查看时长（纯 CSS/SVG 图表）
import { BaseComponent, css } from './base';
import { store } from '../core/store';

export class StatsPage extends BaseComponent {
  protected render(): string {
    const { rows, totalSessions, avgViewSec } = store.stats();
    const maxSubmit = Math.max(1, ...rows.map((r) => r.submitted));
    const totalDocs = store.docs.length;
    const totalRejected = rows.reduce((a, r) => a + r.rejected, 0);

    // 患者端查看时长分布（分钟桶）
    const buckets = [0, 0, 0, 0, 0]; // <1, 1-3, 3-5, 5-8, >8 分钟
    for (const s of store.sessions) {
      const m = s.durationSec / 60;
      if (m < 1) buckets[0]++;
      else if (m < 3) buckets[1]++;
      else if (m < 5) buckets[2]++;
      else if (m < 8) buckets[3]++;
      else buckets[4]++;
    }
    const maxBucket = Math.max(1, ...buckets);
    const bucketLabels = ['<1 分钟', '1–3 分钟', '3–5 分钟', '5–8 分钟', '>8 分钟'];

    return `
    <style>${css}
      .page { padding: 26px 30px; }
      .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px; }
      .kpi { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; }
      .kpi b { font-size: 28px; color: #4f46e5; display: block; }
      .kpi .muted { margin-top: 4px; }
      .charts { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }
      .chart-card { padding: 18px; }
      .bar-row { display: grid; grid-template-columns: 90px 1fr 64px; align-items: center; gap: 10px; margin: 12px 0; font-size: 13px; }
      .bar-track { background: #f1f5f9; border-radius: 999px; height: 22px; overflow: hidden; position: relative; }
      .bar { height: 100%; border-radius: 999px; background: linear-gradient(90deg,#6366f1,#8b5cf6); }
      .bar.reject { background: linear-gradient(90deg,#f87171,#ef4444); }
      .vbar-wrap { display: flex; align-items: flex-end; gap: 14px; height: 220px; padding: 10px 6px 0; border-bottom: 2px solid #e2e8f0; }
      .vbar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 6px; }
      .vbar { width: 100%; max-width: 56px; background: linear-gradient(180deg,#22d3ee,#3b82f6); border-radius: 8px 8px 0 0; min-height: 2px; }
      .vbar-labels { display: flex; gap: 14px; padding-top: 6px; }
      .vbar-labels span { flex: 1; text-align: center; font-size: 11.5px; color: #64748b; }
      .rate-pill { font-size: 12px; padding: 2px 8px; border-radius: 999px; }
      .rate-high { background: #fee2e2; color: #b91c1c; }
      .rate-mid { background: #fef3c7; color: #b45309; }
      .rate-low { background: #dcfce7; color: #15803d; }
    </style>
    <div class="page">
      <h2>数据统计</h2>
      <p class="muted" style="margin-bottom:20px">统计口径：审核提交量含待审核 / 已通过 / 已退回；查看时长来自病房平板患者端会话。</p>

      <div class="kpis">
        <div class="kpi"><b>${totalDocs}</b><div class="muted">图示总数</div></div>
        <div class="kpi"><b>${totalRejected}</b><div class="muted">累计退回</div></div>
        <div class="kpi"><b>${totalSessions}</b><div class="muted">患者端查看次数</div></div>
        <div class="kpi"><b>${fmtDuration(avgViewSec)}</b><div class="muted">平均查看时长</div></div>
      </div>

      <div class="charts">
        <div class="card chart-card">
          <h3>各医生提交量与退回率</h3>
          <table>
            <thead><tr><th>医师</th><th style="width:38%">提交量</th><th>退回率</th><th>患者平均查看</th></tr></thead>
            <tbody>
              ${rows.map((r) => `
                <tr>
                  <td style="font-weight:700">${r.doctor}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div class="bar-track" style="flex:1"><div class="bar" style="width:${(r.submitted / maxSubmit) * 100}%"></div></div>
                      <span style="width:24px;text-align:right">${r.submitted}</span>
                    </div>
                  </td>
                  <td><span class="rate-pill ${r.rejectRate >= 40 ? 'rate-high' : r.rejectRate >= 20 ? 'rate-mid' : 'rate-low'}">${r.rejectRate}%</span></td>
                  <td>${fmtDuration(r.avgViewSec)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          <p class="muted" style="margin-top:10px">退回率 ≥40% 标红，20–40% 标黄，&lt;20% 标绿，可作为培训与模板优化依据。</p>
        </div>

        <div class="card chart-card">
          <h3>患者端查看时长分布（${totalSessions} 次会话）</h3>
          <div class="vbar-wrap">
            ${buckets.map((n) => `
              <div class="vbar-col">
                <span style="font-size:12px;font-weight:700;color:#334155">${n}</span>
                <div class="vbar" style="height:${(n / maxBucket) * 100}%"></div>
              </div>`).join('')}
          </div>
          <div class="vbar-labels">
            ${bucketLabels.map((l) => `<span>${l}</span>`).join('')}
          </div>
          <h3 style="margin-top:22px">最近会话明细</h3>
          <div style="max-height:180px;overflow:auto">
            <table>
              <tbody>
                ${store.sessions.slice().reverse().map((s) => {
                  const doc = store.docs.find((d) => d.id === s.docId);
                  return `<tr>
                    <td style="font-size:12.5px">${doc?.title ?? '（已删除图示）'}</td>
                    <td style="font-size:12.5px;text-align:right">${fmtDuration(s.durationSec)}</td>
                    <td style="font-size:12px;text-align:right">查看脑区 ${s.regionsOpened.length} 个</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  }
}

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec} 秒`;
  const m = Math.floor(sec / 60);
  const rest = sec % 60;
  return rest ? `${m} 分 ${rest} 秒` : `${m} 分钟`;
}
