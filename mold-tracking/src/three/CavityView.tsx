import { onCleanup, onMount, createSignal, createEffect, For } from 'solid-js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cavityGrid } from './shape';

interface Props {
  cavities: number;
  color: string;
  height?: string;
}

/** 模穴分布俯视：按穴数方阵排布，每穴编号 */
export default function CavityView(props: Props) {
  let mountEl!: HTMLDivElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let cavityGroup: THREE.Group;

  const rebuild = () => {
    cavityGroup.clear();
    const { cols, rows } = cavityGrid(props.cavities);
    const gap = 1.25;
    const baseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(props.color), roughness: 0.4, metalness: 0.15,
    });
    // 模架底板
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(cols * gap + 0.9, 0.18, rows * gap + 0.9),
      new THREE.MeshStandardMaterial({ color: '#5b6472', roughness: 0.7, metalness: 0.4 }),
    );
    plate.position.y = -0.32;
    plate.receiveShadow = true;
    cavityGroup.add(plate);

    for (let i = 0; i < props.cavities; i++) {
      const cx = (i % cols) - (cols - 1) / 2;
      const cz = Math.floor(i / cols) - (rows - 1) / 2;
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.12, 28), baseMat.clone());
      hole.position.set(cx * gap, -0.16, cz * gap);
      hole.castShadow = true;
      cavityGroup.add(hole);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.47, 0.035, 10, 30),
        new THREE.MeshStandardMaterial({ color: '#d8e2f0', metalness: 0.8, roughness: 0.25 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(cx * gap, -0.09, cz * gap);
      cavityGroup.add(ring);
    }

    // 穴号标签（sprite canvas）
    for (let i = 0; i < props.cavities; i++) {
      const cx = (i % cols) - (cols - 1) / 2;
      const cz = Math.floor(i / cols) - (rows - 1) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = 96; canvas.height = 96;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(16,20,27,.85)';
      ctx.beginPath(); ctx.arc(48, 48, 34, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#9fc2ff'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), 48, 50);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
      sprite.scale.set(0.42, 0.42, 0.42);
      sprite.position.set(cx * gap, 0.18, cz * gap);
      cavityGroup.add(sprite);
    }
  };

  onMount(() => {
    const w = mountEl.clientWidth, h = mountEl.clientHeight;
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#10141b');
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 5.2, 4.2);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    mountEl.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    scene.add(new THREE.HemisphereLight('#bcd4ff', '#222', 1.2));
    const dir = new THREE.DirectionalLight('#fff', 1.5);
    dir.position.set(3, 6, 2);
    dir.castShadow = true;
    scene.add(dir);
    cavityGroup = new THREE.Group();
    scene.add(cavityGroup);
    rebuild();

    const ro = new ResizeObserver(() => {
      const nw = mountEl.clientWidth, nh = mountEl.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(mountEl);

    let raf = 0;
    const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
    loop();
    onCleanup(() => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    });
  });

  createEffect(() => { props.cavities; props.color; if (cavityGroup) rebuild(); });

  return (
    <div>
      <div ref={mountEl!} class="canvas-host" style={{ height: props.height ?? '320px' }} />
      <div class="flex-wrap gap-2 mt-2">
        <For each={Array.from({ length: props.cavities }, (_, i) => i + 1)}>
          {(n) => <span class="chip chip-outline">{n}# 穴</span>}
        </For>
      </div>
    </div>
  );
}
