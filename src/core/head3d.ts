// Babylon.js 三维头模：半球头颅 + 按脑区锚点分布的可点击区域
// 按需深度导入，避免全量 barrel 撑大主包
import { Engine as BEngine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { BrainTemplate } from '../types';

export { BEngine };

export interface Head3DCallbacks {
  onRegionClick?: (regionId: string, name: string) => void;
}

/**
 * 球坐标 → 笛卡尔。theta=方位角（自前向后），phi=仰角（正为上）
 */
function spherical(theta: number, phi: number, r: number): Vector3 {
  return new Vector3(
    r * Math.cos(phi) * Math.cos(theta),
    r * Math.sin(phi),
    r * Math.cos(phi) * Math.sin(theta),
  );
}

export class Head3D {
  readonly scene: Scene;
  private regionMeshes = new Map<string, Mesh>();
  private camera: ArcRotateCamera;
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    private tpl: BrainTemplate,
    private engine: BEngine,
    private cb: Head3DCallbacks = {},
  ) {
    void canvas;
    this.scene = new Scene(engine);
    this.scene.clearColor = new Color4(0.06, 0.08, 0.14, 1);

    this.camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 2.4, 7.2, Vector3.Zero(), this.scene);
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 4.5;
    this.camera.upperRadiusLimit = 12;
    this.camera.wheelDeltaPercentage = 0.01;
    this.camera.panningSensibility = 0; // 禁止平移，只允许旋转/缩放，适合病房平板
    this.camera.useAutoRotationBehavior = true;
    if (this.camera.autoRotationBehavior) {
      this.camera.autoRotationBehavior.idleRotationWaitTime = 4000;
      this.camera.autoRotationBehavior.idleRotationSpeed = 0.12;
    }

    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.85;
    const key = new PointLight('key', new Vector3(4, 5, -3), this.scene);
    key.intensity = 0.7;

    this.buildSkull();
    this.buildRegions();

    this.scene.onPointerObservable.add((info) => {
      if (info.pickInfo?.hit && info.pickInfo.pickedMesh?.metadata?.regionId) {
        const m = info.pickInfo.pickedMesh as Mesh;
        const id = m.metadata.regionId as string;
        const name = m.metadata.regionName as string;
        this.highlight(id);
        this.cb.onRegionClick?.(id, name);
      }
    });
  }

  /** 半透明头颅半球 + 网格线，营造“头模”观感 */
  private buildSkull(): void {
    const skull = MeshBuilder.CreateSphere(
      'skull',
      { diameter: 5.2, sideOrientation: Mesh.DOUBLESIDE, segments: 32 },
      this.scene,
    );
    const mat = new StandardMaterial('skull-mat', this.scene);
    mat.diffuseColor = new Color3(0.86, 0.88, 0.95);
    mat.alpha = 0.16;
    mat.specularColor = new Color3(0.7, 0.7, 0.8);
    mat.emissiveColor = new Color3(0.05, 0.06, 0.1);
    skull.material = mat;

    // 经纬参考线（线框球略小一点，避免 z-fight）
    const wire = MeshBuilder.CreateSphere(
      'wire',
      { diameter: 5.21, segments: 24, sideOrientation: Mesh.DOUBLESIDE },
      this.scene,
    );
    const wireMat = new StandardMaterial('wire-mat', this.scene);
    wireMat.wireframe = true;
    wireMat.emissiveColor = new Color3(0.35, 0.45, 0.75);
    wireMat.alpha = 0.35;
    wire.material = wireMat;

    // 鼻突标识（前方小锥体），帮助患者辨别朝向
    const nose = MeshBuilder.CreateCylinder('nose', { diameterTop: 0.05, diameterBottom: 0.35, height: 0.7, tessellation: 16 }, this.scene);
    nose.rotation.z = Math.PI / 2;
    nose.position = new Vector3(-2.85, -0.1, 0);
    const noseMat = new StandardMaterial('nose-mat', this.scene);
    noseMat.diffuseColor = new Color3(0.8, 0.82, 0.9);
    noseMat.alpha = 0.5;
    nose.material = noseMat;
  }

  private buildRegions(): void {
    for (const rg of this.tpl.regions) {
      const pos = spherical(rg.anchor.theta, rg.anchor.phi, 2.62 * rg.anchor.r);
      const disc = MeshBuilder.CreateDisc(
        `rg-${rg.id}`,
        { radius: 0.42, tessellation: 36, sideOrientation: Mesh.DOUBLESIDE },
        this.scene,
      );
      disc.position = pos;
      disc.lookAt(pos.scale(2)); // 法线朝外
      const mat = new StandardMaterial(`mat-${rg.id}`, this.scene);
      const c = Color3.FromHexString(rg.color);
      mat.diffuseColor = c;
      mat.emissiveColor = c.scale(0.35);
      mat.alpha = 0.92;
      disc.material = mat;
      disc.metadata = { regionId: rg.id, regionName: rg.name };
      this.regionMeshes.set(rg.id, disc);
    }
  }

  /** 高亮某脑区，其余变暗 */
  highlight(regionId: string | null): void {
    for (const [id, mesh] of this.regionMeshes) {
      const mat = mesh.material as StandardMaterial;
      if (!regionId) {
        mat.alpha = 0.92;
        mesh.scaling.setAll(1);
      } else if (id === regionId) {
        mat.alpha = 1;
        mesh.scaling.setAll(1.25);
      } else {
        mat.alpha = 0.25;
        mesh.scaling.setAll(1);
      }
    }
  }

  resetView(): void {
    this.camera.alpha = -Math.PI / 2;
    this.camera.beta = Math.PI / 2.4;
    this.camera.radius = 7.2;
    this.highlight(null);
  }

  renderLoop = (): void => {
    if (!this.disposed) this.scene.render();
  };

  start(): void {
    this.engine.runRenderLoop(this.renderLoop);
  }

  dispose(): void {
    this.disposed = true;
    this.engine.stopRenderLoop(this.renderLoop);
    this.scene.dispose();
    this.engine.dispose();
  }
}
