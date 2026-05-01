import * as THREE from "three";
import { scene } from "../../core/graphics";

export interface ChimneySmoke {
  points: THREE.Points;
  update(dt: number): void;
}

function createSmokeTexture() {
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

export function buildChimneySmoke(origin: THREE.Vector3): ChimneySmoke {
  const count = 80;
  const positions = new Float32Array(count * 3);
  const puffs: { life: number; vx: number; vy: number; vz: number }[] = [];
  for (let i = 0; i < count; i += 1)
    puffs.push({ life: 0, vx: 0, vy: 0, vz: 0 });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const smTex = createSmokeTexture();
  const material = new THREE.PointsMaterial({
    size: 0.62,
    map: smTex ?? undefined,
    alphaMap: smTex ?? undefined,
    transparent: true,
    depthWrite: false,
    opacity: 0.52,
    color: 0x7a7672,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  const spawnOrigin = new THREE.Vector3();
  let acc = 0;

  const spawn = (i: number) => {
    spawnOrigin.copy(origin);
    spawnOrigin.x += (Math.random() - 0.5) * 0.2;
    spawnOrigin.z += (Math.random() - 0.5) * 0.2;
    spawnOrigin.y += Math.random() * 0.08;
    const i3 = i * 3;
    positions[i3] = spawnOrigin.x;
    positions[i3 + 1] = spawnOrigin.y;
    positions[i3 + 2] = spawnOrigin.z;
    puffs[i] = {
      life: 1.6 + Math.random() * 2.4,
      vx: (Math.random() - 0.5) * 0.22,
      vy: 0.5 + Math.random() * 1.05,
      vz: (Math.random() - 0.5) * 0.22,
    };
  };

  return {
    points,
    update(dt: number) {
      acc += dt * 9;
      while (acc >= 1) {
        acc -= 1;
        for (let i = 0; i < count; i += 1) {
          if (puffs[i].life <= 0) {
            spawn(i);
            break;
          }
        }
      }

      for (let i = 0; i < count; i += 1) {
        const p = puffs[i];
        const i3 = i * 3;
        if (p.life > 0) {
          p.life -= dt;
          positions[i3] += p.vx * dt;
          positions[i3 + 1] += p.vy * dt;
          positions[i3 + 2] += p.vz * dt;
          p.vy += 0.1 * dt;
          p.vx *= 1 - 0.32 * dt;
          p.vz *= 1 - 0.32 * dt;
        } else {
          positions[i3 + 1] = -200;
        }
      }

      const attr = geometry.attributes.position as THREE.BufferAttribute;
      attr.needsUpdate = true;
    },
  };
}
