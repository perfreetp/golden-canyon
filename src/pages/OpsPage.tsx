import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Check,
  Clock,
  Gauge,
  Layers,
  Timer,
  TrendingUp,
  UserRound,
  Users,
  Zap,
} from 'lucide-react';
import { HALL } from '../data/hall';
import { libItem } from '../data/library';
import { PATIENTS, PATIENT_BY_ID } from '../data/people';
import { fmt, zoneFor, zoneLoad } from '../lib/geometry';
import { useApp } from '../store';
import type { DeviceInstance, Role } from '../types';
import { InfoBanner, ProgressBar, StatusChip } from '../components/UI';
import { fmtTime } from './ReviewPage';

export function OpsPage({ role }: { role: Role }) {
  const devices = useApp((s) => s.devices);
  const records = useApp((s) => s.records);
  const queue = useApp((s) => s.queue);
  const leaveQueue = useApp((s) => s.leaveQueue);
  const pushToast = useApp((s) => s.pushToast);
  const [tab, setTab] = useState<'usage' | 'queue' | 'zones'>('usage');

  const approved = devices.filter((d) => d.status === 'approved');
  const today = new Date().toISOString().slice(0, 10);

  const usage = useMemo(() => {
    return devices.map((d) => {
      const rs = records.filter((r) => r.deviceId === d.id);
      const todayRs = rs.filter((r) => r.date === today);
      const cap = d.attrs.dailyCap;
      const usedToday = todayRs.length;
      const last7 = rs.filter((r) => new Date(r.date) >= new Date(Date.now() - 7 * 86400000));
      const capacity7 = cap * 7;
      const rate = capacity7 ? Math.min(100, Math.round((last7.length / capacity7) * 100)) : 0;
      const minutes = rs.reduce((s, r) => s + r.durationSec / 60, 0);
      const utilMin = last7.reduce((s, r) => s + r.durationSec / 60, 0);
      return {
        device: d,
        sessions: rs.length,
        today: usedToday,
        cap,
        rate,
        minutes: Math.round(minutes),
        utilMin: Math.round(utilMin),
        queue: queue.filter((q) => q.deviceId === d.id),
        passRate: rs.length ? Math.round((rs.filter((r) => r.passed).length / rs.length) * 100) : 0,
        open: d.status === 'approved',
      };
    });
  }, [devices, records, queue, today]);

  const totalQueue = queue.length;
  const avgWait = queue.length ? Math.round(queue.reduce((s, q) => s + q.estimatedMin, 0) / queue.length) : 0;
  const activeDevices = approved.filter((d) => queue.some((q) => q.deviceId === d.id)).length;
  const totalUtil = Math.round(usage.reduce((s, u) => s + u.utilMin, 0));
  const overallRate = usage.filter((u) => u.open).length
    ? Math.round(usage.filter((u) => u.open).reduce((s, u) => s + u.rate, 0) / usage.filter((u) => u.open).length)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div className="seg">
          {(
            [
              ['usage', '展项使用率'],
              ['queue', '排队情况'],
              ['zones', '承重分区'],
            ] as [typeof tab, string][]
          ).map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span className="chip chip-neutral">
          <Clock size={10} /> 数据更新至 {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="chip chip-teal">
          <Gauge size={10} /> 整体使用率 {overallRate}%
        </span>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="kpi">
          <div className="kpi-label">
            <BarChart3 size={12} /> 开放展项
          </div>
          <div className="kpi-value">
            {approved.length}
            <small>/ {devices.length}</small>
          </div>
          <div className="kpi-foot">{devices.filter((d) => d.status === 'pending').length} 个待审核</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <TrendingUp size={12} /> 近 7 日使用率
          </div>
          <div className="kpi-value" style={{ color: overallRate > 70 ? '#b45309' : '#0f766e' }}>
            {overallRate}
            <small>%</small>
          </div>
          <div className="kpi-foot">按每日场次上限折算</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <Users size={12} /> 排队人数
          </div>
          <div className="kpi-value">{totalQueue}<small>人</small></div>
          <div className="kpi-foot">{activeDevices} 个展项有排队</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <Timer size={12} /> 平均等待
          </div>
          <div className="kpi-value" style={{ color: avgWait > 20 ? '#b45309' : '#0b2b27' }}>
            {avgWait}
            <small>分钟</small>
          </div>
          <div className="kpi-foot">含正在进行场次</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <Activity size={12} /> 近 7 日训练量
          </div>
          <div className="kpi-value">
            {totalUtil}
            <small>分钟</small>
          </div>
          <div className="kpi-foot">累计 {records.length} 场记录</div>
        </div>
      </div>

      {tab === 'usage' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 12 }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-head">
              <BarChart3 size={15} color="#0f766e" />
              <div style={{ flex: 1 }}>
                <div className="card-title">各展项使用率</div>
                <div className="card-sub">使用率 = 近 7 日实际场次 /（每日上限 × 7）</div>
              </div>
            </div>
            <div>
              {usage
                .slice()
                .sort((a, b) => b.rate - a.rate)
                .map((u) => {
                  const lib = libItem(u.device.libId);
                  const hot = u.rate >= 75;
                  return (
                    <div key={u.device.id} style={{ padding: '11px 15px', borderBottom: '1px solid #f4f8f7' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                        <span style={{ width: 6, height: 20, borderRadius: 99, background: lib.color, flex: '0 0 auto' }} />
                        <span style={{ fontSize: 12.2, fontWeight: 650, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.device.name}
                        </span>
                        <StatusChip status={u.device.status} />
                        {hot && <span className="chip chip-amber">热门</span>}
                        {!u.open && <span className="chip chip-neutral">未开放</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar
                            value={u.open ? u.rate : 0}
                            color={hot ? '#f59e0b' : lib.color}
                            height={7}
                          />
                        </div>
                        <span className="mono" style={{ fontSize: 11, fontWeight: 700, flex: '0 0 40px', textAlign: 'right' }}>
                          {u.open ? `${u.rate}%` : '—'}
                        </span>
                        <span className="mono" style={{ fontSize: 10, color: '#9aa9a5', flex: '0 0 96px', textAlign: 'right' }}>
                          今日 {u.today}/{u.cap} 场
                        </span>
                        <span className="mono" style={{ fontSize: 10, color: '#9aa9a5', flex: '0 0 70px', textAlign: 'right' }}>
                          排队 {u.queue.length}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card">
              <div className="card-head">
                <UserRound size={14} color="#7c3aed" />
                <div className="card-title">患者活跃度</div>
              </div>
              <div style={{ padding: '4px 14px 12px' }}>
                {PATIENTS.map((p) => {
                  const rs = records.filter((r) => r.patientId === p.id);
                  const last7 = rs.filter((r) => new Date(r.date) >= new Date(Date.now() - 7 * 86400000));
                  const max = Math.max(1, ...PATIENTS.map((x) => records.filter((r) => r.patientId === x.id && new Date(r.date) >= new Date(Date.now() - 7 * 86400000)).length));
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 99,
                          background: `${p.color}20`,
                          color: p.color,
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 10,
                          fontWeight: 700,
                          flex: '0 0 auto',
                        }}
                      >
                        {p.name.slice(0, 1)}
                      </span>
                      <span style={{ flex: '0 0 46px', fontSize: 11.3, fontWeight: 600 }}>{p.name}</span>
                      <span style={{ flex: 1 }}>
                        <ProgressBar value={(last7.length / max) * 100} height={4} color={p.color} />
                      </span>
                      <span className="mono" style={{ flex: '0 0 46px', textAlign: 'right', fontSize: 10.3, color: '#7b8f8a' }}>
                        {last7.length} 场
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ flex: 1 }}>
              <div className="card-head">
                <Zap size={14} color="#b45309" />
                <div className="card-title">运营提示</div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {usage.filter((u) => u.open && u.rate >= 75).length > 0 && (
                  <TipRow tone="warn" text={`${usage.filter((u) => u.open && u.rate >= 75).length} 个展项使用率超过 75%，建议增配同类设备或延长开放时段。`} />
                )}
                {usage.filter((u) => u.open && u.rate < 25).length > 0 && (
                  <TipRow tone="info" text={`${usage.filter((u) => u.open && u.rate < 25).length} 个展项使用率低于 25%，可调整训练难度或推送至患者端轮播。`} />
                )}
                {devices.filter((d) => d.status === 'pending').length > 0 && (
                  <TipRow tone="warn" text={`${devices.filter((d) => d.status === 'pending').length} 个展项待审核，审核通过后可分流排队压力。`} />
                )}
                {devices.filter((d) => d.status === 'rejected').length > 0 && (
                  <TipRow tone="danger" text={`${devices.filter((d) => d.status === 'rejected').length} 个展项被退回，需治疗师调整后重新提交。`} />
                )}
                <TipRow tone="success" text={`今日已完成 ${records.filter((r) => r.date === today).length} 场训练，达标 ${records.filter((r) => r.date === today && r.passed).length} 场。`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'queue' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          {devices
            .filter((d) => d.status === 'approved')
            .map((d) => {
              const qs = queue.filter((q) => q.deviceId === d.id);
              const lib = libItem(d.libId);
              return (
                <div key={d.id} className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ height: 4, background: lib.color }} />
                  <div className="card-head" style={{ paddingBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="card-title" style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.name}
                      </div>
                      <div className="card-sub">
                        {d.attrs.durationMin} 分钟/场 · 日限 {d.attrs.dailyCap} 场
                      </div>
                    </div>
                    <span className={`chip ${qs.length ? 'chip-amber' : 'chip-approved'}`}>{qs.length ? `${qs.length} 人排队` : '空闲'}</span>
                  </div>
                  <div style={{ padding: '4px 13px 12px', minHeight: 70 }}>
                    {qs.length === 0 ? (
                      <div style={{ fontSize: 11, color: '#a3b3af', padding: '12px 0' }}>暂无排队，可直接开始训练</div>
                    ) : (
                      qs
                        .slice()
                        .sort((a, b) => (a.joinedAt > b.joinedAt ? 1 : -1))
                        .map((q, i) => {
                          const p = PATIENT_BY_ID[q.patientId];
                          return (
                            <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0' }}>
                              <span
                                style={{
                                  width: 17,
                                  height: 17,
                                  borderRadius: 99,
                                  background: i === 0 ? '#fffbeb' : '#f4f8f7',
                                  color: i === 0 ? '#b45309' : '#7b8f8a',
                                  fontSize: 9,
                                  fontWeight: 700,
                                  display: 'grid',
                                  placeItems: 'center',
                                  flex: '0 0 auto',
                                }}
                              >
                                {i + 1}
                              </span>
                              <span style={{ flex: 1, fontSize: 11.3, fontWeight: 500 }}>
                                {p?.name ?? q.patientId}
                                <span style={{ fontSize: 9.5, color: '#9aa9a5', marginLeft: 4 }}>{p?.age}岁</span>
                              </span>
                              <span className="mono" style={{ fontSize: 10, color: '#9aa9a5' }}>{fmtTime(q.joinedAt)}</span>
                              <span className="mono" style={{ fontSize: 10, color: i === 0 ? '#b45309' : '#7b8f8a', fontWeight: 600 }}>
                                ~{q.estimatedMin}′
                              </span>
                              {role === 'supervisor' && (
                                <button
                                  className="icon-btn"
                                  style={{ width: 20, height: 20 }}
                                  title="移出队列"
                                  onClick={() => {
                                    leaveQueue(q.id);
                                    pushToast(`已将 ${p?.name ?? '患者'} 移出排队`, 'info');
                                  }}
                                >
                                  <Check size={11} />
                                </button>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              );
            })}
          {devices.filter((d) => d.status === 'approved').length === 0 && (
            <div className="card" style={{ padding: 40, gridColumn: '1 / -1', textAlign: 'center', color: '#92a5a0' }}>
              暂无已开放展项
            </div>
          )}
        </div>
      )}

      {tab === 'zones' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
          <div className="card">
            <div className="card-head">
              <Layers size={15} color="#0f766e" />
              <div style={{ flex: 1 }}>
                <div className="card-title">承重分区负载</div>
                <div className="card-sub">按落位展项设备重量统计，超限将影响结构安全</div>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {HALL.zones.map((z) => {
                const load = zoneLoad(devices, z.id);
                const pct = Math.min(100, (load / z.capacity) * 100);
                const over = load > z.capacity;
                const count = devices.filter((d) => zoneFor({ x: d.x, z: d.z, w: d.w, d: d.d, rot: d.rot })?.id === z.id).length;
                return (
                  <div key={z.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 650 }}>
                        {z.name}
                        <span style={{ fontSize: 10, color: '#9aa9a5', fontWeight: 500, marginLeft: 6 }}>{count} 个展项</span>
                      </span>
                      <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: over ? '#dc2626' : pct > 75 ? '#b45309' : '#0f766e' }}>
                        {load} / {z.capacity} kg
                      </span>
                    </div>
                    <ProgressBar value={pct} height={7} color={over ? '#dc2626' : pct > 75 ? '#f59e0b' : '#0d9488'} />
                    {over && (
                      <div style={{ fontSize: 10.3, color: '#dc2626', marginTop: 4, display: 'flex', gap: 4, alignItems: 'center' }}>
                        <AlertTriangle size={10} /> 超出分区承重上限 {(load - z.capacity).toFixed(0)}kg，请移出部分展项
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <Layers size={14} color="#0891b2" />
              <div className="card-title">分区展项明细</div>
            </div>
            <div style={{ maxHeight: 460, overflow: 'auto', padding: '4px 14px 12px' }}>
              {HALL.zones.map((z) => {
                const list = devices.filter((d) => zoneFor({ x: d.x, z: d.z, w: d.w, d: d.d, rot: d.rot })?.id === z.id);
                if (list.length === 0) return null;
                return (
                  <div key={z.id} style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9aa9a5', letterSpacing: 0.6, marginBottom: 4 }}>
                      {z.name}
                    </div>
                    {list.map((d) => (
                      <div key={d.id} style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 11, padding: '3px 0' }}>
                        <span style={{ width: 5, height: 5, borderRadius: 99, background: libItem(d.libId).color }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                        <span className="mono" style={{ color: '#9aa9a5', fontSize: 10 }}>
                          ({fmt(d.x, 1)},{fmt(d.z, 1)})
                        </span>
                        <span className="mono" style={{ color: '#7b8f8a', fontSize: 10 }}>{libItem(d.libId).weightKg}kg</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <InfoBanner tone="info">
        <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <BarChart3 size={12} /> 运营数据由患者端训练记录实时汇总；排队来自患者端取号，主管可移除异常排队。
        </span>
      </InfoBanner>
    </div>
  );
}

function TipRow({ tone, text }: { tone: 'warn' | 'info' | 'danger' | 'success'; text: string }) {
  const map = {
    warn: { bg: '#fffbeb', color: '#92400e', border: '#fde68a', icon: <AlertTriangle size={12} /> },
    info: { bg: '#f0f9ff', color: '#075985', border: '#bae6fd', icon: <Activity size={12} /> },
    danger: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', icon: <AlertTriangle size={12} /> },
    success: { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', icon: <Check size={12} /> },
  }[tone];
  return (
    <div
      style={{
        display: 'flex',
        gap: 7,
        alignItems: 'flex-start',
        padding: '8px 10px',
        borderRadius: 8,
        background: map.bg,
        color: map.color,
        border: `1px solid ${map.border}`,
        fontSize: 11,
        lineHeight: 1.55,
      }}
    >
      <span style={{ flex: '0 0 auto', marginTop: 1 }}>{map.icon}</span>
      {text}
    </div>
  );
}

export type { DeviceInstance };
