import { type JSX, Show, createSignal } from 'solid-js';
import type { BatchStatus, PartStatus } from './types';

export function Modal(props: {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: JSX.Element;
  footer?: JSX.Element;
}) {
  return (
    <div class="modal-mask" onClick={(e) => e.target === e.currentTarget && props.onClose()}>
      <div class={`modal${props.wide ? ' wide' : ''}`}>
        <div class="modal-head">
          <h3>{props.title}</h3>
          <button class="x" onClick={props.onClose}>×</button>
        </div>
        <div class="modal-body">{props.children}</div>
        <Show when={props.footer}>
          <div class="modal-foot">{props.footer}</div>
        </Show>
      </div>
    </div>
  );
}

const PART_STATUS: Record<PartStatus, { label: string; cls: string }> = {
  pending_mold: { label: '待开模', cls: 'gray' },
  trial_pending: { label: '待试模', cls: 'amber' },
  repairing: { label: '修模中', cls: 'red' },
  mold_ready: { label: '模具合格', cls: 'green' },
  scrapped: { label: '已报废', cls: 'gray' },
};
export function PartStatusBadge(p: { status: PartStatus }) {
  const s = PART_STATUS[p.status];
  return <span class={`badge ${s.cls}`}>{s.label}</span>;
}

const BATCH_STATUS: Record<BatchStatus, { label: string; cls: string }> = {
  pending_schedule: { label: '待排产', cls: 'gray' },
  injecting: { label: '注塑中', cls: 'blue' },
  pending_inspect: { label: '待检验', cls: 'amber' },
  rework: { label: '返工', cls: 'red' },
  released: { label: '放行', cls: 'green' },
};
export function BatchStatusBadge(p: { status: BatchStatus }) {
  const s = BATCH_STATUS[p.status];
  return <span class={`badge ${s.cls}`}>{s.label}</span>;
}
export const BATCH_STATUS_LABEL = (s: BatchStatus) => BATCH_STATUS[s].label;

export function LifeBar(p: { pct: number }) {
  const used = 1 - p.pct;
  const cls = p.pct < 0.1 ? 'danger' : p.pct < 0.25 ? 'warn' : 'ok';
  return (
    <div class="flex items-center gap-2">
      <div class="progress flex-1"><i class={cls} style={{ width: `${used * 100}%` }} /></div>
      <span style={{ 'font-size': '12px', 'white-space': 'nowrap' }} class={p.pct < 0.1 ? 'err' : 'muted'}>
        余 {(p.pct * 100).toFixed(1)}%
      </span>
    </div>
  );
}

/** 受控弹窗式确认消息 */
export function useFlash() {
  const [msg, setMsg] = createSignal<{ type: 'ok' | 'err' | 'warn'; text: string } | null>(null);
  let t: ReturnType<typeof setTimeout>;
  const flash = (type: 'ok' | 'err' | 'warn', text: string) => {
    setMsg({ type, text });
    clearTimeout(t);
    t = setTimeout(() => setMsg(null), 4200);
  };
  const FlashBox = () => (
    <Show when={msg()}>
      <div style={{ position: 'fixed', 'z-index': 99, top: '70px', right: '24px', 'max-width': '420px' }}>
        <div class={msg()!.type === 'ok' ? 'toast-ok' : msg()!.type === 'warn' ? 'toast-warn' : 'toast-danger'}>
          <span>{msg()!.type === 'ok' ? '✅' : msg()!.type === 'warn' ? '⚠️' : '⛔'}</span>
          <span>{msg()!.text}</span>
        </div>
      </div>
    </Show>
  );
  return { flash, FlashBox };
}

export function Empty(p: { text: string }) {
  return <div class="empty">📭 {p.text}</div>;
}
