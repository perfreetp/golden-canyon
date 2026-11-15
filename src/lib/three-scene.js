/**
 * 头模 / 电极 / 覆盖层 的 three.js 构建工具
 * 全部基于 WebGL2 + three.js 程序化几何，无需外部模型文件。
 */
import * as THREE from 'three';
import { scalpPoint, scalpNormal, scalpMask, dirFromAngles, normalize, HEAD, smooth, surfaceAt, normalAt, surfaceNear } from './headgeo.js';
import { solveMontage } from './montage.js';

export const PALETTE = {
  skin: 0xbe9c85,
  skinDark: 0x8a6f5e,
  electrode: 0xe8eef2,
  selected: 0x38d3bd,
  wrong: 0xf2726f,
  ok: 0x4fc98b,
  ghost: 0x8fa3b1,
};

export function createSceneRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x070b0f, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

/* ---------------- 头模主体 ---------------- */
export function buildHeadGeometry(segA = 260, segB = 190) {
  const geo = new THREE.BufferGeometry();
  const pos = [];
  const idx = [];
  const uv = [];
  const N = segA + 1;
  for (let j = 0; j <= segB; j++) {
    const tv = j / segB;
    const theta = tv * Math.PI;
    for (let i = 0; i <= segA; i++) {
      const phi = (i / segA) * Math.PI * 2 - Math.PI;
      const d = [Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi)];
      const p = scalpPoint(d);
      pos.push(p[0], p[1], p[2]);
      uv.push(i / segA, tv);
    }
  }
  for (let j = 0; j < segB; j++) {
    for (let i = 0; i < segA; i++) {
      const a = j * N + i;
      const b = a + 1;
      const c = a + N;
      const d2 = c + 1;
      idx.push(a, c, b, b, c, d2);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/**
 * 头模皮肤材质：
 * 通过 onBeforeCompile 注入"肤色渐层 + 分区着色"两套着色逻辑，
 * 分区由 uniform 开关，避免额外的贴面网格产生 z-fighting。
 */
export function buildHeadMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xb99a86, roughness: 0.58, metalness: 0.04,
  });
  const uniforms = {
    uRegionMap: { value: null },
    uShowRegion: { value: 0 },
    uRegionOpacity: { value: 0.52 },
    uHairMap: { value: null },
  };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRegionMap = uniforms.uRegionMap;
    shader.uniforms.uShowRegion = uniforms.uShowRegion;
    shader.uniforms.uRegionOpacity = uniforms.uRegionOpacity;
    shader.uniforms.uHairMap = uniforms.uHairMap;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec2 vScalpUv;
        varying vec3 vObjPos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vScalpUv = uv;
        vObjPos = position;`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uRegionMap;
        uniform sampler2D uHairMap;
        uniform float uShowRegion;
        uniform float uRegionOpacity;
        varying vec2 vScalpUv;
        varying vec3 vObjPos;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // 分区着色
        vec4 regionTexel = texture2D(uRegionMap, vScalpUv);
        // 与肤色混合，保留体积光影，避免"沙滩球"观感
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(diffuseColor.rgb, regionTexel.rgb, 0.72), regionTexel.a * uShowRegion * uRegionOpacity);

        // 发区：颅顶稍暗，模拟头皮/短发
        float hairMask = texture2D(uHairMap, vScalpUv).r;
        diffuseColor.rgb *= mix(1.0, 0.86, hairMask * (1.0 - uShowRegion * 0.55));`);
  };
  return mat;
}

