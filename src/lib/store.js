/** 轻量响应式 store（Svelte 5 runes 之外的全局状态，使用兼容订阅接口） */
import { writable, get, derived } from 'svelte/store';
import { COURSES, CLASSES } from './seed.js';
import { DEFAULT_REGIONS } from './montage.js';
import { buildDemoData } from './demo.js';

const LS_KEY = 'eeg1020.trainer.v1';

function loadPersisted() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

let boot = null;
function initial() {
  if (boot) return boot;
  const persisted = typeof localStorage !== 'undefined' ? loadPersisted() : null;
  boot = persisted || {
    courses: COURSES,
    classes: CLASSES,
    regionDict: DEFAULT_REGIONS,
    submissions: buildDemoData(),
    lastSeed: 5000,
  };
  return boot;
}

export const db = writable(initial());

db.subscribe((v) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(v));
  } catch (e) {
    console.warn('persist failed', e);
  }
});

export function resetDb() {
  localStorage.removeItem(LS_KEY);
  boot = null;
  db.set(initial());
}

export { get, derived };

/* ---------------- 便捷查询 ---------------- */
export function courseById(id) {
  return get(db).courses.find((c) => c.id === id);
}
export function classById(id) {
  return get(db).classes.find((c) => c.id === id);
}

export const session = writable({
  role: 'instructor', // instructor | student
  courseId: 'c-1020-basic',
  itemId: 'it-1',
  studentId: 's-01',
  view: 'dashboard',
  reviewId: null,
});

export function setView(view, patch = {}) {
  session.update((s) => ({ ...s, view, ...patch }));
}
