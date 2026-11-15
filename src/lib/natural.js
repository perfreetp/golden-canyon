// The mountain as it was before the resort: a fall line in z, with ridges,
// spurs, gullies and texture. Trails are benched into this surface; nothing in
// here knows about the ski area.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
const smoothstep = (e0, e1, v) => smooth((v - e0) / (e1 - e0));

function hash2(x, z) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function vnoise(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm(x, z, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i += 1) {
    sum += amp * vnoise(x * f, z * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

export function ridged(x, z, octaves = 3) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i += 1) {
    const n = 1 - Math.abs(vnoise(x * f, z * f) * 2 - 1);
    sum += amp * n * n;
    f *= 2.11;
    amp *= 0.52;
  }
  return sum;
}

export function forestDensity(x, z) {
  return fbm(x * 0.02 + 3.1, z * 0.02 + 8.4, 3);
}

const BASE = 30;

// ------------------------------------------------------------ natural shape

// The pre-resort fall line, north to south. Elevations in metres.
const PROFILE = [
  [510, 26], [460, 27], [420, 28], [380, 30], [340, 35], [300, 42], [260, 51], [220, 62],
  [180, 74], [140, 88], [100, 103], [60, 119], [20, 137], [-20, 156],
  [-60, 176], [-100, 197], [-140, 218], [-180, 239], [-220, 258],
  [-260, 275], [-300, 286], [-340, 291], [-380, 290], [-420, 284],
  [-470, 274], [-530, 258],
];

function profileAt(z) {
  const n = PROFILE.length;
  if (z >= PROFILE[0][0]) return PROFILE[0][1];
  if (z <= PROFILE[n - 1][0]) return PROFILE[n - 1][1];
  let i = 0;
  while (i < n - 2 && z < PROFILE[i + 1][0]) i += 1;
  const [z1, h1] = PROFILE[i];
  const [z2, h2] = PROFILE[i + 1];
  const [z0, h0] = PROFILE[Math.max(0, i - 1)];
  const [z3, h3] = PROFILE[Math.min(n - 1, i + 2)];
  const t = (z - z1) / (z2 - z1);
  const m1 = ((h2 - h0) / (z2 - z0)) * (z2 - z1);
  const m2 = ((h3 - h1) / (z3 - z1)) * (z2 - z1);
  const t2 = t * t;
  const t3 = t2 * t;
  return h1 * (2 * t3 - 3 * t2 + 1) + m1 * (t3 - 2 * t2 + t) + h2 * (-2 * t3 + 3 * t2) + m2 * (t3 - t2);
}

const RIDGES = [
  { x: 148, w: 56, amp: 34, lean: -0.10 },
  { x: -150, w: 60, amp: 26, lean: 0.12 },
  { x: -294, w: 44, amp: 22, lean: 0.08 },
  { x: 310, w: 38, amp: 24, lean: -0.10 },
];
const GULLIES = [
  { x: 56, w: 38, amp: -24 },
  { x: 208, w: 32, amp: -18 },
  { x: -218, w: 34, amp: -14 },
  { x: -60, w: 30, amp: -12 },
];

export function naturalShape(x, z) {
  let h = profileAt(z);

  // ridges and gullies give the face its ribs; they fade out over the bench
  const upper = smoothstep(340, 220, z) * 0.5 + smoothstep(240, 20, z) * 0.5;
  for (const r of RIDGES) {
    const cx = r.x + r.lean * (z + 40);
    const crest = Math.exp(-((Math.abs(x - cx) / r.w) ** 2) * 2.0);
    h += r.amp * crest * upper;
  }
  for (const g of GULLIES) {
    const cx = g.x + Math.sin(z / 190) * 14;
    h += g.amp * Math.exp(-((Math.abs(x - cx) / g.w) ** 2)) * upper;
  }

  // secondary spurs so the flanks read as terrain rather than sheeting
  h += (ridged(x * 0.012 + 2.7, z * 0.012 + 5.1, 4) - 0.42) * 34 * smoothstep(300, 100, z);

  // rolling benches
  h += (fbm(x * 0.0062 + 13.4, z * 0.0062 + 7.1) - 0.5) * 22 * smoothstep(320, 140, z);

  // surface texture
  h += (fbm(x * 0.036 + 4.7, z * 0.036 + 9.3) - 0.5) * 2.6;
  h += (fbm(x * 0.11 + 8.2, z * 0.11 + 3.4, 3) - 0.5) * 1.1;

  // summit block
  h += 40 * Math.exp(-(((x + 4) / 130) ** 2 + ((z + 376) / 58) ** 2));

  // rocky basin walls east and west
  h += 74 * Math.pow(smoothstep(246, 330, -x), 1.4);
  h += 82 * Math.pow(smoothstep(254, 334, x), 1.35);

  // village apron
  const apronT = smoothstep(268, 372, z) * (1 - smoothstep(240, 322, Math.abs(x - 20)));
  h = lerp(h, BASE + 4 * smoothstep(400, 300, z), apronT * 0.95);

  // skirt: the massif falls away into a surrounding valley, which the fog
  // swallows. A broad, smooth fall-off — not a cliff at the tile boundary.
  const rim = Math.min(1, Math.max(Math.abs(x) / 430, Math.abs(z) / 510));
  const skirt = smoothstep(0.78, 1.0, rim);
  h = lerp(h, BASE - 10, skirt * 0.95);

  return h;
}

