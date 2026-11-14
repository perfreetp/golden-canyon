import { Application, Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import type { GameDef } from '../types';

const FONT = 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

export interface GameCallbacks {
  onScore: (score: number, detail: { hits: number; attempts: number }) => void;
  onEvent?: (label: string) => void;
}

interface Mode {
  update(dt: number, t: number): void;
  score(): number;
  detail(): { hits: number; attempts: number };
  press(x: number, y: number): void;
  move(x: number, y: number): void;
  release?(): void;
}

export class GameStage {
  app = new Application();
  private w = 800;
  private h = 600;
  private mode: Mode | null = null;
  private raf = 0;
  private paused = false;
  private lastT = 0;
  private elapsed = 0;
  private keyHandler = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      this.mode?.press(this.w / 2, this.h / 2);
    }
  };

  constructor(private game: GameDef, private cb: GameCallbacks) {}

  async init(host: HTMLElement) {
    await this.app.init({
      background: '#071b1a',
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      resizeTo: host,
    });
    host.appendChild(this.app.canvas);
    this.app.stage.eventMode = 'static';
    this.w = this.app.renderer.width;
    this.h = this.app.renderer.height;
    this.app.stage.hitArea = new Rectangle(0, 0, this.w, this.h);
    this.app.stage.on('pointerdown', (e) => this.mode?.press(e.global.x, e.global.y));
    this.app.stage.on('pointermove', (e) => this.mode?.move(e.global.x, e.global.y));
    this.app.stage.on('pointerup', () => this.mode?.release?.());
    window.addEventListener('keydown', this.keyHandler);
    this.mountMode();
    this.lastT = performance.now();
    const loop = (t: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - this.lastT) / 1000);
      this.lastT = t;
      if (this.paused || !this.mode) return;
      this.elapsed += dt;
      this.mode.update(dt, this.elapsed);
      this.cb.onScore(Math.round(this.mode.score()), this.mode.detail());
    };
    this.raf = requestAnimationFrame(loop);
  }

  setPaused(v: boolean) {
    this.paused = v;
    this.lastT = performance.now();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.keyHandler);
    this.app.destroy(true, { children: true });
  }

  private mountMode() {
    this.w = this.app.renderer.width;
    this.h = this.app.renderer.height;
    const root = new Container();
    this.app.stage.addChild(root);
    const ctx: GameCtx = {
      root,
      w: this.w,
      h: this.h,
      color: this.game.color,
      font: FONT,
      event: (label) => this.cb.onEvent?.(label),
    };
    switch (this.game.id) {
      case 'trail':
      case 'hotel-table':
        this.mode = this.game.id === 'trail' ? new TrailGame(ctx) : new HotelGame(ctx);
        break;
      case 'penguin':
        this.mode = new BalanceGame(ctx);
        break;
      case 'harvest':
        this.mode = new GripGame(ctx);
        break;
      case 'hotel':
        this.mode = new HotelGame(ctx);
        break;
      case 'mirror':
        this.mode = new MirrorGame(ctx);
        break;
      case 'rhythm':
        this.mode = new RhythmGame(ctx);
        break;
      default:
        this.mode = new TrailGame(ctx);
    }
  }
}

interface GameCtx {
  root: Container;
  w: number;
  h: number;
  color: string;
  font: string;
  event: (label: string) => void;
}

function hexToNum(hex: string) {
  return parseInt(hex.replace('#', ''), 16);
}

