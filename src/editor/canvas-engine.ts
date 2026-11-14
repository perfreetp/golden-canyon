// 画布引擎：SVG 绘制、节点/圆弧编辑、网格与端点吸附、对齐参考线、布尔运算入口
import type { BrainTemplate, DiagramDoc, Layer, Point, RegionNode, Shape } from '../types';
import {
  dist,
  findGuides,
  polygonBoolean,
  shapePathD,
  snapPoint,
  uid,
  type Guide,
} from '../core/geometry';
import { store } from '../core/store';

export type Tool =
  | 'select'
  | 'lesion'
  | 'eloquent'
  | 'vessel'
  | 'approach'
  | 'note'
  | 'pan';

interface EngineOptions {
  /** 一次变更即将开始（变更前），编辑器据此压入撤销快照 */
  beforeChange?: (label: string) => void;
  /** 变更完成后同步 store */
  onChange: () => void;
  onSelect: (shape: Shape | null) => void;
}

const HANDLE_R = 5.5;
const SNAP_PX = 11;
const GUIDE_PX = 8;

export class CanvasEngine {
  doc: DiagramDoc;
  tpl: BrainTemplate;
  tool: Tool = 'select';
  selectedId: string | null = null;
  snapEnabled = true;
  private guides: Guide[] = [];
  private hover: Point | null = null;
  private draftNodes: RegionNode[] = [];
  private svg: SVGSVGElement | null = null;
  private drag:
    | { kind: 'node'; shapeId: string; index: number }
    | { kind: 'move'; shapeId: string; start: Point; original: RegionNode[] }
    | null = null;

  constructor(doc: DiagramDoc, tpl: BrainTemplate, private opts: EngineOptions) {
    this.doc = doc;
    this.tpl = tpl;
  }

  private begin(label: string): void {
    this.opts.beforeChange?.(label);
  }

  get shape(): Shape | null {
    return this.doc.shapes.find((s) => s.id === this.selectedId) ?? null;
  }

  get layerLocked(): boolean {
    const s = this.shape;
    if (!s) return false;
    return this.doc.layers.find((l) => l.id === s.layerId)?.locked ?? false;
  }

  select(id: string | null): void {
    this.selectedId = id;
    this.opts.onSelect(this.shape);
    this.render();
  }

  setTool(t: Tool): void {
    this.tool = t;
    this.draftNodes = [];
    if (t !== 'select') this.selectedId = null;
    this.render();
  }

  // ---------- 坐标 ----------
  private toLocal(ev: PointerEvent | MouseEvent, svg: SVGSVGElement): Point {
    const rect = svg.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * this.tpl.width;
    const y = ((ev.clientY - rect.top) / rect.height) * this.tpl.height;
    return { x, y };
  }

  // ---------- 吸附 ----------
  private anchors(): Point[] {
    const pts: Point[] = [];
    for (const s of this.doc.shapes) {
      if (s.kind === 'note') pts.push(s.at);
      else pts.push(...s.points);
    }
    for (const rg of this.tpl.regions) pts.push(...rg.outline);
    return pts;
  }

  private applySnap(p: Point): Point {
    if (!this.snapEnabled) return p;
    const snap = snapPoint(p, {
      gridSize: this.tpl.gridSize,
      threshold: SNAP_PX,
      anchors: this.anchors(),
      gridEnabled: true,
    });
    let out = snap.point;
    this.guides = findGuides(p, this.anchors(), GUIDE_PX);
    // 参考线吸附优先：水平/垂直对齐到锚点
    for (const g of this.guides) {
      if (g.type === 'v' && Math.abs(g.pos - p.x) <= GUIDE_PX) out = { ...out, x: g.pos };
      if (g.type === 'h' && Math.abs(g.pos - p.y) <= GUIDE_PX) out = { ...out, y: g.pos };
    }
    return out;
  }

