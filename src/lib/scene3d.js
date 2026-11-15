import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildTerrainGeometry, heightAt, slopeAt, forestDensity, BASE_STATIONS } from './terrain.js';
import { CORRIDOR_GEOM, nearestOnPath, widthAt } from './layout.js';
import { GUN_TYPES, LEVELS } from './trailMath.js';

const LEVEL_HEX = {
  beginner: 0x4ade9b,
  intermediate: 0x5aa9ff,
  advanced: 0xff6b6b,
};

// Is a point inside any groomed piste (plus its cleared margin)?
function onPiste(x, z) {
  for (let i = 0; i < CORRIDOR_GEOM.length; i += 1) {
    const geom = CORRIDOR_GEOM[i];
    const n = nearestOnPath(i, x, z, 70);
    if (!n) continue;
    const half = widthAt(geom.corridor, n.u) / 2;
    if (n.d < half + 11) return true;
  }
  return false;
}

const WARN_HEX = 0xffc24d;
const GAP_HEX = 0xff4d4d;

function makeHatchTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255, 62, 62, 0.95)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'butt';
  // diagonal stripes
  for (let i = -size; i < size * 2; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}

function makeLabelTexture(text, color = '#dff3ff', sub = '') {
  const pad = 8;
  const dpr = 2;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = '600 26px "Inter","PingFang SC","Microsoft YaHei",sans-serif';
  const fontSub = '500 17px "IBM Plex Mono",monospace';
  ctx.font = font;
  const w1 = ctx.measureText(text).width;
  ctx.font = fontSub;
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const w = Math.ceil(Math.max(w1, w2)) + pad * 2;
  const h = sub ? 62 : 44;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = 'rgba(6, 14, 22, 0.82)';
  const r = 9;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(148,178,214,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pad, sub ? 21 : h / 2);
  if (sub) {
    ctx.fillStyle = 'rgba(168,185,205,0.9)';
    ctx.font = fontSub;
    ctx.fillText(sub, pad, 43);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return { texture: tex, aspect: w / h };
}

function offsetSamples(segments, offY) {
  return segments.map((s) => ({ ...s, y: heightAt(s.x, s.z) + offY }));
}

function normalsFor(points) {
  return points.map((p, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    return { nx: -dz / len, nz: dx / len };
  });
}

// Ribbon geometry for a trail: a strip of quads following the centreline,
// each vertex coloured by the segment's state.
function buildRibbon(segments, opts = {}) {
  const { yOffset = 0.55, colorFor } = opts;
  if (segments.length < 2) return null;
  const pts = offsetSamples(segments, yOffset);
  const nrm = normalsFor(pts);

  const pos = [];
  const col = [];
  const uv = [];
  const idx = [];
  let run = 0;

  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const n = nrm[i];
    const half = p.width / 2;
    pos.push(p.x + n.nx * half, p.y, p.z + n.nz * half);
    pos.push(p.x - n.nx * half, p.y, p.z - n.nz * half);

    const c = colorFor(p, i);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);

    if (i > 0) run += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);
    uv.push(run / 12, 0, run / 12, 1);
  }

  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildGapRibbon(segments, ranges, yOffset = 0.9) {
  // ranges: [{startIdx, endIdx}]
  const pieces = [];
  for (const r of ranges) {
    const slice = segments.slice(r.startIdx - 1, r.endIdx + 2).filter(Boolean);
    if (slice.length < 2) continue;
    const g = buildRibbon(slice, {
      yOffset,
      colorFor: () => new THREE.Color(1, 1, 1),
    });
    if (g) pieces.push(g);
  }
  return pieces;
}

function trailColor(trail, seg, warnIdxSet) {
  const base = new THREE.Color(LEVEL_HEX[trail.level] || 0x8fa8c0);
  if (warnIdxSet.has(seg.index)) return new THREE.Color(WARN_HEX).lerp(base, 0.18);
  if (trail.status === 'closed') return base.clone().lerp(new THREE.Color(0x6d7b8d), 0.62);
  return base;
}

