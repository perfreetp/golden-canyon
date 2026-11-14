import { HALL } from '../data/hall';
import { libItem } from '../data/library';
import { corners, fmt, rectFor } from './geometry';
import type { DeviceInstance, HallConfig } from '../types';

const FONT = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

export interface ExportOptions {
  title: string;
  subtitle: string;
  hall?: HallConfig;
  scaleNote?: string;
  includeZones?: boolean;
  includePower?: boolean;
}

function css(color: number, alpha = 1) {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Draws a clean, printable top view of the hall with all placed devices. */
export function topViewCanvas(devices: DeviceInstance[], opts: ExportOptions): HTMLCanvasElement {
  const hall = opts.hall ?? HALL;
  const pad = 130;
  const pxPerM = 78;
  const W = hall.width * pxPerM + pad * 2;
  const H = hall.depth * pxPerM + pad * 2 + 40;
  const canvas = document.createElement('canvas');
  const dpr = 2;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.scale(dpr, dpr);

  const X = (x: number) => pad + x * pxPerM;
  const Z = (z: number) => pad + z * pxPerM;

  // paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // title block
  ctx.fillStyle = '#0b2b27';
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(opts.title, pad, 52);
  ctx.fillStyle = '#5b6f6a';
  ctx.font = `500 17px ${FONT}`;
  ctx.fillText(opts.subtitle, pad, 82);

  // hall floor
  ctx.fillStyle = '#f8fbfa';
  ctx.fillRect(X(0), Z(0), hall.width * pxPerM, hall.depth * pxPerM);

  // zones
  if (opts.includeZones !== false) {
    for (const z of hall.zones) {
      ctx.fillStyle = css(z.id === 'B' ? 0x0e7490 : 0x0f766e, 0.045);
      ctx.fillRect(X(z.x), Z(z.z), z.w * pxPerM, z.d * pxPerM);
      ctx.strokeStyle = css(0x0f766e, 0.35);
      ctx.setLineDash([9, 6]);
      ctx.lineWidth = 1.2;
      ctx.strokeRect(X(z.x), Z(z.z), z.w * pxPerM, z.d * pxPerM);
      ctx.setLineDash([]);
      const zlabel = `${z.name} · 上限 ${z.capacity}kg`;
      ctx.font = `600 13px ${FONT}`;
      const lw = ctx.measureText(zlabel).width;
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.fillRect(X(z.x) + 4, Z(z.z) + 4, lw + 10, 20);
      ctx.fillStyle = 'rgba(15,118,110,0.72)';
      ctx.fillText(zlabel, X(z.x) + 9, Z(z.z) + 19);
    }
  }

  // grid
  ctx.strokeStyle = 'rgba(15,118,110,0.10)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= hall.width; x += 0.5) {
    ctx.strokeStyle = Math.abs(x % 2) < 1e-6 ? 'rgba(15,118,110,0.20)' : 'rgba(15,118,110,0.08)';
    ctx.beginPath();
    ctx.moveTo(X(x), Z(0));
    ctx.lineTo(X(x), Z(hall.depth));
    ctx.stroke();
  }
  for (let z = 0; z <= hall.depth; z += 0.5) {
    ctx.strokeStyle = Math.abs(z % 2) < 1e-6 ? 'rgba(15,118,110,0.2)' : 'rgba(15,118,110,0.08)';
    ctx.beginPath();
    ctx.moveTo(X(0), Z(z));
    ctx.lineTo(X(hall.width), Z(z));
    ctx.stroke();
  }

  // walls
  const wt = 9;
  ctx.fillStyle = '#c9d8d3';
  ctx.fillRect(X(0) - wt, Z(0) - wt, hall.width * pxPerM + wt * 2, wt);
  ctx.fillRect(X(0) - wt, Z(hall.depth), hall.width * pxPerM + wt * 2, wt);
  ctx.fillRect(X(0) - wt, Z(0), wt, hall.depth * pxPerM);
  ctx.fillRect(X(hall.width), Z(0), wt, hall.depth * pxPerM);

  // door
  const dc = hall.door.center;
  const dw = hall.door.width;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(X(0) - wt - 1, Z(dc - dw / 2), wt + 2, dw * pxPerM);
  ctx.fillStyle = '#7fa49a';
  ctx.fillRect(X(0) - 6, Z(dc - dw / 2), 6, dw * pxPerM);
  ctx.strokeStyle = 'rgba(127,164,154,0.75)';
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(X(0), Z(dc - dw / 2), dw * pxPerM, 0, Math.PI / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#4b615c';
  ctx.font = `600 13px ${FONT}`;
  ctx.save();
  ctx.translate(X(0) - 78, Z(dc));
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('入口 3.2m', 0, 0);
  ctx.restore();
  ctx.textAlign = 'left';

  // power points
  if (opts.includePower !== false) {
    for (const p of hall.powerPoints) {
      ctx.strokeStyle = 'rgba(180,83,9,0.85)';
      ctx.fillStyle = 'rgba(245,158,11,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(X(p.x), Z(p.z), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#7c2d12';
      ctx.font = `700 11px ${FONT}`;
      ctx.fillText(p.label, X(p.x) + 9, Z(p.z) - 7);
    }
  }

  // devices
  const drawn = devices.filter((d) => d.status !== 'draft');
  drawn.forEach((dev, idx0) => {
    const lib = libItem(dev.libId);
    const r = rectFor(dev);
    const cs = corners(r);
    ctx.beginPath();
    ctx.moveTo(X(cs[0].x), Z(cs[0].z));
    for (let i = 1; i < 4; i++) ctx.lineTo(X(cs[i].x), Z(cs[i].z));
    ctx.closePath();

    ctx.fillStyle = lib.color;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(15,23,42,0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // front edge accent: the local -Y edge, rotated into world space
    const cos = Math.cos(dev.rot);
    const sin = Math.sin(dev.rot);
    const cx = dev.x + (dev.d / 2) * sin;
    const cz = dev.z - (dev.d / 2) * cos;
    ctx.strokeStyle = lib.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(X(cx - (dev.w / 2) * cos), Z(cz - (dev.w / 2) * sin));
    ctx.lineTo(X(cx + (dev.w / 2) * cos), Z(cz + (dev.w / 2) * sin));
    ctx.stroke();

    // index number badge
    const idx = idx0 + 1;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(15,23,42,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(X(dev.x), Z(dev.z), 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0b2b27';
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(idx), X(dev.x), Z(dev.z) + 4.5);
    ctx.textAlign = 'left';

    // install point coordinate tag
    ctx.font = `600 11px ${FONT}`;
    ctx.fillStyle = 'rgba(11,43,39,0.75)';
    const coordY = Z(dev.z + Math.max(dev.d, 0.5) / 2) + 15;
    ctx.textAlign = 'center';
    ctx.fillText(`#${idx} (${fmt(dev.x, 2)}, ${fmt(dev.z, 2)})`, X(dev.x), coordY);
    ctx.textAlign = 'left';
  });

  // dimension lines
  ctx.strokeStyle = '#64748b';
  ctx.fillStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.font = `600 13px ${FONT}`;
  ctx.textAlign = 'center';
  // top
  const dimY = 108;
  ctx.beginPath();
  ctx.moveTo(X(0), dimY);
  ctx.lineTo(X(hall.width), dimY);
  ctx.stroke();
  ctx.fillText(`${hall.width} m`, X(hall.width / 2), dimY - 7);
  ctx.beginPath();
  ctx.moveTo(X(0), dimY - 4);
  ctx.lineTo(X(0), dimY + 4);
  ctx.moveTo(X(hall.width), dimY - 4);
  ctx.lineTo(X(hall.width), dimY + 4);
  ctx.stroke();
  // left dimension line
  ctx.beginPath();
  ctx.moveTo(X(0) - 96, Z(0));
  ctx.lineTo(X(0) - 96, Z(hall.depth));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(X(0) - 100, Z(0));
  ctx.lineTo(X(0) - 92, Z(0));
  ctx.moveTo(X(0) - 100, Z(hall.depth));
  ctx.lineTo(X(0) - 92, Z(hall.depth));
  ctx.stroke();
  // left
  ctx.save();
  ctx.translate(X(0) - 112, Z(hall.depth / 2));
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${hall.depth} m`, 0, 0);
  ctx.restore();
  ctx.textAlign = 'left';

  // scale bar
  const sx = pad;
  const sy = H - 62;
  ctx.strokeStyle = '#334155';
  ctx.fillStyle = '#334155';
  ctx.lineWidth = 1.2;
  for (let i = 0; i <= 5; i++) {
    const w = pxPerM;
    ctx.fillStyle = i % 2 === 0 ? '#334155' : '#ffffff';
    ctx.fillRect(sx + i * w, sy, w, 8);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(sx + i * w, sy, w, 8);
    ctx.fillStyle = '#475569';
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText(`${i}`, sx + i * w, sy + 22);
  }
  ctx.fillStyle = '#475569';
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('比例尺（米） · 0.5m 网格', sx, sy - 12);

  // legend
  const lx = X(hall.width) - 350;
  const ly = H - 92;
  ctx.font = `700 12px ${FONT}`;
  ctx.fillStyle = '#0b2b27';
  ctx.fillText('图例', lx, ly);
  const kinds = ['floor', 'wall'] as const;
  kinds.forEach((mount, i) => {
    ctx.fillStyle = mount === 'floor' ? '#0f766e' : '#0e7490';
    ctx.fillRect(lx + i * 150, ly + 12, 12, 12);
    ctx.fillStyle = '#475569';
    ctx.font = `500 11px ${FONT}`;
    ctx.fillText(mount === 'floor' ? '地面展项（网格吸附）' : '墙面展项（靠墙吸附）', lx + i * 150 + 18, ly + 22);
  });

  // footer note
  ctx.fillStyle = '#8a9a96';
  ctx.font = `500 11px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(opts.scaleNote ?? `场地 ${hall.width}×${hall.depth} m · 吊顶 ${hall.ceiling} m · 地面均布荷载 ${hall.defaultLoad}kg/m²`, W - pad, H - 22);
  ctx.textAlign = 'left';

  return canvas;
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');
}

export interface BomRow {
  key: string;
  libId: DeviceInstance['libId'];
  model: string;
  qty: number;
  mount: 'floor' | 'wall';
  size: string;
  screen: string;
  powerW: number;
  weightKg: number;
  installHeight: number;
  points: { name: string; x: number; z: number; note: string }[];
  cableM: number;
  cableRuns: { from: string; to: string; len: number; type: string }[];
  props: number;
  statuses: Record<string, number>;
}

function nearestPower(x: number, z: number) {
  let best = HALL.powerPoints[0];
  let bestD = Infinity;
  for (const p of HALL.powerPoints) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return { point: best, dist: bestD };
}

/** Cable length: horizontal run to nearest floor box + vertical drop + service loop + 15% safety. */
export function cableLength(dev: DeviceInstance): { len: number; from: string; dist: number } {
  const lib = libItem(dev.libId);
  const { point, dist } = nearestPower(dev.x, dev.z);
  const drop = lib.mount === 'wall' ? Math.max(0.5, lib.installHeight - 0.3) : 1.0;
  const raw = dist + drop + 0.8;
  const len = Math.ceil(raw * 1.15 * 2) / 2; // 0.5m rounding
  return { len, from: point.label, dist };
}

export function buildBOM(devices: DeviceInstance[]): BomRow[] {
  const byKind = new Map<string, DeviceInstance[]>();
  for (const d of devices) {
    if (d.status === 'draft') continue;
    const list = byKind.get(d.libId) ?? [];
    list.push(d);
    byKind.set(d.libId, list);
  }
  const rows: BomRow[] = [];
  for (const [libId, list] of byKind) {
    const lib = libItem(libId as DeviceInstance['libId']);
    const points = list.map((d) => ({
      name: d.name,
      x: d.x,
      z: d.z,
      note:
        lib.mount === 'wall'
          ? `墙面安装 · 挂高 ${fmt(lib.installHeight, 2)}m · 朝向 ${Math.round(((d.rot * 180) / Math.PI + 360) % 360)}°`
          : `落地安装 · 中心 (${fmt(d.x, 2)}, ${fmt(d.z, 2)}) · 旋转 ${Math.round(((d.rot * 180) / Math.PI + 360) % 360)}°`,
    }));
    const runs = list.map((d) => {
      const c = cableLength(d);
      return {
        from: `配电点 ${c.from}`,
        to: d.name,
        len: c.len,
        type:
          lib.powerW > 0
            ? `${lib.mount === 'wall' ? '墙面走桥架' : '地槽穿管'} · 3×1.5mm² 电源线`
            : '弱电线',
      };
    });
    const statuses: Record<string, number> = {};
    for (const d of list) statuses[d.status] = (statuses[d.status] ?? 0) + 1;
    rows.push({
      key: libId,
      libId: libId as DeviceInstance['libId'],
      model: `${lib.name} · TONGXING ${libId.toUpperCase()}`,
      qty: list.length,
      mount: lib.mount,
      size: `${fmt(lib.width, 2)} × ${fmt(lib.depth, 2)} × ${fmt(lib.height, 2)} m`,
      screen: lib.screenInches ? `${lib.screenInches}" (${fmt(lib.screenW ?? 0, 2)}×${fmt(lib.screenH ?? 0, 2)}m)` : '—',
      powerW: lib.powerW,
      weightKg: lib.weightKg * list.length,
      installHeight: lib.installHeight,
      points,
      cableM: runs.reduce((s, r) => s + r.len, 0),
      cableRuns: runs,
      props: 0,
      statuses,
    });
  }
  return rows.sort((a, b) => a.libId.localeCompare(b.libId));
}

export function bomTotals(rows: BomRow[]) {
  return {
    devices: rows.reduce((s, r) => s + r.qty, 0),
    kinds: rows.length,
    powerW: rows.reduce((s, r) => s + r.powerW * r.qty, 0),
    weightKg: rows.reduce((s, r) => s + r.weightKg, 0),
    cableM: rows.reduce((s, r) => s + r.cableM, 0),
  };
}

export function bomCSV(rows: BomRow[], devices: DeviceInstance[]): string {
  const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: string[] = [];
  lines.push(['序号', '设备型号', '安装方式', '数量', '外形尺寸(m)', '屏幕尺寸', '单机功率(W)', '总重(kg)', '预估线缆(m)', '安装点位坐标'].map(esc).join(','));
  rows.forEach((r, i) => {
    const coords = r.points.map((p) => `${p.name}@(${fmt(p.x, 2)},${fmt(p.z, 2)})`).join(' | ');
    lines.push(
      [
        i + 1,
        r.model,
        r.mount === 'wall' ? '墙面安装' : '落地安装',
        r.qty,
        r.size,
        r.screen,
        r.powerW,
        r.weightKg.toFixed(1),
        r.cableM.toFixed(1),
        coords,
      ]
        .map(esc)
        .join(','),
    );
  });
  const t = bomTotals(rows);
  lines.push('');
  lines.push([`合计设备台数：${t.devices}`, `预估总功率：${t.powerW} W`, `预估线缆总长：${t.cableM.toFixed(1)} m`].map(esc).join(','));
  lines.push('');
  lines.push(['点位明细', '展项', '坐标X(m)', '坐标Z(m)', '安装说明', '配电点', '线缆(m)', '状态'].map(esc).join(','));
  let n = 0;
  for (const r of rows) {
    for (const p of r.points) {
      n++;
      const dev = devices.find((d) => d.name === p.name);
      const c = cableLength(dev!);
      lines.push(
        [n, p.name, fmt(p.x, 2), fmt(p.z, 2), p.note, c.from, c.len.toFixed(1), dev?.status ?? ''].map(esc).join(','),
      );
    }
  }
  return lines.join('\n');
}

export function downloadText(text: string, filename: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
