import { create } from 'zustand';
import { GAMES, defaultAttrs, libItem, gamesForKind } from './data/library';
import { PATIENTS, PATIENT_BY_ID, ROLES, todayISO, uid } from './data/people';
import type {
  DeviceContent,
  DeviceInstance,
  DeviceKind,
  QueueEntry,
  Role,
  ReviewEvent,
  Toast,
  TrainingRecord,
} from './types';

interface SessionSummary {
  patientId: string;
  deviceId: string;
  gameId: string;
  score: number;
  threshold: number;
  passed: boolean;
  plannedSec: number;
  elapsedSec: number;
  recordId: string;
}

interface AppState {
  role: Role;
  devices: DeviceInstance[];
  records: TrainingRecord[];
  reviews: ReviewEvent[];
  queue: QueueEntry[];
  toasts: Toast[];
  selectedId: string | null;
  showGrid: boolean;
  showZones: boolean;
  showIssues: boolean;
  activePatientId: string;
  session: SessionSummary | null;
  setRole: (r: Role) => void;
  select: (id: string | null) => void;
  addDevice: (kind: DeviceKind, x: number, z: number) => string;
  updateDevice: (id: string, patch: Partial<DeviceInstance>) => void;
  updateAttrs: (id: string, patch: Partial<DeviceInstance['attrs']>) => void;
  updateContent: (id: string, patch: Partial<DeviceContent>) => void;
  removeDevice: (id: string) => void;
  duplicateDevice: (id: string) => void;
  submitForReview: (id: string) => void;
  approve: (id: string, note: string) => void;
  reject: (id: string, note: string) => void;
  addRecord: (r: TrainingRecord) => void;
  joinQueue: (patientId: string, deviceId: string) => void;
  leaveQueue: (id: string) => void;
  pushToast: (message: string, kind?: Toast['kind']) => void;
  dismissToast: (id: string) => void;
  setToggle: (key: 'showGrid' | 'showZones' | 'showIssues', v: boolean) => void;
  setActivePatient: (id: string) => void;
  startSession: (deviceId: string, patientId?: string) => void;
  finishSession: (score: number, elapsedSec?: number) => void;
  clearSession: () => void;
  bumpQueueEstimated: () => void;
}

const now = () => new Date().toISOString();

function seedDevice(
  libId: DeviceKind,
  name: string,
  x: number,
  z: number,
  rot: number,
  status: DeviceInstance['status'],
  patch: Partial<DeviceInstance> = {},
): DeviceInstance {
  const lib = libItem(libId);
  const game = gamesForKind(libId)[0];
  return {
    id: uid('dev'),
    libId,
    name,
    x,
    z,
    rot,
    w: lib.width,
    d: lib.depth,
    attrs: defaultAttrs(libId),
    content: { gameId: game?.id ?? null, threshold: game?.threshold ?? 70, note: '' },
    status,
    updatedAt: now(),
    ...patch,
  };
}