  // ---------- 指针事件 ----------
  attach(svg: SVGSVGElement): void {
    this.svg = svg;
    // 事件绑定在 Shadow Root 上做委托：重渲染替换 SVG 节点后监听依然有效
    const host = svg.getRootNode() as ShadowRoot;
    if (!(host as EventTarget & { __canvasDelegated?: boolean }).__canvasDelegated) {
      (host as EventTarget & { __canvasDelegated?: boolean }).__canvasDelegated = true;
      host.addEventListener('pointerdown', (e) => {
        if ((e.target as Element).closest('#canvas-svg')) this.onDown(e as PointerEvent, this.svg!);
      });
      host.addEventListener('pointermove', (e) => {
        if ((e.target as Element).closest('#canvas-svg')) this.onMove(e as PointerEvent, this.svg!);
      });
      host.addEventListener('pointerup', () => this.onUp());
      host.addEventListener('dblclick', (e) => {
        if ((e.target as Element).closest('#canvas-svg')) this.onDblClick(e as MouseEvent, this.svg!);
      });
      host.addEventListener('contextmenu', (e) => {
        if ((e.target as Element).closest('#canvas-svg')) {
          e.preventDefault();
          this.draftNodes = [];
          this.render();
        }
      });
    }
  }

  private onDown(ev: PointerEvent, svg: SVGSVGElement): void {
    const p = this.toLocal(ev, svg);
    const target = ev.target as Element;
    const handleShape = target.closest<SVGGElement>('[data-handle]');

    // 节点拖拽
    if (handleShape) {
      const shapeId = handleShape.dataset.shape!;
      const index = Number(handleShape.dataset.index!);
      this.select(shapeId);
      if (this.layerLocked) return;
      this.begin('拖拽节点');
      this.drag = { kind: 'node', shapeId, index };
      svg.setPointerCapture(ev.pointerId);
      return;
    }

    // 绘制工具
    if (this.tool === 'lesion' || this.tool === 'eloquent' || this.tool === 'vessel' || this.tool === 'approach') {
      const layerId = this.tool === 'lesion' ? 'ly-lesion' : this.tool === 'eloquent' ? 'ly-eloquent' : this.tool === 'vessel' ? 'ly-vessel' : 'ly-approach';
      if (this.doc.layers.find((l) => l.id === layerId)?.locked) return;
      const sp = this.applySnap(p);
      this.draftNodes.push({ id: uid('n'), x: sp.x, y: sp.y, smooth: this.tool === 'vessel' || this.tool === 'approach' ? 0.6 : 0.4 });
      this.render();
      return;
    }

    if (this.tool === 'note') {
      const text = window.prompt('输入标注文字：', '标注');
      if (text) {
        this.begin('添加标注');
        this.doc.shapes.push({
          id: uid('sh'), kind: 'note', semantic: 'annotation', layerId: 'ly-note',
          at: p, text, color: '#475569', createdAt: Date.now(), updatedAt: Date.now(),
        });
        this.opts.onChange();
      }
      return;
    }

    // 选择 / 移动
    if (this.tool === 'select') {
      const shapeEl = target.closest<SVGElement>('[data-shape-id]');
      if (shapeEl) {
        const id = shapeEl.dataset.shapeId!;
        this.select(id);
        const s = this.shape;
        if (s && s.kind !== 'note' && !this.layerLocked) {
          this.begin('移动图形');
          this.drag = { kind: 'move', shapeId: id, start: p, original: s.points.map((n) => ({ ...n })) };
          svg.setPointerCapture(ev.pointerId);
        }
      } else {
        this.select(null);
      }
    }
  }