function lerpColor(a: number, b: number, t: number) {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

class BaseGame implements Mode {
  protected g = new Graphics();
  protected layer = new Container();
  protected hits = 0;
  protected attempts = 0;
  protected label: Text;
  constructor(protected ctx: GameCtx) {
    ctx.root.addChild(this.layer);
    this.layer.addChild(this.g);
    this.label = new Text({
      text: '',
      style: new TextStyle({ fontFamily: ctx.font, fontSize: 13, fill: 0x9fe8dd }),
    });
    this.label.position.set(18, 16);
    this.label.resolution = 2;
    ctx.root.addChild(this.label);
  }
  update(_dt: number, _t: number) {}
  press(_x: number, _y: number) {}
  move(_x: number, _y: number) {}
  score() {
    return this.attempts === 0 ? 0 : (this.hits / this.attempts) * 100;
  }
  detail() {
    return { hits: this.hits, attempts: this.attempts };
  }
}

/** 追光小径 — tap moving targets before they fade. */
class TrailGame extends BaseGame {
  private targets: { x: number; y: number; born: number; life: number; r: number; hue: number }[] = [];
  private nextSpawn = 0;

  update(dt: number, t: number) {

    this.nextSpawn -= dt;
    const count = this.targets.length;
    const spawnGap = count > 5 ? 1.25 : 0.85;
    if (this.nextSpawn <= 0) {
      this.nextSpawn = spawnGap;
      const margin = 70;
      this.targets.push({
        x: margin + Math.random() * (this.ctx.w - margin * 2),
        y: 80 + Math.random() * (this.ctx.h - 170),
        born: t,
        life: 2.6,
        r: 30 + Math.random() * 14,
        hue: Math.random(),
      });
    }
    this.targets = this.targets.filter((tg) => {
      if (t - tg.born > tg.life) {
        this.attempts++;
        this.ctx.event('漏掉一个光点');
        return false;
      }
      return true;
    });
    this.draw(t);
  }

  press(x: number, y: number) {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const tg = this.targets[i];
      if (Math.hypot(tg.x - x, tg.y - y) <= tg.r + 12) {
        this.targets.splice(i, 1);
        this.hits++;
        this.attempts++;
        this.ctx.event('命中 +1');
        return;
      }
    }
  }

  private draw(t: number) {
    const g = this.g;
    g.clear();
    // path ribbon
    for (let i = 0; i < 40; i++) {
      const p = i / 39;
      const x = p * this.ctx.w;
      const y = this.ctx.h * 0.52 + Math.sin(p * Math.PI * 3 + t * 0.4) * this.ctx.h * 0.16;
      g.moveTo(x, y).lineTo(x + this.ctx.w / 39, y).stroke({ color: 0x0f3b39, width: 2, alpha: 0.6 });
    }
    for (const tg of this.targets) {
      const age = t - tg.born;
      const k = Math.max(0, 1 - age / tg.life);
      const pulse = 1 + Math.sin(age * 6) * 0.08;
      const c = lerpColor(hexToNum(this.ctx.color), 0xfbbf24, tg.hue);
      g.circle(tg.x, tg.y, tg.r * pulse).fill({ color: c, alpha: 0.22 });
      g.circle(tg.x, tg.y, tg.r * 0.72 * pulse).fill({ color: c, alpha: 0.95 });
      g.circle(tg.x, tg.y, tg.r * 0.3).fill({ color: 0xffffff, alpha: 0.85 });
      // life ring
      g.circle(tg.x, tg.y, tg.r + 7).stroke({ color: c, width: 3, alpha: k });
    }
    this.label.text = `已命中 ${this.hits} · 漏掉 ${this.attempts - this.hits}`;
  }
}

