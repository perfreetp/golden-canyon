import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Gamepad2,
  Lock,
  Send,
  Shield,
  Target,
  Timer,
  Users,
} from 'lucide-react';
import { GAMES, gamesForKind, libItem } from '../data/library';
import { useApp } from '../store';
import type { DeviceInstance, Role } from '../types';
import { InfoBanner, SectionTitle, StatusChip } from '../components/UI';

export function ContentPage({ role }: { role: Role }) {
  const devices = useApp((s) => s.devices);
  const updateContent = useApp((s) => s.updateContent);
  const updateAttrs = useApp((s) => s.updateAttrs);
  const submitForReview = useApp((s) => s.submitForReview);
  const [selId, setSelId] = useState<string | null>(devices.find((d) => d.status !== 'approved')?.id ?? devices[0]?.id ?? null);

  const editable = role === 'therapist';
  const selected = devices.find((d) => d.id === selId) ?? null;
  const bound = selected ? gamesForKind(selected.libId) : [];

  const unbound = devices.filter((d) => !d.content.gameId);

  return (
    <div style={{ display: 'flex', gap: 14, minHeight: 0 }}>
      <aside style={{ width: 300, flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head">
            <div style={{ flex: 1 }}>
              <div className="card-title">展项内容</div>
              <div className="card-sub">{devices.length} 个展项 · {unbound.length} 个未绑定游戏</div>
            </div>
          </div>
          <div style={{ maxHeight: 460, overflow: 'auto', padding: '6px 7px' }}>
            {devices.map((d) => {
              const lib = libItem(d.libId);
              const game = GAMES.find((g) => g.id === d.content.gameId);
              return (
                <button
                  key={d.id}
                  onClick={() => setSelId(d.id)}
                  style={{
                    display: 'flex',
                    gap: 9,
                    alignItems: 'center',
                    width: '100%',
                    padding: '9px 9px',
                    borderRadius: 10,
                    textAlign: 'left',
                    background: selId === d.id ? '#f0faf7' : 'transparent',
                    border: selId === d.id ? '1px solid #c9f0e4' : '1px solid transparent',
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      width: 4,
                      height: 30,
                      borderRadius: 99,
                      background: game ? lib.color : '#e11d48',
                      flex: '0 0 auto',
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
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
                      {d.name}
                    </span>
                    <span style={{ fontSize: 10.5, color: game ? '#7b8f8a' : '#e11d48' }}>
                      {game ? `${game.name} · 阈值 ${d.content.threshold}%` : '未绑定游戏'}
                    </span>
                  </span>
                  <StatusChip status={d.status} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-head" style={{ padding: '11px 14px' }}>
            <div className="card-title" style={{ fontSize: 12.5 }}>
              可用训练小游戏库
            </div>
            <span className="chip chip-neutral" style={{ marginLeft: 'auto' }}>
              {GAMES.length} 款
            </span>
          </div>
          <div style={{ maxHeight: 260, overflow: 'auto', padding: '6px 10px 10px' }}>
            {GAMES.map((g) => {
              const count = devices.filter((d) => d.content.gameId === g.id).length;
              return (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px' }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: g.color,
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      flex: '0 0 auto',
                    }}
                  >
                    <Gamepad2 size={11} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, display: 'block' }}>{g.name}</span>
                    <span style={{ fontSize: 10, color: '#9aa9a5' }}>
                      {g.metric} · {g.minutes} 分钟
                    </span>
                  </span>
                  <span className="mono" style={{ fontSize: 10.5, color: '#7b8f8a' }}>
                    ×{count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {selected ? (
          <>
            <ContentEditor
              device={selected}
              editable={editable}
              games={bound}
              onContent={(patch) => updateContent(selected.id, patch)}
              onAttrs={(patch) => updateAttrs(selected.id, patch)}
              onSubmit={() => submitForReview(selected.id)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <ReleaseRules device={selected} />
              <GamePreview gameId={selected.content.gameId} threshold={selected.content.threshold} device={selected} />
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: 40, color: '#92a5a0' }}>
            请选择左侧展项以配置内容
          </div>
        )}
      </section>
    </div>
  );
}

function ContentEditor({
  device,
  editable,
  games,
  onContent,
  onAttrs,
  onSubmit,
}: {
  device: DeviceInstance;
  editable: boolean;
  games: ReturnType<typeof gamesForKind>;
  onContent: (patch: Partial<DeviceInstance['content']>) => void;
  onAttrs: (patch: Partial<DeviceInstance['attrs']>) => void;
  onSubmit: () => void;
}) {
  const lib = libItem(device.libId);
  const game = GAMES.find((g) => g.id === device.content.gameId);

  return (
    <div className="card">
      <div className="card-head">
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: lib.color,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            flex: '0 0 auto',
          }}
        >
          <Gamepad2 size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {device.name} <StatusChip status={device.status} />
          </div>
          <div className="card-sub">
            {lib.name} · {lib.mount === 'wall' ? '墙面安装' : '落地安装'} · 承重分区 {device.attrs.bodyParts.join(' / ')}
          </div>
        </div>
        <button
          className="btn btn-primary"
          disabled={!editable || !game || device.status === 'pending'}
          onClick={onSubmit}
          title={!editable ? '仅治疗师可提交' : device.status === 'pending' ? '审核中' : undefined}
        >
          <Send size={13} /> {device.status === 'pending' ? '审核中' : '提交审核'}
        </button>
      </div>

      <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <SectionTitle>训练小游戏绑定</SectionTitle>
          {games.length === 0 && (
            <InfoBanner tone="warn">该设备类型暂无可绑定的小游戏，请先在内容库中新增。</InfoBanner>
          )}
          {games.map((g) => {
            const on = g.id === device.content.gameId;
            return (
              <button
                key={g.id}
                disabled={!editable}
                onClick={() => onContent({ gameId: on ? null : g.id, threshold: g.threshold })}
                style={{
                  display: 'flex',
                  gap: 11,
                  alignItems: 'center',
                  textAlign: 'left',
                  padding: '11px 12px',
                  borderRadius: 11,
                  border: on ? `1.5px solid ${g.color}` : '1px solid #e8f0ee',
                  background: on ? `${g.color}0d` : '#fff',
                  cursor: editable ? 'pointer' : 'not-allowed',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: g.color,
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    flex: '0 0 auto',
                  }}
                >
                  <Gamepad2 size={16} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12.8, fontWeight: 700 }}>
                    {g.name}
                    <span style={{ fontSize: 10.5, fontWeight: 500, color: '#869894', marginLeft: 6 }}>{g.tagline}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: 10.8, color: '#6d807b', lineHeight: 1.5, marginTop: 2 }}>
                    {g.description}
                  </span>
                  <span style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                    <span className="chip chip-neutral" style={{ height: 19, fontSize: 9.8 }}>
                      <Target size={9} /> {g.metric}
                    </span>
                    <span className="chip chip-neutral" style={{ height: 19, fontSize: 9.8 }}>
                      <Timer size={9} /> 建议 {g.minutes} 分钟
                    </span>
                    <span className="chip chip-neutral" style={{ height: 19, fontSize: 9.8 }}>
                      基准阈值 {g.threshold}%
                    </span>
                  </span>
                </span>
                {on && (
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 99,
                      background: g.color,
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      flex: '0 0 auto',
                    }}
                  >
                    <Check size={11} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SectionTitle>达标与时长</SectionTitle>
          <div
            style={{
              padding: '13px 14px',
              borderRadius: 11,
              background: game ? `${game.color}0f` : '#f7faf9',
              border: `1px solid ${game ? `${game.color}33` : '#e8f0ee'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 11.5, color: '#5d716c', fontWeight: 600 }}>
                达标阈值 · {game?.metric ?? '得分'}
              </span>
              <span className="mono" style={{ fontSize: 24, fontWeight: 750, letterSpacing: -0.8, color: game?.color ?? '#0b2b27' }}>
                {device.content.threshold}
                <span style={{ fontSize: 12, marginLeft: 2 }}>%</span>
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={95}
              step={5}
              value={device.content.threshold}
              disabled={!editable || !game}
              onChange={(e) => onContent({ threshold: Number(e.target.value) })}
              style={{ width: '100%', accentColor: game?.color ?? '#0f766e', marginTop: 6 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.8, color: '#9aa9a5', marginTop: 2 }}>
              <span>宽松 30%</span>
              <span>严格 95%</span>
            </div>
            {game && device.content.threshold < 50 && (
              <div style={{ fontSize: 10.5, color: '#b45309', marginTop: 7, display: 'flex', gap: 4, alignItems: 'center' }}>
                <AlertTriangle size={11} /> 阈值偏低，康复效果可能无法体现
              </div>
            )}
          </div>

          <div className="field">
            <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>单次训练时长</span>
              <span className="mono" style={{ color: '#0f766e' }}>{device.attrs.durationMin} 分钟</span>
            </label>
            <input
              type="range"
              min={3}
              max={30}
              step={1}
              value={device.attrs.durationMin}
              disabled={!editable}
              onChange={(e) => onAttrs({ durationMin: Number(e.target.value) })}
              style={{ accentColor: '#0f766e' }}
            />
            <div className="field-hint">训练满该时长后自动结束并生成训练小结</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            <div className="field">
              <label className="field-label">适用年龄</label>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <input
                  type="number"
                  className="input mono"
                  value={device.attrs.ageMin}
                  disabled={!editable}
                  onChange={(e) => onAttrs({ ageMin: Math.min(Number(e.target.value), device.attrs.ageMax) })}
                />
                <span style={{ fontSize: 10.5, color: '#9aa9a5' }}>–</span>
                <input
                  type="number"
                  className="input mono"
                  value={device.attrs.ageMax}
                  disabled={!editable}
                  onChange={(e) => onAttrs({ ageMax: Math.max(Number(e.target.value), device.attrs.ageMin) })}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">每日场次上限</label>
              <input
                type="number"
                className="input mono"
                value={device.attrs.dailyCap}
                disabled={!editable}
                onChange={(e) => onAttrs({ dailyCap: Math.max(1, Number(e.target.value)) })}
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label">备注（随审核一并展示）</label>
            <textarea
              className="textarea"
              style={{ minHeight: 56 }}
              value={device.content.note}
              disabled={!editable}
              onChange={(e) => onContent({ note: e.target.value })}
              placeholder="例如：音量上限 70dB、需治疗师在旁辅助"
            />
          </div>

          {!editable && (
            <InfoBanner tone="info">
              <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <Lock size={12} /> 当前身份为只读，内容配置由治疗师完成。
              </span>
            </InfoBanner>
          )}
        </div>
      </div>
    </div>
  );
}

function ReleaseRules({ device }: { device: DeviceInstance }) {
  const open = device.status === 'approved';
  return (
    <div className="card">
      <div className="card-head">
        <Shield size={14} color="#0f766e" />
        <div className="card-title">开放条件</div>
        <span className={`chip ${open ? 'chip-approved' : 'chip-pending'}`} style={{ marginLeft: 'auto' }}>
          {open ? '已对患者开放' : '未开放'}
        </span>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Rule ok={!!device.content.gameId} text="已绑定训练小游戏" />
        <Rule ok={!!device.content.threshold} text={`达标阈值 ${device.content.threshold}% 已设定`} />
        <Rule ok={device.attrs.durationMin >= 3} text={`单次时长 ${device.attrs.durationMin} 分钟`} />
        <Rule ok={device.attrs.dailyCap >= 1} text={`每日上限 ${device.attrs.dailyCap} 场`} />
        <Rule ok={device.status === 'approved'} text="审核人已通过发布审查" />
        {device.reviewNote && (
          <div
            style={{
              marginTop: 4,
              padding: '8px 10px',
              borderRadius: 8,
              background: device.status === 'rejected' ? '#fef2f2' : '#f7faf9',
              border: `1px solid ${device.status === 'rejected' ? '#fecaca' : '#eef4f2'}`,
              fontSize: 11,
              color: device.status === 'rejected' ? '#991b1b' : '#5d716c',
              lineHeight: 1.6,
            }}
          >
            <b>审核意见：</b>
            {device.reviewNote}
          </div>
        )}
      </div>
    </div>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 11.5 }}>
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 99,
          display: 'grid',
          placeItems: 'center',
          background: ok ? '#ecfdf5' : '#fef2f2',
          color: ok ? '#047857' : '#b91c1c',
          flex: '0 0 auto',
        }}
      >
        {ok ? <Check size={10} /> : <AlertTriangle size={9} />}
      </span>
      <span style={{ color: ok ? '#0b2b27' : '#7b8f8a' }}>{text}</span>
    </div>
  );
}

function GamePreview({ gameId, threshold, device }: { gameId: string | null; threshold: number; device: DeviceInstance }) {
  const game = GAMES.find((g) => g.id === gameId);
  if (!game) {
    return (
      <div className="card">
        <div className="card-head">
          <Gamepad2 size={14} color="#869894" />
          <div className="card-title">小游戏预览</div>
        </div>
        <div className="card-body" style={{ color: '#92a5a0', fontSize: 12, textAlign: 'center', padding: '32px 16px' }}>
          尚未绑定小游戏，患者端不会轮播该展项
        </div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-head">
        <Gamepad2 size={14} color={game.color} />
        <div className="card-title">{game.name}</div>
        <span className="chip chip-neutral" style={{ marginLeft: 'auto' }}>
          {game.metric}
        </span>
      </div>
      <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${game.color}, ${game.color}cc)`,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            flex: '0 0 auto',
            boxShadow: `0 8px 22px ${game.color}44`,
          }}
        >
          <Gamepad2 size={34} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 650, lineHeight: 1.5 }}>{game.instruction}</div>
          <div style={{ fontSize: 11, color: '#7b8f8a', lineHeight: 1.65, marginTop: 5 }}>{game.description}</div>
          <div style={{ display: 'flex', gap: 5, marginTop: 9, flexWrap: 'wrap' }}>
            <span className="chip chip-teal">
              <Timer size={9} /> {device.attrs.durationMin} 分钟/场
            </span>
            <span className="chip chip-amber">
              <Target size={9} /> 达标 {threshold}%
            </span>
            <span className="chip chip-neutral">
              <Users size={9} /> {device.attrs.ageMin}–{device.attrs.ageMax} 岁
            </span>
            <span className="chip chip-neutral">
              <Clock size={9} /> {device.attrs.difficulty}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
