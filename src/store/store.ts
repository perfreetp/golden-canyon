import { createStore, produce } from 'solid-js/store';
import type {
  Project, Animation, ActionRecord, Course, Student, LearnEvent, Role,
  Keyframe, SegmentEase, PartLayer, JointDef,
} from '../types';
import { DEFAULT_JOINTS, DEFAULT_PARTS } from '../rig/skeleton';
import { keyframeFromRest } from '../rig/kinematics';
import { uid } from '../util/math';

const STORAGE_KEY = 'daoyin_studio_state_v1';

export interface PlayerState {
  time: number;
  playing: boolean;
  speed: number;
  loop: boolean;
}

export interface AppState {
  role: Role;
  project: Project;
  actions: ActionRecord[];
  courses: Course[];
  students: Student[];
  events: LearnEvent[];
  player: PlayerState;
}

// 确定性伪随机，保证种子数据稳定
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedProject(): Project {
  const joints = DEFAULT_JOINTS.map(j => ({ ...j }));
  const parts = DEFAULT_PARTS.map(p => ({ ...p }));
  const k0 = keyframeFromRest(joints, 0, 'kf_seed_0');
  // 托天式：4 秒时双臂上托
  const k1 = keyframeFromRest(joints, 4, 'kf_seed_1');
  k1.angles['shoulderL'] = -1.85;
  k1.angles['elbowL'] = -1.62;
  k1.angles['shoulderR'] = -1.29;
  k1.angles['elbowR'] = -1.52;
  k1.rootY -= 6;
  const k2 = keyframeFromRest(joints, 7, 'kf_seed_2');
  k2.angles = { ...k1.angles };
  k2.rootY = k1.rootY;
  const k3 = keyframeFromRest(joints, 10, 'kf_seed_3');
  const eases: Record<string, SegmentEase> = {
    [k0.id]: { type: 'easeInOut', cp1: [0.42, 0], cp2: [0.58, 1] },
    [k1.id]: { type: 'linear', cp1: [0.25, 0.25], cp2: [0.75, 0.75] },
    [k2.id]: { type: 'bezier', cp1: [0.7, 0], cp2: [0.2, 1] },
  };
  const anim: Animation = {
    id: 'anim_tuotian',
    name: '两手托天理三焦',
    duration: 10,
    keyframes: [k0, k1, k2, k3],
    eases,
    breath: { inhale: 4, hold: 0, exhale: 6 },
  };
  return {
    id: 'proj_demo',
    name: '八段锦拆件工程',
    updatedAt: '2026-11-10T09:00:00.000Z',
    joints,
    parts,
    animations: [anim],
    activeAnimationId: anim.id,
  };
}

function seedCourses(actionId: string): Course[] {
  return [
    {
      id: 'course_a', title: '八段锦导引基础课', coach: '陈鹤鸣',
      chapters: [
        { id: 'ch_a1', name: '第一章 · 预备式与托天式', actionIds: [actionId], durationMin: 12 },
        { id: 'ch_a2', name: '第二章 · 左右开弓似射雕', actionIds: [actionId], durationMin: 15 },
      ],
      audience: '久坐伏案、肩颈僵硬人群', weeklySessions: 5, totalMinutes: 27,
      status: 'approved', notes: [{ id: uid('note'), reviewer: '审查员 · 林清和', approved: true, comment: '动作规范、呼吸配比合理，同意上架。', at: '2026-11-08T03:20:00.000Z' }],
      createdAt: '2026-11-05T02:00:00.000Z',
    },
    {
      id: 'course_b', title: '疏肝解郁导引课', coach: '苏婉儿',
      chapters: [{ id: 'ch_b1', name: '第一章 · 舒展肝胆经', actionIds: [actionId], durationMin: 10 }],
      audience: '情志不畅、胁肋胀满人群', weeklySessions: 3, totalMinutes: 10,
      status: 'pending', notes: [], createdAt: '2026-11-12T07:30:00.000Z',
    },
    {
      id: 'course_c', title: '睡前安神导引课', coach: '陈鹤鸣',
      chapters: [{ id: 'ch_c1', name: '第一章 · 调息静坐', actionIds: [actionId], durationMin: 8 }],
      audience: '入睡困难人群', weeklySessions: 7, totalMinutes: 8,
      status: 'rejected',
      notes: [{ id: uid('note'), reviewer: '审查员 · 林清和', approved: false, comment: '呼气节奏超过学员耐受，请将呼气 6 秒调整为 4 秒后重新提交。', at: '2026-11-09T12:00:00.000Z' }],
      createdAt: '2026-11-07T01:00:00.000Z',
    },
  ];
}