/** 企鹅栈桥 — keep the penguin inside the safe band by shifting weight. */
class BalanceGame extends BaseGame {
  private px: number;
  private pxTarget: number;
  private inBand = 0;
  private ticks = 0;
  private sinceSample = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.px = ctx.w / 2;
    this.pxTarget = ctx.w / 2;
  }

  update(dt: number, t: number) {

    this.px += (this.pxTarget - this.px) * Math.min(1, dt * 4.5);
    const bandCenter = Math.sin(t * 0.55) * (this.ctx.w * 0.28) + Math.sin(t * 1.7) * 12;

    const bandHalf = 46;
    // sample at ~10 Hz so "attempts" reads as attempts, not animation frames
    this.sinceSample += dt;
    if (this.sinceSample >= 0.1) {
      this.sinceSample = 0;
      this.ticks++;
      if (Math.abs(this.px - bandCenter) < bandHalf) {
        this.inBand++;
        this.hits++;
      }
    }
    this.attempts = this.ticks;
    this.draw(bandCenter, bandHalf);
  }

  move(x: number) {
    this.pxTarget = x;
  }

  score() {
    return this.attempts === 0 ? 0 : (this.inBand / this.attempts) * 100;
  }

  detail() {
    return { hits: this.inBand, attempts: this.ticks };
  }

  private draw(bandCenter: number, bandHalf: number) {
    const g = this.g;
    g.clear();
    const baseY = this.ctx.h * 0.62;
    // frozen lake
    g.roundRect(40, baseY - 26, this.ctx.w - 80, 74, 22).fill({ color: 0x0c3b47, alpha: 0.9 });
    // safe band
    g.roundRect(bandCenter - bandHalf, baseY - 26, bandHalf * 2, 74, 18).fill({ color: 0x22c55e, alpha: 0.22 });
    g.roundRect(bandCenter - bandHalf, baseY - 26, bandHalf * 2, 74, 18).stroke({ color: 0x4ade80, width: 2, alpha: 0.85 });
    // danger edges
    g.roundRect(40, baseY - 4, Math.max(0, bandCenter - bandHalf - 40), 12, 6).fill({ color: 0xef4444, alpha: 0.4 });
    // penguin
    const py = baseY;
    g.ellipse(this.px, py, 26, 30).fill({ color: 0x1e293b });
    g.ellipse(this.px, py + 3, 16, 20).fill({ color: 0xf8fafc });
    g.circle(this.px - 7, py - 12, 3).fill({ color: 0xffffff });
    g.circle(this.px + 7, py - 12, 3).fill({ color: 0xffffff });
    g.circle(this.px - 7, py - 12, 1.6).fill({ color: 0x0b1220 });
    g.circle(this.px + 7, py - 12, 1.6).fill({ color: 0x0b1220 });
    g.poly([this.px, py - 2, this.px + 9, py + 3, this.px, py + 7]).fill({ color: 0xf59e0b });
    // balance indicator
    const ok = Math.abs(this.px - bandCenter) < bandHalf;
    g.roundRect(this.ctx.w / 2 - 160, 52, 320, 10, 5).fill({ color: 0x0d3a37 });
    g.roundRect(this.ctx.w / 2 - 160, 52, (this.px / this.ctx.w) * 320, 10, 5).fill({ color: ok ? 0x22c55e : 0xef4444 });
    this.label.text = `稳定保持 · 目标光带${ok ? '已对准' : '偏离中'} · ${((this.inBand / Math.max(1, this.ticks)) * 100).toFixed(0)}%`;
  }
}

/** 果实收集 — press when the fruit is in the basket zone. */
interface Fruit {
  x: number;
  y: number;
  vy: number;
  r: number;
  kind: number;
}

class GripGame extends BaseGame {
  private fruits: Fruit[] = [];
  private spawn = 0;
  private glow = 0;
  private zoneY = 0;

  update(dt: number, t: number) {

    this.spawn -= dt;
    this.glow = Math.max(0, this.glow - dt * 2.4);
    if (this.spawn <= 0) {
      this.spawn = 0.9 + Math.random() * 0.5;
      const kinds = [0, 1, 2];
      this.fruits.push({
        x: 80 + Math.random() * (this.ctx.w - 160),
        y: 70,
        vy: 120 + Math.random() * 70,
        r: 16 + Math.random() * 8,
        kind: kinds[Math.floor(Math.random() * kinds.length)],
      });
    }
    this.zoneY = this.ctx.h - 118;
    this.fruits = this.fruits.filter((f) => {
      f.y += f.vy * dt;
      if (f.y > this.ctx.h + 30) {
        this.attempts++;
        return false;
      }
      return true;
    });
    this.draw();
  }