/** 头皮/发区遮罩贴图（灰度：1=发区） */
export function buildHairMaskTexture() {
  const W = 512, H = 256;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const tv = 1 - (y + 0.5) / H;
    const theta = (1 - tv) * Math.PI;
    for (let x = 0; x < W; x++) {
      const phi = ((x + 0.5) / W) * Math.PI * 2 - Math.PI;
      const d = [Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi)];
      const p = scalpPoint(d);
      // 面部为 0（非发区），其余头皮为 1
      const faceFront = smooth(4.6, 6.6, p[2]);
      const faceDown = 1 - smooth(2.0, 4.2, p[1]);
      const face = faceFront * faceDown;
      const neck = 1 - smooth(-7.6, -5.6, p[1]);
      const v = Math.round(255 * Math.max(face, neck));
      const i4 = (y * W + x) * 4;
      img.data[i4] = v; img.data[i4 + 1] = v; img.data[i4 + 2] = v; img.data[i4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** 头皮分区贴图：在表面参数域上按"到标准标记位的弧距"平滑混合 */
export function buildScalpTexture(regionDict) {
  const W = 1024, H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const { nodes } = solveMontage();

  const lm = [];
  for (const [name, n] of Object.entries(nodes)) {
    let rgb = null;
    for (const r of regionDict) if (r.members.includes(name)) { rgb = hexToRgb(r.color); break; }
    if (!rgb) continue;
    lm.push({ dir: normalize(n.dir), rgb });
  }

  const img = ctx.createImageData(W, H);
  const d = img.data;
  const sums = [0, 0, 0];
  for (let yIdx = 0; yIdx < H; yIdx++) {
    // 行 0 → θ=0（颅顶），与几何 uv.v = j/segB 一致（贴图 flipY = false）
    const tv = (yIdx + 0.5) / H;
    const theta = tv * Math.PI;
    for (let xIdx = 0; xIdx < W; xIdx++) {
      const phi = ((xIdx + 0.5) / W) * Math.PI * 2 - Math.PI;
      const dir = [Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi)];
      const i4 = (yIdx * W + xIdx) * 4;
      const mask = scalpMask(dir);
      if (mask < 0.02) { d[i4 + 3] = 0; continue; }
      // 取最近 3 个标记位，按 (dmin/d)^N 锐化混合，保持分区颜色饱和
      let d1 = Infinity, d2 = Infinity, d3 = Infinity;
      let i1 = 0, i2 = 0, i3 = 0;
      for (let k = 0; k < lm.length; k++) {
        const it = lm[k];
        const dd = Math.sqrt((dir[0] - it.dir[0]) ** 2 + (dir[1] - it.dir[1]) ** 2 + (dir[2] - it.dir[2]) ** 2);
        if (dd < d1) { d3 = d2; i3 = i2; d2 = d1; i2 = i1; d1 = dd; i1 = k; }
        else if (dd < d2) { d3 = d2; i3 = i2; d2 = dd; i2 = k; }
        else if (dd < d3) { d3 = dd; i3 = k; }
      }
      // 归一化：按"到第二近标记位的差距"决定混合强度
      const sigma = Math.max(0.035, (d2 - d1) * 0.75 + 0.02);
      const w1 = 1;
      const w2 = Math.exp(-(((d2 - d1) / sigma) ** 2)) * 0.35;
      const w3 = Math.exp(-(((d3 - d1) / sigma) ** 2)) * 0.14;
      const wsum = w1 + w2 + w3;
      sums[0] = (lm[i1].rgb[0] * w1 + lm[i2].rgb[0] * w2 + lm[i3].rgb[0] * w3) / wsum;
      sums[1] = (lm[i1].rgb[1] * w1 + lm[i2].rgb[1] * w2 + lm[i3].rgb[1] * w3) / wsum;
      sums[2] = (lm[i1].rgb[2] * w1 + lm[i2].rgb[2] * w2 + lm[i3].rgb[2] * w3) / wsum;
      d[i4] = Math.min(255, Math.round(sums[0] / wsum));
      d[i4 + 1] = Math.min(255, Math.round(sums[1] / wsum));
      d[i4 + 2] = Math.min(255, Math.round(sums[2] / wsum));
      d[i4 + 3] = Math.round(255 * Math.min(1, mask));
    }
  }
  ctx.putImageData(img, 0, 0);
  // 横向羽化时保证接缝连续：左右各多画一次
  const blur = document.createElement('canvas');
  blur.width = W; blur.height = H;
  const bx = blur.getContext('2d');
  bx.filter = 'blur(7px)';
  bx.drawImage(cv, 0, 0);
  bx.drawImage(cv, W, 0);
  bx.drawImage(cv, -W, 0);
  const tex = new THREE.CanvasTexture(blur);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false; // 行 0 对应 θ=0（颅顶），与几何 uv.v 一致
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/* ---------------- 面部细节：贴合曲面的凸起/凹陷 ----------------
 * 所有面部特征都由"在头皮参数域上采样 + 沿法线偏移"生成，
 * 因而与头模主体完全贴合，不会出现悬浮的贴片。
 */
const at = (y, phi) => surfaceAt(y, phi);
const nAt = (y, phi) => normalAt(y, phi);

/**
 * 参数域补丁
 * @param {object} o
 *   y0, phi0        中心
 *   wY, wPhi        半宽（cm / 度）
 *   height          法向偏移峰值（cm，可为负 = 凹陷）
 *   falloff         衰减指数
 *   stretchX        横向拉伸
 */
function surfacePatch({ y0, phi0 = 0, wY, wPhi, height, falloff = 2.2, segY = 26, segP = 30 }) {
  const geo = new THREE.BufferGeometry();
  const pos = [];
  const idx = [];
  const N = segP + 1;
  for (let j = 0; j <= segY; j++) {
    const v = j / segY; // 0..1
    for (let i = 0; i <= segP; i++) {
      const u = i / segP;
      const dy = (v * 2 - 1) * wY;
      const dp = (u * 2 - 1) * wPhi;
      const y = y0 + dy;
      const phi = phi0 + dp;
      const base = surfaceAt(y, phi);
      const n = normalAt(y, phi);
      const ry = Math.abs(dy) / wY;
      const rp = Math.abs(dp) / wPhi;
      const r = Math.hypot(ry, rp * 0.98);
      const bump = height * Math.pow(Math.max(0, 1 - Math.min(1, r)), falloff);
      pos.push(base[0] + n[0] * bump, base[1] + n[1] * bump, base[2] + n[2] * bump);
    }
  }
  for (let j = 0; j < segY; j++) {
    for (let i = 0; i < segP; i++) {
      const a = j * N + i;
      idx.push(a, a + N, a + 1, a + 1, a + N, a + N + 1);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** 鼻：从鼻根到鼻尖的前突楔形体，横断面为半椭圆 */
function buildNoseGeometry() {
  const geo = new THREE.BufferGeometry();
  const rows = 34;
  const cols = 26;
  const pos = [];
  const idx = [];
  const N = cols + 1;
  for (let j = 0; j <= rows; j++) {
    const v = j / rows;
    // 鼻根 y=1.9 → 鼻底 y=-2.5
    const y = 1.9 - v * 4.4;
    // 前突量：鼻根小 → 鼻尖最大 → 鼻底回落
    const protr = 0.1 + 1.28 * smooth(0.04, 0.76, v) * (1 - 0.5 * smooth(0.84, 1.0, v));
    // 半宽：鼻根窄 → 鼻翼宽
    const halfW = 0.3 + 0.72 * smooth(0.34, 0.96, v);
    const base = surfaceAt(y, 0);
    for (let i = 0; i <= cols; i++) {
      const u = (i / cols) * 2 - 1;
      const x = u * halfW;
      const k = Math.sqrt(Math.max(0, 1 - u * u));
      const dz = protr * Math.pow(k, 0.62);
      // 侧缘贴向面部
      const sideZ = base[2] - 0.26 * (1 - k);
      pos.push(x, y, sideZ + dz);
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * N + i;
      idx.push(a, a + N, a + 1, a + 1, a + N, a + N + 1);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** 耳廓：扁平耳壳 + 外耳轮 + 耳甲 + 耳垂，朝向颞侧外法线 */
function buildEarGeometry(side) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc2a28a, roughness: 0.6, metalness: 0.02 });
  const deep = new THREE.MeshStandardMaterial({ color: 0x9b7b68, roughness: 0.75 });

  // 耳壳：薄椭球（横向压薄，前后拉长）
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), skin);
  shell.scale.set(0.22, 1.52, 1.06);
  g.add(shell);

  // 外耳轮：沿耳壳外缘的半圈隆起
  const helix = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.145, 10, 40, Math.PI * 1.55), skin);
  helix.scale.set(0.2, 1.42, 1.0);
  helix.rotation.set(0, Math.PI / 2, Math.PI * 0.1);
  helix.position.set(side * 0.1, 0.06, 0.02);
  g.add(helix);

  // 对耳轮
  const anti = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.1, 8, 26, Math.PI * 1.2), skin);
  anti.scale.set(0.16, 1.25, 1.0);
  anti.rotation.set(0, Math.PI / 2, Math.PI * 0.32);
  anti.position.set(side * 0.16, -0.06, -0.12);
  g.add(anti);

  // 耳甲腔
  const concha = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 16), deep);
  concha.scale.set(0.14, 0.85, 0.66);
  concha.position.set(side * 0.2, -0.3, 0.02);
  g.add(concha);

  // 耳屏
  const tragus = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), skin);
  tragus.scale.set(0.55, 1.0, 0.8);
  tragus.position.set(side * 0.24, -0.32, 0.36);
  g.add(tragus);

  // 耳垂
  const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 14), skin);
  lobe.scale.set(0.72, 0.78, 0.66);
  lobe.position.set(side * 0.04, -1.24, 0.12);
  g.add(lobe);

  return g;
}