function seedDevices(): DeviceInstance[] {
  const d1 = seedDevice('tracking-screen', '追踪屏 01 · 追光小径', 4.5, 0.15, 0, 'approved', {
    submittedBy: '林知夏',
    submittedAt: '2026-10-28T09:12:00.000Z',
    reviewedBy: '周明远',
    reviewedAt: '2026-10-29T02:30:00.000Z',
    reviewNote: '内容与年龄档位匹配，通过。',
    attrs: { ...defaultAttrs('tracking-screen'), durationMin: 12, dailyCap: 8, difficulty: '入门' },
  });
  const d2 = seedDevice('balance-board', '平衡踏板 A · 企鹅栈桥', 4.5, 3.6, 0, 'approved', {
    submittedBy: '林知夏',
    submittedAt: '2026-10-28T09:20:00.000Z',
    reviewedBy: '周明远',
    reviewedAt: '2026-10-29T02:32:00.000Z',
    reviewNote: '承重区 B 中央，安全距离充足，通过。',
    attrs: { ...defaultAttrs('balance-board'), durationMin: 10, dailyCap: 10, difficulty: '进阶' },
  });
  const d3 = seedDevice('grip-station', '抓握台 01 · 果实收集', 9.5, 3.4, 0, 'pending', {
    submittedBy: '林知夏',
    submittedAt: '2026-11-12T06:40:00.000Z',
    attrs: { ...defaultAttrs('grip-station') },
  });
  const d4 = seedDevice('cognitive-table', '配对桌 01 · 配对旅店', 14.2, 3.6, 0, 'approved', {
    submittedBy: '林知夏',
    submittedAt: '2026-10-30T07:05:00.000Z',
    reviewedBy: '周明远',
    reviewedAt: '2026-10-31T01:10:00.000Z',
    reviewNote: '配对难度对 6–14 岁分档清晰，通过。',
  });
  const d5 = seedDevice('camera', '摄像头 C1 · 镜子舞', 0.18, 5.6, Math.PI / 2, 'approved', {
    submittedBy: '林知夏',
    submittedAt: '2026-10-30T07:20:00.000Z',
    reviewedBy: '周明远',
    reviewedAt: '2026-10-31T01:12:00.000Z',
    reviewNote: '覆盖范围已标注，通过。',
  });
  const d6 = seedDevice('speaker', '音响 S1 · 节拍森林', 0.2, 7.4, Math.PI / 2, 'approved', {
    submittedBy: '林知夏',
    submittedAt: '2026-10-30T07:22:00.000Z',
    reviewedBy: '周明远',
    reviewedAt: '2026-10-31T01:13:00.000Z',
    reviewNote: '音量上限建议锁定 70dB。',
    content: { gameId: 'rhythm', threshold: 80, note: '音量上限 70dB' },
  });
  const d7 = seedDevice('tracking-screen', '追踪屏 02 · 追光小径', 19.2, 0.15, 0, 'rejected', {
    submittedBy: '林知夏',
    submittedAt: '2026-11-13T03:00:00.000Z',
    reviewedBy: '周明远',
    reviewedAt: '2026-11-13T07:20:00.000Z',
    reviewNote: '高度 1.55m 对 4–6 岁组偏高，请调整安装高度或收窄年龄范围后重新提交。',
    attrs: { ...defaultAttrs('tracking-screen'), ageMin: 4, ageMax: 6, difficulty: '挑战' },
  });
  const d8 = seedDevice('balance-board', '平衡踏板 B · 企鹅栈桥', 19.5, 4.0, 0, 'draft', {
    attrs: { ...defaultAttrs('balance-board'), difficulty: '挑战', durationMin: 12, dailyCap: 6 },
  });
  const d9 = seedDevice('cognitive-table', '配对桌 02 · 双子星配对', 14.2, 8.2, 0, 'pending', {
    submittedBy: '林知夏',
    submittedAt: '2026-11-14T02:12:00.000Z',
    attrs: { ...defaultAttrs('cognitive-table'), difficulty: '挑战', durationMin: 15, dailyCap: 5 },
  });
  return [d1, d2, d3, d4, d5, d6, d7, d8, d9];
}

