// SVG 导出：将图示文档序列化为可打印 / 可用于课件的独立 SVG
import type { BrainTemplate, DiagramDoc } from '../types';
import { escapeXml, shapePathD } from './geometry';

export function buildSvg(doc: DiagramDoc, tpl: BrainTemplate): string {
  const layerOf = (id: string) => doc.layers.find((l) => l.id === id);
  const visible = (layerId: string): boolean => layerOf(layerId)?.visible ?? true;
  const opacity = (layerId: string): number => layerOf(layerId)?.opacity ?? 1;

  const lines: string[] = [];
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tpl.width}" height="${tpl.height}" viewBox="0 0 ${tpl.width} ${tpl.height}" font-family="'Microsoft YaHei','PingFang SC',sans-serif">`,
  );
  lines.push(`<rect width="100%" height="100%" fill="#f8fafc"/>`);

  // 网格
  lines.push('<g stroke="#e2e8f0" stroke-width="1">');
  for (let x = 0; x <= tpl.width; x += tpl.gridSize) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${tpl.height}"/>`);
  }
  for (let y = 0; y <= tpl.height; y += tpl.gridSize) {
    lines.push(`<line x1="0" y1="${y}" x2="${tpl.width}" y2="${y}"/>`);
  }
  lines.push('</g>');

  // 模板层：头颅轮廓 + 脑区
  if (doc.showTemplate && visible('ly-template')) {
    const op = opacity('ly-template');
    lines.push(`<g opacity="${op}">`);
    const headD = shapePathD(tpl.headOutline.map((p, i) => ({ ...p, id: `h${i}`, smooth: 0.5 })), true);
    lines.push(`<path d="${headD}" fill="#eef2ff" stroke="#94a3b8" stroke-width="2.5"/>`);
    for (const rg of tpl.regions) {
      const d = shapePathD(rg.outline.map((p, i) => ({ ...p, id: `${rg.id}-${i}`, smooth: 0.4 })), true);
      lines.push(
        `<path d="${d}" fill="${rg.color}" fill-opacity="0.18" stroke="${rg.color}" stroke-width="1.5" stroke-dasharray="6 4"/>`,
      );
      const cx = rg.outline.reduce((a, p) => a + p.x, 0) / rg.outline.length;
      const cy = rg.outline.reduce((a, p) => a + p.y, 0) / rg.outline.length;
      lines.push(
        `<text x="${cx}" y="${cy}" font-size="14" fill="#475569" text-anchor="middle">${escapeXml(rg.name)}</text>`,
      );
    }
    lines.push('</g>');
  }

  // 图形按图层分组
  for (const layer of doc.layers) {
    if (layer.id === 'ly-template' || !layer.visible) continue;
    lines.push(`<g opacity="${layer.opacity}">`);
    for (const s of doc.shapes) {
      if (s.layerId !== layer.id) continue;
      if (s.kind === 'region') {
        const d = shapePathD(s.points, true);
        lines.push(
          `<path d="${d}" fill="${s.fill}" fill-opacity="0.45" stroke="${s.stroke}" stroke-width="2.5" stroke-linejoin="round"/>`,
        );
        if (s.label) {
          const cx = s.points.reduce((a, p) => a + p.x, 0) / s.points.length;
          const cy = s.points.reduce((a, p) => a + p.y, 0) / s.points.length;
          lines.push(
            `<text x="${cx}" y="${cy}" font-size="16" font-weight="600" fill="#0f172a" text-anchor="middle">${escapeXml(s.label)}</text>`,
          );
        }
      } else if (s.kind === 'path') {
        const d = shapePathD(s.points, false);
        lines.push(
          `<path d="${d}" fill="none" stroke="${s.stroke}" stroke-width="${s.width}" stroke-linecap="round" ${
            s.dashed ? 'stroke-dasharray="10 7"' : ''
          }/>`,
        );
        const end = s.points[s.points.length - 1];
        if (end) lines.push(`<circle cx="${end.x}" cy="${end.y}" r="${s.width + 1.5}" fill="${s.stroke}"/>`);
        if (s.label) {
          const first = s.points[0];
          lines.push(
            `<text x="${first.x + 6}" y="${first.y - 8}" font-size="15" font-weight="600" fill="${s.stroke}">${escapeXml(s.label)}</text>`,
          );
        }
      } else {
        lines.push(
          `<text x="${s.at.x}" y="${s.at.y}" font-size="16" fill="${s.color}">${escapeXml(s.text)}</text>`,
        );
      }
    }
    lines.push('</g>');
  }

  // 标题栏
  lines.push(
    `<rect x="0" y="${tpl.height - 56}" width="${tpl.width}" height="56" fill="#0f172a" fill-opacity="0.88"/>`,
  );
  lines.push(
    `<text x="24" y="${tpl.height - 32}" font-size="20" font-weight="700" fill="#ffffff">${escapeXml(doc.title)}</text>`,
  );
  lines.push(
    `<text x="24" y="${tpl.height - 12}" font-size="13" fill="#cbd5e1">患者：${escapeXml(doc.patientName || '—')}　住院号：${escapeXml(doc.patientNo || '—')}　医师：${escapeXml(doc.author)}　导出时间：${new Date().toLocaleString('zh-CN')}</text>`,
  );
  lines.push('</svg>');
  return lines.join('\n');
}

export function downloadSvg(doc: DiagramDoc, tpl: BrainTemplate): void {
  const svg = buildSvg(doc, tpl);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title.replace(/[\\/:*?"<>|]/g, '_')}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