  private onMove(ev: PointerEvent, svg: SVGSVGElement): void {
    const p = this.toLocal(ev, svg);
    this.hover = p;

    if (this.drag) {
      const sp = this.applySnap(p);
      const s = this.doc.shapes.find((x) => x.id === this.drag!.shapeId);
      if (!s || s.kind === 'note') return;
      if (this.drag.kind === 'node') {
        const node = s.points[this.drag.index];
        node.x = sp.x;
        node.y = sp.y;
      } else {
        const dx = sp.x - this.drag.start.x;
        const dy = sp.y - this.drag.start.y;
        s.points = this.drag.original.map((o) => ({ ...o, x: o.x + dx, y: o.y + dy }));
      }
      s.updatedAt = Date.now();
      this.render();
      return;
    }
    if (this.draftNodes.length) this.render();
    else if (this.snapEnabled) {
      this.applySnap(p);
      this.render();
    }
  }

  private onUp(): void {
    if (this.drag) {
      this.drag = null;
      this.guides = [];
      this.opts.onChange();
      this.render();
    }
  }

  private onDblClick(ev: MouseEvent, svg: SVGSVGElement): void {
    const p = this.toLocal(ev, svg);
    if (this.draftNodes.length) {
      this.commitDraft();
      return;
    }
    const target = ev.target as Element;
    const shapeEl = target.closest<SVGElement>('[data-shape-id]');
    if (shapeEl && this.tool === 'select') {
      const s = this.doc.shapes.find((x) => x.id === shapeEl.dataset.shapeId);
      if (s && s.kind !== 'note') {
        // 双击边线上最接近处插入节点
        const idx = this.nearestEdge(s, p);
        if (idx >= 0) {
          const a = s.points[idx];
          const b = s.points[(idx + 1) % s.points.length];
          this.begin('插入节点');
          s.points.splice(idx + 1, 0, { id: uid('n'), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, smooth: a.smooth });
          this.opts.onChange();
          this.render();
        }
      }
    }
  }