  press() {
    this.glow = 1;
    let best: { f: Fruit; idx: number; inZone: boolean } | null = null;
    for (let i = 0; i < this.fruits.length; i++) {
      const f = this.fruits[i];
      const inZone = Math.abs(f.y - (this.zoneY + 34)) < 52;
      if (!best || Math.abs(f.y - this.zoneY) < Math.abs(best.f.y - this.zoneY)) {
        // closest fruit to the basket wins regardless of zone
        best = { f, idx: i, inZone };
      }
      if (inZone && (!best || !best.inZone)) best = { f, idx: i, inZone: true };
    }
    this.attempts++;
    if (best) {
      this.fruits.splice(best.idx, 1);
      if (best.inZone) {
        this.hits++;
        this.ctx.event('有效抓握 +1');
      } else {
        this.ctx.event('时机过早，未接住');
      }
    } else {
      this.ctx.event('空按一次');
    }
  }

  private draw() {
    const g = this.g;
    g.clear();
    // basket
    const bx = this.ctx.w / 2;
    const by = this.zoneY + 34;
    const zoneTop = this.zoneY - 18;
    g.roundRect(bx - 118, zoneTop, 236, 104, 14).fill({ color: 0x134e4a, alpha: 0.55 });
    g.roundRect(bx - 118, zoneTop, 236, 104, 14).stroke({ color: 0x2dd4bf, width: 2, alpha: 0.9 });
    g.roundRect(bx - 92, by + 4, 184, 52, 12).fill({ color: 0x9d174d, alpha: 0.4 });
    g.roundRect(bx - 92, by + 4, 184, 52, 12).stroke({ color: 0xf9a8d4, width: 2.5 });
    // grip button
    const pulse = 1 + this.glow * 0.18;
    g.circle(bx, by + 118, 30 * pulse).fill({ color: 0xf9a8d4, alpha: 0.2 });
    g.circle(bx, by + 118, 21 * pulse).fill({ color: 0xbe123c });
    g.circle(bx, by + 118, 8).fill({ color: 0xfed7e4 });
    for (const f of this.fruits) {
      const colors = [0xfacc15, 0xf97316, 0x22c55e];
      g.circle(f.x, f.y, f.r).fill({ color: colors[f.kind] });
      g.ellipse(f.x, f.y - f.r - 4, f.r * 0.5, 5).fill({ color: 0x4ade80, alpha: 0.8 });
    }
    this.label.text = `有效抓握 ${this.hits} / 尝试 ${this.attempts}`;
  }
  release() {}
}