export class TerrainScene {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050a11);
    this.scene.fog = new THREE.FogExp2(0x060d16, 0.00052);

    this.camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 1, 4000);
    this.camera.position.set(300, 380, 690);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 150, 20);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 120;
    this.controls.maxDistance = 1500;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minPolarAngle = Math.PI * 0.06;
    this.controls.rotateSpeed = 0.62;
    this.controls.panSpeed = 0.7;
    this.controls.zoomSpeed = 0.8;

    this.hemi = new THREE.HemisphereLight(0xbcd8f5, 0x0a1420, 0.95);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xf2f8ff, 1.25);
    this.sun.position.set(-260, 420, 200);
    this.scene.add(this.sun);

    this.rim = new THREE.DirectionalLight(0x7fb4ff, 0.35);
    this.rim.position.set(320, 180, -320);
    this.scene.add(this.rim);

    this.hatch = makeHatchTexture();

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.trailGroup = new THREE.Group();
    this.gunGroup = new THREE.Group();
    this.markerGroup = new THREE.Group();
    this.stationGroup = new THREE.Group();
    this.nodeGroup = new THREE.Group();
    this.ghostGroup = new THREE.Group();
    this.root.add(this.trailGroup, this.gunGroup, this.markerGroup, this.stationGroup, this.nodeGroup, this.ghostGroup);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pickables = [];
    this.gunPickables = [];
    this.nodePickables = [];

    this.buildTerrain();
    this.buildStations();
    this.buildGrid();

    this.onResize = this.onResize.bind(this);
    this.animate = this.animate.bind(this);
    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(container);
    this.clock = new THREE.Clock();
    this.raf = requestAnimationFrame(this.animate);
  }

  buildTerrain() {
    const { positions, colors, normals, indices } = buildTerrainGeometry(250, 280);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    g.setIndex(indices);

    // fully baked lighting lives in the vertex colours, so the terrain is unlit
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.terrain = new THREE.Mesh(g, mat);
    this.terrain.name = 'terrain';
    this.scene.add(this.terrain);

    // contour hint: sparse isohypses read as a survey base map
    const contour = new THREE.LineSegments(
      new THREE.EdgesGeometry(g, 22),
      new THREE.LineBasicMaterial({
        color: 0x3d6b8f,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    );
    contour.renderOrder = 1;
    this.scene.add(contour);

    this.buildForest();

    // a base plate so the massif does not float in space
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(600, 620, 40, 72),
      new THREE.MeshStandardMaterial({ color: 0x081420, roughness: 1, metalness: 0 }),
    );
    plate.position.y = 2;
    this.scene.add(plate);
  }

  // Instanced conifers give the terrain a human scale and mark the tree line.
  buildForest() {
    const COUNT = 2600;
    const geo = new THREE.ConeGeometry(1.5, 7.5, 5);
    geo.translate(0, 3.75, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x16313a, roughness: 0.9, metalness: 0 });
    const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
    const dummy = new THREE.Object3D();
    let n = 0;
    let guard = 0;
    // deterministic scatter
    let seed = 20261118;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    while (n < COUNT && guard < COUNT * 30) {
      guard += 1;
      const x = -300 + rnd() * 600;
      const z = -330 + rnd() * 660;
      const y = heightAt(x, z);
      const slope = slopeAt(x, z, 3);
      // trees hold to gentle ground below the tree line and avoid the runs
      const belowLine = y < 232;
      const gentle = slope < 33;
      const clump = forestDensity(x, z) > 0.44;
      if (!belowLine || !gentle || !clump) continue;
      // no trees inside a piste: the runs are cleared, mown and groomed
      if (onPiste(x, z)) continue;
      const s = 0.7 + rnd() * 0.9;
      dummy.position.set(x, y - 0.5, z);
      dummy.rotation.y = rnd() * Math.PI * 2;
      dummy.scale.set(s, s * (0.85 + rnd() * 0.4), s);
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      n += 1;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(mesh);
  }

  buildStations() {
    for (const st of BASE_STATIONS) {
      const y = heightAt(st.x, st.z);
      const g = new THREE.Group();
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.9, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0x2b3f52, roughness: 0.6, metalness: 0.3 }),
      );
      post.position.y = 7;
      g.add(post);
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(3.4, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0x4fe3c1, emissive: 0x1d8a74, emissiveIntensity: 0.9, roughness: 0.4 }),
      );
      cap.position.y = 15;
      g.add(cap);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(13, 15, 40),
        new THREE.MeshBasicMaterial({ color: 0x4fe3c1, transparent: true, opacity: 0.32, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.7;
      g.add(ring);

      const label = makeLabelTexture(`下站 ${st.id}`, '#9df3e1', st.name);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: label.texture, transparent: true, depthTest: false, depthWrite: false }),
      );
      const h = 15;
      sprite.scale.set(h * label.aspect, h, 1);
      sprite.position.y = 28;
      g.add(sprite);

      g.position.set(st.x, y, st.z);
      this.stationGroup.add(g);
    }
  }

  buildGrid() {
    // survey grid draped loosely over the floor
    const geo = new THREE.BufferGeometry();
    const pts = [];
    for (let x = -300; x <= 300; x += 100) {
      pts.push(x, heightAt(x, -380) + 2, -380, x, heightAt(x, 400) + 2, 400);
    }
    for (let z = -380; z <= 400; z += 100) {
      pts.push(-300, heightAt(-300, z) + 2, z, 300, heightAt(300, z) + 2, z);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const lines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0x3f6f96, transparent: true, opacity: 0.1 }),
    );
    this.scene.add(lines);
  }

  onResize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate() {
    this.raf = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (this.tick) this.tick();
  }

  // ------------------------------------------------------------- trails
  setData({ trails, analyses, guns, selectedTrailId, selectedGunId, conflicts, mode, draft }) {
    this.data = { trails, analyses, guns, selectedTrailId, selectedGunId, conflicts, mode, draft };
    this.rebuildTrails();
    this.rebuildGuns();
    this.rebuildMarkers();
    this.rebuildNodes();
  }

  rebuildNodes() {
    while (this.nodeGroup.children.length) {
      const c = this.nodeGroup.children.pop();
      this.nodeGroup.remove(c);
      c.traverse?.((o) => {
        o.geometry?.dispose?.();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }
    this.nodePickables = [];
    const { trails, selectedTrailId, mode, draft } = this.data || {};
    if (!trails) return;
    const trail = trails.find((t) => t.id === selectedTrailId);
    if (!trail) return;

    const showHandles = mode === 'edit' && trail.centerline.length > 0;
    if (!showHandles) return;

    const isDraft = draft && draft.trailId === trail.id;

    trail.centerline.forEach((p, i) => {
      const y = heightAt(p.x, p.z);
      const g = new THREE.Group();
      g.position.set(p.x, y + 1.2, p.z);

      const isStart = i === 0;
      const isEnd = i === trail.centerline.length - 1;
      const color = isStart ? 0x4fe3c1 : isEnd ? 0xff9f6b : 0xeaf6ff;

      const handle = new THREE.Mesh(
        new THREE.SphereGeometry(isStart || isEnd ? 3.6 : 2.9, 14, 10),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.55,
          roughness: 0.35,
          metalness: 0.2,
        }),
      );
      g.add(handle);

      if (isStart || isEnd) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(5.4, 6.6, 26),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
        );
        ring.rotation.x = -Math.PI / 2;
        g.add(ring);
      }

      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(11, 8, 6),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hit.userData = { trailId: trail.id, nodeIndex: i, kind: 'node' };
      g.add(hit);
      this.nodePickables.push(hit);

      this.nodeGroup.add(g);
    });

    // live preview of the in-progress line
    if (isDraft && draft.points.length >= 1) {
      const pts = [...draft.points];
      if (draft.cursor) pts.push(draft.cursor);
      const vecs = pts.map((p) => new THREE.Vector3(p.x, heightAt(p.x, p.z) + 2.2, p.z));
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(vecs),
        new THREE.LineDashedMaterial({
          color: 0x4fe3c1,
          dashSize: 6,
          gapSize: 4,
          transparent: true,
          opacity: 0.95,
          depthTest: false,
        }),
      );
      line.computeLineDistances();
      line.renderOrder = 30;
      this.nodeGroup.add(line);

      draft.points.forEach((p) => {
        const y = heightAt(p.x, p.z);
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(2.2, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0x4fe3c1, transparent: true, opacity: 0.95, depthTest: false }),
        );
        dot.position.set(p.x, y + 2.2, p.z);
        dot.renderOrder = 31;
        this.nodeGroup.add(dot);
      });
    }
  }

  pickNode(clientX, clientY) {
    this.setPointer(clientX, clientY);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.nodePickables, false);
    if (hits.length) return hits[0].object.userData;
    return null;
  }

  rebuildTrails() {
    while (this.trailGroup.children.length) {
      const c = this.trailGroup.children.pop();
      this.trailGroup.remove(c);
      c.traverse?.((o) => {
        o.geometry?.dispose?.();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }
    this.pickables = [];
    const { trails, analyses, selectedTrailId } = this.data;

    for (const trail of trails) {
      const analysis = analyses[trail.id];
      if (!analysis || analysis.segments.length < 2) continue;
      const segs = analysis.segments;
      const isSelected = trail.id === selectedTrailId;
      const warnIdx = new Set();
      for (const w of analysis.warnings) {
        for (let i = w.startIdx; i <= w.endIdx; i += 1) warnIdx.add(i);
      }

      const group = new THREE.Group();
      group.userData.trailId = trail.id;

      const colorFor = (seg) => trailColor(trail, seg, warnIdx);
      const ribbonGeo = buildRibbon(segs, { yOffset: 0.5, colorFor });
      const opacity = isSelected ? 1 : trail.status === 'closed' ? 0.4 : 0.78;
      const ribbon = new THREE.Mesh(
        ribbonGeo,
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.72,
          metalness: 0.02,
          transparent: opacity < 1,
          opacity,
          emissive: new THREE.Color(LEVEL_HEX[trail.level] || 0x8fa8c0),
          emissiveIntensity: isSelected ? 0.34 : 0.12,
          side: THREE.DoubleSide,
          depthWrite: true,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        }),
      );
      ribbon.userData = { trailId: trail.id, kind: 'trail' };
      group.add(ribbon);
      this.pickables.push(ribbon);

      // centre line
      const linePts = segs.map((s) => new THREE.Vector3(s.x, s.y + 0.85, s.z));
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(linePts),
        new THREE.LineBasicMaterial({
          color: isSelected ? 0xffffff : 0xdfeefc,
          transparent: true,
          opacity: isSelected ? 0.85 : 0.35,
        }),
      );
      group.add(line);

      // red diagonal hatching over uncovered sections
      if (analysis.uncovered.length) {
        const pieces = buildGapRibbon(segs, analysis.uncovered, 0.95);
        for (const pg of pieces) {
          const uv = pg.getAttribute('uv');
          // stretch hatch density with run length
          for (let i = 0; i < uv.count; i += 1) uv.setX(i, uv.getX(i) * 1.15);
          const mesh = new THREE.Mesh(
            pg,
            new THREE.MeshBasicMaterial({
              map: this.hatch,
              transparent: true,
              opacity: isSelected ? 0.95 : 0.6,
              depthWrite: false,
              side: THREE.DoubleSide,
              polygonOffset: true,
              polygonOffsetFactor: -4,
              polygonOffsetUnits: -4,
            }),
          );
          mesh.userData = { trailId: trail.id, kind: 'gap' };
          group.add(mesh);
        }
      }

      // label at the top of the route
      if (isSelected || trail.status === 'open') {
        const head = segs[Math.floor(segs.length * 0.12)];
        const label = makeLabelTexture(trail.name, isSelected ? '#ffffff' : '#cfe3f5', `${LEVELS[trail.level].label} · ${trail.width} m`);
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: label.texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            opacity: isSelected ? 1 : 0.82,
          }),
        );
        const h = isSelected ? 17 : 13;
        sprite.scale.set(h * label.aspect, h, 1);
        sprite.position.set(head.x, head.y + 26, head.z);
        sprite.renderOrder = 20;
        group.add(sprite);
      }

      this.trailGroup.add(group);
    }
  }

  rebuildGuns() {
    while (this.gunGroup.children.length) {
      const c = this.gunGroup.children.pop();
      this.gunGroup.remove(c);
      c.traverse?.((o) => {
        o.geometry?.dispose?.();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }
    this.gunPickables = [];
    const { guns, selectedTrailId, selectedGunId } = this.data;

    for (const gun of guns) {
      const y = heightAt(gun.x, gun.z);
      const g = new THREE.Group();
      g.position.set(gun.x, y, gun.z);
      const isSel = gun.id === selectedGunId;
      const isRelevant = gun.trailId === selectedTrailId;
      const range = GUN_TYPES[gun.type]?.range || 55;

      const metal = new THREE.MeshStandardMaterial({
        color: isSel ? 0xd6fff4 : 0x9fb8cd,
        emissive: isSel ? 0x2f8f7c : 0x0f2836,
        emissiveIntensity: isSel ? 1.1 : 0.5,
        roughness: 0.45,
        metalness: 0.55,
      });

      if (gun.type === 'fan') {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 3.2, 10), metal);
        base.position.y = 1.6;
        g.add(base);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.2, 2.6, 12), metal);
        head.position.y = 4.6;
        head.rotation.z = 0.28;
        g.add(head);
      } else {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.8, 7.4, 8), metal);
        mast.position.y = 3.7;
        g.add(mast);
        const nozzle = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), metal);
        nozzle.position.y = 7.8;
        g.add(nozzle);
      }

      // pickable hit sphere
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(6, 8, 6),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hit.position.y = 4;
      hit.userData = { gunId: gun.id, trailId: gun.trailId, kind: 'gun' };
      g.add(hit);
      this.gunPickables.push(hit);

      // range ring
      if (isSel || isRelevant) {
        const ringPts = [];
        for (let a = 0; a <= 64; a += 1) {
          const ang = (a / 64) * Math.PI * 2;
          const px = gun.x + Math.cos(ang) * range;
          const pz = gun.z + Math.sin(ang) * range;
          ringPts.push(new THREE.Vector3(px, heightAt(px, pz) + 1.2, pz));
        }
        const ring = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(ringPts),
          new THREE.LineBasicMaterial({
            color: isSel ? 0x6ff0d8 : 0x4b93c8,
            transparent: true,
            opacity: isSel ? 0.8 : 0.4,
            depthWrite: false,
          }),
        );
        g.add(ring);

        // faint coverage disc, draped to the surface
        const disc = [];
        const rings = 3;
        for (let r = 1; r <= rings; r += 1) {
          const rr = (range * r) / rings;
          for (let a = 0; a < 40; a += 1) {
            const a1 = (a / 40) * Math.PI * 2;
            const a2 = ((a + 1) / 40) * Math.PI * 2;
            const p1x = gun.x + Math.cos(a1) * rr;
            const p1z = gun.z + Math.sin(a1) * rr;
            const p2x = gun.x + Math.cos(a2) * rr;
            const p2z = gun.z + Math.sin(a2) * rr;
            disc.push(
              gun.x, heightAt(gun.x, gun.z) + 1.0, gun.z,
              p1x, heightAt(p1x, p1z) + 1.0, p1z,
              p2x, heightAt(p2x, p2z) + 1.0, p2z,
            );
          }
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute('position', new THREE.Float32BufferAttribute(disc, 3));
        dg.computeVertexNormals();
        const dm = new THREE.Mesh(
          dg,
          new THREE.MeshBasicMaterial({
            color: isSel ? 0x3fd8bd : 0x2b6f95,
            transparent: true,
            opacity: isSel ? 0.12 : 0.05,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        g.add(dm);
      }

      g.userData = { gunId: gun.id, trailId: gun.trailId };
      this.gunGroup.add(g);
    }
  }

  rebuildMarkers() {
    while (this.markerGroup.children.length) {
      const c = this.markerGroup.children.pop();
      this.markerGroup.remove(c);
      c.traverse?.((o) => {
        o.geometry?.dispose?.();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }
    const { conflicts, selectedTrailId } = this.data;
    for (const c of conflicts) {
      if (c.kind === 'queue' || c.x === undefined) continue;
      const y = heightAt(c.x, c.z);
      const color = c.severity === 'severe' ? 0xff5252 : c.severity === 'warn' ? 0xffb84d : 0x6fbfe8;
      const g = new THREE.Group();
      g.position.set(c.x, y, c.z);

      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(4.4, 11, 4),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.6,
          roughness: 0.4,
          transparent: true,
          opacity: 0.92,
        }),
      );
      cone.position.y = 6;
      cone.rotation.x = Math.PI;
      g.add(cone);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 5, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }),
      );
      stem.position.y = 2.5;
      g.add(stem);

      if (c.trails.includes(selectedTrailId)) {
        const halo = new THREE.Mesh(
          new THREE.RingGeometry(9, 11.4, 32),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
        );
        halo.rotation.x = -Math.PI / 2;
        halo.position.y = 1;
        g.add(halo);
      }
      this.markerGroup.add(g);
    }
  }

  // ------------------------------------------------------------- picking
  setPointer(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    return rect;
  }

  pickTerrain(clientX, clientY) {
    this.setPointer(clientX, clientY);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.terrain, false);
    if (!hits.length) return null;
    const p = hits[0].point;
    return { x: p.x, z: p.z, y: heightAt(p.x, p.z) };
  }

  pickObject(clientX, clientY) {
    this.setPointer(clientX, clientY);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    // edit handles take priority: they sit on top of the ribbon they belong to
    const nodeHits = this.raycaster.intersectObjects(this.nodePickables, false);
    if (nodeHits.length) return { kind: 'node', ...nodeHits[0].object.userData };
    const gunHits = this.raycaster.intersectObjects(this.gunPickables, false);
    if (gunHits.length) return { kind: 'gun', ...gunHits[0].object.userData };
    const trailHits = this.raycaster.intersectObjects(this.pickables, false);
    if (trailHits.length) return { kind: 'trail', ...trailHits[0].object.userData };
    return null;
  }

  // Frame one run in the current view. Computes the run's bounding sphere and
  // stands the camera back far enough that the sphere fits whichever viewport
  // axis is tighter — so the whole piste is visible at any panel shape.
  focusTrail(analysis) {
    if (!analysis || !analysis.segments.length) return;
    const segs = analysis.segments;

    const centre = new THREE.Vector3();
    for (const s of segs) centre.add(new THREE.Vector3(s.x, s.y, s.z));
    centre.multiplyScalar(1 / segs.length);

    let radius = 0;
    for (const s of segs) {
      radius = Math.max(radius, Math.hypot(s.x - centre.x, s.y - centre.y, s.z - centre.z));
    }
    radius = Math.max(radius, (segs[0].width || 36) / 2 + 10);

    const vFov = (this.camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const fitFov = Math.min(vFov, hFov);
    const dist = (radius / Math.sin(fitFov / 2)) * 1.02;

    const top = segs[0];
    const dir = new THREE.Vector3(centre.x - top.x, 0, centre.z - top.z);
    if (dir.lengthSq() < 1) dir.set(0, 0, 1);
    dir.normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);

    // oblique: mostly across the fall line, a little downhill, and lifted
    const desired = centre
      .clone()
      .addScaledVector(side, dist * 0.72)
      .addScaledVector(dir, dist * 0.3)
      .add(new THREE.Vector3(0, dist * 0.62, 0));
    this.animateCamera(desired, centre.clone());
  }

  resetCamera() {
    this.animateCamera(new THREE.Vector3(300, 380, 690), new THREE.Vector3(0, 150, 20));
  }

  topView() {
    this.animateCamera(new THREE.Vector3(2, 900, 150), new THREE.Vector3(0, 60, 40));
  }

  animateCamera(pos, target) {
    this.camTween = {
      fromPos: this.camera.position.clone(),
      toPos: pos.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
      t: 0,
    };
    this.tick = () => {
      const tw = this.camTween;
      if (!tw) return;
      tw.t = Math.min(1, tw.t + 0.045);
      const e = 1 - (1 - tw.t) ** 3;
      this.camera.position.lerpVectors(tw.fromPos, tw.toPos, e);
      this.controls.target.lerpVectors(tw.fromTarget, tw.toTarget, e);
      this.controls.update();
      if (tw.t >= 1) {
        this.camTween = null;
        this.tick = null;
      }
    };
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.scene.traverse((o) => {
      o.geometry?.dispose?.();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