  private nearestEdge(s: Shape, p: Point): number {
    if (s.kind === 'note') return -1;
    let best = -1;
    let bestD = 14;
    const n = s.points.length;
    const closed = s.kind === 'region';
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = s.points[i];
      const b = s.points[(i + 1) % n];
      const d = pointToSegment(p, a, b);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  /** Enter 或切换工具时提交草稿图形 */
  commitDraft(): void {
    if (this.draftNodes.length < 2) {
      this.draftNodes = [];
      this.render();
      return;
    }
    this.begin('绘制图形');
    const t = this.tool;
    const isRegion = t === 'lesion' || t === 'eloquent';
    const id = uid('sh');
    const spec = this.colorFor(t);
    const shape: Shape = isRegion
      ? {
          id, kind: 'region',
          semantic: t as 'lesion' | 'eloquent',
          layerId: t === 'lesion' ? 'ly-lesion' : 'ly-eloquent',
          points: this.draftNodes,
          fill: spec.fill, stroke: spec.stroke,
          label: t === 'lesion' ? '病变范围' : '功能区',
          createdAt: Date.now(), updatedAt: Date.now(),
        }
      : {
          id, kind: 'path',
          semantic: t as 'vessel' | 'approach',
          layerId: t === 'vessel' ? 'ly-vessel' : 'ly-approach',
          points: this.draftNodes,
          stroke: spec.stroke, width: t === 'vessel' ? 4 : 3,
          dashed: t === 'approach',
          label: t === 'vessel' ? '血管走行' : '手术入路',
          createdAt: Date.now(), updatedAt: Date.now(),
        };
    this.draftNodes = [];
    this.doc.shapes.push(shape);
    this.select(id);
    this.tool = 'select';
    this.opts.onChange();
    this.render();
  }

  cancelDraft(): void {
    this.draftNodes = [];
    this.render();
  }

  private colorFor(tool: Tool): { fill: string; stroke: string } {
    const map: Record<string, string> = {
      lesion: 'lesion', eloquent: 'eloquent', vessel: 'vessel', approach: 'approach',
    };
    const spec = store.colors.find((c) => c.semantic === map[tool]);
    return { fill: spec?.fill ?? '#e5484d', stroke: spec?.stroke ?? '#b42329' };
  }

  // ---------- 节点删除 ----------
  deleteSelected(): void {
    if (!this.selectedId || this.layerLocked) return;
    this.begin('删除图形');
    this.doc.shapes = this.doc.shapes.filter((s) => s.id !== this.selectedId);
    this.select(null);
    this.opts.onChange();
    this.render();
  }

  deleteNode(shapeId: string, index: number): void {
    const s = this.doc.shapes.find((x) => x.id === shapeId);
    if (!s || s.kind === 'note') return;
    const min = s.kind === 'region' ? 3 : 2;
    if (s.points.length <= min) return;
    this.begin('删除节点');
    s.points.splice(index, 1);
    this.opts.onChange();
    this.render();
  }

  setNodeSmooth(shapeId: string, index: number, smooth: number): void {
    const s = this.doc.shapes.find((x) => x.id === shapeId);
    if (!s || s.kind === 'note') return;
    this.begin('调整圆弧');
    s.points[index].smooth = smooth;
    s.updatedAt = Date.now();
    this.opts.onChange();
    this.render();
  }

  // ---------- 图层操作 ----------
  toggleLayer(id: string, key: 'visible' | 'locked'): void {
    const l = this.doc.layers.find((x) => x.id === id);
    if (!l) return;
    this.begin(key === 'locked' ? '锁定图层' : '切换图层显示');
    l[key] = !l[key];
    this.opts.onChange();
    this.render();
  }

  setLayerOpacity(id: string, opacity: number): void {
    const l = this.doc.layers.find((x) => x.id === id);
    if (!l) return;
    l.opacity = opacity;
    this.opts.onChange();
    this.render();
  }

  // ---------- 布尔运算 ----------
  booleanWith(otherId: string, op: 'union' | 'subtract'): void {
    const a = this.shape;
    const b = this.doc.shapes.find((s) => s.id === otherId);
    if (!a || !b || a.kind !== 'region' || b.kind !== 'region') return;
    if (this.layerLocked) return;
    this.begin(op === 'union' ? '布尔求并' : '布尔求差');
    const contours = polygonBoolean(
      a.points.map((p) => ({ x: p.x, y: p.y })),
      b.points.map((p) => ({ x: p.x, y: p.y })),
      op,
    );
    if (!contours.length) {
      // 主体被完全裁掉
      this.doc.shapes = this.doc.shapes.filter((s) => s.id !== a.id && s.id !== b.id);
      this.select(null);
    } else {
      const primary = contours[0];
      a.points = primary.map((p) => ({ id: uid('n'), x: p.x, y: p.y, smooth: 0.35 }));
      a.booleanSource = { op, a: a.id, b: b.id };
      a.updatedAt = Date.now();
      if (op === 'subtract' || contours.length === 1) {
        this.doc.shapes = this.doc.shapes.filter((s) => s.id !== b.id);
      }
    }
    this.opts.onChange();
    this.render();
  }

  // ---------- 渲染 ----------
  render(): void {
    const svg = this.svg;
    if (!svg) return;
    const layerOf = (id: string): Layer => this.doc.layers.find((l) => l.id === id)!;
    const visible = (id: string): boolean => layerOf(id)?.visible ?? true;

    let html = '';

    // 网格
    html += '<g class="grid">';
    for (let x = 0; x <= this.tpl.width; x += this.tpl.gridSize) {
      html += `<line x1="${x}" y1="0" x2="${x}" y2="${this.tpl.height}" />`;
    }
    for (let y = 0; y <= this.tpl.height; y += this.tpl.gridSize) {
      html += `<line x1="0" y1="${y}" x2="${this.tpl.width}" y2="${y}" />`;
    }
    html += '</g>';

    // 模板层
    if (this.doc.showTemplate && visible('ly-template')) {
      const op = layerOf('ly-template')?.opacity ?? 1;
      html += `<g class="tpl" opacity="${op}">`;
      html += `<path class="head" d="${shapePathD(this.tpl.headOutline.map((p, i) => ({ ...p, id: `h${i}`, smooth: 0.5 })), true)}"/>`;
      for (const rg of this.tpl.regions) {
        html += `<path class="tpl-region" data-region="${rg.id}" d="${shapePathD(rg.outline.map((p, i) => ({ ...p, id: `${rg.id}${i}`, smooth: 0.4 })), true)}"/>`;
        const cx = rg.outline.reduce((a, p) => a + p.x, 0) / rg.outline.length;
        const cy = rg.outline.reduce((a, p) => a + p.y, 0) / rg.outline.length;
        html += `<text class="tpl-label" x="${cx}" y="${cy}">${rg.name}</text>`;
      }
      html += '</g>';
    }

    // 图形层
    for (const layer of this.doc.layers) {
      if (layer.id === 'ly-template' || !layer.visible) continue;
      html += `<g opacity="${layer.opacity}">`;
      for (const s of this.doc.shapes) {
        if (s.layerId !== layer.id) continue;
        const selected = s.id === this.selectedId;
        if (s.kind === 'region') {
          html += `<path data-shape-id="${s.id}" class="shape region ${selected ? 'selected' : ''}" d="${shapePathD(s.points, true)}" fill="${s.fill}" stroke="${s.stroke}"/>`;
          if (s.label) {
            const cx = s.points.reduce((a, p) => a + p.x, 0) / s.points.length;
            const cy = s.points.reduce((a, p) => a + p.y, 0) / s.points.length;
            html += `<text class="shape-label" x="${cx}" y="${cy}">${s.label}</text>`;
          }
        } else if (s.kind === 'path') {
          html += `<path data-shape-id="${s.id}" class="shape path ${selected ? 'selected' : ''}" d="${shapePathD(s.points, false)}" stroke="${s.stroke}" ${s.dashed ? 'stroke-dasharray="10 7"' : ''} stroke-width="${s.width}"/>`;
          const end = s.points[s.points.length - 1];
          html += `<circle class="path-end" data-shape-id="${s.id}" cx="${end.x}" cy="${end.y}" r="${s.width + 1.5}" fill="${s.stroke}"/>`;
        } else {
          html += `<g data-shape-id="${s.id}" class="note ${selected ? 'selected' : ''}"><circle cx="${s.at.x}" cy="${s.at.y - 5}" r="4" fill="${s.color}"/><text x="${s.at.x + 8}" y="${s.at.y}" fill="${s.color}">${escapeHtml(s.text)}</text></g>`;
        }
      }
      html += '</g>';
    }

    // 选中图形的节点
    const sel = this.shape;
    if (sel && sel.kind !== 'note') {
      sel.points.forEach((n, i) => {
        html += `<g data-handle data-shape="${sel.id}" data-index="${i}" class="handle">
          <circle cx="${n.x}" cy="${n.y}" r="${HANDLE_R}" />
          <text x="${n.x + 9}" y="${n.y - 8}" class="handle-tip">${n.smooth > 0.01 ? '弧' : '角'}${i + 1} · 双击删</text>
        </g>`;
      });
    }

    // 草稿
    if (this.draftNodes.length) {
      const closed = this.tool === 'lesion' || this.tool === 'eloquent';
      const pts = this.hover ? [...this.draftNodes, { ...this.hover, id: 'hover', smooth: 0.4 }] : this.draftNodes;
      html += `<path class="draft" d="${shapePathD(pts, closed)}"/>`;
      for (const n of this.draftNodes) html += `<circle class="draft-node" cx="${n.x}" cy="${n.y}" r="4"/>`;
    }

    // 参考线
    for (const g of this.guides) {
      if (g.type === 'v') html += `<line class="guide" x1="${g.pos}" y1="0" x2="${g.pos}" y2="${this.tpl.height}"/>`;
      else html += `<line class="guide" x1="0" y1="${g.pos}" x2="${this.tpl.width}" y2="${g.pos}"/>`;
    }

    svg.innerHTML = html;
  }
}

function pointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
