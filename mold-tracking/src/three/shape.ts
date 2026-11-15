import * as THREE from 'three';
import type { PartShapeKind } from '../types';

export function buildGeometry(kind: PartShapeKind): THREE.BufferGeometry {
  switch (kind) {
    case 'box':
      return new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 32, 24);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 28);
    case 'torus':
      return new THREE.TorusGeometry(0.42, 0.16, 20, 40);
    case 'capsule':
      return new THREE.CapsuleGeometry(0.5, 0.6, 8, 20);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

/** 根据穴数计算模穴排列（尽量接近方阵） */
export function cavityGrid(n: number): { cols: number; rows: number } {
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  return { cols, rows };
}
