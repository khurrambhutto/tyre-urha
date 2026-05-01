import * as THREE from "three";
import { scene } from "../../core/graphics";
import { towerHorizRadiusAtWorldY } from "../../entities/targetChallenge";
import { TOWER_Z } from "../../config/constants";

const CONFETTI_PALETTE = [
  0xe63946, 0xf4a261, 0xe9c46a, 0x2a9d8f, 0x8338ec, 0xff006e, 0x3a86ff,
  0xffbe0b, 0xfb5607, 0x06d6a0,
];

export interface TowerConfetti {
  mesh: THREE.InstancedMesh;
  burst(): void;
  update(dt: number): void;
}

export function buildTowerConfetti(): TowerConfetti {
  const maxCount = 180;
  const geometry = new THREE.BoxGeometry(0.072, 0.1, 0.02);
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, maxCount);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const surf = new THREE.Vector3();
  const outward = new THREE.Vector3();
  const hiddenMatrix = new THREE.Matrix4().makeTranslation(0, -420, 0);

  type ConfettiParticle = {
    life: number;
    px: number;
    py: number;
    pz: number;
    vx: number;
    vy: number;
    vz: number;
    rx: number;
    ry: number;
    rz: number;
    avx: number;
    avy: number;
    avz: number;
  };

  const particles: ConfettiParticle[] = [];
  for (let i = 0; i < maxCount; i++) {
    particles.push({
      life: 0,
      px: 0,
      py: 0,
      pz: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rx: 0,
      ry: 0,
      rz: 0,
      avx: 0,
      avy: 0,
      avz: 0,
    });
  }

  let hasActive = false;

  const sampleTowerSurface = (target: THREE.Vector3) => {
    const y = 1.4 + Math.random() * 6.8;
    const r = towerHorizRadiusAtWorldY(y) * 0.95 + 0.04;
    const ang = Math.random() * Math.PI * 2;
    target.set(Math.cos(ang) * r, y, TOWER_Z + Math.sin(ang) * r);
  };

  const burst = () => {
    mesh.visible = true;
    hasActive = true;
    for (let i = 0; i < maxCount; i += 1) {
      sampleTowerSurface(surf);
      outward.set(surf.x, 0, surf.z - TOWER_Z);
      outward.normalize();
      const p = particles[i];
      p.px = surf.x;
      p.py = surf.y;
      p.pz = surf.z;
      const blast = 4.5 + Math.random() * 11;
      const lift = 3 + Math.random() * 7;
      p.vx =
        outward.x * blast * (0.65 + Math.random() * 0.55) +
        (Math.random() - 0.5) * 4;
      p.vy = lift + Math.random() * 4;
      p.vz =
        outward.z * blast * (0.65 + Math.random() * 0.55) +
        (Math.random() - 0.5) * 4;
      p.rx = Math.random() * Math.PI * 2;
      p.ry = Math.random() * Math.PI * 2;
      p.rz = Math.random() * Math.PI * 2;
      p.avx = (Math.random() - 0.5) * 16;
      p.avy = (Math.random() - 0.5) * 16;
      p.avz = (Math.random() - 0.5) * 16;
      p.life = 2.4 + Math.random() * 2;
      color.setHex(CONFETTI_PALETTE[i % CONFETTI_PALETTE.length]);
      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
  };

  const update = (dt: number) => {
    if (!hasActive) return;
    let any = false;
    const g = 11;
    for (let i = 0; i < maxCount; i += 1) {
      const p = particles[i];
      if (p.life <= 0) {
        mesh.setMatrixAt(i, hiddenMatrix);
        continue;
      }
      any = true;
      p.life -= dt;
      p.vy -= g * dt;
      p.vx *= 1 - 0.28 * dt;
      p.vz *= 1 - 0.28 * dt;
      p.px += p.vx * dt;
      p.py += p.vy * dt;
      p.pz += p.vz * dt;
      p.rx += p.avx * dt;
      p.ry += p.avy * dt;
      p.rz += p.avz * dt;
      const fade = THREE.MathUtils.clamp(p.life * 1.15, 0.15, 1);
      const s = 0.7 + 0.55 * fade;
      dummy.position.set(p.px, p.py, p.pz);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (!any) {
      hasActive = false;
      mesh.visible = false;
    }
  };

  return { burst, update };
}
