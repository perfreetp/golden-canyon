import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  Clock,
  Gamepad2,
  Pause,
  Play,
  RotateCw,
  SkipForward,
  Sparkles,
  Star,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { GAMES, libItem } from '../data/library';
import { PATIENTS, PATIENT_BY_ID } from '../data/people';
import { GameStage } from '../games/GameStage';
import { useApp } from '../store';
import type { DeviceInstance, Patient, QueueEntry, Role } from '../types';
import { Modal, ProgressBar } from '../components/UI';

type Mode = 'carousel' | 'confirm' | 'playing' | 'summary';

export function PatientPage({ role }: { role: Role }) {
  const devices = useApp((s) => s.devices);
  const records = useApp((s) => s.records);
  const queue = useApp((s) => s.queue);
  const session = useApp((s) => s.session);
  const startSession = useApp((s) => s.startSession);
  const finishSession = useApp((s) => s.finishSession);
  const clearSession = useApp((s) => s.clearSession);
  const activePatientId = useApp((s) => s.activePatientId);
  const setActivePatient = useApp((s) => s.setActivePatient);
  const pushToast = useApp((s) => s.pushToast);

  const [mode, setMode] = useState<Mode>('carousel');
  const [index, setIndex] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [score, setScore] = useState(0);
  const [detail, setDetail] = useState({ hits: 0, attempts: 0 });
  const [lastEvent, setLastEvent] = useState<string>('');
  const [summary, setSummary] = useState<null | {
    score: number;
    passed: boolean;
    detail: { hits: number; attempts: number };
    plannedSec: number;
    elapsedSec: number;
  }>(null);

  const today = new Date().toISOString().slice(0, 10);
  const approved = useMemo(
    () => devices.filter((d) => d.status === 'approved' && !!d.content.gameId),
    [devices],
  );
  const todayCount = useCallback(
    (deviceId: string) => records.filter((r) => r.deviceId === deviceId && r.date === today).length,
    [records, today],
  );
  const available = useMemo(
    () => approved.filter((d) => todayCount(d.id) < d.attrs.dailyCap),
    [approved, todayCount],
  );
  const capped = useMemo(
    () => approved.filter((d) => todayCount(d.id) >= d.attrs.dailyCap),
    [approved, todayCount],
  );
  // shuffled rotation order so the big screen doesn't always start on the same device
  const order = useMemo(() => {
    const idx = available.map((_, i) => i);
    let seed = 7;
    for (let i = idx.length - 1; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      const j = seed % (i + 1);
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.map((i) => available[i]);
  }, [available.map((d) => d.id).join('|')]);
  const rotated = order.length ? order : available;

  const patient = PATIENT_BY_ID[activePatientId];
  const safeIndex = rotated.length ? index % rotated.length : 0;
  const current = rotated[safeIndex];

  // carousel autoplay
  useEffect(() => {
    if (mode !== 'carousel' || showLogin || available.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % Math.max(1, available.length)), 6000);
    return () => clearInterval(t);
  }, [mode, showLogin, available.length]);

  useEffect(() => {
    if (index >= available.length) setIndex(0);
  }, [available.length, index]);

  const stageRef = useRef<GameStage | null>(null);
  const gameHostRef = useRef<HTMLDivElement | null>(null);

  const begin = (d: DeviceInstance) => {
    if (!patient) return;
    if (patient.age < d.attrs.ageMin || patient.age > d.attrs.ageMax) {
      pushToast(`${patient.name}（${patient.age} 岁）不在「${d.name}」适用年龄 ${d.attrs.ageMin}–${d.attrs.ageMax} 岁范围内，请选择其他展项`, 'error');
      return;
    }
    startSession(d.id, patient.id);
    setLastEvent('');
    setScore(0);
    setDetail({ hits: 0, attempts: 0 });
    setSummary(null);
    setPaused(false);
    setMode('playing');
  };

  // timer — counts down in wall-clock time, pausing accumulates a hold offset
  const clockRef = useRef({ start: 0, hold: 0, holdAt: 0, paused: false });
  useEffect(() => {
    if (mode !== 'playing' || !session) return;
    const planned = session.plannedSec;
    clockRef.current = { start: Date.now(), hold: 0, holdAt: 0, paused: false };
    setRemaining(planned);
    const tick = setInterval(() => {
      const c = clockRef.current;
      const now = Date.now();
      if (c.paused) return;
      const elapsed = (now - c.start - c.hold) / 1000;
      const left = Math.max(0, planned - elapsed);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(tick);
        finishSession(Math.round(score), elapsed);
        setSummary({
          score: Math.round(score),
          passed: Math.round(score) >= (session.threshold ?? 70),
          detail,
          plannedSec: planned,
          elapsedSec: Math.round(elapsed),
        });
        setMode('summary');
      }
    }, 200);
    return () => clearInterval(tick);
  }, [mode, session?.recordId, session?.gameId]);

  useEffect(() => {
    const c = clockRef.current;
    if (paused && !c.paused) {
      c.paused = true;
      c.holdAt = Date.now();
    } else if (!paused && c.paused) {
      c.paused = false;
      c.hold += Date.now() - c.holdAt;
    }
  }, [paused]);

  // mount pixi game
  useEffect(() => {
    if (mode !== 'playing' || !session || !gameHostRef.current) return;
    const game = GAMES.find((g) => g.id === session.gameId);
    if (!game) return;
    const stage = new GameStage(game, {
      onScore: (s, d) => {
        setScore(s);
        setDetail(d);
      },
      onEvent: (label) => setLastEvent(label),
    });
    stageRef.current = stage;
    void stage.init(gameHostRef.current);
    return () => {
      stage.destroy();
      stageRef.current = null;
    };
  }, [mode, session?.recordId, session?.gameId]);

  useEffect(() => {
    stageRef.current?.setPaused(paused);
  }, [paused]);

  const skip = () => {
    if (!session) return;
    const c = clockRef.current;
    const elapsed = Math.max(1, Math.round((Date.now() - c.start - c.hold) / 1000));
    const finalScore = Math.round(score);
    finishSession(finalScore, elapsed);
    setSummary({ score: finalScore, passed: finalScore >= session.threshold, detail, plannedSec: session.plannedSec, elapsedSec: elapsed });
    setMode('summary');
  };

  const reset = () => {
    clearSession();
    setSummary(null);
    setMode('carousel');
  };

  const todayTotal = records.filter((r) => r.date === new Date().toISOString().slice(0, 10));

  return (
    <div
      style={{
        minHeight: 620,
        borderRadius: 18,
        overflow: 'hidden',
        background: 'linear-gradient(150deg, #062a26 0%, #0a3a3a 55%, #062b33 100%)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        color: '#e8f5f1',
      }}
    >
      {/* top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '13px 20px',
          borderBottom: '1px solid rgba(255,255,255,.08)',
          background: 'rgba(0,0,0,.12)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: 'linear-gradient(140deg,#14b8a6,#0891b2)',
            color: '#04211d',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          童
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>康复大厅 · 互动训练大屏</div>
          <div style={{ fontSize: 10.3, color: '#7faea6' }}>
            {role === 'patient' ? '患者终端模式' : '试运行预览 · 管理端可观察'}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#9fc9c2' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Gamepad2 size={12} /> {available.length} 个可用展项
          </span>
          <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,.14)' }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={12} /> 今日 {todayTotal.length} 场
          </span>
        </div>
        <button
          onClick={() => setShowLogin(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 10px 5px 5px',
            borderRadius: 99,
            background: 'rgba(255,255,255,.08)',
            border: '1px solid rgba(255,255,255,.13)',
            color: '#e8f5f1',
            fontSize: 11.5,
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 99,
              background: patient?.color ?? '#0f766e',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: 11,
              color: '#fff',
            }}
          >
            {patient?.name.slice(0, 1) ?? '?'}
          </span>
          {patient ? `${patient.name} · ${patient.age} 岁` : '请选择患者'}
          <ChevronRight size={12} style={{ opacity: 0.6 }} />
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {mode === 'carousel' && (
          <Carousel
            available={rotated}
            capped={capped.map((d) => d.name)}
            index={safeIndex}
            current={current}
            patient={patient}
            queue={queue}
            onSelect={setIndex}
            onBegin={begin}
            onLogin={() => setShowLogin(true)}
          />
        )}

        {mode === 'playing' && session && (
          <PlayView
            device={devices.find((d) => d.id === session.deviceId)!}
            gameHostRef={gameHostRef}
            score={score}
            detail={detail}
            remaining={remaining}
            planned={session.plannedSec}
            threshold={session.threshold}
            paused={paused}
            lastEvent={lastEvent}
            onPause={() => setPaused((p) => !p)}
            onSkip={skip}
            patientName={patient?.name ?? ''}
          />
        )}

        {mode === 'summary' && summary && session && (
          <SummaryView
            summary={summary}
            device={devices.find((d) => d.id === session.deviceId)!}
            patientName={patient?.name ?? ''}
            onAgain={reset}
            onQueue={reset}
          />
        )}
      </div>

      {showLogin && (
        <PatientPicker
          onClose={() => setShowLogin(false)}
          onPick={(id) => {
            setActivePatient(id);
            setShowLogin(false);
          }}
          activeId={activePatientId}
        />
      )}
    </div>
  );
}

function Carousel({
  available,
  capped,
  index,
  current,
  patient,
  queue,
  onSelect,
  onBegin,
  onLogin,
}: {
  available: DeviceInstance[];
  capped: string[];
  index: number;
  current?: DeviceInstance;
  patient: Patient | undefined;
  queue: QueueEntry[];
  onSelect: (i: number) => void;
  onBegin: (d: DeviceInstance) => void;
  onLogin: () => void;
}) {
  if (available.length === 0) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', padding: 40, textAlign: 'center' }}>
        <div>
          <Sparkles size={34} color="#2dd4bf" />
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>暂无可用训练</div>
          <div style={{ fontSize: 12, color: '#8fb8b1', marginTop: 6, lineHeight: 1.7 }}>
            治疗师完成布置与内容配置，并经审核人通过后，<br />
            展项会自动出现在这里轮播。
          </div>
        </div>
      </div>
    );
  }
  if (!current) return null;
  const lib = libItem(current.libId);
  const game = GAMES.find((g) => g.id === current.content.gameId)!;
  const qLen = queue.filter((q) => q.deviceId === current.id).length;
  const ageOk = patient ? patient.age >= current.attrs.ageMin && patient.age <= current.attrs.ageMax : true;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)', height: '100%', minHeight: 540 }}>
      <div style={{ padding: '34px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(60% 70% at 20% 40%, ${game.color}55, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <span
              className="chip"
              style={{ background: 'rgba(255,255,255,.12)', color: '#b7e3db', border: '1px solid rgba(255,255,255,.16)' }}
            >
              {lib.name}
            </span>
            <span className="chip" style={{ background: `${game.color}33`, color: '#e8f5f1', border: `1px solid ${game.color}77` }}>
              {game.metric}
            </span>
            <span className="chip" style={{ background: 'rgba(255,255,255,.08)', color: '#b7e3db', border: '1px solid rgba(255,255,255,.13)' }}>
              <Clock size={9} /> {current.attrs.durationMin} 分钟
            </span>
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.6, lineHeight: 1.1 }}>{game.name}</div>
          <div style={{ fontSize: 17, color: '#9fd4cb', marginTop: 8 }}>{game.tagline}</div>
          <div style={{ fontSize: 13.5, color: '#a8c7c1', marginTop: 16, lineHeight: 1.85, maxWidth: 520 }}>{game.instruction}</div>

          <div style={{ display: 'flex', gap: 26, marginTop: 26 }}>
            <CarouselStat label="适用年龄" value={`${current.attrs.ageMin}–${current.attrs.ageMax} 岁`} />
            <CarouselStat label="难度" value={current.attrs.difficulty} />
            <CarouselStat label="达标线" value={`${current.content.threshold}%`} />
            <CarouselStat label="今日排队" value={`${qLen} 人`} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 30, alignItems: 'center' }}>
            <button
              onClick={() => onBegin(current)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 52,
                padding: '0 26px',
                borderRadius: 14,
                background: 'linear-gradient(135deg,#2dd4bf,#0891b2)',
                color: '#04211d',
                fontSize: 16,
                fontWeight: 750,
                boxShadow: '0 12px 34px rgba(45,212,191,.32)',
              }}
            >
              <Play size={18} /> 开始训练
            </button>
            <button
              onClick={onLogin}
              style={{
                height: 52,
                padding: '0 20px',
                borderRadius: 14,
                background: 'rgba(255,255,255,.08)',
                border: '1px solid rgba(255,255,255,.16)',
                color: '#d7efe9',
                fontSize: 13,
              }}
            >
              切换患者
            </button>
            <div style={{ fontSize: 11.5, color: '#8fb8b1' }}>
              {patient ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Check size={12} color={ageOk ? '#4ade80' : '#fbbf24'} />
                  {patient.name} · {patient.age} 岁 {ageOk ? '符合适用年龄' : '不在适用年龄范围'}
                </span>
              ) : (
                '尚未选择患者'
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '26px 26px 26px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 10.5, letterSpacing: 1.6, color: '#74a29b', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RotateCw size={11} /> 轮播中 · 每 6 秒切换
        </div>
        {available.map((d, i) => {
          const g = GAMES.find((x) => x.id === d.content.gameId)!;
          const active = i === index;
          return (
            <button
              key={d.id}
              onClick={() => onSelect(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '11px 13px',
                borderRadius: 13,
                textAlign: 'left',
                background: active ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.035)',
                border: active ? '1px solid rgba(45,212,191,.55)' : '1px solid rgba(255,255,255,.07)',
                transition: 'background .2s, border-color .2s',
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: `linear-gradient(135deg, ${g.color}, ${g.color}aa)`,
                  display: 'grid',
                  placeItems: 'center',
                  flex: '0 0 auto',
                }}
              >
                <Gamepad2 size={18} color="#fff" />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 650, color: active ? '#fff' : '#c9e3dd' }}>{g.name}</span>
                <span style={{ display: 'block', fontSize: 10.5, color: '#86b3ab', marginTop: 1 }}>
                  {d.name} · {d.attrs.durationMin} 分钟
                </span>
              </span>
              {active && <span style={{ width: 6, height: 6, borderRadius: 99, background: '#2dd4bf' }} />}
            </button>
          );
        })}
        {capped.length > 0 && (
          <div style={{ fontSize: 10.5, color: '#e9b07a', lineHeight: 1.6 }}>
            今日场次已满：{capped.join('、')}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div
          style={{
            fontSize: 10.8,
            color: '#79a69f',
            lineHeight: 1.7,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.06)',
          }}
        >
          仅轮播已通过审核的展项。训练满设定时长后自动生成训练小结并计入训练记录。
        </div>
      </div>
    </div>
  );
}

function CarouselStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: '#7fada5', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3, color: '#e8f5f1' }}>{value}</div>
    </div>
  );
}

function PlayView({
  device,
  gameHostRef,
  score,
  detail,
  remaining,
  planned,
  threshold,
  paused,
  lastEvent,
  onPause,
  onSkip,
  patientName,
}: {
  device: DeviceInstance;
  gameHostRef: React.RefObject<HTMLDivElement | null>;
  score: number;
  detail: { hits: number; attempts: number };
  remaining: number;
  planned: number;
  threshold: number;
  paused: boolean;
  lastEvent: string;
  onPause: () => void;
  onSkip: () => void;
  patientName: string;
}) {
  const game = GAMES.find((g) => g.id === device.content.gameId)!;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(Math.floor(remaining % 60)).padStart(2, '0');
  const pct = planned ? ((planned - remaining) / planned) * 100 : 0;
  const passing = score >= threshold;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 540 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '11px 20px',
          borderBottom: '1px solid rgba(255,255,255,.07)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 22, borderRadius: 99, background: game.color }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{game.name}</div>
            <div style={{ fontSize: 10, color: '#86b3ab' }}>{patientName} · {device.name}</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 420, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#86b3ab' }}>
            <span>训练进度</span>
            <span className="mono">
              {Math.round(planned - remaining)}s / {Math.round(planned)}s
            </span>
          </div>
          <ProgressBar value={pct} height={5} bg="rgba(255,255,255,.1)" color="#2dd4bf" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9.5, color: '#86b3ab' }}>达标阈值</div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{threshold}%</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9.5, color: '#86b3ab' }}>实时得分</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 800, color: passing ? '#4ade80' : '#fbbf24', lineHeight: 1.1 }}>
              {score}
            </div>
          </div>
          <div
            className="mono"
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: -1,
              padding: '2px 12px',
              borderRadius: 10,
              background: 'rgba(255,255,255,.07)',
              border: '1px solid rgba(255,255,255,.1)',
            }}
          >
            {mm}:{ss}
          </div>
          <button
            onClick={onPause}
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: 'rgba(255,255,255,.1)',
              border: '1px solid rgba(255,255,255,.14)',
              color: '#e8f5f1',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            onClick={onSkip}
            style={{
              height: 38,
              padding: '0 14px',
              borderRadius: 11,
              background: 'rgba(255,255,255,.08)',
              border: '1px solid rgba(255,255,255,.14)',
              color: '#c9e3dd',
              fontSize: 11.5,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <SkipForward size={13} /> 结束训练
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 380 }}>
        <div ref={gameHostRef} style={{ position: 'absolute', inset: 0 }} />
        {paused && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(4,25,23,.72)',
              backdropFilter: 'blur(4px)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Pause size={30} color="#2dd4bf" />
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>已暂停</div>
              <div style={{ fontSize: 11.5, color: '#9fc9c2', marginTop: 4 }}>计时暂停，点击播放继续</div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 17,
          padding: '9px 20px',
          borderTop: '1px solid rgba(255,255,255,.07)',
          fontSize: 11,
          color: '#9fc9c2',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Target size={12} /> 有效 {detail.hits} / 尝试 {detail.attempts}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Zap size={12} /> {game.metric}实时计算
        </span>
        <span style={{ marginLeft: 'auto', color: '#7fada5' }}>{lastEvent || '开始吧，跟着屏幕上的提示做～'}</span>
      </div>
    </div>
  );
}

function SummaryView({
  summary,
  device,
  patientName,
  onAgain,
  onQueue,
}: {
  summary: { score: number; passed: boolean; detail: { hits: number; attempts: number }; plannedSec: number; elapsedSec: number };
  device: DeviceInstance;
  patientName: string;
  onAgain: () => void;
  onQueue: () => void;
}) {
  const game = GAMES.find((g) => g.id === device.content.gameId)!;
  const stars = summary.score >= 90 ? 3 : summary.score >= device.content.threshold ? 2 : 1;
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', minHeight: 540, padding: 30 }}>
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          borderRadius: 22,
          background: 'rgba(255,255,255,.06)',
          border: '1px solid rgba(255,255,255,.12)',
          backdropFilter: 'blur(10px)',
          padding: '28px 30px',
          boxShadow: '0 24px 70px rgba(0,0,0,.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              background: summary.passed ? 'linear-gradient(135deg,#34d399,#0891b2)' : 'linear-gradient(135deg,#fbbf24,#f97316)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {summary.passed ? <Check size={24} color="#04211d" /> : <Sparkles size={22} color="#04211d" />}
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{summary.passed ? '训练达标，太棒了！' : '训练完成，继续加油！'}</div>
            <div style={{ fontSize: 11.5, color: '#9fc9c2', marginTop: 2 }}>
              {patientName} · {device.name} · 已训练 {Math.max(1, Math.round(summary.elapsedSec / 60))} / {Math.round(summary.plannedSec / 60)} 分钟
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
            {[1, 2, 3].map((i) => (
              <Star key={i} size={18} color={i <= stars ? '#fbbf24' : 'rgba(255,255,255,.18)'} fill={i <= stars ? '#fbbf24' : 'transparent'} />
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 22 }}>
          <SummaryCell label={game.metric} value={`${summary.score}%`} tone={summary.passed ? 'good' : 'warn'} />
          <SummaryCell label="达标线" value={`${device.content.threshold}%`} />
          <SummaryCell label="有效次数" value={`${summary.detail.hits}`} hint={`尝试 ${summary.detail.attempts} 次`} />
        </div>

        <div
          style={{
            marginTop: 16,
            padding: '12px 14px',
            borderRadius: 12,
            background: summary.passed ? 'rgba(52,211,153,.12)' : 'rgba(251,191,36,.12)',
            border: `1px solid ${summary.passed ? 'rgba(52,211,153,.32)' : 'rgba(251,191,36,.3)'}`,
            fontSize: 11.8,
            lineHeight: 1.75,
            color: summary.passed ? '#a7f3d0' : '#fde68a',
          }}
        >
          {summary.passed
            ? `本次${game.metric}达到 ${summary.score}%，已超过 ${device.content.threshold}% 的达标线，训练记录已同步给治疗师。`
            : `本次${game.metric}为 ${summary.score}%，距达标线还差 ${Math.max(0, device.content.threshold - summary.score)} 个百分点，建议休息后再试一次。`}
        </div>

        <div style={{ display: 'flex', gap: 9, marginTop: 20 }}>
          <button
            onClick={onAgain}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 12,
              background: 'linear-gradient(135deg,#2dd4bf,#0891b2)',
              color: '#04211d',
              fontSize: 14,
              fontWeight: 750,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}
          >
            <RotateCw size={16} /> 返回轮播
          </button>
          <button
            onClick={onQueue}
            style={{
              height: 46,
              padding: '0 18px',
              borderRadius: 12,
              background: 'rgba(255,255,255,.08)',
              border: '1px solid rgba(255,255,255,.15)',
              color: '#c9e3dd',
              fontSize: 12.5,
            }}
          >
            查看排队
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCell({ label, value, tone, hint }: { label: string; value: string; tone?: 'good' | 'warn'; hint?: string }) {
  return (
    <div
      style={{
        padding: '12px 13px',
        borderRadius: 12,
        background: 'rgba(255,255,255,.05)',
        border: '1px solid rgba(255,255,255,.08)',
      }}
    >
      <div style={{ fontSize: 10, color: '#8fb8b1' }}>{label}</div>
      <div
        className="mono"
        style={{
          fontSize: 22,
          fontWeight: 800,
          marginTop: 3,
          color: tone === 'good' ? '#4ade80' : tone === 'warn' ? '#fbbf24' : '#e8f5f1',
        }}
      >
        {value}
      </div>
      {hint && <div style={{ fontSize: 9.5, color: '#7fada5', marginTop: 1 }}>{hint}</div>}
    </div>
  );
}

function PatientPicker({
  onClose,
  onPick,
  activeId,
}: {
  onClose: () => void;
  onPick: (id: string) => void;
  activeId: string;
}) {
  return (
    <Modal
      onClose={onClose}
      title="选择患者"
      subtitle="演示环境：选择后即可在大屏上开始训练，训练记录将归属该患者"
      footer={
        <button className="btn btn-ghost" onClick={onClose}>
          取消
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {PATIENTS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              padding: '11px 12px',
              borderRadius: 11,
              textAlign: 'left',
              border: p.id === activeId ? '1.5px solid #7dd3c7' : '1px solid #eef4f2',
              background: p.id === activeId ? '#f0faf7' : '#fff',
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 99,
                background: `${p.color}1f`,
                color: p.color,
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                fontSize: 13,
                flex: '0 0 auto',
              }}
            >
              {p.name.slice(0, 1)}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 650 }}>
                {p.name} · {p.age} 岁
              </span>
              <span style={{ display: 'block', fontSize: 10.5, color: '#7b8f8a', marginTop: 1 }}>{p.goal}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
