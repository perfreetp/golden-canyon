import {
  LAYOUT,
  CORRIDOR_GEOM,
  benchElev,
  nearestOnPath,
  widthAt,
} from './layout.js';
import { naturalShape, forestDensity } from './natural.js';

export { forestDensity };

// Procedural alpine terrain for 北岭雪场.
//
// `naturalShape` is the mountain as it was before the resort: a fall line in z,
// with ridges, spurs and gullies. On top of that, each corridor is benched into
// the hill along the grade line its designer staked out (see layout.js), with a
// level bench across the groomed width and a cut/fill shoulder tying back into
// natural ground.
//
// The trail analysis in the app reads elevations off this same field, so a run's
// reported grade is the grade it was designed to.

export const TERRAIN = {
  minX: LAYOUT.minX,
  maxX: LAYOUT.maxX,
  minZ: LAYOUT.minZ,
  maxZ: LAYOUT.maxZ,
  baseHeight: 30,
};

export { BASE_STATIONS } from './layout.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
const smoothstep = (e0, e1, v) => smooth((v - e0) / (e1 - e0));


// ---------------------------------------------------------- corridor grading

const CROSS_FALL = 0.05; // ~3° shed across the groomed width
// Cut/fill tie-in beyond the bench edge. Kept short: a long shoulder from one
// piste would otherwise reach across and warp its neighbour.
const SHOULDER = 26;

// Bench and natural surface blending.
//
// A point inside a corridor's groomed width always belongs to it — that keeps
// every centreline on its own bench. Outside the width, corridors contribute a
// shoulder that only ever competes with other shoulders, so the ground between
// two runs eases up or down instead of stepping.
export function heightAt(x, z) {
  const natural = naturalShape(x, z);

  let inside = null;
  let shoulder = null;

  for (let i = 0; i < CORRIDOR_GEOM.length; i += 1) {
    const geom = CORRIDOR_GEOM[i];
    const probe = widthAt(geom.corridor, 0.5) / 2 + 1.5 + SHOULDER;
    const n = nearestOnPath(i, x, z, probe);
    if (!n) continue;
    const half = widthAt(geom.corridor, n.u) / 2 + 1.5;
    if (n.d > half + SHOULDER) continue;

    if (n.d <= half) {
      // score by how central the point is, so a narrow piste crossing a wide
      // one still owns its own centreline
      const score = 1 - (n.d / half) * 0.25;
      if (!inside || score > inside.score) inside = { i, n, half, score };
    } else {
      const t = 1 - smoothstep(half, half + SHOULDER, n.d);
      if (!shoulder || t > shoulder.t) shoulder = { i, n, half, t };
    }
  }

  if (inside) {
    const { i, n, half } = inside;
    const centre = benchElev(i, n.s);
    return centre - n.side * CROSS_FALL * 0.5;
  }

  if (shoulder) {
    const { i, n, half, t } = shoulder;
    const centre = benchElev(i, n.s);
    const edge = centre - (n.side > 0 ? half : -half) * CROSS_FALL * 0.5;
    // ease out with a curve that is flat at both ends, so the cut edge is a
    // bank rather than a cliff and the toe melts into the hill
    return lerp(edge, natural, smoothstep(0, 1, 1 - t));
  }

  return natural;
}

export function slopeAt(x, z, d = 2) {
  const hx = (heightAt(x + d, z) - heightAt(x - d, z)) / (2 * d);
  const hz = (heightAt(x, z + d) - heightAt(x, z - d)) / (2 * d);
  return (Math.atan(Math.hypot(hx, hz)) * 180) / Math.PI;
}

// ----------------------------------------------------------- display geometry

const SNOW = [0.58, 0.64, 0.73];
const ICE = [0.4, 0.5, 0.65];
const ROCK = [0.16, 0.185, 0.24];
const ROCK_LIT = [0.5, 0.52, 0.55];

