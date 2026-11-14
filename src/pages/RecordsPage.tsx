import { useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  Search,
  Target,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react';
import { GAMES, libItem } from '../data/library';
import { PATIENTS, PATIENT_BY_ID } from '../data/people';
import { useApp } from '../store';
import type { DeviceInstance, Role, TrainingRecord } from '../types';
import { EmptyState, Modal, ProgressBar } from '../components/UI';

type GroupBy = 'patient' | 'device' | 'date';

interface AggRow {
  key: string;
  label: string;
  sub: string;
  color: string;
  sessions: number;
  completed: number;
  passed: number;
  passRate: number;
  avgScore: number;
  minutes: number;
  records: TrainingRecord[];
}

export function RecordsPage({ role }: { role: Role }) {
  const records = useApp((s) => s.records);
  const devices = useApp((s) => s.devices);
  const [groupBy, setGroupBy] = useState<GroupBy>('patient');
  const [days, setDays] = useState(7);
  const [patientFilter, setPatientFilter] = useState<string>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [openRow, setOpenRow] = useState<AggRow | null>(null);

  const today = new Date();

  const filtered = useMemo(() => {
    const cutoff = new Date(today.getTime() - (days - 1) * 86400000);
    return records.filter((r) => {
      const d = new Date(r.date);
      if (d < cutoff) return false;
      if (patientFilter !== 'all' && r.patientId !== patientFilter) return false;
      if (deviceFilter !== 'all' && r.deviceId !== deviceFilter) return false;
      if (query.trim()) {
        const p = PATIENT_BY_ID[r.patientId];
        const hay = `${r.deviceName} ${p?.name ?? ''} ${r.date}`.toLowerCase();
        if (!hay.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [records, days, patientFilter, deviceFilter, query]);

  const rows = useMemo<AggRow[]>(() => {
    const map = new Map<string, AggRow>();
    for (const r of filtered) {
      let key: string;
      let label: string;
      let sub: string;
      let color: string;
      if (groupBy === 'patient') {
        const p = PATIENT_BY_ID[r.patientId];
        key = r.patientId;
        label = p ? `${p.name}` : r.patientId;
        sub = p ? `${p.age} 岁 · ${p.goal}` : '';
        color = p?.color ?? '#64748b';
      } else if (groupBy === 'device') {
        const d = devices.find((x) => x.id === r.deviceId);
        key = r.deviceId;
        label = r.deviceName;
        sub = d ? `${libItem(d.libId).name} · ${d.attrs.difficulty}` : '';
        color = d ? libItem(d.libId).color : '#64748b';
      } else {
        key = r.date;
        label = r.date;
        sub = '训练日';
        color = '#0f766e';
      }
      const row =
        map.get(key) ??
        ({
          key,
          label,
          sub,
          color,
          sessions: 0,
          completed: 0,
          passed: 0,
          passRate: 0,
          avgScore: 0,
          minutes: 0,
          records: [],
        } as AggRow);
      row.sessions += 1;
      row.completed += r.completed ? 1 : 0;
      row.passed += r.passed ? 1 : 0;
      row.avgScore += r.score;
      row.minutes += r.durationSec / 60;
      row.records.push(r);
      map.set(key, row);
    }
    for (const row of map.values()) {
      row.passRate = row.sessions === 0 ? 0 : Math.round((row.passed / row.sessions) * 100);
      row.avgScore = row.sessions === 0 ? 0 : Math.round(row.avgScore / row.sessions);
      row.minutes = Math.round(row.minutes);
    }
    return [...map.values()].sort((a, b) => b.sessions - a.sessions);
  }, [filtered, groupBy, devices]);

  const totals = useMemo(() => {
    const s = filtered.length;
    const passed = filtered.filter((r) => r.passed).length;
    const completed = filtered.filter((r) => r.completed).length;
    const avg = s ? Math.round(filtered.reduce((acc, r) => acc + r.score, 0) / s) : 0;
    const minutes = Math.round(filtered.reduce((acc, r) => acc + r.durationSec / 60, 0));
    return { sessions: s, passed, completed, passRate: s ? Math.round((passed / s) * 100) : 0, avg, minutes };
  }, [filtered]);

  const byDate = useMemo(() => {
    const arr: { date: string; sessions: number; passed: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const rs = filtered.filter((r) => r.date === iso);
      arr.push({ date: iso, sessions: rs.length, passed: rs.filter((r) => r.passed).length });
    }
    return arr;
  }, [filtered, days, today]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi">
          <div className="kpi-label">
            <ClipboardList size={12} /> 完成场次
          </div>
          <div className="kpi-value">
            {totals.completed}
            <small>/ {totals.sessions} 场</small>
          </div>
          <div className="kpi-foot">近 {days} 天 · 完成率 {totals.sessions ? Math.round((totals.completed / totals.sessions) * 100) : 0}%</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <Target size={12} /> 达标率
          </div>
          <div className="kpi-value" style={{ color: totals.passRate >= 60 ? '#0f766e' : '#b45309' }}>
            {totals.passRate}
            <small>%</small>
          </div>
          <div className="kpi-foot">{totals.passed} 场达标 / {totals.sessions} 场</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <TrendingUp size={12} /> 平均得分
          </div>
          <div className="kpi-value">
            {totals.avg}
            <small>分</small>
          </div>
          <div className="kpi-foot">按展项阈值判定达标</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <Clock size={12} /> 累计训练时长
          </div>
          <div className="kpi-value">
            {totals.minutes}
            <small>分钟</small>
          </div>
          <div className="kpi-foot">{PATIENTS.length} 名在册患者</div>
        </div>
      </div>

      <div className="card" style={{ padding: '11px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="seg">
          {(
            [
              ['patient', '按患者'],
              ['device', '按展项'],
              ['date', '按日期'],
            ] as [GroupBy, string][]
          ).map(([k, label]) => (
            <button key={k} className={groupBy === k ? 'on' : ''} onClick={() => setGroupBy(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="seg">
          {[7, 14, 30].map((n) => (
            <button key={n} className={days === n ? 'on' : ''} onClick={() => setDays(n)}>
              近 {n} 天
            </button>
          ))}
        </div>
        <select className="select" style={{ width: 132 }} value={patientFilter} onChange={(e) => setPatientFilter(e.target.value)}>
          <option value="all">全部患者</option>
          {PATIENTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}（{p.age} 岁）
            </option>
          ))}
        </select>
        <select className="select" style={{ width: 168 }} value={deviceFilter} onChange={(e) => setDeviceFilter(e.target.value)}>
          <option value="all">全部展项</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: 10, color: '#9aa9a5' }} />
          <input
            className="input"
            style={{ width: 190, paddingLeft: 27 }}
            placeholder="搜索患者 / 展项 / 日期"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 12 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head">
            <div style={{ flex: 1 }}>
              <div className="card-title">
                训练汇总 · {groupBy === 'patient' ? '患者' : groupBy === 'device' ? '展项' : '日期'}
              </div>
              <div className="card-sub">达标率 = 达标场次 / 完成场次 · 点击行查看明细</div>
            </div>
           <span className="chip chip-neutral">{rows.length} 组</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState title="所选范围内没有训练记录" hint="调整时间范围或筛选条件试试" icon={<ClipboardList size={26} color="#c7d6d2" />} />
          ) : (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 78px 78px 110px 74px',
                  gap: 8,
                  padding: '8px 15px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  color: '#9aa9a5',
                  borderBottom: '1px solid #eef4f2',
                  textTransform: 'uppercase',
                }}
              >
                <span>{groupBy === 'patient' ? '患者' : groupBy === 'device' ? '展项' : '日期'}</span>
                <span style={{ textAlign: 'right' }}>场次</span>
                <span style={{ textAlign: 'right' }}>达标</span>
                <span>达标率</span>
                <span style={{ textAlign: 'right' }}>均分</span>
              </div>
              {rows.map((row) => (
                <button
                  key={row.key}
                  onClick={() => setOpenRow(row)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 78px 78px 110px 74px',
                    gap: 8,
                    padding: '11px 15px',
                    width: '100%',
                    alignItems: 'center',
                    textAlign: 'left',
                    borderBottom: '1px solid #f4f8f7',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fbfa')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ display: 'flex', gap: 9, alignItems: 'center', minWidth: 0 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 99,
                        background: `${row.color}18`,
                        color: row.color,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        flex: '0 0 auto',
                      }}
                    >
                      {groupBy === 'date' ? <CalendarDays size={13} /> : row.label.slice(0, 1)}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 12.3,
                          fontWeight: 650,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row.label}
                      </span>
                      <span style={{ display: 'block', fontSize: 10, color: '#9aa9a5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.sub}
                      </span>
                    </span>
                  </span>
                  <span className="mono" style={{ textAlign: 'right', fontSize: 12, fontWeight: 600 }}>{row.sessions}</span>
                  <span className="mono" style={{ textAlign: 'right', fontSize: 12, color: '#0f766e', fontWeight: 600 }}>{row.passed}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ProgressBar
                      value={row.passRate}
                      height={5}
                      color={row.passRate >= 70 ? '#0d9488' : row.passRate >= 45 ? '#f59e0b' : '#ef4444'}
                    />
                    <span className="mono" style={{ fontSize: 10.5, fontWeight: 600, color: '#5d716c', flex: '0 0 30px' }}>
                      {row.passRate}%
                    </span>
                  </span>
                  <span className="mono" style={{ textAlign: 'right', fontSize: 12, fontWeight: 600 }}>{row.avgScore}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-head">
              <Activity size={14} color="#0f766e" />
              <div style={{ flex: 1 }}>
                <div className="card-title">每日达标走势</div>
                <div className="card-sub">柱高为当日场次，绿色为达标部分</div>
              </div>
            </div>
            <div className="card-body" style={{ paddingTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 96 }}>
                {byDate.map((d) => {
                  const max = Math.max(1, ...byDate.map((x) => x.sessions));
                  const h = (d.sessions / max) * 82;
                  const ph = d.sessions ? (d.passed / d.sessions) * h : 0;
                  return (
                    <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} title={`${d.date} · ${d.passed}/${d.sessions} 达标`}>
                      <div style={{ width: '100%', height: 82, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 1 }}>
                        <div style={{ height: `${Math.max(0, h - ph)}px`, width: '100%', background: '#fbbf24', borderRadius: '3px 3px 0 0' }} />
                        <div style={{ height: `${ph}px`, width: '100%', background: '#0d9488' }} />
                        <div style={{ height: 2, width: '100%', background: '#e2ece9' }} />
                      </div>
                      <span style={{ fontSize: 8.5, color: '#9aa9a5', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{d.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card" style={{ flex: 1 }}>
            <div className="card-head">
              <UserRound size={14} color="#7c3aed" />
              <div className="card-title">患者达标概览</div>
            </div>
            <div style={{ padding: '6px 14px 12px' }}>
              {PATIENTS.map((p) => {
                const rs = filtered.filter((r) => r.patientId === p.id);
                const pr = rs.length ? Math.round((rs.filter((r) => r.passed).length / rs.length) * 100) : 0;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0' }}>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 99,
                        background: `${p.color}20`,
                        color: p.color,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 10.5,
                        fontWeight: 700,
                        flex: '0 0 auto',
                      }}
                    >
                      {p.name.slice(0, 1)}
                    </span>
                    <span style={{ flex: '0 0 52px', fontSize: 11.5, fontWeight: 600 }}>{p.name}</span>
                    <span style={{ flex: 1 }}>
                      <ProgressBar value={pr} height={4} color={p.color} />
                    </span>
                    <span className="mono" style={{ flex: '0 0 62px', textAlign: 'right', fontSize: 10.5, color: '#7b8f8a' }}>
                      {rs.filter((r) => r.passed).length}/{rs.length} · {pr}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {openRow && (
        <RecordsDetail row={openRow} groupBy={groupBy} devices={devices} onClose={() => setOpenRow(null)} />
      )}
    </div>
  );
}

function RecordsDetail({
  row,
  groupBy,
  devices,
  onClose,
}: {
  row: AggRow;
  groupBy: GroupBy;
  devices: DeviceInstance[];
  onClose: () => void;
}) {
  return (
    <Modal
      wide
      onClose={onClose}
      title={`${row.label} · 训练明细`}
      subtitle={`${row.sub} · 共 ${row.sessions} 场，${row.passed} 场达标（${row.passRate}%），平均 ${row.avgScore} 分，累计 ${row.minutes} 分钟`}
      footer={
        <button className="btn btn-ghost" onClick={onClose}>
          关闭
        </button>
      }
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <span className="chip chip-teal">
          <Check size={10} /> 达标 {row.passed}
        </span>
        <span className="chip chip-amber">
          <X size={10} /> 未达标 {row.sessions - row.passed}
        </span>
        <span className="chip chip-neutral">
          <Clock size={10} /> 完成 {row.completed}/{row.sessions}
        </span>
      </div>
      <div style={{ overflow: 'auto', maxHeight: 420 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '78px 1fr 1fr 52px 62px 76px',
            gap: 8,
            fontSize: 10,
            fontWeight: 700,
            color: '#9aa9a5',
            padding: '6px 4px',
            borderBottom: '1px solid #eef4f2',
            textTransform: 'uppercase',
          }}
        >
          <span>日期</span>
          <span>患者</span>
          <span>展项</span>
          <span style={{ textAlign: 'right' }}>得分</span>
          <span style={{ textAlign: 'right' }}>时长</span>
          <span style={{ textAlign: 'right' }}>结果</span>
        </div>
        {row.records
          .slice()
          .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
          .map((r) => {
            const p = PATIENT_BY_ID[r.patientId];
            const game = GAMES.find((g) => g.id === r.gameId);
            return (
              <div
                key={r.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '78px 1fr 1fr 52px 62px 76px',
                  gap: 8,
                  alignItems: 'center',
                  padding: '8px 4px',
                  borderBottom: '1px solid #f6f9f8',
                  fontSize: 11.3,
                }}
              >
                <span className="mono" style={{ color: '#5d716c' }}>{r.date.slice(5)}</span>
                <span style={{ display: 'flex', gap: 5, alignItems: 'center', minWidth: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: p?.color, flex: '0 0 auto' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.name ?? r.patientId}</span>
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.deviceName}</span>
                  <span style={{ fontSize: 9.5, color: '#9aa9a5' }}>{game?.name ?? r.gameId}</span>
                </span>
                <span className="mono" style={{ textAlign: 'right', fontWeight: 700, color: r.passed ? '#0f766e' : '#b45309' }}>
                  {r.score}
                  <span style={{ fontSize: 9, color: '#9aa9a5', fontWeight: 500 }}>/{r.threshold}</span>
                </span>
                <span className="mono" style={{ textAlign: 'right', color: '#5d716c' }}>
                  {Math.round(r.durationSec / 60)}/{Math.round(r.plannedSec / 60)}′
                </span>
                <span style={{ textAlign: 'right' }}>
                  <span className={`chip ${r.passed ? 'chip-approved' : 'chip-amber'}`} style={{ height: 18, fontSize: 9.8 }}>
                    {r.passed ? '达标' : '未达标'}
                  </span>
                </span>
              </div>
            );
          })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 10.8, color: '#9aa9a5' }}>
        <ChevronRight size={12} /> 得分 / 该展项达标阈值 · 时长 实际/计划（分钟）{groupBy === 'device' && ` · ${devices.length} 个展项已建`}
      </div>
    </Modal>
  );
}
