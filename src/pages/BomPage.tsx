import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Cable,
  Download,
  FileText,
  MapPin,
  Monitor,
  Printer,
  Ruler,
  Weight,
  Zap,
} from 'lucide-react';
import { HALL } from '../data/hall';
import { libItem } from '../data/library';
import { bomCSV, bomTotals, buildBOM, downloadCanvas, downloadText, topViewCanvas } from '../lib/exporters';
import { fmt } from '../lib/geometry';
import { useApp } from '../store';
import type { Role } from '../types';
import { InfoBanner, Modal, SectionTitle, StatusChip } from '../components/UI';

export function BomPage({ role }: { role: Role }) {
  const devices = useApp((s) => s.devices);
  const pushToast = useApp((s) => s.pushToast);
  const [preview, setPreview] = useState<HTMLCanvasElement | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [includeDraft, setIncludeDraft] = useState(false);

  const canExport = role === 'therapist' || role === 'supervisor';
  const exportable = includeDraft ? devices : devices.filter((d) => d.status !== 'draft');
  const rows = useMemo(() => buildBOM(exportable), [exportable]);
  const totals = useMemo(() => bomTotals(rows), [rows]);
  const drafts = devices.filter((d) => d.status === 'draft').length;

  const doPreview = () => {
    const canvas = topViewCanvas(exportable, {
      title: '康复大厅互动训练展项布置图 · 俯视图',
      subtitle: `${HALL.name}　|　出图日期 ${new Date().toLocaleDateString('zh-CN')}　|　共 ${exportable.length} 个展项`,
      includeZones: true,
      includePower: true,
    });
    setPreview(canvas);
  };

  const doDownloadPlan = () => {
    const canvas = topViewCanvas(exportable, {
      title: '康复大厅互动训练展项布置图 · 俯视图',
      subtitle: `${HALL.name}　|　出图日期 ${new Date().toLocaleDateString('zh-CN')}　|　共 ${exportable.length} 个展项`,
    });
    downloadCanvas(canvas, `康复大厅布置俯视图_${new Date().toISOString().slice(0, 10)}.png`);
    pushToast('俯视图已导出（PNG，含安装点位坐标）', 'success');
  };

  const doDownloadBom = () => {
    downloadText(bomCSV(rows, exportable), `康复大厅物料清单_${new Date().toISOString().slice(0, 10)}.csv`);
    pushToast('物料清单已导出（CSV，含线缆估算与点位坐标）', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" disabled={!canExport} onClick={doPreview}>
          <FileText size={13} /> 预览俯视图
        </button>
        <button className="btn btn-ghost" disabled={!canExport} onClick={doDownloadPlan}>
          <Download size={13} /> 导出俯视图 PNG
        </button>
        <button className="btn btn-ghost" disabled={!canExport} onClick={doDownloadBom}>
          <Download size={13} /> 导出物料清单 CSV
        </button>
        <button className="btn btn-ghost" disabled={!canExport} onClick={() => window.print()}>
          <Printer size={13} /> 打印
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#5d716c', marginLeft: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={includeDraft} onChange={(e) => setIncludeDraft(e.target.checked)} />
          包含 {drafts} 个草稿展项
        </label>
        <div style={{ flex: 1 }} />
        {!canExport && (
          <span className="chip chip-amber">
            <AlertTriangle size={10} /> 审核人身份仅可查看，导出权限归治疗师 / 主管
          </span>
        )}
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <Kpi icon={<Boxes size={12} />} label="设备总台数" value={totals.devices} unit="台" foot={`${totals.kinds} 类设备`} />
        <Kpi icon={<Zap size={12} />} label="预估总功率" value={totals.powerW} unit="W" foot="按单机额定功率累加" />
        <Kpi icon={<Weight size={12} />} label="设备总重" value={Math.round(totals.weightKg)} unit="kg" foot="含全部已建展项" />
        <Kpi icon={<Cable size={12} />} label="线缆估算" value={totals.cableM} unit="m" foot="含 15% 余量，0.5m 取整" />
        <Kpi icon={<MapPin size={12} />} label="安装点位" value={rows.reduce((s, r) => s + r.points.length, 0)} unit="处" foot="均带坐标定位" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', gap: 12 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head">
            <Boxes size={15} color="#0f766e" />
            <div style={{ flex: 1 }}>
              <div className="card-title">物料清单</div>
              <div className="card-sub">设备数量 · 屏幕尺寸 · 线缆长度估算 · 安装点位坐标</div>
            </div>
          </div>
          <div style={{ overflow: 'auto' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 44px 88px 92px 62px 76px',
                gap: 8,
                padding: '8px 15px',
                fontSize: 10,
                fontWeight: 700,
                color: '#9aa9a5',
                textTransform: 'uppercase',
                borderBottom: '1px solid #eef4f2',
                letterSpacing: 0.4,
              }}
            >
              <span>设备型号</span>
              <span style={{ textAlign: 'right' }}>数量</span>
              <span>屏幕尺寸</span>
              <span>外形尺寸</span>
              <span style={{ textAlign: 'right' }}>功率</span>
              <span style={{ textAlign: 'right' }}>线缆</span>
            </div>
            {rows.map((r) => (
              <React.Fragment key={r.key}>
                <button
                  onClick={() => setExpanded(expanded === r.key ? null : r.key)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 44px 88px 92px 62px 76px',
                    gap: 8,
                    alignItems: 'center',
                    width: '100%',
                    padding: '10px 15px',
                    textAlign: 'left',
                    borderBottom: '1px solid #f4f8f7',
                    background: expanded === r.key ? '#f8fbfa' : 'transparent',
                  }}
                >
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                    <span style={{ width: 6, height: 22, borderRadius: 99, background: libItem(r.libId).color, flex: '0 0 auto' }} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {libItem(r.libId).name}
                      </span>
                      <span style={{ fontSize: 9.5, color: '#9aa9a5' }}>
                        {r.mount === 'wall' ? '墙面安装' : '落地安装'} · {r.model.split(' · ')[1]}
                      </span>
                    </span>
                  </span>
                  <span className="mono" style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700 }}>{r.qty}</span>
                  <span className="mono" style={{ fontSize: 10.8, color: r.screen === '—' ? '#cbd5e1' : '#334155' }}>
                    {r.screen}
                  </span>
                  <span className="mono" style={{ fontSize: 10.5, color: '#5d716c' }}>{r.size}</span>
                  <span className="mono" style={{ textAlign: 'right', fontSize: 10.8, color: '#5d716c' }}>{r.powerW * r.qty}W</span>
                  <span className="mono" style={{ textAlign: 'right', fontSize: 10.8, fontWeight: 600, color: '#0f766e' }}>
                    {r.cableM.toFixed(1)}m
                  </span>
                </button>
                {expanded === r.key && (
                  <div style={{ background: '#fbfdfc', padding: '10px 15px 13px', borderBottom: '1px solid #eef4f2' }}>
                    <SectionTitle>安装点位坐标（{r.points.length} 处）</SectionTitle>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {r.points.map((p, i) => {
                        const dev = exportable.find((d) => d.name === p.name);
                        const run = r.cableRuns[i];
                        return (
                          <div
                            key={p.name}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '20px 1fr 108px 1fr 66px',
                              gap: 8,
                              alignItems: 'center',
                              fontSize: 10.8,
                              padding: '5px 8px',
                              background: '#fff',
                              border: '1px solid #eef4f2',
                              borderRadius: 7,
                            }}
                          >
                            <span
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 99,
                                background: '#ecfdf5',
                                color: '#047857',
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: 9,
                                fontWeight: 700,
                              }}
                            >
                              {i + 1}
                            </span>
                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                            <span className="mono" style={{ color: '#0f766e', fontWeight: 600 }}>
                              X {fmt(p.x, 2)} · Z {fmt(p.z, 2)}
                            </span>
                            <span style={{ color: '#7b8f8a', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.note}
                            </span>
                            <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                              <span className="mono" style={{ color: '#5d716c' }}>{run?.len.toFixed(1)}m</span>
                              {dev && <StatusChip status={dev.status} />}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 9, fontSize: 10.3, color: '#7b8f8a' }}>
                      <span>
                        <Cable size={10} style={{ verticalAlign: -1 }} /> 线缆走向：{r.cableRuns[0]?.type}
                      </span>
                      <span>
                        <Ruler size={10} style={{ verticalAlign: -1 }} /> 安装高度：{fmt(r.installHeight, 2)}m
                      </span>
                      <span>
                        <Weight size={10} style={{ verticalAlign: -1 }} /> 总重：{r.weightKg.toFixed(1)}kg
                      </span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
            {rows.length === 0 && (
              <div style={{ padding: 30, textAlign: 'center', color: '#92a5a0', fontSize: 12 }}>
                暂无已建立的展项
              </div>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 44px 88px 92px 62px 76px',
                gap: 8,
                padding: '11px 15px',
                background: '#f8fbfa',
                fontSize: 11.5,
                fontWeight: 700,
                borderTop: '1px solid #eef4f2',
              }}
            >
              <span>合计</span>
              <span className="mono" style={{ textAlign: 'right' }}>{totals.devices}</span>
              <span />
              <span />
              <span className="mono" style={{ textAlign: 'right' }}>{totals.powerW}W</span>
              <span className="mono" style={{ textAlign: 'right', color: '#0f766e' }}>{totals.cableM.toFixed(1)}m</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-head">
              <MapPin size={14} color="#b45309" />
              <div style={{ flex: 1 }}>
                <div className="card-title">线缆估算规则</div>
                <div className="card-sub">按最近配电点计算</div>
              </div>
            </div>
            <div className="card-body" style={{ fontSize: 11, color: '#5d716c', lineHeight: 1.85 }}>
              <div>· 水平距离取展项中心到最近配电点的直线距离</div>
              <div>· 墙面展项加垂直落线（挂高 − 0.3m），落地展项加 1.0m 地槽</div>
              <div>· 附加 0.8m 服务余量，整体乘以 1.15 安全系数</div>
              <div>· 结果按 0.5m 向上取整，含桥架 / 穿管长度</div>
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>展厅配电点</span>
                <b>{HALL.powerPoints.length} 处</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>最长单点线缆</span>
                <b className="mono">
                  {Math.max(0, ...rows.flatMap((r) => r.cableRuns.map((c) => c.len))).toFixed(1)} m
                </b>
              </div>
            </div>
          </div>

          <div className="card" style={{ flex: 1 }}>
            <div className="card-head">
              <Monitor size={14} color="#0891b2" />
              <div className="card-title">屏幕与显示设备</div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {rows
                .filter((r) => r.screen !== '—')
                .map((r) => (
                  <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span
                      style={{
                        width: 30,
                        height: 22,
                        borderRadius: 4,
                        border: '2px solid #0e7490',
                        background: '#ecfeff',
                        flex: '0 0 auto',
                      }}
                    />
                    <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600 }}>{libItem(r.libId).name}</span>
                    <span className="mono" style={{ fontSize: 10.8, color: '#0891b2', fontWeight: 600 }}>
                      {r.screen} × {r.qty}
                    </span>
                  </div>
                ))}
              {rows.filter((r) => r.screen !== '—').length === 0 && (
                <div style={{ fontSize: 11, color: '#9aa9a5' }}>暂无带屏设备</div>
              )}
              <div className="divider" style={{ margin: '4px 0' }} />
              <InfoBanner tone="info">
                俯视图导出为 2 倍分辨率 PNG，含 0.5m 网格、承重分区、配电点、展项编号与中心坐标，可直接用于施工交底。
              </InfoBanner>
            </div>
          </div>
        </div>
      </div>

      {preview && (
        <Modal
          wide
          onClose={() => setPreview(null)}
          title="俯视图预览"
          subtitle={`${HALL.name} · ${exportable.length} 个展项 · ${HALL.width}×${HALL.depth}m`}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setPreview(null)}>
                关闭
              </button>
              <button className="btn btn-primary" onClick={() => (downloadCanvas(preview, `康复大厅布置俯视图_${new Date().toISOString().slice(0, 10)}.png`), pushToast('已导出 PNG', 'success'))}>
                <Download size={13} /> 下载 PNG
              </button>
            </>
          }
        >
          <div
            style={{
              border: '1px solid #eef4f2',
              borderRadius: 10,
              overflow: 'auto',
              maxHeight: '62vh',
              background: '#fff',
            }}
            ref={(el) => {
              if (el && preview && !el.contains(preview)) {
                preview.style.width = '100%';
                preview.style.maxWidth = '100%';
                preview.style.height = 'auto';
                el.appendChild(preview);
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, unit, foot }: { icon: React.ReactNode; label: string; value: number; unit: string; foot: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label">
        {icon} {label}
      </div>
      <div className="kpi-value">
        {value}
        <small>{unit}</small>
      </div>
      <div className="kpi-foot">{foot}</div>
    </div>
  );
}
