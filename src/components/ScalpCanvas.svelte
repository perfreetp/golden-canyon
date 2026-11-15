<script>
  /**
   * 头皮三维布点画布（three.js / WebGL2）
   * - 从电极架拖出电极 → 射线投射到头皮 → 自动吸附最近解剖分区
   * - 点选电极、双击改名、拖动坐标手柄微调
   * - 旋转视角，一键切俯视 / 左右侧视图
   * - 任意两电极间距 < 1.5cm 时红色圆框 + 虚线提示
   * - 支持幽灵层（标准答案叠加，用于复盘）
   */
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
  import {
    createSceneRenderer, buildHeadGeometry, buildHeadMaterial, buildHeadDetails,
    buildScalpTexture, buildHairMaskTexture, buildElectrodeMesh, buildLabelSprite, orientToScalp,
  } from '../lib/three-scene.js';
  import {
    scalpPoint, scalpNormal, dirOfPoint, scalpMask, normalize, projectToScalp, dist, HEAD, dirFromAngles,
  } from '../lib/headgeo.js';
  import { solveMontage, DEFAULT_REGIONS, CAMERA_PRESETS, classifyRegion, parseName } from '../lib/montage.js';

  let {
    placements = [],
    regionDict = DEFAULT_REGIONS,
    showRegions = true,
    showLabels = true,
    selectedId = null,
    minSpacing = 1.5,
    editable = true,
    gizmoMode = 'translate',
    ghosts = [],
    wrongIds = [],
    presetSeq = 0,
    presetKey = 'iso',
    symmetryCheck = false,
    onPlace,
    onSelect,
    onMove,
    onDropOutside,
    onReady,
  } = $props();

  let host;
  let canvasEl;
  let overlayEl;

  let renderer;
  let scene;
  let camera;
  let controls;
  let transform;
  let raycaster;
  let headMesh;
  let labelLayer;
  let ghostLayer;
  let violationLayer;
  let symmetryLayer;
  let offsetLayer;

  const electrodeObjs = new Map();
  const labelObjs = new Map();
  const ghostObjs = new Map();
  let violationKey = '';

  let rafId = 0;
  let disposed = false;
  let ready = $state(false);
  let hoverId = null;
  let dropHintEl = null;
  let hoverTipEl = null;
  let camAnim = null;
  let gizmoDragging = false;
  let lastGizmoNotify = 0;
  let syncing = false;

  let headGeo;
  let headMat;
  let regionTex = null;
  let hairMaskTex = null;
  let regionTexSig = '';

  function init() {
    renderer = createSceneRenderer(canvasEl);
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070b0f, 0.0068);

    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
    camera.position.set(24, 26, 40);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.9;
    controls.enablePan = false;
    controls.minDistance = 30;
    controls.maxDistance = 120;
    controls.maxPolarAngle = Math.PI * 0.93;
    controls.minPolarAngle = Math.PI * 0.03;
    controls.target.set(0, 0.4, 0);

    const key = new THREE.DirectionalLight(0xffe7cd, 2.25);
    key.position.set(17, 27, 19);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 95;
    key.shadow.camera.left = -24;
    key.shadow.camera.right = 24;
    key.shadow.camera.top = 28;
    key.shadow.camera.bottom = -24;
    key.shadow.bias = -0.0008;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x76dcff, 1.45);
    rim.position.set(-24, 9, -22);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0x93acc0, 0.7);
    fill.position.set(-9, -15, 16);
    scene.add(fill);

    scene.add(new THREE.HemisphereLight(0x2c3d49, 0x090c0f, 1.1));
    scene.add(new THREE.AmbientLight(0x3b4b59, 0.55));

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(64, 48),
      new THREE.ShadowMaterial({ opacity: 0.4 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -16.2;
    ground.receiveShadow = true;
    scene.add(ground);

    headGeo = buildHeadGeometry(256, 178);
    headMat = buildHeadMaterial();
    headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    scene.add(headMesh);
    scene.add(buildHeadDetails());

    hairMaskTex = buildHairMaskTexture();
    headMat.userData.uniforms.uHairMap.value = hairMaskTex;
    ensureRegionTexture();

    labelLayer = new THREE.Group();
    ghostLayer = new THREE.Group();
    violationLayer = new THREE.Group();
    symmetryLayer = new THREE.Group();
    scene.add(labelLayer, ghostLayer, violationLayer, symmetryLayer);

    transform = new TransformControls(camera, renderer.domElement);
    transform.setSize(0.5);
    transform.addEventListener('dragging-changed', (e) => {
      controls.enabled = !e.value;
      gizmoDragging = !!e.value;
      if (!e.value) applyGizmoToPlacement(false);
    });
    transform.addEventListener('objectChange', () => {
      if (gizmoDragging) applyGizmoToPlacement(true);
    });
    scene.add(transform.getHelper());
    transform.visible = false;

    raycaster = new THREE.Raycaster();
    canvasEl.addEventListener('pointermove', onPointerMove);
    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('dblclick', onDblClick);
    canvasEl.addEventListener('contextmenu', preventDefault);

    host.addEventListener('dragover', onDragOver);
    host.addEventListener('dragenter', preventDefaultFn);
    host.addEventListener('dragleave', onDragLeave);
    host.addEventListener('drop', onDrop);
    window.addEventListener('resize', resize);

    resize();
    syncAll();
    updatePreset();
    loop();
  }

  function preventDefault(e) { e.preventDefault(); }
  function preventDefaultFn(e) { e.preventDefault(); }

  function resize() {
    if (!renderer || !host) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function loop() {
    rafId = requestAnimationFrame(loop);
    if (disposed) return;
    if (camAnim) {
      camAnim.t += 1;
      const k = Math.min(1, camAnim.t / 30);
      const e = 1 - (1 - k) ** 3;
      camera.position.lerpVectors(camAnim.from, camAnim.to, e);
      if (k >= 1) camAnim = null;
    }
    controls.update();
    if (gizmoDragging) handleGizmoLive();
    for (const sp of labelObjs.values()) {
      const d = camera.position.distanceTo(sp.position);
      sp.scale.setScalar(THREE.MathUtils.clamp(1 + (d - 32) * 0.011, 0.8, 1.5));
    }
    renderer.render(scene, camera);
  }

  /* -------- 区域贴图 -------- */
  function ensureRegionTexture() {
    if (!headMat) return;
    const sig = JSON.stringify(regionDict.map((r) => [r.id, r.color, r.members]));
    if (regionTex && sig === regionTexSig) return;
    if (regionTex) regionTex.dispose();
    regionTex = buildScalpTexture(regionDict);
    regionTexSig = sig;
    headMat.userData.uniforms.uRegionMap.value = regionTex;
    headMat.needsUpdate = true;
  }

  /* -------- 电极与标签 -------- */
  function electrodeColor(p) {
    if (selectedId && p.id === selectedId) return 0x38d3bd;
    if (wrongIds.includes(p.id)) return 0xf2726f;
    if (!parseName(p.name).ok) return 0xffa6a3;
    return 0xe8eef2;
  }

  function tintElectrode(g, hex) {
    const disk = g.children[0];
    disk.material.color.setHex(hex);
    disk.material.emissive.setHex(hex);
    disk.material.emissiveIntensity = hex === 0x38d3bd ? 0.42 : 0.08;
  }

  function ensureElectrode(p) {
    let g = electrodeObjs.get(p.id);
    if (!g) {
      g = buildElectrodeMesh(electrodeColor(p));
      g.castShadow = true;
      g.userData.electrodeId = p.id;
      orientToScalp(g, p.pos);
      scene.add(g);
      electrodeObjs.set(p.id, g);
    }
    tintElectrode(g, electrodeColor(p));
    return g;
  }

  function rebuildLabels() {
    if (!labelLayer) return;
    while (labelLayer.children.length) {
      const sp = labelLayer.children.pop();
      sp.material.map?.dispose();
      sp.material.dispose();
    }
    labelObjs.clear();
    if (!showLabels) return;
    for (const p of placements) {
      const sel = p.id === selectedId;
      const bad = wrongIds.includes(p.id) || !parseName(p.name).ok;
      const sp = buildLabelSprite(p.name || '·', {
        color: sel ? '#38d3bd' : bad ? '#ff9a97' : '#dbe6ee',
        active: sel,
      });
      sp.center.set(0.5, 0);
      const n = scalpNormal(dirOfPoint(p.pos));
      sp.position.set(p.pos[0] + n[0] * 1.5, p.pos[1] + n[1] * 1.5, p.pos[2] + n[2] * 1.5);
      sp.renderOrder = 900;
      labelLayer.add(sp);
      labelObjs.set(p.id, sp);
    }
  }

  function rebuildGhosts() {
    if (!ghostLayer) return;
    while (ghostLayer.children.length) ghostLayer.children.pop();
    ghostObjs.clear();
    for (const gh of ghosts) {
      const g = buildElectrodeMesh(0x7fa0b6);
      g.scale.setScalar(1.35);
      g.children.forEach((c) => {
        if (c.material) {
          c.material.transparent = true;
          c.material.opacity = 0.34;
          c.material.depthWrite = false;
        }
      });
      orientToScalp(g, gh.pos);
      ghostLayer.add(g);
      ghostObjs.set(gh.id, g);
    }
  }

  function rebuildViolations() {
    if (!violationLayer) return;
    const key = placements
      .map((p) => `${p.id}:${p.pos.map((v) => v.toFixed(3)).join(',')}`)
      .join('|') + `#${minSpacing}`;
    if (key === violationKey) return;
    violationKey = key;

    while (violationLayer.children.length) {
      const c = violationLayer.children.pop();
      c.geometry?.dispose();
      c.material?.dispose();
    }
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const a = placements[i];
        const b = placements[j];
        if (dist(a.pos, b.pos) >= minSpacing) continue;
        for (const p of [a, b]) {
          const n = normalize(scalpNormal(dirOfPoint(p.pos)));
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.95, 0.09, 8, 44),
            new THREE.MeshBasicMaterial({ color: 0xf2726f, transparent: true, opacity: 0.95, depthTest: false }),
          );
          ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...n));
          ring.position.set(p.pos[0] + n[0] * 0.5, p.pos[1] + n[1] * 0.5, p.pos[2] + n[2] * 0.5);
          ring.renderOrder = 800;
          violationLayer.add(ring);
        }
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...a.pos), new THREE.Vector3(...b.pos),
          ]),
          new THREE.LineDashedMaterial({ color: 0xf2726f, dashSize: 0.3, gapSize: 0.22, transparent: true, opacity: 0.85, depthTest: false }),
        );
        line.computeLineDistances();
        line.renderOrder = 800;
        violationLayer.add(line);
      }
    }
  }

  /** 左右对称核对：绘制正中矢状面与镜像配对连线 */
  function rebuildSymmetry() {
    if (!symmetryLayer) return;
    while (symmetryLayer.children.length) {
      const c = symmetryLayer.children.pop();
      c.geometry?.dispose();
      c.material?.dispose();
    }
    if (!symmetryCheck) return;

    // 正中矢状面（薄片，半透明）
    const planeGeo = new THREE.PlaneGeometry(30, 34);
    const plane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({
      color: 0x38d3bd, transparent: true, opacity: 0.055, side: THREE.DoubleSide,
      depthWrite: false,
    }));
    plane.rotation.y = Math.PI / 2;
    plane.position.set(0, 0.4, 0);
    symmetryLayer.add(plane);

    // 正中线
    const mid = [];
    for (let tDeg = 2; tDeg <= 178; tDeg += 2) {
      const p = scalpPoint(dirFromAngles(tDeg, 0));
      mid.push(new THREE.Vector3(p[0], p[1], p[2]));
    }
    for (let tDeg = 178; tDeg >= 2; tDeg -= 2) {
      const p = scalpPoint(dirFromAngles(tDeg, 180));
      mid.push(new THREE.Vector3(p[0], p[1], p[2]));
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(mid),
      new THREE.LineBasicMaterial({ color: 0x38d3bd, transparent: true, opacity: 0.55, depthTest: false }),
    );
    line.renderOrder = 700;
    symmetryLayer.add(line);

    // 左右配对：镜像虚线
    const byName = new Map();
    for (const p of placements) byName.set(p.name, p);
    for (const [name, lead] of byName) {
      const m = name.match(/^(Fp|F|C|P|O|T|A)(\d)$/);
      if (!m) continue;
      const n = Number(m[2]);
      const other = `${m[1]}${n % 2 === 0 ? n - 1 : n + 1}`;
      const pr = byName.get(other);
      if (!pr) continue;
      const mirrorPos = [-lead.pos[0], lead.pos[1], lead.pos[2]];
      const dash = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...mirrorPos), new THREE.Vector3(...pr.pos)]),
        new THREE.LineDashedMaterial({ color: 0xf0bd68, dashSize: 0.3, gapSize: 0.22, transparent: true, opacity: 0.8, depthTest: false }),
      );
      dash.computeLineDistances();
      dash.renderOrder = 720;
      symmetryLayer.add(dash);
      // 镜像参考点
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xf0bd68, transparent: true, opacity: 0.8, depthTest: false }),
      );
      dot.position.set(...mirrorPos);
      dot.renderOrder = 721;
      symmetryLayer.add(dot);
    }
  }

  /** 未吸附落点：到场标准标记位画虚线，直观显示偏差 */
  function rebuildOffsetLines() {
    if (!symmetryLayer) return;
    // 复用对称层的清理不便，这里单独挂到 violation layer 之外的小组
    if (!offsetLayer) {
      offsetLayer = new THREE.Group();
      scene.add(offsetLayer);
    }
    while (offsetLayer.children.length) {
      const c = offsetLayer.children.pop();
      c.geometry?.dispose();
      c.material?.dispose();
    }
    const { nodes } = solveMontage();
    for (const p of placements) {
      if (p.snappedTo) continue;
      const node = nodes[p.name];
      if (!node) continue;
      const d = Math.hypot(p.pos[0] - node.pos[0], p.pos[1] - node.pos[1], p.pos[2] - node.pos[2]);
      if (d < 0.25) continue;
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...p.pos), new THREE.Vector3(...node.pos),
        ]),
        new THREE.LineDashedMaterial({ color: 0x6aa8e8, dashSize: 0.26, gapSize: 0.2, transparent: true, opacity: 0.75, depthTest: false }),
      );
      line.computeLineDistances();
      line.renderOrder = 710;
      offsetLayer.add(line);
    }
  }

  function syncAll() {
    if (!scene) return;
    for (const [id, g] of electrodeObjs) {
      if (!placements.some((p) => p.id === id)) {
        scene.remove(g);
        g.traverse((o) => { o.geometry?.dispose?.(); });
        electrodeObjs.delete(id);
      }
    }
    for (const p of placements) {
      const g = ensureElectrode(p);
      const d = Math.hypot(g.position.x - p.pos[0], g.position.y - p.pos[1], g.position.z - p.pos[2]);
      if (d > 1e-4) orientToScalp(g, p.pos);
    }
    rebuildLabels();
    rebuildGhosts();
    rebuildViolations();
    rebuildSymmetry();
    rebuildOffsetLines();
    syncGizmo();
  }

  function syncGizmo() {
    if (!transform) return;
    const sel = placements.find((p) => p.id === selectedId);
    if (sel && editable) {
      const g = electrodeObjs.get(sel.id);
      if (g && transform.object !== g) transform.attach(g);
      transform.visible = true;
      transform.setMode(gizmoMode);
    } else {
      if (transform.object) transform.detach();
      transform.visible = false;
    }
  }

  /* -------- 手柄微调：约束到头皮表面 -------- */
  function handleGizmoLive() {
    const sel = placements.find((p) => p.id === selectedId);
    if (!sel) return;
    const g = electrodeObjs.get(sel.id);
    if (!g) return;
    const raw = [g.position.x, g.position.y, g.position.z];
    const dir = dirOfPoint(raw);
    const onHead = scalpMask(dir) > 0.18;
    if (onHead) {
      const snapped = scalpPoint(dir);
      orientToScalp(g, snapped);
      const now = performance.now();
      if (now - lastGizmoNotify > 70) {
        lastGizmoNotify = now;
        onMove?.(sel.id, snapped, { live: true });
      }
    }
  }

  function applyGizmoToPlacement(live) {
    const sel = placements.find((p) => p.id === selectedId);
    if (!sel) return;
    const g = electrodeObjs.get(sel.id);
    if (!g) return;
    const dir = dirOfPoint([g.position.x, g.position.y, g.position.z]);
    const snapped = scalpPoint(dir);
    orientToScalp(g, snapped);
    onMove?.(sel.id, snapped, { live });
  }

  /* -------- 拖放 -------- */
  function hitScalp(clientX, clientY) {
    const rect = canvasEl.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(headMesh, false);
    if (!hits.length) return null;
    return hits[0].point.toArray();
  }

  function nearestLandmark(pos) {
    const { nodes } = solveMontage();
    let best = null;
    for (const [name, n] of Object.entries(nodes)) {
      const d = dist(pos, n.pos);
      if (!best || d < best.distance) best = { name, distance: d, node: n };
    }
    return best;
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    showDropHint(e.clientX, e.clientY);
  }
  function onDragLeave() { if (dropHintEl) dropHintEl.style.display = 'none'; }

  function showDropHint(cx, cy) {
    const hit = hitScalp(cx, cy);
    if (!hit) { if (dropHintEl) dropHintEl.style.display = 'none'; return; }
    const dir = dirOfPoint(hit);
    const ok = scalpMask(dir) > 0.2;
    const snapped = projectToScalp(hit);
    const near = nearestLandmark(snapped);
    if (!dropHintEl) {
      dropHintEl = document.createElement('div');
      dropHintEl.className = 'drop-hint';
      overlayEl.appendChild(dropHintEl);
    }
    const rect = host.getBoundingClientRect();
    dropHintEl.style.display = 'flex';
    dropHintEl.style.left = `${cx - rect.left + 18}px`;
    dropHintEl.style.top = `${cy - rect.top + 12}px`;
    dropHintEl.dataset.ok = ok ? '1' : '0';
    dropHintEl.innerHTML = ok
      ? `<b>吸附 ${near.name}</b><span>${dist(snapped, near.node.pos).toFixed(1)} cm · 点击落点</span>`
      : '<b>超出可贴区域</b><span>请贴至发际线以上头皮</span>';
  }

  function onDrop(e) {
    e.preventDefault();
    if (dropHintEl) dropHintEl.style.display = 'none';
    let payload = null;
    try { payload = JSON.parse(e.dataTransfer.getData('application/x-electrode') || 'null'); } catch { payload = null; }
    const hit = editable ? hitScalp(e.clientX, e.clientY) : null;
    if (!hit) { onDropOutside?.(payload); return; }
    const dir = dirOfPoint(hit);
    if (scalpMask(dir) < 0.2) { onDropOutside?.(payload); return; }
    const snapped = projectToScalp(hit);
    onPlace?.(payload, snapped, classifyRegion(dir, regionDict));
  }

  /* -------- 选点 -------- */
  function pickElectrode(cx, cy) {
    if (!scene) return null;
    const rect = canvasEl.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((cx - rect.left) / rect.width) * 2 - 1,
      -((cy - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects([...electrodeObjs.values()], true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData.electrodeId) o = o.parent;
    return o?.userData.electrodeId || null;
  }

  function onPointerDown(e) {
    if (!editable || e.button !== 0 || gizmoDragging) return;
    const id = pickElectrode(e.clientX, e.clientY);
    if (id) onSelect?.(id);
    else if (selectedId) onSelect?.(null);
  }

  function onDblClick(e) {
    if (!editable) return;
    const id = pickElectrode(e.clientX, e.clientY);
    if (!id) return;
    onSelect?.(id);
    const p = placements.find((x) => x.id === id);
    window.dispatchEvent(new CustomEvent('eeg:rename-request', { detail: { id, name: p?.name } }));
  }

  function onPointerMove(e) {
    if (!scene) return;
    const id = editable ? pickElectrode(e.clientX, e.clientY) : null;
    if (id !== hoverId) {
      hoverId = id;
      canvasEl.style.cursor = id ? 'pointer' : 'grab';
    }
    if (!hoverTipEl && overlayEl) {
      hoverTipEl = document.createElement('div');
      hoverTipEl.className = 'hover-tip';
      overlayEl.appendChild(hoverTipEl);
    }
    if (id && hoverTipEl && !gizmoDragging) {
      const p = placements.find((x) => x.id === id);
      if (p) {
        const region = classifyRegion(dirOfPoint(p.pos), regionDict);
        const rect = host.getBoundingClientRect();
        hoverTipEl.style.display = 'block';
        hoverTipEl.style.left = `${e.clientX - rect.left + 16}px`;
        hoverTipEl.style.top = `${e.clientY - rect.top + 12}px`;
        hoverTipEl.innerHTML =
          `<b>${p.name || '未命名'}</b><span>${region.region.name} · 偏离标准位 ${region.distance.toFixed(1)} cm</span>`;
      }
    } else if (hoverTipEl) {
      hoverTipEl.style.display = 'none';
    }
  }

  /* -------- 视角 -------- */
  function setPreset(key) {
    const preset = CAMERA_PRESETS[key];
    if (!preset) return;
    const theta = (preset.theta * Math.PI) / 180;
    const phi = (preset.phi * Math.PI) / 180;
    const r = preset.radius;
    const to = new THREE.Vector3(
      r * Math.sin(theta) * Math.sin(phi),
      r * Math.cos(theta) + 0.4,
      r * Math.sin(theta) * Math.cos(phi),
    );
    controls.target.set(0, 0.4, 0);
    camAnim = { from: camera.position.clone(), to, t: 0 };
  }

  function updatePreset() {
    if (!scene) return;
    setPreset(presetKey || 'iso');
  }

  function resetView() { setPreset('iso'); }

  function focusOn(pos) {
    if (!pos) return;
    const dir = normalize([pos[0], pos[1] - 0.4, pos[2]]);
    const r = Math.max(26, Math.min(40, camera.position.distanceTo(controls.target)));
    camAnim = {
      from: camera.position.clone(),
      to: new THREE.Vector3(dir[0] * r, 0.4 + dir[1] * r, dir[2] * r), t: 0,
    };
  }

  /* -------- 响应式同步 -------- */
  $effect(() => {
    if (!ready || !scene) return;
    ensureRegionTexture();
    headMat.userData.uniforms.uShowRegion.value = showRegions === true || showRegions === 'true' ? 1 : 0;
    headMat.userData.uniforms.uRegionOpacity.value = 0.62;
    headMat.needsUpdate = true;
  });

  $effect(() => {
    // 依赖 placements / selected / wrongIds / ghosts / labels / ready
    if (!ready || !scene) return;
    syncAll();
  });

  $effect(() => {
    if (!ready || !scene) return;
    if (transform) {
      transform.setMode(gizmoMode);
      syncGizmo();
    }
  });

  $effect(() => {
    if (!ready || !scene) return;
    if (presetSeq > 0) setPreset(presetKey);
  });

  $effect(() => {
    if (!ready || !scene) return;
    void symmetryCheck;
    void placements;
    rebuildSymmetry();
  });

  // 只读预览模式：初始化后立即定位到指定视角
  $effect(() => {
    if (!ready || !scene || editable) return;
    setPreset(presetKey || 'top');
  });



  onMount(() => {
    init();
    ready = true;
    onReady?.({
      setPreset, resetView, focusOn,
      getCamera: () => camera,
      screenshot: () => renderer.domElement.toDataURL('image/png'),
    });
  });

  onDestroy(() => {
    disposed = true;
    cancelAnimationFrame(rafId);
    canvasEl?.removeEventListener('pointermove', onPointerMove);
    canvasEl?.removeEventListener('pointerdown', onPointerDown);
    canvasEl?.removeEventListener('dblclick', onDblClick);
    canvasEl?.removeEventListener('contextmenu', preventDefault);
    host?.removeEventListener('dragover', onDragOver);
    host?.removeEventListener('dragenter', preventDefaultFn);
    host?.removeEventListener('dragleave', onDragLeave);
    host?.removeEventListener('drop', onDrop);
    window.removeEventListener('resize', resize);
    transform?.dispose?.();
    headGeo?.dispose();
    headMat?.dispose();
    regionTex?.dispose();
    hairMaskTex?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss?.();
  });
</script>

<div class="canvas-host" bind:this={host}>
  <canvas bind:this={canvasEl} class="gl"></canvas>
  <div class="overlay" bind:this={overlayEl}></div>
  <div class="corner-meta"><span class="dot"></span> WebGL2 · 头皮曲面投照</div>
</div>

<style>
  .canvas-host { position: relative; width: 100%; height: 100%; overflow: hidden; background: #070b0f; }
  .gl { display: block; width: 100%; height: 100%; touch-action: none; }
  .overlay { position: absolute; inset: 0; pointer-events: none; }
  :global(.drop-hint) {
    position: absolute; display: flex; flex-direction: column;
    padding: 7px 11px; border-radius: 7px; white-space: nowrap;
    background: rgba(8, 14, 19, .94); border: 1px solid rgba(56, 211, 189, .55);
    font-size: 12px; color: #dbe6ee; box-shadow: 0 8px 24px rgba(0, 0, 0, .55);
  }
  :global(.drop-hint[data-ok='0']) { border-color: rgba(242, 114, 111, .65); }
  :global(.drop-hint span) { color: #61727f; font-size: 10.5px; }
  :global(.hover-tip) {
    position: absolute; display: none; flex-direction: column; white-space: nowrap;
    padding: 6px 10px; border-radius: 7px;
    background: rgba(8, 14, 19, .92); border: 1px solid rgba(120, 145, 160, .35);
    font-size: 11.5px; color: #dbe6ee;
  }
  :global(.hover-tip span) { color: #61727f; font-size: 10.5px; }
  .corner-meta {
    position: absolute; left: 14px; bottom: 12px; display: flex; align-items: center; gap: 6px;
    font-size: 10.5px; color: #43535f; letter-spacing: .05em;
  }
  .dot { width: 5px; height: 5px; border-radius: 50%; background: #38d3bd; box-shadow: 0 0 8px #38d3bd; }
</style>
