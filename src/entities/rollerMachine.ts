import * as THREE from "three";
import { scene } from "../core/graphics";
import { addBox, addPhysicsBox } from "../utils/sceneHelpers";
import { materials } from "../config/materials";
import { state } from "../state";

export interface RollerMachine {
  rollerGroup: THREE.Group;
  flywheel: THREE.Mesh;
}

export function buildRollerMachine(): RollerMachine {
  addPhysicsBox([2.5, 0.22, 1.72], [0.2, 0.11, -2.9], materials.darkMetal);
  addBox([0.22, 1.0, 1.95], [1.6, 0.54, -2.9], materials.metal);

  const rollerGroup = new THREE.Group();
  scene.add(rollerGroup);
  for (const z of [-3.25, -2.55]) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 2.65, 32),
      materials.darkMetal,
    );
    roller.rotation.z = Math.PI / 2;
    roller.position.set(0.2, 0.52, z);
    roller.castShadow = true;
    roller.receiveShadow = true;
    rollerGroup.add(roller);
  }

  const engine = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.78, 0.82),
    materials.metal,
  );
  engine.position.set(2.45, 0.55, -2.95);
  engine.castShadow = true;
  engine.receiveShadow = true;
  scene.add(engine);

  const flywheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.18, 48),
    materials.metal,
  );
  flywheel.rotation.z = Math.PI / 2;
  flywheel.position.set(1.88, 0.66, -2.95);
  flywheel.castShadow = true;
  scene.add(flywheel);

  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.52, 24),
    materials.accent,
  );
  arrow.rotation.x = -Math.PI / 2;
  arrow.position.set(0.2, 0.62, -4.25);
  arrow.castShadow = true;
  scene.add(arrow);

  return { rollerGroup, flywheel };
}

export function getRollerDriveSpin(): number {
  return state.tyreState === "loaded"
    ? THREE.MathUtils.lerp(10, 42, state.rollerCharge)
    : 2;
}

export function animateMachine(dt: number, machine: RollerMachine) {
  const spin = getRollerDriveSpin();
  machine.rollerGroup.children.forEach((roller) => {
    roller.rotation.x += spin * dt;
  });
  machine.flywheel.rotation.x += spin * 0.8 * dt;
}
