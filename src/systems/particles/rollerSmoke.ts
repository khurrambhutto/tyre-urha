import * as THREE from "three";
import { scene } from "../../core/graphics";
import { tyreRadius } from "../../config/constants";

export interface RollerSmoke {
  points: THREE.Points;
  update(
    dt: number,
    charge: number,
    active: boolean,
    mesh: THREE.Group,
  ): void;
}

function createRollerSmokeTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  if (!g) return null;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,0.55)");
  grd.addColorStop(0.4, "rgba(210,210,210,0.2)");
  grd.addColorStop(0.75, "rgba(170,170,170,0.08)");
  grd.addColorStop(1, "rgba(150,150,150,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildRollerSmoke(): RollerSmoke {
  const count = 90;
  const positions = new Float32Array(count * 3);
  const puffs: { life: number; vx: number; vy: number; vz: number }[] = [];
  for (let i = 0; i < count; i += 1)
    puffs.push({ life: 0, vx: 0, vy: 0, vz: 0 });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const smTex = createRollerSmokeTexture();
  const material = new THREE.PointsMaterial({
    size: 0.5,
    map: smTex ?? undefined,
    alphaMap: smTex ?? undefined,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
    color: 0xbfb8b0,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  const origin = new THREE.Vector3();
  const scratch = new THREE.Vector3();
  let acc = 0;

  const spawn = (
    i: number,
    charge: number,
    mesh: THREE.Group,
  ) => {
    const speedFactor = Math.pow(Math.max(0, charge), 1.1);
    scratch.set(0, -tyreRadius * 0.58, 0.08);
    scratch.applyQuaternion(mesh.quaternion);
    origin.copy(mesh.position).add(scratch);
    origin.x += (Math.random() - 0.5) * (0.1 + 0.12 * speedFactor);
    origin.z += (Math.random() - 0.5) * (0.16 + 0.12 * speedFactor);
    const i3 = i * 3;
    const f = 0.45 + speedFactor;
    positions[i3] = origin.x;
    positions[i3 + 1] = origin.y + Math.random() * 0.04;
    positions[i3 + 2] = origin.z;
    puffs[i] = {
      life: 0.45 + 0.65 * f * (0.35 + Math.random()),
      vx: (Math.random() - 0.5) * (0.15 + 0.35 * speedFactor),
      vy: 0.38 + 0.85 * f * (0.4 + Math.random() * 0.6),
      vz: 0.05 + 0.55 * f * (0.25 + Math.random() * 0.75),
    };
  };

  return {
    points,
    update(
      dt: number,
      charge: number,
      active: boolean,
      mesh: THREE.Group,
    ) {
      const speedFactor = Math.pow(Math.max(0, charge), 1.1);
      material.size = 0.32 + 0.58 * (0.15 + 0.85 * speedFactor);
      material.opacity = 0.28 + 0.5 * (0.2 + 0.8 * speedFactor);

      if (active) {
        acc += (1.2 + 38 * speedFactor) * dt;
        while (acc >= 1) {
          acc -= 1;
          for (let i = 0; i < count; i += 1) {
            if (puffs[i].life <= 0) {
              spawn(i, charge, mesh);
              break;
            }
          }
        }
      } else {
        acc = 0;
      }

      for (let i = 0; i < count; i += 1) {
        const p = puffs[i];
        const i3 = i * 3;
        if (p.life > 0) {
          p.life -= dt;
          positions[i3] += p.vx * dt;
          positions[i3 + 1] += p.vy * dt;
          positions[i3 + 2] += p.vz * dt;
          p.vy += 0.28 * dt;
          p.vx *= 1 - 0.85 * dt;
          p.vz *= 1 - 0.4 * dt;
        } else {
          positions[i3 + 1] = -200;
        }
      }

      const attr = geometry.attributes.position as THREE.BufferAttribute;
      attr.needsUpdate = true;
    },
  };
}