/** 配对旅店 — memory match with six distinct shapes (no font dependency). */
class HotelGame extends BaseGame {
  private cards: { shape: number; hue: number; flipped: boolean; matched: boolean }[] = [];
  private cols = 4;
  private rows = 3;
  private open: number[] = [];
  private lock = 0;
  private pairs = 0;
  private flips = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    const deck = [
      { shape: 0, hue: 0 },
      { shape: 1, hue: 1 },
      { shape: 2, hue: 2 },
      { shape: 3, hue: 3 },
      { shape: 4, hue: 4 },
      { shape: 5, hue: 5 },
    ];
    const set = [...deck, ...deck].sort(() => Math.random() - 0.5).slice(0, 12);
    this.cards = set.map((c) => ({ ...c, flipped: false, matched: false }));
  }

  private layout() {
    const pad = 90;
    const gw = this.ctx.w - pad * 2;
    const gh = this.ctx.h - 190;
    return { pad, gw, gh, cw: gw / this.cols, ch: gh / this.rows };
  }

  private cardRect(i: number) {
    const { pad, cw, ch } = this.layout();
    const col = i % this.cols;
    const row = Math.floor(i / this.cols);
    return { x: pad + col * cw, y: 96 + row * ch, w: cw - 12, h: ch - 12 };
  }

  update(dt: number, _t: number) {
    if (this.open.length === 2) {
      this.lock -= dt;
      if (this.lock <= 0) {
        const [a, b] = this.open;
        if (this.cards[a].shape === this.cards[b].shape) {
          this.cards[a].matched = true;
          this.cards[b].matched = true;
          this.pairs++;
        } else {
          this.cards[a].flipped = false;
          this.cards[b].flipped = false;
        }
        this.open = [];
      }
    }
    this.draw();
  }

  press(x: number, y: number) {
    if (this.open.length === 2) return;
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i];
      if (c.flipped || c.matched) continue;
      const r = this.cardRect(i);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        c.flipped = true;
        this.flips++;
        this.open.push(i);
        this.ctx.event('翻开一张卡片');
        if (this.open.length === 2) this.lock = 1.1;
        return;
      }
    }
  }

  score() {
    return this.flips === 0 ? 0 : (this.pairs / Math.ceil(this.flips / 2)) * 100;
  }
  detail() {
    return { hits: this.pairs, attempts: Math.ceil(this.flips / 2) };
  }

  private paintShape(g: Graphics, shape: number, hue: number, x: number, y: number, r: number) {
    const hues = [0xf472b6, 0xfbbf24, 0x60a5fa, 0x4ade80, 0xc084fc, 0x2dd4bf];
    const c = hues[hue % hues.length];
    switch (shape) {
      case 0: // circle
        g.circle(x, y, r).fill({ color: c });
        break;
      case 1: // square
        g.roundRect(x - r, y - r, r * 2, r * 2, 5).fill({ color: c });
        break;
      case 2: // triangle
        g.poly([x, y - r, x + r, y + r * 0.8, x - r, y + r * 0.8]).fill({ color: c });
        break;
      case 3: // diamond
        g.poly([x, y - r, x + r, y, x, y + r, x - r, y]).fill({ color: c });
        break;
      case 4: // star
        g.poly(starPoints(x, y, r, r * 0.45, 5)).fill({ color: c });
        break;
      default: // heart-ish: two lobes + point
        g.circle(x - r * 0.4, y - r * 0.25, r * 0.55).fill({ color: c });
        g.circle(x + r * 0.4, y - r * 0.25, r * 0.55).fill({ color: c });
        g.poly([x - r * 0.9, y - r * 0.1, x + r * 0.9, y - r * 0.1, x, y + r]).fill({ color: c });
    }
  }

  private draw() {
    const g = this.g;
    g.clear();
    const { pad, gw, gh } = this.layout();
    g.roundRect(pad - 14, 82, gw + 28, gh + 24, 18).fill({ color: 0x2a1a4d, alpha: 0.65 });
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i];
      const r = this.cardRect(i);
      if (c.matched) {
        g.roundRect(r.x, r.y, r.w, r.h, 12).fill({ color: 0x22c55e, alpha: 0.18 });
        g.roundRect(r.x, r.y, r.w, r.h, 12).stroke({ color: 0x4ade80, width: 2, alpha: 0.6 });
        this.paintShape(g, c.shape, c.hue, r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.22);
      } else if (c.flipped) {
        g.roundRect(r.x, r.y, r.w, r.h, 12).fill({ color: 0xf5f3ff });
        g.roundRect(r.x, r.y, r.w, r.h, 12).stroke({ color: 0x7c3aed, width: 2.5 });
        this.paintShape(g, c.shape, c.hue, r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.24);
      } else {
        g.roundRect(r.x, r.y, r.w, r.h, 12).fill({ color: 0x4c1d95 });
        g.roundRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10, 9).stroke({ color: 0xa78bfa, width: 1.2, alpha: 0.7 });
        g.circle(r.x + r.w / 2, r.y + r.h / 2, 12).fill({ color: 0xc4b5fd, alpha: 0.35 });
      }
    }
    this.label.text = `配对成功 ${this.pairs} 对 · 翻牌 ${this.flips} 次`;
  }
}

function starPoints(cx: number, cy: number, outer: number, inner: number, points: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const ang = (Math.PI / points) * i - Math.PI / 2;
    out.push(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad);
  }
  return out;
}

