import { HALL } from '../data/hall';
import type { DeviceInstance, Point, Rect } from '../types';

export const GRID = 0.5;
export const WALL_SNAP = 0.9;

export function snapGrid(v: number, step = GRID): number {
  return Math.round(v / step) * step;
}

/** Corners of a rotated rectangle, in hall coordinates (x right, z down). */
export function corners(r: Rect): Point[] {
  const hw = r.w / 2;
  const hd = r.d / 2;
  const cos = Math.cos(r.rot);
  const sin = Math.sin(r.rot);
  return [
    { x: r.x + (-hw * cos - -hd * sin), z: r.z + (-hw * sin + -hd * cos) },
    { x: r.x + (hw * cos - -hd * sin), z: r.z + (hw * sin + -hd * cos) },
    { x: r.x + (hw * cos - hd * sin), z: r.z + (hw * sin + hd * cos) },
    { x: r.x + (-hw * cos - hd * sin), z: r.z + (-hw * sin + hd * cos) },
  ];
}

export function aabb(r: Rect) {
  const pts = corners(r);
  const xs = pts.map((p) => p.x);
  const zs = pts.map((p) => p.z);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

function projectPoly(pts: Point[], axis: Point) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of pts) {
    const d = p.x * axis.x + p.z * axis.z;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

/** Separating-axis test for two rotated rectangles. */
export function rectsOverlap(a: Rect, b: Rect, pad = 0): boolean {
  const pa = corners(a);
  const pb = corners(b);
  if (pad) {
    const cxa = a.x;
    const cza = a.z;
    const exA = a.w / 2 + pad;
    const ezA = a.d / 2 + pad;
    for (const p of pa) {
      const dx = p.x - cxa;
      const dz = p.z - cza;
      p.x = cxa + Math.sign(dx) * Math.min(Math.abs(dx), exA);
      p.z = cza + Math.sign(dz) * Math.min(Math.abs(dz), ezA);
    }
  }
  const axes = [
    { x: Math.cos(a.rot), z: Math.sin(a.rot) },
    { x: -Math.sin(a.rot), z: Math.cos(a.rot) },
    { x: Math.cos(b.rot), z: Math.sin(b.rot) },
    { x: -Math.sin(b.rot), z: Math.cos(b.rot) },
  ];
  for (const axis of axes) {
    const A = projectPoly(pa, axis);
    const B = projectPoly(pb, axis);
    if (A.max < B.min - 1e-9 || B.max < A.min - 1e-9) return false;
  }
  return true;
}

export function rectContainsPoint(r: Rect, p: Point): boolean {
  const cos = Math.cos(-r.rot);
  const sin = Math.sin(-r.rot);
  const dx = p.x - r.x;
  const dz = p.z - r.z;
  const lx = dx * cos - dz * sin;
  const lz = dx * sin + dz * cos;
  return Math.abs(lx) <= r.w / 2 && Math.abs(lz) <= r.d / 2;
}

export function rectBoundsOk(r: Rect, hallW = HALL.width, hallD = HALL.depth) {
  const a = aabb(r);
  return {
    ok: a.minX >= -1e-6 && a.minZ >= -1e-6 && a.maxX <= hallW + 1e-6 && a.maxZ <= hallD + 1e-6,
    aabb: a,
  };
}

export interface SnapResult {
  x: number;
  z: number;
  rot: number;
  snappedWall: 'north' | 'south' | 'west' | 'east' | null;
}

/**
 * Snap a device for its mount type.
 * Wall devices clamp their thickness against the nearest wall (within WALL_SNAP)
 * and align rotation to the wall normal (quantised to 15° otherwise).
 * Floor devices snap their centre to the 0.5 m grid.
 */
export function applySnap(rect: Rect, mount: 'floor' | 'wall'): SnapResult {
  if (mount === 'wall') {
    const best = nearestWall(rect);
    if (best.dist <= WALL_SNAP) {
      const rot = wallRot(best.wall);
      const hw = rect.w / 2;
      switch (best.wall) {
        case 'north':
          return { x: clampX(rect.x, hw), z: rect.d / 2 + 0.05, rot, snappedWall: best.wall };
        case 'south':
          return { x: clampX(rect.x, hw), z: HALL.depth - rect.d / 2 - 0.05, rot, snappedWall: best.wall };
        case 'west':
          return { x: rect.d / 2 + 0.05, z: clampX(rect.z, hw), rot, snappedWall: best.wall };
        case 'east':
          return { x: HALL.width - rect.d / 2 - 0.05, z: clampX(rect.z, hw), rot, snappedWall: best.wall };
      }
    }
    return { x: clampX(rect.x, 0), z: clampZ(rect.z, 0), rot: quantise(rect.rot, Math.PI / 12), snappedWall: null };
  }
  return { x: snapGrid(rect.x), z: snapGrid(rect.z), rot: quantise(rect.rot, Math.PI / 12), snappedWall: null };
}

function clampX(v: number, hw: number) {
  return Math.min(Math.max(v, hw), HALL.width - hw);
}
function clampZ(v: number, hd: number) {
  return Math.min(Math.max(v, hd), HALL.depth - hd);
}

export function nearestWall(r: Rect): {
  wall: 'north' | 'south' | 'west' | 'east';
  dist: number;
} {
  const a = aabb(r);
  const dN = a.minZ;
  const dS = HALL.depth - a.maxZ;
  const dW = a.minX;
  const dE = HALL.width - a.maxX;
  const cands = [
    { wall: 'north' as const, dist: dN },
    { wall: 'south' as const, dist: dS },
    { wall: 'west' as const, dist: dW },
    { wall: 'east' as const, dist: dE },
  ];
  return cands.reduce((best, c) => (c.dist < best.dist ? c : best), cands[0]);
}

export function wallRot(w: 'north' | 'south' | 'west' | 'east') {
  switch (w) {
    case 'north':
      return 0;
    case 'south':
      return Math.PI;
    case 'west':
      return Math.PI / 2;
    case 'east':
      return -Math.PI / 2;
  }
}

export function quantise(v: number, step: number) {
  return Math.round(v / step) * step;
}

export function rectFor(d: DeviceInstance, x = d.x, z = d.z, rot = d.rot): Rect {
  return { x, z, w: d.w, d: d.d, rot };
}

export function zoneFor(r: Rect) {
  const cx = r.x;
  const cz = r.z;
  const primary = HALL.zones.filter((zn) => rectContainsPoint({ ...zn, rot: 0 }, { x: cx, z: cz }));
  return primary[primary.length - 1] ?? null;
}

export function zoneLoad(devices: DeviceInstance[], zoneId: string): number {
  return devices
    .filter((d) => zoneFor(rectFor(d))?.id === zoneId)
    .reduce((sum, d) => sum + deviceWeight(d), 0);
}

export function deviceWeight(d: DeviceInstance): number {
  // approximate weight lookup without importing LIBRARY to avoid cycles
  const weights: Record<string, number> = {
    'tracking-screen': 42,
    'balance-board': 46,
    'grip-station': 34,
    'cognitive-table': 58,
    camera: 4,
    speaker: 9,
  };
  return weights[d.libId] ?? 20;
}

export interface LayoutIssue {
  deviceId: string;
  kind: 'out-of-bounds' | 'overlap' | 'overload';
  message: string;
  otherId?: string;
  severity: 'error' | 'warn';
}

export function validateLayout(devices: DeviceInstance[]): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  for (const d of devices) {
    const r = rectFor(d);
    const b = rectBoundsOk(r);
    if (!b.ok) {
      issues.push({ deviceId: d.id, kind: 'out-of-bounds', message: '展项超出展厅边界，请移回区域内', severity: 'error' });
    }
  }
  for (let i = 0; i < devices.length; i++) {
    for (let j = i + 1; j < devices.length; j++) {
      const a = devices[i];
      const b = devices[j];
      if (rectsOverlap(rectFor(a), rectFor(b))) {
        issues.push({
          deviceId: a.id,
          otherId: b.id,
          kind: 'overlap',
          message: `与「${b.name}」摆放区域重叠`,
          severity: 'error',
        });
      }
    }
  }
  for (const zn of HALL.zones) {
    const load = zoneLoad(devices, zn.id);
    if (load > zn.capacity) {
      issues.push({
        deviceId: '',
        kind: 'overload',
        message: `${zn.name} 承重 ${load}kg 超出分区上限 ${zn.capacity}kg`,
        severity: 'warn',
      });
    }
  }
  return issues;
}

export function issuesForDevice(issues: LayoutIssue[], id: string): LayoutIssue[] {
  return issues.filter((i) => i.deviceId === id || i.otherId === id);
}

export function fmt(n: number, digits = 1): string {
  return n.toFixed(digits).replace(/\.0$/, '');
}