function seedEvents(courses: Course[]): LearnEvent[] {
  const rnd = mulberry32(20261115);
  const months = ['2026-09', '2026-10', '2026-11'];
  const events: LearnEvent[] = [];
  let n = 0;
  for (const course of courses) {
    if (course.status === 'rejected') continue;
    const perMonth = course.status === 'approved' ? 26 : 10;
    for (const month of months) {
      for (let i = 0; i < perMonth; i++) {
        const completed = rnd() < (course.status === 'approved' ? 0.78 : 0.55);
        const day = String(1 + Math.floor(rnd() * 27)).padStart(2, '0');
        events.push({
          id: uid('evt'),
          courseId: course.id,
          coach: course.coach,
          month,
          completed,
          exitPoint: completed ? 0 : Math.round((60 + rnd() * course.totalMinutes * 60 * 0.8) * 10) / 10,
          repeated: rnd() < 0.42,
          at: `${month}-${day}T08:00:00.000Z`,
        });
        n++;
      }
    }
  }
  return events;
}

function seedStudents(courseId: string): Student[] {
  return [
    {
      id: 'stu_1', name: '学员 · 周明远', courseId,
      weekPlan: [['ch_a1'], ['ch_a1'], ['ch_a2'], [], ['ch_a1'], ['ch_a2'], []],
      feedback: [
        { part: '右肩', note: '上托时右肩有牵拉感', at: '2026-11-11T01:00:00.000Z' },
        { part: '后腰', note: '弯腰动作后腰微酸', at: '2026-11-13T01:00:00.000Z' },
      ],
    },
    {
      id: 'stu_2', name: '学员 · 沈知微', courseId,
      weekPlan: [['ch_a1'], [], ['ch_a1'], ['ch_a2'], [], ['ch_a1'], []],
      feedback: [{ part: '膝', note: '下蹲时左膝弹响', at: '2026-11-12T01:00:00.000Z' }],
    },
    {
      id: 'stu_3', name: '学员 · 韩立诚', courseId: null,
      weekPlan: [[], [], [], [], [], [], []],
      feedback: [],
    },
  ];
}

function buildInitial(): AppState {
  const project = seedProject();
  const anim = project.animations[0];
  const action: ActionRecord = {
    id: 'act_tuotian',
    name: anim.name,
    projectId: project.id,
    createdAt: '2026-11-06T05:00:00.000Z',
    duration: anim.duration,
    fps: 12,
    snapshot: { joints: project.joints, parts: project.parts, animation: anim },
  };
  const courses = seedCourses(action.id);
  return {
    role: 'animator',
    project,
    actions: [action],
    courses,
    students: seedStudents('course_a'),
    events: seedEvents(courses),
    player: { time: 0, playing: false, speed: 1, loop: true },
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch { /* ignore */ }
  return buildInitial();
}

export const [state, setState] = createStore<AppState>(load());

// 持久化（跳过瞬时播放状态无妨，存整棵树）
let saveTimer: ReturnType<typeof setTimeout> | undefined;
export function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* 配额超限等 */ }
  }, 200);
}
state && persist();

// ---------- 领域操作 ----------
export const activeAnim = (): Animation => {
  const p = state.project;
  return p.animations.find(a => a.id === p.activeAnimationId) ?? p.animations[0];
};

