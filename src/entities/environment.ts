import * as THREE from "three";
import { scene } from "../core/graphics";
import { addBox, addPhysicsBox } from "../utils/sceneHelpers";
import { materials } from "../config/materials";

export function buildEnvironment() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(48, 110, 12, 28),
    materials.dust,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const lane = addBox([7.2, 0.035, 74], [0, 0.025, -22], materials.dust, false);
  (lane.material as THREE.MeshStandardMaterial) = new THREE.MeshStandardMaterial(
    { color: 0xc4a16a, roughness: 1 },
  );

  addPhysicsBox([0.7, 3.2, 58], [-4.1, 1.6, -14], materials.wall);
  addPhysicsBox([0.6, 2.0, 44], [4.2, 1.0, -20], materials.wallDark);

  for (let z = 0; z > -52; z -= 4.7) {
    addBox([0.12, 3.45, 0.18], [-3.72, 1.72, z], materials.wallDark);
    addBox([0.09, 2.1, 0.13], [3.88, 1.05, z - 1.2], materials.wall);
  }

  for (let i = 0; i < 10; i += 1) {
    const z = -5 - i * 5.3;
    const x = i % 2 === 0 ? 6.1 : 5.15;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.2, 2.0, 9),
      materials.trunk,
    );
    trunk.position.set(x, 1, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.25 + (i % 3) * 0.18, 2),
      materials.leaf,
    );
    crown.position.set(x - 0.18, 2.45, z - 0.12);
    crown.castShadow = true;
    crown.receiveShadow = true;
    scene.add(crown);
  }

  const pathLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.03, 64),
    new THREE.MeshStandardMaterial({ color: 0xe0c48e, roughness: 1 }),
  );
  pathLine.position.set(-2.9, 0.055, -22);
  scene.add(pathLine);
}
