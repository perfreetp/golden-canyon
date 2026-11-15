// Deterministic pseudo-random utilities.
// Every generated diagram is a pure function of its examination parameters and
// seed, so the same parameter group always produces the same lesion layout and
// mucosal texture.

/** FNV-1a 32-bit hash with a final avalanche step. Stable across platforms. */
export function hash32(input) {
  const str = String(input);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Small, fast, deterministic PRNG. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a named random stream. Joining the parts makes streams independent. */
export function createRng(...parts) {
  const next = mulberry32(hash32(parts.join('::')));
  const rng = {
    next,
    range(a, b) {
      return a + (b - a) * next();
    },
    int(a, b) {
      return Math.floor(a + (b - a + 1) * next());
    },
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    chance(p) {
      return next() < p;
    },
    normal(mean = 0, sd = 1) {
      // Box–Muller, deterministic given the stream.
      const u = Math.max(next(), 1e-9);
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
  };
  return rng;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function roundTo(v, step = 0.1) {
  return Math.round(v / step) * step;
}

/** Stable short code used for issue ids and verification codes. */
export function shortCode(input, length = 8) {
  const hex = hash32(input).toString(16).padStart(8, '0');
  return (hex + hex).slice(0, length).toUpperCase();
}