export function setRole(role: Role) {
  setState('role', role);
  persist();
}

export function updateProject(mut: (p: Project) => void) {
  setState('project', produce(mut));
  persist();
}

export function addAnimation() {
  const anim: Animation = {
    id: uid('anim'), name: `未命名动作 ${state.project.animations.length + 1}`,
    duration: 6, keyframes: [], eases: {},
    breath: { inhale: 4, hold: 0, exhale: 6 },
  };
  updateProject(p => { p.animations.push(anim); p.activeAnimationId = anim.id; });
}

export function switchAnimation(id: string) {
  updateProject(p => { p.activeAnimationId = id; });
  setState('player', 'time', 0);
}

export function renameAnimation(id: string, name: string) {
  updateProject(p => { const a = p.animations.find(x => x.id === id); if (a) a.name = name; });
}

export function deleteAnimation(id: string) {
  updateProject(p => {
    if (p.animations.length <= 1) return;
    p.animations = p.animations.filter(a => a.id !== id);
    if (p.activeAnimationId === id) p.activeAnimationId = p.animations[0].id;
  });
}

export function upsertKeyframe(kf: Keyframe) {
  updateProject(p => {
    const a = p.animations.find(x => x.id === p.activeAnimationId)!;
    const idx = a.keyframes.findIndex(k => k.id === kf.id);
    if (idx >= 0) a.keyframes[idx] = kf; else a.keyframes.push(kf);
    a.keyframes.sort((x, y) => x.time - y.time);
  });
}

export function removeKeyframe(id: string) {
  updateProject(p => {
    const a = p.animations.find(x => x.id === p.activeAnimationId)!;
    a.keyframes = a.keyframes.filter(k => k.id !== id);
    delete a.eases[id];
  });
}

export function setSegmentEase(kfId: string, ease: SegmentEase) {
  updateProject(p => {
    const a = p.animations.find(x => x.id === p.activeAnimationId)!;
    a.eases[kfId] = ease;
  });
}

export function setBreath(b: Animation['breath']) {
  updateProject(p => {
    const a = p.animations.find(x => x.id === p.activeAnimationId)!;
    a.breath = b;
  });
}

export function setDuration(d: number) {
  updateProject(p => {
    const a = p.animations.find(x => x.id === p.activeAnimationId)!;
    a.duration = Math.max(1, d);
  });
}

export function updatePart(partId: string, patch: Partial<PartLayer>) {
  updateProject(p => {
    const part = p.parts.find(x => x.id === partId);
    if (part) Object.assign(part, patch);
  });
}

export function updateJoint(jointId: string, patch: Partial<JointDef>) {
  updateProject(p => {
    const j = p.parts && p.joints.find(x => x.id === jointId);
    if (j) Object.assign(j, patch);
  });
}

export function addLibraryAction(rec: ActionRecord) {
  setState('actions', acts => [...acts, rec]);
  persist();
}

export function upsertCourse(course: Course) {
  setState('courses', list => {
    const i = list.findIndex(c => c.id === course.id);
    if (i >= 0) { const next = [...list]; next[i] = course; return next; }
    return [...list, course];
  });
  persist();
}

export function reviewCourse(courseId: string, approved: boolean, comment: string, reviewer: string) {
  setState('courses', list => list.map(c => c.id === courseId
    ? { ...c, status: (approved ? 'approved' : 'rejected') as Course['status'],
        notes: [...c.notes, { id: uid('note'), reviewer, approved, comment, at: new Date().toISOString() }] }
    : c));
  persist();
}

export function addFeedback(studentId: string, part: string, note: string) {
  setState('students', list => list.map(s => s.id === studentId
    ? { ...s, feedback: [...s.feedback, { part, note, at: new Date().toISOString() }] } : s));
  persist();
}

export function setPlayer(patch: Partial<PlayerState>) {
  setState('player', produce(pl => Object.assign(pl, patch)));
}

export function resetAll() {
  const fresh = buildInitial();
  setState(fresh);
  persist();
}