function mulberry32(seed: number) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedRecords(devices: DeviceInstance[]): TrainingRecord[] {
  const rand = mulberry32(20261115);
  const playable = devices.filter((d) => d.status === 'approved');
  const out: TrainingRecord[] = [];
  for (let dayAgo = 13; dayAgo >= 0; dayAgo--) {
    const days = playable.filter(() => rand() > 0.3);
    for (const dev of days) {
      const game = GAMES.find((g) => g.id === dev.content.gameId);
      const sessions = 1 + Math.floor(rand() * 3);
      for (let s = 0; s < sessions; s++) {
        const patient = PATIENTS[Math.floor(rand() * PATIENTS.length)];
        const score = Math.round(Math.min(99, Math.max(38, 62 + rand() * 36)));
        const passRate = dev.attrs.difficulty === '挑战' ? 0.52 : dev.attrs.difficulty === '进阶' ? 0.68 : 0.82;
        const passed = score >= dev.content.threshold && rand() < passRate + 0.2;
        const completed = rand() > 0.09;
        const plannedSec = dev.attrs.durationMin * 60;
        out.push({
          id: uid('rec'),
          patientId: patient.id,
          deviceId: dev.id,
          deviceName: dev.name,
          gameId: game?.id ?? 'trail',
          date: todayISO(-dayAgo),
          startedAt: `${todayISO(-dayAgo)}T${String(9 + Math.floor(rand() * 7)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}:00`,
          durationSec: completed ? plannedSec : Math.round(plannedSec * (0.35 + rand() * 0.5)),
          plannedSec,
          score,
          threshold: dev.content.threshold,
          passed,
          completed,
          difficulty: dev.attrs.difficulty,
        });
      }
    }
  }
  return out.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

function seedReviews(devices: DeviceInstance[]): ReviewEvent[] {
  const events: ReviewEvent[] = [];
  for (const d of devices) {
    if (d.status === 'draft') continue;
    events.push({
      id: uid('rev'),
      deviceId: d.id,
      deviceName: d.name,
      action: 'submit',
      by: d.submittedBy ?? '林知夏',
      role: 'therapist',
      at: d.submittedAt ?? now(),
      note: '提交内容配置与安全参数审核',
      snapshot: { gameId: d.content.gameId, threshold: d.content.threshold, durationMin: d.attrs.durationMin },
    });
    if (d.status === 'approved' || d.status === 'rejected') {
      events.push({
        id: uid('rev'),
        deviceId: d.id,
        deviceName: d.name,
        action: d.status === 'approved' ? 'approve' : 'reject',
        by: d.reviewedBy ?? '周明远',
        role: 'reviewer',
        at: d.reviewedAt ?? now(),
        note: d.reviewNote,
      });
    }
  }
  return events.sort((a, b) => (a.at < b.at ? 1 : -1));
}

function seedQueue(devices: DeviceInstance[]): QueueEntry[] {
  const approved = devices.filter((d) => d.status === 'approved');
  const pick = (i: number) => approved[i % approved.length];
  return [
    { id: uid('q'), patientId: 'p4', deviceId: pick(0).id, joinedAt: new Date(Date.now() - 4 * 60000).toISOString(), estimatedMin: 10 },
    { id: uid('q'), patientId: 'p5', deviceId: pick(0).id, joinedAt: new Date(Date.now() - 2 * 60000).toISOString(), estimatedMin: 22 },
    { id: uid('q'), patientId: 'p2', deviceId: pick(1).id, joinedAt: new Date(Date.now() - 6 * 60000).toISOString(), estimatedMin: 11 },
    { id: uid('q'), patientId: 'p6', deviceId: pick(2).id, joinedAt: new Date(Date.now() - 1 * 60000).toISOString(), estimatedMin: 19 },
    { id: uid('q'), patientId: 'p1', deviceId: pick(3).id, joinedAt: new Date(Date.now() - 3 * 60000).toISOString(), estimatedMin: 6 },
  ];
}

const seededDevices = seedDevices();

export const useApp = create<AppState>((set, get) => ({
  role: 'therapist',
  devices: seededDevices,
  records: seedRecords(seededDevices),
  reviews: seedReviews(seededDevices),
  queue: seedQueue(seededDevices),
  toasts: [],
  selectedId: null,
  showGrid: true,
  showZones: true,
  showIssues: true,
  activePatientId: 'p1',
  session: null,

  setRole: (role) => {
    const labels = Object.fromEntries(ROLES.map((r) => [r.id, r.label])) as Record<Role, string>;
    set({ role, toasts: pushToastList(get().toasts, `已切换为：${labels[role]}（${ROLES.find((r) => r.id === role)?.person}）`, 'info') });
  },
  select: (id) => set({ selectedId: id }),
  setToggle: (key, v) => set({ [key]: v } as Partial<AppState>),

  addDevice: (kind, x, z) => {
    const lib = libItem(kind);
    const game = gamesForKind(kind)[0];
    const id = uid('dev');
    const count = get().devices.filter((d) => d.libId === kind).length + 1;
    const dev: DeviceInstance = {
      id,
      libId: kind,
      name: `${lib.shortName} ${String(count).padStart(2, '0')}`,
      x,
      z,
      rot: lib.mount === 'wall' ? 0 : 0,
      w: lib.width,
      d: lib.depth,
      attrs: defaultAttrs(kind),
      content: { gameId: game?.id ?? null, threshold: game?.threshold ?? 70, note: '' },
      status: 'draft',
      updatedAt: now(),
    };
    set({ devices: [...get().devices, dev], selectedId: id });
    get().pushToast(`已添加「${lib.name}」，状态为草稿`, 'success');
    return id;
  },

  updateDevice: (id, patch) =>
    set({
      devices: get().devices.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: now() } : d)),
    }),

  updateAttrs: (id, patch) =>
    set({
      devices: get().devices.map((d) =>
        d.id === id ? { ...d, attrs: { ...d.attrs, ...patch }, updatedAt: now() } : d,
      ),
    }),

  updateContent: (id, patch) =>
    set({
      devices: get().devices.map((d) =>
        d.id === id ? { ...d, content: { ...d.content, ...patch }, updatedAt: now() } : d,
      ),
    }),

  removeDevice: (id) => {
    const d = get().devices.find((x) => x.id === id);
    set({
      devices: get().devices.filter((x) => x.id !== id),
      selectedId: get().selectedId === id ? null : get().selectedId,
      queue: get().queue.filter((q) => q.deviceId !== id),
    });
    if (d) get().pushToast(`已删除「${d.name}」`, 'info');
  },

  duplicateDevice: (id) => {
    const d = get().devices.find((x) => x.id === id);
    if (!d) return;
    const copy: DeviceInstance = {
      ...d,
      id: uid('dev'),
      name: `${d.name} 副本`,
      x: Math.min(d.x + 1, 23),
      status: 'draft',
      submittedAt: undefined,
      submittedBy: undefined,
      reviewedAt: undefined,
      reviewedBy: undefined,
      reviewNote: undefined,
      updatedAt: now(),
    };
    set({ devices: [...get().devices, copy], selectedId: copy.id });
    get().pushToast('已复制为草稿，需重新提交审核', 'success');
  },

  submitForReview: (id) => {
    const d = get().devices.find((x) => x.id === id);
    if (!d) return;
    if (!d.content.gameId) {
      get().pushToast('请先绑定训练小游戏后再提交审核', 'error');
      return;
    }
    const updated: DeviceInstance = {
      ...d,
      status: 'pending',
      submittedBy: '林知夏',
      submittedAt: now(),
      reviewNote: undefined,
      reviewedAt: undefined,
      reviewedBy: undefined,
      updatedAt: now(),
    };
    set({
      devices: get().devices.map((x) => (x.id === id ? updated : x)),
      reviews: [
        {
          id: uid('rev'),
          deviceId: id,
          deviceName: d.name,
          action: 'submit',
          by: '林知夏',
          role: 'therapist',
          at: now(),
          note: '提交内容配置与安全参数审核',
          snapshot: { gameId: d.content.gameId, threshold: d.content.threshold, durationMin: d.attrs.durationMin },
        },
        ...get().reviews,
      ],
    });
    get().pushToast('已提交审核，等待审核人处理', 'success');
  },

  approve: (id, note) => {
    const d = get().devices.find((x) => x.id === id);
    if (!d) return;
    set({
      devices: get().devices.map((x) =>
        x.id === id
          ? { ...x, status: 'approved', reviewedBy: '周明远', reviewedAt: now(), reviewNote: note, updatedAt: now() }
          : x,
      ),
      reviews: [
        {
          id: uid('rev'),
          deviceId: id,
          deviceName: d.name,
          action: 'approve',
          by: '周明远',
          role: 'reviewer',
          at: now(),
          note,
        },
        ...get().reviews,
      ],
    });
    get().pushToast(`「${d.name}」已通过审核，患者端即刻开放`, 'success');
  },

  reject: (id, note) => {
    const d = get().devices.find((x) => x.id === id);
    if (!d) return;
    if (!note.trim()) {
      get().pushToast('退回必须填写原因', 'error');
      return;
    }
    set({
      devices: get().devices.map((x) =>
        x.id === id
          ? { ...x, status: 'rejected', reviewedBy: '周明远', reviewedAt: now(), reviewNote: note, updatedAt: now() }
          : x,
      ),
      queue: get().queue.filter((q) => q.deviceId !== id),
      reviews: [
        {
          id: uid('rev'),
          deviceId: id,
          deviceName: d.name,
          action: 'reject',
          by: '周明远',
          role: 'reviewer',
          at: now(),
          note,
        },
        ...get().reviews,
      ],
    });
    get().pushToast(`已退回「${d.name}」，原因已记录`, 'info');
  },

  addRecord: (r) => set({ records: [r, ...get().records] }),

  joinQueue: (patientId, deviceId) => {
    const entries = get().queue.filter((q) => q.deviceId === deviceId);
    set({
      queue: [
        ...get().queue,
        {
          id: uid('q'),
          patientId,
          deviceId,
          joinedAt: now(),
          estimatedMin: 6 + entries.length * 5,
        },
      ],
    });
  },

  leaveQueue: (id) => set({ queue: get().queue.filter((q) => q.id !== id) }),

  pushToast: (message, kind = 'info') => {
    const t: Toast = { id: uid('t'), message, kind };
    set({ toasts: [...get().toasts.slice(-3), t] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((x) => x.id !== t.id) });
    }, 4200);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  setActivePatient: (id) => set({ activePatientId: id }),

  startSession: (deviceId, patientId) => {
    const d = get().devices.find((x) => x.id === deviceId);
    const patient = PATIENT_BY_ID[patientId ?? get().activePatientId];
    if (!d || !patient || !d.content.gameId) return;
    set({
      session: {
        patientId: patient.id,
        deviceId,
        gameId: d.content.gameId,
        score: 0,
        threshold: d.content.threshold,
        passed: false,
        plannedSec: d.attrs.durationMin * 60,
        elapsedSec: 0,
        recordId: '',
      },
    });
    // starting a session takes the patient out of that device's queue
    set({ queue: get().queue.filter((q) => !(q.deviceId === deviceId && q.patientId === patient.id)) });
  },

  finishSession: (score, elapsedSec) => {
    const s = get().session;
    const d = get().devices.find((x) => x.id === s?.deviceId);
    if (!s || !d) return;
    const passed = score >= d.content.threshold;
    const elapsed = Math.max(1, Math.min(s.plannedSec, Math.round(elapsedSec ?? s.plannedSec)));
    const rec: TrainingRecord = {
      id: uid('rec'),
      patientId: s.patientId,
      deviceId: d.id,
      deviceName: d.name,
      gameId: s.gameId,
      date: todayISO(),
      startedAt: new Date().toISOString(),
      durationSec: elapsed,
      plannedSec: s.plannedSec,
      score,
      threshold: d.content.threshold,
      passed,
      completed: elapsed >= s.plannedSec * 0.95,
      difficulty: d.attrs.difficulty,
    };
    set({
      records: [rec, ...get().records],
      session: { ...s, score, passed, elapsedSec: elapsed, recordId: rec.id },
      queue: get().queue.filter((q) => !(q.deviceId === d.id && q.patientId === s.patientId)),
    });
  },

  clearSession: () => set({ session: null }),

  bumpQueueEstimated: () =>
    set({ queue: get().queue.map((q) => ({ ...q, estimatedMin: Math.max(2, q.estimatedMin - 1) })) }),
}));

function pushToastList(list: Toast[], message: string, kind: Toast['kind']): Toast[] {
  const t: Toast = { id: uid('t'), message, kind };
  setTimeout(() => {
    useApp.setState({ toasts: useApp.getState().toasts.filter((x) => x.id !== t.id) });
  }, 3800);
  return [...list.slice(-3), t];
}

export function canEditLayout(role: Role): boolean {
  return role === 'therapist';
}
export function canReview(role: Role): boolean {
  return role === 'reviewer';
}
export function canConfigure(role: Role): boolean {
  return role === 'therapist' || role === 'reviewer';
}
export function canExport(role: Role): boolean {
  return role === 'therapist' || role === 'supervisor';
}
export function canSeeOps(role: Role): boolean {
  return role === 'supervisor' || role === 'reviewer';
}