export function buildHeadDetails() {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc4a48c, roughness: 0.56, metalness: 0.02 });
  const skinDeep = new THREE.MeshStandardMaterial({ color: 0x9c7c69, roughness: 0.72 });
  const browMat = new THREE.MeshStandardMaterial({ color: 0x352f2b, roughness: 0.92 });
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xe4ded4, roughness: 0.22 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x445b66, roughness: 0.16 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x06090b, roughness: 0.18 });
  const lipMat = new THREE.MeshStandardMaterial({ color: 0xa8746a, roughness: 0.52 });
  const mouthDark = new THREE.MeshStandardMaterial({ color: 0x5c3a34, roughness: 0.85 });

  // 面部解剖（眉弓、眼窝、颊、唇、颏）已并入曲面本体，此处仅补五官细节。

  // ---------- 眼（临床模型头：睑裂闭合线 + 浅眼窝阴影） ----------
  const lidMat = new THREE.MeshStandardMaterial({ color: 0x8a6654, roughness: 0.72 });
  for (const s2 of [1, -1]) {
    const lidPts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const phi = s2 * (11 + u * 15);
      const y = 0.86 - Math.sin(u * Math.PI) * 0.38;
      const q = surfaceAt(y, phi);
      const n = normalAt(y, phi);
      lidPts.push(new THREE.Vector3(q[0] + n[0] * 0.025, q[1] + n[1] * 0.025, q[2] + n[2] * 0.025));
    }
    group.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lidPts), 26, 0.028, 6, false),
      lidMat,
    ));

    // 眉：贴合眉弓的细带，两端渐变收细
    browMat.side = THREE.DoubleSide;
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const u = i / 18;
      const y = 2.62 + Math.sin(u * Math.PI) * 0.26 - u * 0.06;
      const phiDeg = s2 * (7 + u * 20);
      const q = surfaceAt(y, phiDeg);
      const n = normalAt(y, phiDeg);
      pts.push(new THREE.Vector3(q[0] + n[0] * 0.02, q[1] + n[1] * 0.02, q[2] + n[2] * 0.02));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.062, 7, false), browMat));
  }

  // ---------- 口裂（唇形已并入曲面） ----------
  const slitPts = [];
  for (let i = 0; i <= 22; i++) {
    const u = i / 22;
    const phi = (u * 2 - 1) * 13.5;
    const q = surfaceAt(-4.66, phi);
    const n = normalAt(-4.66, phi);
    slitPts.push(new THREE.Vector3(q[0] + n[0] * 0.04, q[1] + n[1] * 0.04, q[2] + n[2] * 0.04));
  }
  group.add(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(slitPts), 28, 0.05, 6, false),
    mouthDark,
  ));

  // ---------- 耳 ----------
  for (const s2 of [1, -1]) {
    const p = surfaceAt(-0.5, s2 * 90);
    const ear = buildEarGeometry(s2);
    // 耳壳平面平行于矢状面，耳廓略微外展
    ear.position.set(p[0] + s2 * 0.18, p[1] - 0.1, p[2] - 0.5);
    ear.rotation.y = s2 * 0.12;
    ear.rotation.z = s2 * -0.04;
    ear.rotation.x = -0.06;
    group.add(ear);
  }

  // ---------- 颈 ----------
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 4.4, 6.8, 36, 1, true), skin);
  neck.position.set(0, -9.7, -0.9);
  group.add(neck);

  // ---------- 肩 ----------
  const shoulders = new THREE.Mesh(
    new THREE.CylinderGeometry(10.0, 11.8, 1.4, 40, 1, true, Math.PI * 0.14, Math.PI * 1.72),
    new THREE.MeshStandardMaterial({ color: 0x16222b, roughness: 0.9, metalness: 0.12, side: THREE.DoubleSide }),
  );
  shoulders.position.set(0, -14.9, -1.2);
  group.add(shoulders);

  return group;
}

