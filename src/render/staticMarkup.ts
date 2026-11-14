import type { PartLayer } from '../types';
import type { PartPlacement } from '../rig/figureMath';

/** 与 Figure.tsx 中 PartShape 保持一致的矢量部件路径（字符串版，供离屏渲染） */
function shapeInner(p: PartLayer): string {
  const w = p.width, h = p.height;
  const fill = `fill="${p.color}" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"`;
  if (p.id === 'p_head') {
    return `<ellipse cx="0" cy="${h * 0.42}" rx="${w * 0.46}" ry="${h * 0.42}" ${fill}/>
      <circle cx="${-w * 0.14}" cy="${h * 0.36}" r="2.2" fill="#3a2a1c" stroke="none"/>
      <circle cx="${w * 0.14}" cy="${h * 0.36}" r="2.2" fill="#3a2a1c" stroke="none"/>
      <path d="M ${-w * 0.12} ${h * 0.55} Q 0 ${h * 0.62} ${w * 0.12} ${h * 0.55}" stroke="#8a5a44" fill="none" stroke-width="1.4"/>`;
  }
  if (p.id === 'p_torso') {
    const top = w * 0.86;
    return `<path d="M ${-top / 2} 4 Q 0 -4 ${top / 2} 4 L ${w / 2} ${h * 0.82} Q 0 ${h} ${-w / 2} ${h * 0.82} Z" ${fill}/>`;
  }
  if (p.id.startsWith('p_foot')) {
    return `<path d="M ${-w / 2} 0 Q ${-w / 2} -${h * 0.55} 0 -${h * 0.55} L ${w * 0.34} -${h * 0.45} Q ${w / 2} -${h * 0.1} ${w * 0.42} ${h * 0.15} Z" ${fill}/>`;
  }
  if (p.id.startsWith('p_hand')) {
    return `<ellipse cx="0" cy="${h * 0.55}" rx="${w / 2}" ry="${h * 0.45}" ${fill}/>`;
  }
  return `<rect x="${-w / 2}" y="0" width="${w}" height="${h}" rx="${w * 0.38}" ry="${w * 0.38}" ${fill}/>`;
}

const Z_ORDER = [
  'p_thighL', 'p_thighR', 'p_shinL', 'p_shinR', 'p_footL', 'p_footR',
  'p_torso',
  'p_upperArmL', 'p_upperArmR', 'p_forearmL', 'p_forearmR', 'p_handL', 'p_handR',
  'p_head',
];

/**
 * 生成独立的 SVG 文档字符串（用于序列帧/精灵图离屏渲染）。
 * placeOf 返回每个部件的位姿；返回 null 的部件跳过。
 */
export function renderToStaticMarkup(
  width: number,
  height: number,
  parts: PartLayer[],
  placeOf: (p: PartLayer) => PartPlacement | null,
): string {
  const byId = new Map(parts.map(p => [p.id, p]));
  const body = Z_ORDER.map(id => byId.get(id)).filter(Boolean).map(part => {
    const pl = placeOf(part!);
    if (!pl) return '';
    const inner = part!.imageDataUrl
      ? `<image href="${part!.imageDataUrl}" x="${-part!.width / 2}" y="0" width="${part!.width}" height="${part!.height}" preserveAspectRatio="xMidYMin meet"/>`
      : shapeInner(part!);
    return `<g transform="translate(${pl.x},${pl.y}) rotate(${pl.rotation})" opacity="${pl.opacity}">${inner}</g>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f8fafc"/>
  <line x1="0" y1="560" x2="600" y2="560" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="8 6"/>
  ${body}
</svg>`;
}
