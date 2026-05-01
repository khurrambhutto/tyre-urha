import * as THREE from "three";
import { camera } from "../core/graphics";

export const player = {
  position: new THREE.Vector3(0, 1.65, 4.8),
  yaw: Math.PI,
  pitch: -0.1,
  velocity: new THREE.Vector3(),
};

export function cameraForward(flat = false) {
  const direction = new THREE.Vector3(0, 0, -1).applyEuler(
    new THREE.Euler(player.pitch, player.yaw, 0, "YXZ"),
  );
  if (flat) {
    direction.y = 0;
    direction.normalize();
  }
  return direction;
}

export function cameraRight() {
  return cameraForward(true).cross(new THREE.Vector3(0, 1, 0)).normalize();
}

export function updatePlayer(dt: number, keys: Set<string>) {
  const forward = cameraForward(true);
  const right = cameraRight();
  const wish = new THREE.Vector3();

  if (keys.has("KeyW")) wish.add(forward);
  if (keys.has("KeyS")) wish.sub(forward);
  if (keys.has("KeyD")) wish.add(right);
  if (keys.has("KeyA")) wish.sub(right);

  if (wish.lengthSq() > 0) wish.normalize();
  const speed = keys.has("ShiftLeft") ? 7.2 : 4.6;
  player.velocity.lerp(wish.multiplyScalar(speed), 1 - Math.exp(-dt * 12));
  player.position.addScaledVector(player.velocity, dt);
  player.position.x = THREE.MathUtils.clamp(player.position.x, -2.75, 3.25);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -8, 7);

  camera.position.copy(player.position);
  camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
}