/* ---------------- 电极几何 ---------------- */
export function buildElectrodeMesh(color = 0xe8eef2) {
  const g = new THREE.Group();
  const disk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.55, 0.17, 28),
    new THREE.MeshStandardMaterial({
      color, roughness: 0.26, metalness: 0.7,
      emissive: new THREE.Color(color), emissiveIntensity: 0.06,
    }),
  );
  disk.position.y = 0.075;
  g.add(disk);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.54, 0.06, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0x7d8a95, roughness: 0.32, metalness: 0.88 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.045;
  g.add(rim);

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.64, 0.66, 0.06, 28),
    new THREE.MeshStandardMaterial({ color: 0x121c23, roughness: 0.85, metalness: 0.06 }),
  );
  pad.position.y = -0.02;
  g.add(pad);

  const lead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.95, 8),
    new THREE.MeshStandardMaterial({ color: 0x39434b, roughness: 0.55, metalness: 0.25 }),
  );
  lead.position.set(0.44, 0.3, 0);
  lead.rotation.z = -0.6;
  g.add(lead);

  return g;
}

export function buildLabelSprite(text, { color = '#dbe6ee', bg = 'rgba(8,13,18,0.85)', active = false } = {}) {
  const canvas = document.createElement('canvas');
  const probe = canvas.getContext('2d');
  const font = '700 56px ui-monospace, SFMono-Regular, monospace';
  probe.font = font;
  const pad = 14;
  const w = Math.ceil(probe.measureText(text).width) + pad * 2;
  const h = 80;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const draw = (t, opts = {}) => {
    ctx.clearRect(0, 0, w, h);
    ctx.font = font;
    ctx.fillStyle = opts.bg || bg;
    roundRect(ctx, 1, 1, w - 2, h - 2, 11);
    ctx.fill();
    ctx.strokeStyle = opts.active ? (opts.color || color) : 'rgba(112,138,155,0.55)';
    ctx.lineWidth = opts.active ? 3 : 1.4;
    ctx.stroke();
    ctx.fillStyle = opts.color || color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, w / 2, h / 2 + 1);
  };
  draw(text, { active: active });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(w * 0.0335, h * 0.0335, 1);
  sp.userData.canvas = canvas;
  sp.userData.tex = tex;
  sp.userData.redraw = (t, opts = {}) => { draw(t, opts); tex.needsUpdate = true; };
  return sp;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function orientToScalp(obj, pos) {
  const d = normalize([pos[0] - HEAD.center[0], pos[1] - HEAD.center[1], pos[2] - HEAD.center[2]]);
  const n = scalpNormal(d);
  obj.position.set(pos[0], pos[1], pos[2]);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(n[0], n[1], n[2]).normalize(),
  );
  obj.quaternion.copy(q);
}

export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m.map?.isCanvasTexture) m.map.dispose();
        m.dispose();
      });
    }
  });
}