/** 镜子舞 — follow the moving target and hold the pointer on it. */
class MirrorGame extends BaseGame {
  private tx = 0;
  private ty = 0;
  private seq = 0;
  private goodT = 0;
  private ptr = { x: -999, y: -999 };
  private promptTime = 0;
  private sinceSample = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.ptr = { x: ctx.w / 2, y: ctx.h * 0.5 };
  }

  update(dt: number, t: number) {

    this.promptTime += dt;
    if (this.promptTime > 4.5) {
      this.promptTime = 0;
      this.seq++;
      this.ctx.event('切换动作提示');
    }
    const phase = this.seq * 1.7;
    this.tx = this.ctx.w / 2 + Math.sin(t * 0.9 + phase) * this.ctx.w * 0.26;
    this.ty = this.ctx.h * 0.5 + Math.sin(t * 1.6 + phase) * this.ctx.h * 0.2;
    // the pointer is where the child "is"; score how close their body is to the target
    const dist = Math.hypot(this.ptr.x - this.tx, this.ptr.y - this.ty);
    this.sinceSample += dt;
    if (this.sinceSample >= 0.1) {
      this.sinceSample = 0;
      this.attempts++;
      if (dist < 70) {
        this.goodT++;
        this.hits = this.goodT;
      }
    }
    this.draw();
  }

  move(x: number, y: number) {
    this.ptr = { x, y };
  }

  score() {
    return this.attempts === 0 ? 0 : (this.goodT / this.attempts) * 100;
  }
  detail() {
    return { hits: this.goodT, attempts: this.attempts };
  }

  private draw() {
    const g = this.g;
    g.clear();
    // body silhouette
    const cx = this.ctx.w / 2;
    const cy = this.ctx.h * 0.5;
    g.circle(cx, cy - 96, 34).fill({ color: 0x0f766e, alpha: 0.4 });
    g.roundRect(cx - 30, cy - 60, 60, 130, 26).fill({ color: 0x0f766e, alpha: 0.4 });
    // limbs follow target lean
    const lean = (this.tx - cx) / (this.ctx.w / 2);
    g.moveTo(cx - 26, cy - 36).lineTo(cx - 70 - lean * 26, cy + 6).stroke({ color: 0x5eead4, width: 8, alpha: 0.6 });
    g.moveTo(cx + 26, cy - 36).lineTo(cx + 70 - lean * 26, cy + 6).stroke({ color: 0x5eead4, width: 8, alpha: 0.6 });
    g.moveTo(cx - 16, cy + 66).lineTo(cx - 34 + lean * 20, cy + 132).stroke({ color: 0x5eead4, width: 8, alpha: 0.6 });
    g.moveTo(cx + 16, cy + 66).lineTo(cx + 34 + lean * 20, cy + 132).stroke({ color: 0x5eead4, width: 8, alpha: 0.6 });
    // target
    g.circle(this.tx, this.ty, 76).stroke({ color: 0x2dd4bf, width: 2, alpha: 0.5 });
    g.circle(this.tx, this.ty, 52).fill({ color: 0x14b8a6, alpha: 0.18 });
    g.circle(this.tx, this.ty, 30).fill({ color: 0x2dd4bf, alpha: 0.9 });
    // pointer — where the child is reaching; a ghost trail shows the target offset
    if (this.ptr.x > 0) {
      const ok = Math.hypot(this.ptr.x - this.tx, this.ptr.y - this.ty) < 70;
      g.moveTo(this.ptr.x, this.ptr.y).lineTo(this.tx, this.ty);
      g.stroke({ color: ok ? 0x22c55e : 0xf97316, width: 2, alpha: 0.35 });
      g.circle(this.ptr.x, this.ptr.y, 18).fill({ color: ok ? 0x22c55e : 0xf97316, alpha: 0.95 });
      g.circle(this.ptr.x, this.ptr.y, 7).fill({ color: 0xffffff, alpha: 0.8 });
    }
    this.label.text = `动作同步 ${((this.goodT / Math.max(1, this.attempts)) * 100).toFixed(0)}% · 第 ${this.seq + 1} 个动作`;
  }
}

/** 节拍森林 — tap when the note crosses the golden line. */
interface Note {
  x: number;
  y: number;
  vy: number;
  hit: boolean;
  lane: number;
}

