// 撤销 / 重做：快照式历史，默认保留 100 步（要求 ≥ 50）
export interface Snapshot<T> {
  label: string;
  at: number;
  state: T;
}

export class HistoryStack<T> {
  private past: Snapshot<T>[] = [];
  private future: Snapshot<T>[] = [];

  constructor(
    private readonly limit = 100,
    private readonly clone: (s: T) => T,
  ) {}

  /** 变更前调用，记录当前状态 */
  push(state: T, label: string): void {
    this.past.push({ label, at: Date.now(), state: this.clone(state) });
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  undo(current: T): { state: T; label: string } | null {
    const snap = this.past.pop();
    if (!snap) return null;
    this.future.push({ label: snap.label, at: Date.now(), state: this.clone(current) });
    return { state: this.clone(snap.state), label: snap.label };
  }

  redo(current: T): { state: T; label: string } | null {
    const snap = this.future.pop();
    if (!snap) return null;
    this.past.push({ label: snap.label, at: Date.now(), state: this.clone(current) });
    return { state: this.clone(snap.state), label: snap.label };
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  get size(): number {
    return this.past.length;
  }

  get undoLabels(): string[] {
    return this.past.map((s) => s.label).reverse();
  }

  get redoLabels(): string[] {
    return this.future.map((s) => s.label);
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
