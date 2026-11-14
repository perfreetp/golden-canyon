// 全局状态管理：内存状态 + localStorage 持久化 + 订阅通知
import type {
  AppState,
  ColorSpec,
  DiagramDoc,
  ReviewRecord,
  TermEntry,
  BrainTemplate,
  ViewSession,
} from '../types';
import { buildSeedState } from '../data/seed';
import { uid } from './geometry';

const STORAGE_KEY = 'neurosurg-platform-state-v1';

type Listener = () => void;

class Store {
  private state: AppState;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = this.load();
  }

  private load(): AppState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as AppState;
    } catch {
      /* 损坏则回退种子 */
    }
    return buildSeedState();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* 配额超限时静默 */
    }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.persist();
    this.listeners.forEach((fn) => fn());
  }

  get snapshot(): AppState {
    return this.state;
  }

  get docs(): DiagramDoc[] {
    return this.state.docs;
  }

  getDoc(id: string): DiagramDoc | undefined {
    return this.state.docs.find((d) => d.id === id);
  }

  getTemplate(id: string): BrainTemplate {
    return this.state.templates.find((t) => t.id === id) ?? this.state.templates[0];
  }

  get colors(): ColorSpec[] {
    return this.state.colors;
  }

  get terms(): TermEntry[] {
    return this.state.terms;
  }

  get templates(): BrainTemplate[] {
    return this.state.templates;
  }

  get sessions(): ViewSession[] {
    return this.state.sessions;
  }

  // ---------- 图示 --------//

  createDoc(partial: Partial<DiagramDoc>): DiagramDoc {
    const tpl = this.state.templates[0];
    const doc: DiagramDoc = {
      id: uid('doc'),
      title: partial.title ?? '未命名术前图示',
      patientName: partial.patientName ?? '',
      patientNo: partial.patientNo ?? '',
      author: this.state.currentDoctor,
      templateId: tpl.id,
      layers: [
        { id: 'ly-template', name: '模板网格', visible: true, locked: false, opacity: 1 },
        { id: 'ly-lesion', name: '病变范围', visible: true, locked: false, opacity: 1 },
        { id: 'ly-eloquent', name: '功能区', visible: true, locked: false, opacity: 1 },
        { id: 'ly-vessel', name: '血管走行', visible: true, locked: false, opacity: 1 },
        { id: 'ly-approach', name: '手术入路', visible: true, locked: false, opacity: 1 },
        { id: 'ly-note', name: '标注', visible: true, locked: false, opacity: 1 },
      ],
      shapes: [],
      showTemplate: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'draft',
    };
    this.state.docs = [doc, ...this.state.docs];
    this.emit();
    return doc;
  }

  saveDoc(doc: DiagramDoc): void {
    const idx = this.state.docs.findIndex((d) => d.id === doc.id);
    const next = { ...doc, updatedAt: Date.now() };
    if (idx >= 0) this.state.docs[idx] = next;
    else this.state.docs = [next, ...this.state.docs];
    this.emit();
  }

  deleteDoc(id: string): void {
    this.state.docs = this.state.docs.filter((d) => d.id !== id);
    this.emit();
  }

  /** 提交审核：状态转为 submitted */
  submitDoc(id: string): void {
    const doc = this.getDoc(id);
    if (!doc) return;
    doc.status = 'submitted';
    doc.updatedAt = Date.now();
    doc.review = undefined;
    this.emit();
  }

  /** 审核：通过或退回（退回必须写明修改项） */
  reviewDoc(id: string, review: Omit<ReviewRecord, 'reviewer' | 'at'>): void {
    const doc = this.getDoc(id);
    if (!doc) return;
    doc.review = { ...review, reviewer: this.state.currentReviewer, at: Date.now() };
    doc.status = review.result === 'approved' ? 'approved' : 'rejected';
    doc.updatedAt = Date.now();
    this.emit();
  }

  /** 发布：生成分享链接（模拟病房平板推送） */
  publishDoc(id: string): string {
    const doc = this.getDoc(id);
    if (!doc) return '';
    if (!doc.shareToken) doc.shareToken = uid('shr');
    doc.publishedAt = Date.now();
    doc.updatedAt = Date.now();
    this.emit();
    return doc.shareToken;
  }

  getDocByToken(token: string): DiagramDoc | undefined {
    return this.state.docs.find((d) => d.shareToken === token);
  }

  recordSession(session: Omit<ViewSession, 'id'>): void {
    this.state.sessions.push({ ...session, id: uid('vs') });
    this.emit();
  }

  // ---------- 模板 / 术语 / 配色（运营后台） --------//

  saveTemplate(tpl: BrainTemplate): void {
    const idx = this.state.templates.findIndex((t) => t.id === tpl.id);
    const next = { ...tpl, updatedAt: Date.now() };
    if (idx >= 0) this.state.templates[idx] = next;
    else this.state.templates = [...this.state.templates, next];
    this.emit();
  }

  deleteTemplate(id: string): void {
    if (this.state.templates.length <= 1) return;
    this.state.templates = this.state.templates.filter((t) => t.id !== id);
    this.emit();
  }

  saveTerm(term: TermEntry): void {
    const idx = this.state.terms.findIndex((t) => t.id === term.id);
    if (idx >= 0) this.state.terms[idx] = term;
    else this.state.terms = [...this.state.terms, term];
    this.emit();
  }

  deleteTerm(id: string): void {
    this.state.terms = this.state.terms.filter((t) => t.id !== id);
    this.emit();
  }

  saveColor(spec: ColorSpec): void {
    const idx = this.state.colors.findIndex((c) => c.id === spec.id);
    if (idx >= 0) this.state.colors[idx] = spec;
    else this.state.colors = [...this.state.colors, spec];
    this.emit();
  }

  // ---------- 自动预检（审核辅助） --------//

  /** 检查缺解剖标注 / 颜色不符规范的图形 */
  precheck(doc: DiagramDoc): { missingAnatomy: string[]; badColor: string[] } {
    const missingAnatomy: string[] = [];
    const badColor: string[] = [];
    for (const s of doc.shapes) {
      const name = s.kind === 'note' ? s.text : s.label ?? s.id;
      if (s.kind !== 'note' && !s.anatomyTag) missingAnatomy.push(name);
      if (s.kind === 'region') {
        const spec = this.state.colors.find((c) => c.semantic === s.semantic);
        if (spec && (spec.fill.toLowerCase() !== s.fill.toLowerCase() || spec.stroke.toLowerCase() !== s.stroke.toLowerCase())) {
          badColor.push(name);
        }
      }
      if (s.kind === 'path') {
        const spec = this.state.colors.find((c) => c.semantic === s.semantic);
        if (spec && spec.stroke.toLowerCase() !== s.stroke.toLowerCase()) {
          badColor.push(name);
        }
      }
    }
    return { missingAnatomy, badColor };
  }

  // ---------- 统计 --------//

  stats(): {
    rows: { doctor: string; submitted: number; rejected: number; approved: number; rejectRate: number; avgViewSec: number }[];
    totalSessions: number;
    avgViewSec: number;
  } {
    const map = new Map<string, { submitted: number; rejected: number; approved: number }>();
    for (const doc of this.state.docs) {
      const row = map.get(doc.author) ?? { submitted: 0, rejected: 0, approved: 0 };
      if (doc.status === 'submitted' || doc.status === 'approved' || doc.status === 'rejected') row.submitted++;
      if (doc.status === 'rejected') row.rejected++;
      if (doc.status === 'approved') row.approved++;
      map.set(doc.author, row);
    }

    const viewByDoctor = new Map<string, number[]>();
    for (const s of this.state.sessions) {
      const doc = this.state.docs.find((d) => d.id === s.docId);
      if (!doc) continue;
      const arr = viewByDoctor.get(doc.author) ?? [];
      arr.push(s.durationSec);
      viewByDoctor.set(doc.author, arr);
    }

    const rows = [...map.entries()].map(([doctor, r]) => {
      const views = viewByDoctor.get(doctor) ?? [];
      const avgViewSec = views.length ? Math.round(views.reduce((a, b) => a + b, 0) / views.length) : 0;
      return {
        doctor,
        ...r,
        rejectRate: r.submitted ? Math.round((r.rejected / r.submitted) * 100) : 0,
        avgViewSec,
      };
    });

    const all = this.state.sessions;
    const avgViewSec = all.length ? Math.round(all.reduce((a, s) => a + s.durationSec, 0) / all.length) : 0;
    return { rows, totalSessions: all.length, avgViewSec };
  }

  resetToSeed(): void {
    this.state = buildSeedState();
    this.emit();
  }
}

export const store = new Store();
