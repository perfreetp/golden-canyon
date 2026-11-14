import { Application, Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import { HALL } from '../data/hall';
import { libItem } from '../data/library';
import type { DeviceInstance, HallConfig, LibraryItem, Point, Rect } from '../types';
import {
  GRID,
  zoneLoad as zoneLoadOf,
  aabb,
  wallRot,
  applySnap,
  corners,
  nearestWall,
  rectContainsPoint,
  rectFor,
  rectsOverlap,
  validateLayout,
} from '../lib/geometry';

const FONT = 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
const HANDLE_R = 0.16;

const STATUS_COLOR: Record<DeviceInstance['status'], number> = {
  draft: 0x94a3b8,
  pending: 0xf59e0b,
  approved: 0x22c55e,
  rejected: 0xef4444,
};

export interface TransformPayload {
  x: number;
  z: number;
  rot: number;
  w: number;
  d: number;
}

export interface EditorCallbacks {
  onSelect: (id: string | null) => void;
  onTransform: (id: string, t: TransformPayload, commit: boolean) => void;
  onBlocked: (message: string) => void;
  onSnapHint: (hint: string | null) => void;
  onView?: (pct: number) => void;
}

type DragMode = 'none' | 'move' | 'pan' | 'rotate' | 'scale';
type ScreenPoint = { x: number; y: number };

interface DragState {
  mode: DragMode;
  deviceId: string | null;
  start: Point;
  origin: TransformPayload;
  pointerStart: ScreenPoint;
  startDist: number;
  startAngle: number;
  blocked: boolean;
  moved: boolean;
  hint: string | null;
  panStart: ScreenPoint;
  panOrigin: ScreenPoint;
  lastValid: TransformPayload | null;
  ghost: { rect: Rect; valid: boolean; wall: string | null } | null;
}

export class HallEditor {
  app = new Application();
  private host!: HTMLElement;
  private world = new Container();
  private bgLayer = new Graphics();
  private zoneLayer = new Graphics();
  private gridLayer = new Graphics();
  private wireLayer = new Graphics();
  private deviceLayer = new Container();
  private overlayLayer = new Graphics();
  private labelLayer = new Container();
  private devices: DeviceInstance[] = [];
  private selectedId: string | null = null;
  private scale = 40;
  private offset = { x: 0, y: 0 };
  private hall: HallConfig = HALL;
  private drag: DragState = this.freshDrag();
  private editable = true;
  private showGrid = true;
  private showZones = true;
  private ready = false;
  private disposed = false;
  private userAdjusted = false;
  private initPromise: Promise<void> | null = null;
  private containerEl: HTMLDivElement | null = null;
  private dirty = true;
  private ro?: ResizeObserver;
  private hoverId: string | null = null;

  constructor(private cb: EditorCallbacks) {}

  init(host: HTMLElement): Promise<void> {
    this.host = host;
    this.initPromise = this.bootstrap();
    return this.initPromise;
  }

  private async bootstrap() {
    if (this.disposed) return;
    await this.app.init({
      background: '#f4f7f6',
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      width: Math.max(1, this.host.clientWidth),
      height: Math.max(1, this.host.clientHeight),
    });
    this.containerEl = this.app.canvas as unknown as HTMLDivElement;
    this.host.appendChild(this.app.canvas);
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = new Rectangle(0, 0, this.app.renderer.width, this.app.renderer.height);

    this.world.addChild(
      this.bgLayer,
      this.zoneLayer,
      this.gridLayer,
      this.wireLayer,
      this.deviceLayer,
      this.overlayLayer,
    );
    this.app.stage.addChild(this.world);
    // label layer lives in screen space so text stays upright and legible at any zoom
    this.app.stage.addChild(this.labelLayer);

    this.bindEvents();
    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(this.host);
    this.layout();
    this.fit();
    if (this.disposed) {
      this.app.destroy(true, { children: true });
      return;
    }
    this.ready = true;
    this.renderAll();
    this.app.ticker.add(() => {
      if (this.dirty) {
        this.dirty = false;
        this.renderAll();
      }
    });
  }

  destroy() {
    this.disposed = true;
    if (!this.ready) return;
    this.ro?.disconnect();
    if (this.containerEl) {
      this.containerEl.removeEventListener('wheel', this.onWheel);
    }
    this.app.destroy(true, { children: true });
  }

  setHall(hall: HallConfig) {
    this.hall = hall;
    this.dirty = true;
  }

  setDevices(devices: DeviceInstance[]) {
    // the store is the source of truth and is updated live during drags
    this.devices = devices;
    this.dirty = true;
  }

  setSelection(id: string | null) {
    this.selectedId = id;
    this.dirty = true;
  }

  setEditable(v: boolean) {
    this.editable = v;
    this.dirty = true;
  }

  setLayers(v: { grid?: boolean; zones?: boolean }) {
    if (v.grid !== undefined) this.showGrid = v.grid;
    if (v.zones !== undefined) this.showZones = v.zones;
    this.dirty = true;
  }

  zoomBy(factor: number, anchor?: ScreenPoint) {
    this.userAdjusted = true;
    const a = anchor ?? { x: this.app.renderer.width / 2, y: this.app.renderer.height / 2 };
    const next = Math.max(10, Math.min(160, this.scale * factor));
    const wx = (a.x - this.offset.x) / this.scale;
    const wz = (a.y - this.offset.y) / this.scale;
    this.scale = next;
    this.offset = { x: a.x - wx * next, y: a.y - wz * next };
    this.dirty = true;
    this.emitView();
  }

  fit() {
    this.userAdjusted = false;
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    const pad = 44;
    const s = Math.min((w - pad * 2) / this.hall.width, (h - pad * 2) / this.hall.depth);
    this.scale = Math.max(10, Math.min(160, s));
    this.offset = {
      x: (w - this.hall.width * this.scale) / 2,
      y: (h - this.hall.depth * this.scale) / 2,
    };
    this.dirty = true;
    this.emitView();
  }

  /** Zoom expressed as a percentage of the "fit" scale (100% = whole hall visible). */
  private emitView() {
    const w = this.app.renderer?.width ?? 0;
    const h = this.app.renderer?.height ?? 0;
    if (!w || !h) return;
    const fit = Math.min((w - 88) / this.hall.width, (h - 88) / this.hall.depth);
    const pct = Math.round((this.scale / Math.max(1, fit)) * 100);
    this.cb.onView?.(Math.max(20, Math.min(999, pct)));
  }

  screenToHall(clientX: number, clientY: number): Point | null {
    if (!this.containerEl) return null;
    const r = this.containerEl.getBoundingClientRect();
    return {
      x: (clientX - r.left - this.offset.x) / this.scale,
      z: (clientY - r.top - this.offset.y) / this.scale,
    };
  }

  /** Highlight a drop footprint while dragging over the hall. */
  showDropGhost(rect: Rect | null, mount: 'floor' | 'wall') {
    if (!rect) {
      this.drag.ghost = null;
      this.dirty = true;
      return;
    }
    const snapped = applySnap(rect, mount);
    const snappedRect = { x: snapped.x, z: snapped.z, w: rect.w, d: rect.d, rot: snapped.rot };
    const valid = this.canPlace(snapped, undefined);
    this.drag.ghost = { rect: snappedRect, valid, wall: snapped.snappedWall };
    this.dirty = true;
  }

  clearGhost() {
    this.drag.ghost = null;
    this.dirty = true;
  }

  /** First free snapped position for a library item, scanning wall or floor in a grid. */
  findFreeSpot(lib: LibraryItem): { x: number; z: number } | null {
    const w = lib.width;
    const d = lib.depth;
    if (lib.mount === 'wall') {
      for (const wall of ['north', 'south', 'west', 'east'] as const) {
        const rot = wallRot(wall);
        const span = wall === 'north' || wall === 'south' ? this.hall.width : this.hall.depth;
        for (let t = w / 2 + 0.4; t <= span - w / 2 - 0.4 + 1e-6; t += GRID) {
          const candidate =
            wall === 'north'
              ? { x: t, z: d / 2 + 0.05 }
              : wall === 'south'
                ? { x: t, z: this.hall.depth - d / 2 - 0.05 }
                : wall === 'west'
                  ? { x: d / 2 + 0.05, z: t }
                  : { x: this.hall.width - d / 2 - 0.05, z: t };
          if (this.canPlace({ ...candidate, rot }, undefined, w, d)) return candidate;
        }
      }
      return null;
    }
    // walk out from the room centre so new pieces land in usable open space
    const cx = this.hall.width / 2;
    const cz = this.hall.depth / 2;
    const xs: number[] = [];
    const zs: number[] = [];
    for (let x = GRID; x <= this.hall.width - GRID + 1e-6; x += GRID) xs.push(x);
    for (let z = GRID; z <= this.hall.depth - GRID + 1e-6; z += GRID) zs.push(z);
    xs.sort((a, b) => Math.abs(a - cx) - Math.abs(b - cx));
    zs.sort((a, b) => Math.abs(a - cz) - Math.abs(b - cz));
    for (const z of zs) {
      for (const x of xs) {
        if (this.canPlace({ x, z, rot: 0 }, undefined, w, d)) return { x, z };
      }
    }
    return null;
  }

  /** Test whether a rect collides with other devices or leaves the hall. */
  canPlace(t: { x: number; z: number; rot: number }, excludeId?: string, w = 0, d = 0): boolean {
    const r: Rect = { x: t.x, z: t.z, rot: t.rot, w: w || (excludeId ? (this.devices.find((x) => x.id === excludeId)?.w ?? 1) : 1), d: d || (excludeId ? (this.devices.find((x) => x.id === excludeId)?.d ?? 1) : 1) };
    const a = aabb(r);
    if (a.minX < -1e-6 || a.minZ < -1e-6 || a.maxX > this.hall.width + 1e-6 || a.maxZ > this.hall.depth + 1e-6) return false;
    for (const other of this.devices) {
      if (other.id === excludeId) continue;
      if (rectsOverlap(r, rectFor(other))) return false;
    }
    return true;
  }

  captureCanvas(): HTMLCanvasElement | null {
    if (!this.ready) return null;
    const savedScale = this.scale;
    const savedOffset = { ...this.offset };
    const savedSel = this.selectedId;
    this.selectedId = null;
    this.fit();
    this.renderAll();
    this.app.renderer.render(this.app.stage);
    let canvas: HTMLCanvasElement | null = null;
    try {
      const out = this.app.renderer.extract.canvas({ target: this.world, resolution: 2 });
      canvas = out as HTMLCanvasElement;
    } catch {
      canvas = null;
    }
    this.scale = savedScale;
    this.offset = savedOffset;
    this.selectedId = savedSel;
    this.fitIfNeeded();
    this.dirty = true;
    return canvas;
  }

  private fitIfNeeded() {
    this.offset = { ...this.offset };
  }

  private freshDrag(): DragState {
    return {
      mode: 'none',
      deviceId: null,
      start: { x: 0, z: 0 },
      origin: { x: 0, z: 0, rot: 0, w: 0, d: 0 },
      pointerStart: { x: 0, y: 0 },
      startDist: 0,
      startAngle: 0,
      blocked: false,
      moved: false,
      hint: null,
      panStart: { x: 0, y: 0 },
      panOrigin: { x: 0, y: 0 },
      lastValid: null,
      ghost: null,
    };
  }

  private layout() {
    if (!this.host || this.disposed || !this.app.renderer) return;
    const w = this.host.clientWidth || 800;
    const h = this.host.clientHeight || 600;
    const oldW = this.app.renderer.width;
    const oldH = this.app.renderer.height;
    this.app.stage.hitArea = new Rectangle(0, 0, w, h);
    if (w === oldW && h === oldH) return;
    // keep the hall centred while resizing (or until the user pans/zooms)
    if (!this.userAdjusted && (oldW !== w || oldH !== h)) {
      this.app.renderer.resize(w, h);
      this.app.stage.hitArea = new Rectangle(0, 0, w, h);
      this.fit();
      this.dirty = true;
      return;
    }
    this.offset.x += (w - oldW) / 2;
    this.offset.y += (h - oldH) / 2;
    this.app.renderer.resize(w, h);
    this.app.stage.hitArea = new Rectangle(0, 0, w, h);
    this.dirty = true;
  }

  private bindEvents() {
    const stage = this.app.stage;
    stage.on('pointerdown', (e) => this.onPointerDown(e.global.x, e.global.y, e));
    stage.on('pointermove', (e) => this.onPointerMove(e.global.x, e.global.y));
    stage.on('pointerup', () => this.onPointerUp());
    stage.on('pointerupoutside', () => this.onPointerUp());
    this.containerEl?.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!this.containerEl) return;
    const r = this.containerEl.getBoundingClientRect();
    this.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, { x: e.clientX - r.left, y: e.clientY - r.top });
  };

  private toWorld(sx: number, sy: number): Point {
    return { x: (sx - this.offset.x) / this.scale, z: (sy - this.offset.y) / this.scale };
  }

  private selectedDevice() {
    return this.devices.find((d) => d.id === this.selectedId) ?? null;
  }

  private handlePositions(dev: DeviceInstance) {
    const r = rectFor(dev);
    const c = corners(r);
    return {
      corners: c,
      rotate: {
        x: r.x - Math.sin(r.rot) * (r.d / 2 + 0.55),
        z: r.z + Math.cos(r.rot) * (r.d / 2 + 0.55),
      },
    };
  }

  private onPointerDown(sx: number, sy: number, evt: FederatedPointerEvent) {
    const p = this.toWorld(sx, sy);
    if (evt.button === 1) {
      this.drag = {
        ...this.freshDrag(),
        mode: 'pan',
        panStart: { x: sx, y: sy },
        panOrigin: { ...this.offset },
      };
      return;
    }
    const sel = this.selectedDevice();
    if (sel && this.editable) {
      const hp = this.handlePositions(sel);
      const thresh = Math.max(HANDLE_R * 1.8, 8 / this.scale);
      if (libItem(sel.libId).mount === 'floor' && Math.hypot(p.x - hp.rotate.x, p.z - hp.rotate.z) <= thresh) {
        this.drag = {
          ...this.freshDrag(),
          mode: 'rotate',
          deviceId: sel.id,
          origin: { x: sel.x, z: sel.z, rot: sel.rot, w: sel.w, d: sel.d },
          startAngle: Math.atan2(p.z - sel.z, p.x - sel.x),
          start: p,
        };
        return;
      }
      for (const c of hp.corners) {
        if (Math.hypot(p.x - c.x, p.z - c.z) <= thresh) {
          this.drag = {
            ...this.freshDrag(),
            mode: 'scale',
            deviceId: sel.id,
            origin: { x: sel.x, z: sel.z, rot: sel.rot, w: sel.w, d: sel.d },
            startDist: Math.max(0.15, Math.hypot(p.x - sel.x, p.z - sel.z)),
            start: p,
          };
          return;
        }
      }
    }

    const hit = this.pickDevice(p);
    if (hit) {
      this.cb.onSelect(hit.id);
      this.selectedId = hit.id;
      this.drag = {
        ...this.freshDrag(),
        mode: this.editable ? 'move' : 'none',
        deviceId: hit.id,
        start: p,
        origin: { x: hit.x, z: hit.z, rot: hit.rot, w: hit.w, d: hit.d },
        lastValid: { x: hit.x, z: hit.z, rot: hit.rot, w: hit.w, d: hit.d },
      };
      this.dirty = true;
      return;
    }
    this.cb.onSelect(null);
    this.selectedId = null;
    this.drag = {
      ...this.freshDrag(),
      mode: 'pan',
      panStart: { x: sx, y: sy },
      panOrigin: { ...this.offset },
    };
    this.dirty = true;
  }

  private onPointerMove(sx: number, sy: number) {
    if (this.drag.mode === 'none') {
      const p = this.toWorld(sx, sy);
      const hover = this.pickDevice(p);
      if (hover?.id !== this.hoverId) {
        this.hoverId = hover?.id ?? null;
        if (this.containerEl) this.containerEl.style.cursor = hover ? 'grab' : 'default';
        this.dirty = true;
      }
      return;
    }
    if (this.drag.mode === 'pan') {
      this.userAdjusted = true;
      this.offset = {
        x: this.drag.panOrigin.x + (sx - this.drag.panStart.x),
        y: this.drag.panOrigin.y + (sy - this.drag.panStart.y),
      };
      this.dirty = true;
      return;
    }
    const dev = this.devices.find((d) => d.id === this.drag.deviceId);
    if (!dev) return;
    const p = this.toWorld(sx, sy);
    this.drag.moved = Math.hypot(p.x - this.drag.start.x, p.z - this.drag.start.z) > 0.02;

    if (this.drag.mode === 'move') {
      const lib = libItem(dev.libId);
      const raw: Rect = {
        x: this.drag.origin.x + (p.x - this.drag.start.x),
        z: this.drag.origin.z + (p.z - this.drag.start.z),
        w: this.drag.origin.w,
        d: this.drag.origin.d,
        rot: this.drag.origin.rot,
      };
      const snapped = applySnap(raw, lib.mount);
      const candidate: TransformPayload = {
        x: snapped.x,
        z: snapped.z,
        rot: snapped.rot,
        w: this.drag.origin.w,
        d: this.drag.origin.d,
      };
      const valid = this.canPlace({ x: candidate.x, z: candidate.z, rot: candidate.rot }, dev.id, candidate.w, candidate.d);
      this.drag.blocked = !valid;
      this.drag.hint = snapped.snappedWall ? `已吸附 ${wallName(snapped.snappedWall)}` : lib.mount === 'floor' ? '0.5m 网格吸附' : null;
      this.cb.onSnapHint(this.drag.hint);
      if (valid) this.drag.lastValid = candidate;
      this.applyLocalTransform(dev.id, candidate);
      this.cb.onTransform(dev.id, candidate, false);
      this.dirty = true;
      return;
    }

    if (this.drag.mode === 'rotate') {
      const angle = Math.atan2(p.z - dev.z, p.x - dev.x);
      let rot = this.drag.origin.rot + (angle - this.drag.startAngle);
      const step = Math.PI / 12;
      rot = Math.round(rot / step) * step;
      const lib = libItem(dev.libId);
      if (lib.mount === 'wall') {
        // wall panels snap to the nearest wall normal at 90° increments
        const wall = nearestWall({ ...rectFor(dev), rot }).wall;
        const target = wallRot(wall);
        const delta = normaliseAngle(rot - target);
        if (Math.abs(delta) <= Math.PI / 12 + 1e-6) rot = target;
        this.cb.onSnapHint(Math.abs(normaliseAngle(rot - target)) < 1e-6 ? `已贴合 ${wallName(wall)}（墙面法线）` : '旋转偏离墙面，靠墙吸附已取消');
      }
      const candidate = { x: dev.x, z: dev.z, rot, w: dev.w, d: dev.d };
      const valid = this.canPlace({ x: candidate.x, z: candidate.z, rot: candidate.rot }, dev.id, candidate.w, candidate.d);
      this.drag.blocked = !valid;
      this.applyLocalTransform(dev.id, candidate);
      this.cb.onTransform(dev.id, candidate, false);
      this.dirty = true;
      return;
    }

    if (this.drag.mode === 'scale') {
      const dist = Math.hypot(p.x - dev.x, p.z - dev.z);
      const ratio = Math.max(0.3, Math.min(4, dist / this.drag.startDist));
      const lib = libItem(dev.libId);
      // wall panels keep their mounting depth and stretch along the wall only
      const w = Math.max(0.35, this.drag.origin.w * ratio);
      const d =
        lib.mount === 'wall'
          ? Math.max(0.1, Math.min(0.45, this.drag.origin.d * (1 + (ratio - 1) * 0.15)))
          : Math.max(0.25, this.drag.origin.d * ratio);
      const candidate = { x: dev.x, z: dev.z, rot: dev.rot, w, d };
      const valid = this.canPlace({ x: candidate.x, z: candidate.z, rot: candidate.rot }, dev.id, w, d);
      this.drag.blocked = !valid;
      this.applyLocalTransform(dev.id, candidate);
      this.cb.onTransform(dev.id, candidate, false);
      this.dirty = true;
    }
  }

  private applyLocalTransform(id: string, t: TransformPayload) {
    this.devices = this.devices.map((d) => (d.id === id ? { ...d, ...t } : d));
  }

  private onPointerUp() {
    const mode = this.drag.mode;
    if (mode === 'none' || mode === 'pan') {
      this.cb.onSnapHint(null);
      this.drag = this.freshDrag();
      return;
    }
    const dev = this.devices.find((d) => d.id === this.drag.deviceId);
    if (!dev) {
      this.drag = this.freshDrag();
      return;
    }
    if (this.drag.blocked) {
      const back = this.drag.lastValid ?? this.drag.origin;
      this.applyLocalTransform(dev.id, back);
      this.cb.onTransform(dev.id, back, true);
      this.cb.onBlocked('位置与其他展项重叠或超出展厅，已退回上一个有效位置');
    } else if (this.drag.moved) {
      this.cb.onTransform(dev.id, { x: dev.x, z: dev.z, rot: dev.rot, w: dev.w, d: dev.d }, true);
    }
    this.cb.onSnapHint(null);
    this.drag = this.freshDrag();
    this.dirty = true;
  }

  pickDevice(p: Point): DeviceInstance | null {
    const list = [...this.devices].reverse();
    for (const d of list) {
      if (rectContainsPoint(rectFor(d), p)) return d;
    }
    return null;
  }

  // ---------------- rendering ----------------

  private renderAll() {
    this.drawBackground();
    this.drawZones();
    this.drawGrid();
    this.drawDevices();
    this.drawOverlay();
    this.world.position.set(this.offset.x, this.offset.y);
    this.world.scale.set(this.scale);
  }

  private drawBackground() {
    const g = this.bgLayer;
    g.clear();
    // floor
    g.roundRect(-0.12, -0.12, this.hall.width + 0.24, this.hall.depth + 0.24, 0.3)
      .fill({ color: 0xffffff })
      .stroke({ color: 0xd8e3df, width: 0.06 / this.zoomFactor() });
    g.rect(0, 0, this.hall.width, this.hall.depth).fill({ color: 0xf8fbfa });

    // subtle floor planks
    for (let x = 0; x < this.hall.width; x += 2) {
      g.rect(x, 0, 0.02, this.hall.depth).fill({ color: 0xedf3f1, alpha: 1 });
    }

    // walls
    const t = 0.22;
    g.rect(0, -t, this.hall.width, t).fill({ color: 0x9fb6b0 });
    g.rect(0, this.hall.depth, this.hall.width, t).fill({ color: 0x9fb6b0 });
    g.rect(-t, 0, t, this.hall.depth).fill({ color: 0x9fb6b0 });
    g.rect(this.hall.width, 0, t, this.hall.depth).fill({ color: 0x9fb6b0 });

    // door gap on west wall
    const door = this.hall.door;
    g.rect(-t - 0.02, door.center - door.width / 2, t + 0.04, door.width).fill({ color: 0xf8fbfa });
    // door swing
    g.moveTo(0, door.center - door.width / 2)
      .arc(0, door.center - door.width / 2, door.width, 0, Math.PI / 2)
      .stroke({ color: 0xb9cdc7, width: 0.03, alpha: 1 });
    g.rect(0, door.center - door.width / 2 - 0.05, 0.05, door.width + 0.1).fill({ color: 0x7fa49a });

    // power points
    for (const p of this.hall.powerPoints) {
      g.circle(p.x, p.z, 0.11).fill({ color: 0xf59e0b }).stroke({ color: 0xffffff, width: 0.03 });
      g.roundRect(p.x - 0.05, p.z - 0.04, 0.1, 0.08, 0.02).fill({ color: 0xffffff });
      g.circle(p.x, p.z, 0.03).fill({ color: 0xb45309 });
    }
  }

  private drawZones() {
    if (!this.showZones) {
      this.zoneLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
      return;
    }
    // rebuild from scratch each pass: pixi keeps an active path per context,
    // so reusing one Graphics for fills and dashed strokes joins them together
    this.zoneLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    for (const z of this.hall.zones) {
      // same helper the side panel uses so the two never disagree
      const load = zoneLoadOf(this.devices, z.id);
      const over = load > z.capacity;
      const color = over ? 0xef4444 : z.id === 'B' ? 0x0e7490 : 0x0f766e;
      const panel = new Graphics();
      panel.roundRect(z.x + 0.04, z.z + 0.04, z.w - 0.08, z.d - 0.08, 0.1);
      panel.fill({ color, alpha: 0.05 });
      panel.roundRect(z.x + 0.04, z.z + 0.04, z.w - 0.08, z.d - 0.08, 0.1);
      panel.stroke({ color, width: 0.02, alpha: 0.22 });
      this.zoneLayer.addChild(panel);

      const dashes = new Graphics();
      const dash = 0.34;
      const gap = 0.24;
      const thick = 0.026;
      const alpha = over ? 0.75 : 0.34;
      const edge = (x: number, zz: number, w: number, d: number, horizontal: boolean) => {
        const len = horizontal ? w : d;
        for (let t = 0; t < len - 1e-6; t += dash + gap) {
          const seg = Math.min(dash, len - t);
          if (horizontal) dashes.rect(x + t, zz - thick / 2, seg, thick);
          else dashes.rect(x - thick / 2, zz + t, thick, seg);
        }
      };
      const ix = z.x + 0.06;
      const iz = z.z + 0.06;
      const iw = z.w - 0.12;
      const id = z.d - 0.12;
      edge(ix, iz, iw, id, true);
      edge(ix, iz + id, iw, id, true);
      edge(ix, iz, iw, id, false);
      edge(ix + iw, iz, iw, id, false);
      dashes.fill({ color, alpha });
      this.zoneLayer.addChild(dashes);
    }
  }

  private drawGrid() {
    this.gridLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    if (!this.showGrid || this.scale < 16) return;
    const minor = new Graphics();
    const major = new Graphics();
    const showMinor = this.scale >= 22;
    for (let x = 0; x <= this.hall.width + 1e-6; x += GRID) {
      const isMajor = Math.abs(x - Math.round(x)) < 1e-6;
      if (!isMajor && !showMinor) continue;
      const g = isMajor ? major : minor;
      const w = isMajor ? 0.045 : 0.03;
      g.rect(x - w / 2, 0, w, this.hall.depth);
    }
    for (let z = 0; z <= this.hall.depth + 1e-6; z += GRID) {
      const isMajor = Math.abs(z - Math.round(z)) < 1e-6;
      if (!isMajor && !showMinor) continue;
      const g = isMajor ? major : minor;
      const w = isMajor ? 0.045 : 0.03;
      g.rect(0, z - w / 2, this.hall.width, w);
    }
    minor.fill({ color: 0xe4eeeb });
    major.fill({ color: 0xcfded9 });
    this.gridLayer.addChild(minor, major);
  }

  private zoomFactor() {
    return this.scale / 40;
  }

  private drawDevices() {
    this.deviceLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.labelLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    const issues = validateLayout(this.devices);
    const dragId = this.drag.deviceId;
    const labelScale = Math.max(0.75, Math.min(1.25, this.scale / 44));
    for (const dev of this.devices) {
      const g = new Graphics();
      const isSelected = dev.id === this.selectedId;
      const isHover = dev.id === this.hoverId;
      const blockedNow =
        (this.drag.blocked && dev.id === dragId) ||
        issues.some((i) => i.kind === 'overlap' && (i.deviceId === dev.id || i.otherId === dev.id));
      g.position.set(dev.x, dev.z);
      g.rotation = dev.rot;
      this.paintDevice(g, dev, blockedNow, isSelected, isHover);
      this.deviceLayer.addChild(g);

      // status pill anchor sits at the device's top-left corner
      const badge = new Graphics();
      badge.circle(0, 0, 0.085).fill({ color: STATUS_COLOR[dev.status] }).stroke({ color: 0xffffff, width: 0.032 });
      const cornerX = this.offset.x + (dev.x - dev.w / 2 + 0.1) * this.scale;
      const cornerY = this.offset.y + (dev.z - dev.d / 2 + 0.1) * this.scale;
      badge.position.set(cornerX, cornerY);
      badge.scale.set(this.scale);
      this.labelLayer.addChild(badge);

      // name label, upright regardless of world zoom, placed under the footprint
      const h = devH(dev);
      const nameStyle = new TextStyle({
        fontFamily: FONT,
        fontSize: 11,
        fill: blockedNow ? 0xdc2626 : isSelected ? 0x0b6b63 : 0x1e2b29,
        fontWeight: isSelected ? '700' : '600',
        align: 'center',
        wordWrap: false,
      });
      const label = new Text({ text: dev.name, style: nameStyle });
      label.anchor.set(0.5, 0);
      label.resolution = 2;
      const maxW = Math.max(72, Math.max(dev.w, h) * this.scale);
      if (label.width > maxW) {
        label.style.wordWrap = true;
        label.style.wordWrapWidth = maxW;
        label.style.lineHeight = 13;
      }
      label.scale.set(labelScale);
      const labelY = this.offset.y + (dev.z + Math.max(dev.d, h) / 2) * this.scale + 4;
      const labelX = this.offset.x + dev.x * this.scale;
      if (isSelected) {
        const bg = new Graphics();
        const padX = 5;
        const padY = 3;
        bg.roundRect(-label.width / 2 - padX, -label.height - padY * 2, label.width + padX * 2, label.height + padY * 2, 4)
          .fill({ color: 0xffffff, alpha: 0.92 })
          .stroke({ color: 0x0f766e, width: 0.8, alpha: 0.5 });
        bg.position.set(0, 0);
        const holder = new Container();
        holder.addChild(bg, label);
        holder.position.set(labelX, labelY);
        this.labelLayer.addChild(holder);
      } else {
        label.position.set(labelX, labelY);
        this.labelLayer.addChild(label);
      }
    }
  }

  private paintDevice(g: Graphics, dev: DeviceInstance, blocked: boolean, selected: boolean, hover: boolean) {
    const lib = libItem(dev.libId);
    const w = dev.w;
    const d = dev.d;
    const r = Math.min(0.12, Math.min(w, d) * 0.25);
    const base = parseInt(lib.color.replace('#', ''), 16);
    const accent = parseInt(lib.accent.replace('#', ''), 16);
    const wall = lib.mount === 'wall';

    // shadow
    g.roundRect(-w / 2 + 0.05, -d / 2 + 0.08, w, d, r).fill({ color: 0x0f172a, alpha: 0.1 });
    // body
    g.roundRect(-w / 2, -d / 2, w, d, r).fill({ color: base, alpha: wall ? 0.95 : 0.92 });
    // inner face
    g.roundRect(-w / 2 + 0.06, -d / 2 + 0.06, w - 0.12, d - 0.12, r * 0.8).fill({ color: 0xffffff, alpha: 0.14 });

    if (dev.libId === 'tracking-screen') {
      const sw = Math.min(dev.w * 0.86, 1.44);
      const sh = Math.min(dev.d * 0.62, 0.82);
      g.roundRect(-sw / 2, -sh / 2, sw, sh, 0.04).fill({ color: 0x0b1220 });
      g.roundRect(-sw / 2 + 0.03, -sh / 2 + 0.03, sw - 0.06, sh - 0.06, 0.03).fill({ color: 0x0891b2, alpha: 0.7 });
      for (let i = 0; i < 4; i++) {
        g.circle(-sw / 2 + 0.14 + i * (sw - 0.28) / 3, 0, 0.035).fill({ color: accent, alpha: 0.9 });
      }
      g.roundRect(-w / 2, d / 2 - 0.08, w, 0.08, 0.02).fill({ color: 0x0e7490 });
    } else if (dev.libId === 'balance-board') {
      g.roundRect(-w / 2 + 0.1, -d / 2 + 0.1, w - 0.2, d - 0.2, 0.14).fill({ color: 0xfef3c7, alpha: 0.9 });
      const pads = [
        [-0.3, -0.26],
        [0.3, -0.26],
        [-0.3, 0.26],
        [0.3, 0.26],
      ];
      for (const [px, pz] of pads) {
        g.circle(px * (w / 1.15), pz * (d / 0.95), 0.11).fill({ color: 0xb45309, alpha: 0.8 });
      }
      g.roundRect(-0.06, -d / 2 + 0.06, 0.12, d - 0.12, 0.05).fill({ color: accent, alpha: 0.8 });
    } else if (dev.libId === 'grip-station') {
      g.roundRect(-w / 2 + 0.08, -d / 2 + 0.08, w - 0.16, d - 0.16, 0.08).fill({ color: 0xfdf2f8, alpha: 0.92 });
      g.circle(0, -0.04, Math.min(w, d) * 0.2).fill({ color: 0x9d174d, alpha: 0.25 });
      g.circle(0, -0.04, Math.min(w, d) * 0.12).fill({ color: 0xf9a8d4 });
      g.circle(-0.24, 0.2, 0.06).fill({ color: 0x9d174d });
      g.circle(0.24, 0.2, 0.06).fill({ color: 0x9d174d });
    } else if (dev.libId === 'cognitive-table') {
      const sw = Math.min(w * 0.72, 0.78);
      const sh = Math.min(d * 0.62, 0.5);
      g.roundRect(-sw / 2, -sh / 2 - 0.03, sw, sh, 0.05).fill({ color: 0x1e1b4b });
      g.roundRect(-sw / 2 + 0.03, -sh / 2, sw - 0.06, sh - 0.06, 0.04).fill({ color: 0xc4b5fd, alpha: 0.85 });
      g.rect(-sw / 2, -0.06, sw, 0.02).fill({ color: 0xffffff, alpha: 0.5 });
    } else if (dev.libId === 'camera') {
      g.circle(0, 0, Math.min(w, d) * 0.45).fill({ color: 0x0f766e });
      g.circle(0, 0, Math.min(w, d) * 0.25).fill({ color: 0x0b1220 });
      g.circle(-0.02, -0.02, Math.min(w, d) * 0.08).fill({ color: 0x5eead4 });
      // field of view cone
      g.moveTo(0, 0)
        .lineTo(-2.2, 3.4)
        .lineTo(2.2, 3.4)
        .closePath()
        .fill({ color: 0x0f766e, alpha: 0.12 })
        .stroke({ color: 0x0f766e, width: 0.02, alpha: 0.4 });
    } else if (dev.libId === 'speaker') {
      g.roundRect(-w / 2, -d / 2, w, d, 0.06).fill({ color: 0x3730a3 });
      for (let i = 0; i < 3; i++) {
        g.circle(0, 0.12, 0.12 + i * 0.07).stroke({ color: 0xa5b4fc, width: 0.018, alpha: 0.8 - i * 0.2 });
      }
      g.circle(0, -0.14, 0.06).fill({ color: 0xa5b4fc });
      g.moveTo(0, 0).lineTo(-1.6, 2.4).lineTo(1.6, 2.4).closePath().fill({ color: 0x3730a3, alpha: 0.08 });
    }

    // mount indicator strip toward the wall side (front edge highlighted)
    if (wall) {
      g.rect(-w / 2 + 0.06, -d / 2, w - 0.12, 0.05).fill({ color: accent, alpha: 0.95 });
    }

    if (hover && !selected) {
      g.roundRect(-w / 2 - 0.04, -d / 2 - 0.04, w + 0.08, d + 0.08, r + 0.02).stroke({ color: 0x0f766e, width: 0.03, alpha: 0.5 });
    }

    if (blocked) {
      g.roundRect(-w / 2 - 0.05, -d / 2 - 0.05, w + 0.1, d + 0.1, r + 0.03).fill({ color: 0xef4444, alpha: 0.22 });
      g.roundRect(-w / 2 - 0.05, -d / 2 - 0.05, w + 0.1, d + 0.1, r + 0.03).stroke({ color: 0xef4444, width: 0.055 });
    }

    if (selected) {
      g.roundRect(-w / 2 - 0.02, -d / 2 - 0.02, w + 0.04, d + 0.04, r + 0.01).stroke({ color: 0x0f766e, width: 0.045 });
    }
  }

  private drawOverlay() {
    this.overlayLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    const g = new Graphics();
    this.overlayLayer.addChild(g);

    // ghost preview for HTML5 drag & drop
    if (this.drag.ghost) {
      const gh = this.drag.ghost;
      const r = gh.rect;
      const pts = corners(r);
      const poly: number[] = [];
      for (const p of pts) poly.push(p.x, p.z);
      const ghostG = new Graphics();
      ghostG.poly(poly).fill({ color: gh.valid ? 0x0f766e : 0xef4444, alpha: 0.2 });
      ghostG.poly(poly).stroke({ color: gh.valid ? 0x0f766e : 0xef4444, width: 0.05, alpha: 0.9 });
      if (gh.valid) {
        for (let i = 0; i < 4; i++) {
          const p = pts[i];
          ghostG.circle(p.x, p.z, 0.07).fill({ color: 0x0f766e });
        }
      }
      this.overlayLayer.addChild(ghostG);
    }

    const sel = this.selectedDevice();
    if (sel && this.editable) {
      const hp = this.handlePositions(sel);
      if (libItem(sel.libId).mount === 'floor') {
        // rotate stem drawn on its own graphics so the arc path can't leak
        const stem = new Graphics();
        const edgeX = sel.x - Math.sin(sel.rot) * (sel.d / 2);
        const edgeZ = sel.z + Math.cos(sel.rot) * (sel.d / 2);
        stem.moveTo(edgeX, edgeZ).lineTo(hp.rotate.x, hp.rotate.z);
        stem.stroke({ color: 0x0f766e, width: 0.022 });
        this.overlayLayer.addChild(stem);

        const knob = new Graphics();
        knob.circle(hp.rotate.x, hp.rotate.z, HANDLE_R).fill({ color: 0xffffff });
        knob.circle(hp.rotate.x, hp.rotate.z, HANDLE_R).stroke({ color: 0x0f766e, width: 0.04 });
        this.overlayLayer.addChild(knob);

        // arc glyph needs a fresh context — pixi arcs join from the current point
        const glyph = new Graphics();
        glyph.arc(hp.rotate.x, hp.rotate.z, HANDLE_R * 0.62, 0.35, Math.PI * 1.2);
        glyph.stroke({ color: 0x0f766e, width: 0.022 });
        glyph.circle(hp.rotate.x + HANDLE_R * 0.55, hp.rotate.z - HANDLE_R * 0.28, 0.032);
        glyph.fill({ color: 0x0f766e });
        this.overlayLayer.addChild(glyph);
      }

      const cornerG = new Graphics();
      for (const c of hp.corners) {
        cornerG.roundRect(c.x - HANDLE_R, c.z - HANDLE_R, HANDLE_R * 2, HANDLE_R * 2, 0.03);
        cornerG.fill({ color: 0xffffff });
        cornerG.roundRect(c.x - HANDLE_R, c.z - HANDLE_R, HANDLE_R * 2, HANDLE_R * 2, 0.03);
        cornerG.stroke({ color: 0x0f766e, width: 0.04 });
      }
      this.overlayLayer.addChild(cornerG);
    }

    // dimension ticks around the hall (one path, one stroke — per-segment
    // stroke calls would let the active path leak into a stray diagonal)
    const ticks = new Graphics();
    const tick = 0.16;
    for (let x = 0; x <= this.hall.width + 1e-6; x += 1) {
      ticks.moveTo(x, this.hall.depth).lineTo(x, this.hall.depth + tick);
    }
    for (let z = 0; z <= this.hall.depth + 1e-6; z += 1) {
      ticks.moveTo(0, z).lineTo(-tick, z);
    }
    ticks.stroke({ color: 0x94a3b8, width: 0.02 });
    this.overlayLayer.addChild(ticks);
  }
}

export function devH(dev: DeviceInstance) {
  const lib = libItem(dev.libId);
  return lib.mount === 'wall' ? dev.d : Math.max(dev.d, 0.4);
}

export function weightOf(dev: DeviceInstance) {
  return libItem(dev.libId).weightKg;
}

export function normaliseAngle(a: number) {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v < -Math.PI) v += Math.PI * 2;
  return v;
}

export function wallName(id: string) {
  return (
    {
      north: '北墙',
      south: '南墙',
      west: '西墙',
      east: '东墙',
    } as Record<string, string>
  )[id] ?? id;
}