export function buildTerrainGeometry(segX = 240, segZ = 260) {
  const { minX, maxX, minZ, maxZ } = TERRAIN;
  const count = (segX + 1) * (segZ + 1);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const indices = [];

  const sunA = { x: -0.46, y: 0.56, z: 0.69 };
  const sunB = { x: 0.7, y: 0.42, z: -0.58 };

  let p = 0;
  for (let j = 0; j <= segZ; j += 1) {
    const z = minZ + ((maxZ - minZ) * j) / segZ;
    for (let i = 0; i <= segX; i += 1) {
      const x = minX + ((maxX - minX) * i) / segX;
      const y = heightAt(x, z);
      positions[p * 3] = x;
      positions[p * 3 + 1] = y;
      positions[p * 3 + 2] = z;

      const d = 3;
      const hx = (heightAt(x + d, z) - heightAt(x - d, z)) / (2 * d);
      const hz = (heightAt(x, z + d) - heightAt(x, z - d)) / (2 * d);
      const nl = Math.hypot(hx, 1, hz);
      const nx = -hx / nl;
      const ny = 1 / nl;
      const nz = -hz / nl;
      normals[p * 3] = nx;
      normals[p * 3 + 1] = ny;
      normals[p * 3 + 2] = nz;

      const slope = (Math.atan(Math.hypot(hx, hz)) * 180) / Math.PI;
      const steep = smoothstep(34, 52, slope);
      const alt = smoothstep(70, 300, y);

      let r = lerp(SNOW[0], ICE[0], alt * 0.7);
      let g = lerp(SNOW[1], ICE[1], alt * 0.7);
      let b = lerp(SNOW[2], ICE[2], alt * 0.7);

      const lit = nx * sunA.x + ny * sunA.y + nz * sunA.z;
      const fill = Math.max(0, nx * sunB.x + ny * sunB.y + nz * sunB.z);

      const rockR = lerp(ROCK[0], ROCK_LIT[0], smoothstep(-0.05, 0.9, lit));
      const rockG = lerp(ROCK[1], ROCK_LIT[1], smoothstep(-0.05, 0.9, lit));
      const rockB = lerp(ROCK[2], ROCK_LIT[2], smoothstep(-0.05, 0.9, lit));
      r = lerp(r, rockR, steep * 0.9);
      g = lerp(g, rockG, steep * 0.9);
      b = lerp(b, rockB, steep * 0.9);

      const key = Math.pow(Math.max(0, lit), 1.1);
      const shade = 0.14 + 0.13 * ny + key * 1.12 + fill * 0.1;
      r *= shade;
      g *= shade;
      b *= shade;

      const shadowT = (1 - smoothstep(0.0, 0.36, lit + fill * 0.3)) * 0.55;
      r = lerp(r, r * 0.32 + 0.008, shadowT);
      g = lerp(g, g * 0.52 + 0.03, shadowT);
      b = lerp(b, b * 1.1 + 0.1, shadowT);

      const warm = key * key * 0.05;
      r += warm;
      g += warm * 0.85;
      b += warm * 0.6;

      const crest = smoothstep(0.84, 0.995, ny) * 0.07;
      r += crest;
      g += crest;
      b += crest;

      colors[p * 3] = clamp(r, 0, 1);
      colors[p * 3 + 1] = clamp(g, 0, 1);
      colors[p * 3 + 2] = clamp(b, 0, 1);
      p += 1;
    }
  }

  const row = segX + 1;
  for (let j = 0; j < segZ; j += 1) {
    for (let i = 0; i < segX; i += 1) {
      const a = j * row + i;
      const b = a + 1;
      const d = a + row;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }
  return { positions, colors, normals, indices, segX, segZ };
}

export function clampToTerrain(x, z) {
  return {
    x: clamp(x, TERRAIN.minX + 14, TERRAIN.maxX - 14),
    z: clamp(z, TERRAIN.minZ + 14, TERRAIN.maxZ - 14),
  };
}
