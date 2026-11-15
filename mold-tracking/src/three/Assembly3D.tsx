import { onCleanup, onMount, createSignal, createEffect, For, Show } from 'solid-js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Part } from '../types';
import { buildGeometry } from './shape';

interface Props {
  parts: Part[];
  selectedId?: string;
  defectPartIds?: string[]; // 试模缺陷定位：红色高亮
  onSelect?: (id: string) => void;
  height?: string;
}

export default function Assembly3D(props: Props) {
  let mountEl!: HTMLDivElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let group: THREE.Group;
  const meshMap = new Map<string, THREE.Mesh>();
  const [autoRotate, setAutoRotate] = createSignal(true);
  const [hover, setHover] = createSignal<string | null>(null);

  const applyStyles = () => {
    meshMap.forEach((mesh, id) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const isSelected = id === props.selectedId;
      const isDefect = props.defectPartIds?.includes(id);
      const isHover = id === hover();
      mat.emissive.set(isDefect ? '#ff2d2d' : isSelected ? '#ffb020' : isHover ? '#3a6ea5' : '#000000');
      mat.emissiveIntensity = isDefect ? 0.85 : isSelected ? 0.6 : isHover ? 0.45 : 0;
    });
  };

  const rebuild = () => {
    group.clear();
    meshMap.clear();
    for (const p of props.parts) {
      const geo = buildGeometry(p.shape);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(p.color), roughness: 0.45, metalness: 0.12,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...p.pos);
      mesh.rotation.set(...p.rot);
      mesh.scale.set(...p.scale);
      mesh.userData.partId = p.id;
      mesh.castShadow = true;
      group.add(mesh);
      meshMap.set(p.id, mesh);
    }
    applyStyles();
  };

  onMount(() => {
    const w = mountEl.clientWidth;
    const h = mountEl.clientHeight;
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#10141b');
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(4.2, 3.2, 5.4);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountEl.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1, 0);

    const hemi = new THREE.HemisphereLight('#bcd4ff', '#2a2418', 1.1);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight('#ffffff', 1.6);
    dir.position.set(4, 7, 3);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    scene.add(dir);

    const grid = new THREE.GridHelper(9, 18, '#3a4356', '#232a37');
    grid.position.y = -1.05;
    scene.add(grid);

    group = new THREE.Group();
    scene.add(group);
    rebuild();

    // 点选
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointer = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...meshMap.values()], false);
      const id = hits[0]?.object.userData.partId as string | undefined;
      if (ev.type === 'click') {
        if (id && props.onSelect) props.onSelect(id);
      } else {
        setHover(id ?? null);
        renderer.domElement.style.cursor = id ? 'pointer' : 'default';
      }
    };
    renderer.domElement.addEventListener('click', onPointer);
    renderer.domElement.addEventListener('pointermove', onPointer);

    const ro = new ResizeObserver(() => {
      const nw = mountEl.clientWidth, nh = mountEl.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(mountEl);

    let raf = 0;
    const loop = () => {
      controls.autoRotate = autoRotate();
      controls.autoRotateSpeed = 1.2;
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    onCleanup(() => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('click', onPointer);
      renderer.domElement.removeEventListener('pointermove', onPointer);
      controls.dispose();
      meshMap.forEach((m) => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      renderer.dispose();
      renderer.domElement.remove();
    });
  });

  createEffect(() => {
    // 分件列表变化时重建（依赖 props.parts 长度与 id）
    props.parts.map((p) => p.id).join('|');
    if (group) rebuild();
  });
  createEffect(() => { props.selectedId; props.defectPartIds?.join('|'); hover(); applyStyles(); });

  return (
    <div class="relative" style={{ height: props.height ?? '420px' }}>
      <div ref={mountEl!} class="canvas-host" />
      <div class="absolute right-3 top-3 flex gap-2">
        <button class="btn-mini" onClick={() => setAutoRotate((v) => !v)}>
          {autoRotate() ? '⏸ 停止旋转' : '▶ 自动旋转'}
        </button>
      </div>
      <Show when={props.defectPartIds?.length}>
        <div class="absolute left-3 top-3 chip chip-danger">红点分件 = 试模缺陷定位</div>
      </Show>
      <div class="absolute bottom-3 left-3 hint">拖拽旋转 · 滚轮缩放 · 点击分件查看</div>
    </div>
  );
}
