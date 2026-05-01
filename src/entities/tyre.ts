import * as THREE from "three";
import * as CANNON from "cannon-es";
import { scene } from "../core/graphics";
import { world, tyreMaterial } from "../core/physics";
import { materials } from "../config/materials";
import { state } from "../state";
import { player } from "./player";
import { rollerCenter, tyreRadius, carryOffset } from "../config/constants";

export interface TyreObject {
  mesh: THREE.Group;
  body: CANNON.Body;
}

export function createTyre(): TyreObject {
  const tyre = new THREE.Group();
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(tyreRadius, 0.16, 18, 72),
    materials.rubber,
  );
  torus.rotation.y = Math.PI / 2;
  torus.castShadow = true;
  torus.receiveShadow = true;
  tyre.add(torus);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.045, 12, 42),
    materials.rubberSide,
  );
  rim.rotation.y = Math.PI / 2;
  rim.castShadow = true;
  tyre.add(rim);

  for (let i = 0; i < 12; i += 1) {
    const tread = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.06, 0.25),
      materials.rubberSide,
    );
    const angle = (i / 12) * Math.PI * 2;
    tread.position.set(0, Math.cos(angle) * 0.61, Math.sin(angle) * 0.61);
    tread.rotation.x = angle;
    tread.castShadow = true;
    tyre.add(tread);
  }

  scene.add(tyre);

  const body = new CANNON.Body({
    mass: 16,
    material: tyreMaterial,
    linearDamping: 0.09,
    angularDamping: 0.12,
    allowSleep: false,
  });
  const cylinder = new CANNON.Cylinder(tyreRadius, tyreRadius, 0.34, 32);
  const shapeOrientation = new CANNON.Quaternion();
  shapeOrientation.setFromEuler(0, 0, Math.PI / 2);
  body.addShape(cylinder, new CANNON.Vec3(), shapeOrientation);
  body.position.set(-1.2, tyreRadius + 0.08, 1.0);
  body.quaternion.setFromEuler(0, 0, 0);
  world.addBody(body);

  return { mesh: tyre, body };
}

export function setTyreKinematic(body: CANNON.Body) {
  body.type = CANNON.Body.KINEMATIC;
  body.mass = 0;
  body.velocity.setZero();
  body.angularVelocity.setZero();
  body.updateMassProperties();
  body.collisionResponse = false;
}

export function setTyreDynamic(body: CANNON.Body) {
  body.type = CANNON.Body.DYNAMIC;
  body.mass = 16;
  body.updateMassProperties();
  body.collisionResponse = true;
  body.wakeUp();
}

const wobbleQ = new THREE.Quaternion();
const wobbleEuler = new THREE.Euler(0, 0, 0, "XYZ");

export function updateTyre(
  dt: number,
  tyre: TyreObject,
  releaseButton: HTMLButtonElement,
  elapsedTime: number,
) {
  if (state.tyreState === "carried") {
    const offset = carryOffset
      .clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
    const target = player.position.clone().add(offset);
    tyre.body.position.copy(new CANNON.Vec3(target.x, target.y, target.z));
    tyre.body.quaternion.setFromEuler(0, player.yaw, 0);
  }

  if (state.tyreState === "loaded") {
    state.rollerCharge = Math.min(1, state.rollerCharge + dt * 0.22);
    const drive =
      state.tyreState === "loaded"
        ? THREE.MathUtils.lerp(10, 42, state.rollerCharge)
        : 2;
    const tyreOmega = (drive * 0.18) / tyreRadius;
    state.tyreVisualRollAngle += tyreOmega * dt;
    tyre.body.position.copy(
      new CANNON.Vec3(
        state.loadedTyreSlotX,
        rollerCenter.y,
        rollerCenter.z,
      ),
    );
    tyre.body.quaternion.setFromEuler(state.tyreVisualRollAngle, 0, 0);
    releaseButton.disabled = state.rollerCharge < 0.18;
  } else {
    releaseButton.disabled = true;
  }

  tyre.mesh.position.copy(tyre.body.position as unknown as THREE.Vector3);
  tyre.mesh.quaternion.copy(tyre.body.quaternion as unknown as THREE.Quaternion);

  if (state.tyreState === "loaded") {
    const t = elapsedTime;
    const c = state.rollerCharge;
    tyre.mesh.position.x += 0.02 * Math.sin(t * 35) * (0.45 + c);
    tyre.mesh.position.z += 0.016 * Math.sin(t * 28 + 1.1) * (0.45 + c);
    tyre.mesh.position.y += 0.007 * Math.sin(t * 46) * (0.35 + c);
    wobbleEuler.set(
      0.02 * (0.45 + c) * Math.sin(t * 41),
      0.01 * (0.4 + c) * Math.sin(t * 32 + 0.2),
      0.04 * c * Math.sin(t * 51 + 0.3),
    );
    wobbleQ.setFromEuler(wobbleEuler);
    tyre.mesh.quaternion.multiply(wobbleQ);
  }
}