class RhythmGame extends BaseGame {
  private notes: Note[] = [];
  private spawn = 0;
  private line = 0;
  private hitLane = -1;
  private hitLaneAt = -99;
  private t = 0;
  private lastJudge: { text: string; t: number; ok: boolean } | null = null;
  private judgeText: Text;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.judgeText = new Text({
      text: '',
      style: new TextStyle({ fontFamily: ctx.font, fontSize: 18, fontWeight: '700', fill: 0xfbbf24 }),
    });
    this.judgeText.anchor.set(0.5, 0);
    this.judgeText.position.set(ctx.w / 2, ctx.h - 196);
    this.judgeText.resolution = 2;
    ctx.root.addChild(this.judgeText);
  }

  update(dt: number, t: number) {
    this.t = t;
    this.line = this.ctx.h - 150;
    this.spawn -= dt;
    if (this.spawn <= 0) {
      this.spawn = 0.85;
      const lanes = 7;
      const lane = Math.floor(Math.random() * lanes);
      const lx = 90 + lane * ((this.ctx.w - 180) / (lanes - 1));
      this.notes.push({ x: lx, y: 50, vy: 190, hit: false, lane });
    }
    this.notes = this.notes.filter((n) => {
      n.y += n.vy * dt;
      if (!n.hit && n.y > this.ctx.h - 30) {
        this.attempts++;
        this.lastJudge = { text: '错过', t, ok: false };
        return false;
      }
      return n.y < this.ctx.h + 40 && !n.hit;
    });
    this.draw();
  }

  press() {
    let best: { n: Note; idx: number; d: number } | null = null;
    for (let i = 0; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.hit) continue;
      const d = Math.abs(n.y - this.line);
      if (!best || d < best.d) best = { n, idx: i, d };
    }
    this.attempts++;
    if (best) {
      if (best.d < 60) {
        this.hits++;
        this.hitLane = best.n.lane;
        this.hitLaneAt = this.t;
        this.notes.splice(best.idx, 1);
        this.lastJudge = { text: '节拍准确 +1', t: this.t, ok: true };
        this.ctx.event('节拍准确 +1');
      } else {
        this.notes.splice(best.idx, 1);
        this.lastJudge = { text: '节奏偏了', t: this.t, ok: false };
      }
    } else {
      this.lastJudge = { text: '空拍', t: this.t, ok: false };
    }
  }

  private draw() {
    const g = this.g;
    g.clear();
    // forest lanes
    for (let i = 0; i < 7; i++) {
      const x = 90 + i * ((this.ctx.w - 180) / 6);
      const active = i === this.hitLane && this.t - this.hitLaneAt < 0.45;
      g.roundRect(x - 22, 40, 44, this.ctx.h - 120, 10).fill({
        color: active ? 0x4338ca : 0x1e1b4b,
        alpha: active ? 0.85 : 0.5,
      });
    }
    const lx = this.ctx.w / 2;
    g.roundRect(lx - 56, this.line - 4, 112, 106, 10).fill({ color: 0xf59e0b, alpha: 0.14 });
    g.rect(60, this.line, this.ctx.w - 120, 5).fill({ color: 0xfbbf24, alpha: 0.9 });
    // drum
    g.circle(lx, this.line + 76, 34).fill({ color: 0x4338ca });
    g.circle(lx, this.line + 76, 24).fill({ color: 0xa5b4fc, alpha: 0.75 });
    for (const n of this.notes) {
      g.circle(n.x, n.y, 18).fill({ color: 0xa5b4fc });
      g.circle(n.x, n.y, 10).fill({ color: 0x3730a3 });
    }
    if (this.lastJudge && this.t - this.lastJudge.t < 1.3) {
      this.judgeText.text = this.lastJudge.text;
      this.judgeText.alpha = Math.max(0, 1 - (this.t - this.lastJudge.t) / 1.3);
      this.judgeText.style.fill = this.lastJudge.ok ? 0xfbbf24 : 0xf87171;
    } else {
      this.judgeText.alpha = 0;
    }
    this.label.text = `节拍准确 ${this.hits} / ${this.attempts}`;
  }
}
