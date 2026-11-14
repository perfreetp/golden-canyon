import type { ActionRecord, Animation, JointDef, PartLayer } from '../types';
import { samplePose } from './kinematics';
import { restAngles, placePart } from './figureMath';
import { renderToStaticMarkup } from '../render/staticMarkup';

const SIZE = 600;

/** 生成一帧的独立 SVG 字符串（含背景与全部部件，可直接转图片） */
function frameSvg(joints: JointDef[], parts: PartLayer[], anim: Animation, t: number) {
  const pose = samplePose(joints, anim.keyframes, anim.eases, t);
  const rest = restAngles(joints);
  return renderToStaticMarkup(SIZE, SIZE, parts, part => placePart(part, joints, pose, rest));
}

function svgToImage(svg: string): Promise<HTMLImageElement> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function renderFrame(joints: JointDef[], parts: PartLayer[], anim: Animation, t: number, scale: number) {
  const svg = frameSvg(joints, parts, anim, t);
  const img = await svgToImage(svg);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE * scale;
  canvas.height = SIZE * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(img.src);
  return canvas;
}

function download(canvas: HTMLCanvasElement, filename: string) {
  const a = document.createElement('a');
  a.download = filename;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

export interface ExportResult {
  spriteSheet: string;
  atlas: NonNullable<ActionRecord['atlas']>;
  count: number;
}

/**
 * 导出 PNG 序列帧 + 精灵图。
 * 逐帧下载受浏览器下载策略限制，这里：
 *  - 序列帧：逐张触发下载（浏览器可能询问“允许多个下载”）
 *  - 精灵图：合成一张网格 PNG
 */
export async function exportFrames(
  joints: JointDef[],
  parts: PartLayer[],
  anim: Animation,
  fps: number,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  const count = Math.max(1, Math.round(anim.duration * fps));
  const scale = 0.5; // 导出 300x300 控制体积
  const fw = SIZE * scale, fh = SIZE * scale;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const sheet = document.createElement('canvas');
  sheet.width = fw * cols;
  sheet.height = fh * rows;
  const sctx = sheet.getContext('2d')!;

  for (let i = 0; i < count; i++) {
    const t = Math.min(anim.duration, i / fps);
    const frame = await renderFrame(joints, parts, anim, t, scale);
    sctx.drawImage(frame, (i % cols) * fw, Math.floor(i / cols) * fh);
    download(frame, `frame_${String(i).padStart(4, '0')}.png`);
    onProgress?.(((i + 1) / count) * 100);
    await new Promise(r => setTimeout(r, 60)); // 避免多下载被浏览器拦截
  }

  const spriteSheet = sheet.toDataURL('image/png');
  download(sheet, 'spritesheet.png');
  return {
    spriteSheet,
    atlas: { frameWidth: fw, frameHeight: fh, cols, count, fps },
    count,
  };
}
