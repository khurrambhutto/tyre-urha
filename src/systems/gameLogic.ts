import * as THREE from "three";
import * as CANNON from "cannon-es";
import { state } from "../state";
import { context } from "../context";
import { player, cameraForward } from "../entities/player";
import {
  setTyreKinematic,
  setTyreDynamic,
} from "../entities/tyre";
import {
  rollerCenter,
  rollerSlotXMin,
  rollerSlotXMax,
  tyreRadius,
  launchDirection,
} from "../config/constants";
import { statusEl } from "./hud";
import {
  towerHorizRadiusAtWorldY,
} from "../entities/targetChallenge";
import {
  TOWER_Z,
  TOWER_CENTER_Y,
  TOWER_HALF_HEIGHT,
} from "../config/constants";
import { camera } from "../core/graphics";

export function getAimPlacementOnRollerX(): number {
  const dir = cameraForward(false);
  if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
  else dir.normalize();

  let x: number;
  if (Math.abs(dir.z) < 0.06) {
    x = player.position.x;
  } else {
    const t = (rollerCenter.z - camera.position.z) / dir.z;
    if (t < 0) x = player.position.x;
    else x = camera.position.x + t * dir.x;
  }
  return THREE.MathUtils.clamp(x, rollerSlotXMin, rollerSlotXMax);
}

export function registerTowerHit() {
  if (state.towerHit) return;
  if (context.confetti) context.confetti.burst();
  state.towerHit = true;
  state.goalResetTimer = 2.4;
  statusEl.textContent = "Goal hit: the tyre struck the tower";
}

export function carryTyre() {
  if (!context.tyre) return;
  setTyreKinematic(context.tyre.body);
  state.tyreState = "carried";
  state.rollerCharge = 0;
  statusEl.textContent = "Carry it to the roller machine";
}

export function loadTyre() {
  if (!context.tyre) return;
  setTyreKinematic(context.tyre.body);
  state.tyreState = "loaded";
  state.tyreVisualRollAngle = 0;
  state.loadedTyreSlotX = getAimPlacementOnRollerX();
  context.tyre.body.position.copy(
    new CANNON.Vec3(
      state.loadedTyreSlotX,
      rollerCenter.y,
      rollerCenter.z,
    ),
  );
  context.tyre.body.quaternion.setFromEuler(0, 0, 0);
  statusEl.textContent = "Tyre is accelerating in the rollers";
}

export function releaseTyre() {
  if (state.tyreState !== "loaded" || !context.tyre) return;

  state.towerHit = false;
  state.launchedRestTime = 0;
  state.goalResetTimer = 0;
  state.releaseSpeed = THREE.MathUtils.lerp(7, 25, state.rollerCharge);
  setTyreDynamic(context.tyre.body);
  state.tyreState = "launched";
  context.tyre.body.position.set(
    state.loadedTyreSlotX,
    rollerCenter.y,
    rollerCenter.z - 0.72,
  );
  context.tyre.body.velocity.set(
    launchDirection.x * state.releaseSpeed,
    0.2,
    launchDirection.z * state.releaseSpeed,
  );
  context.tyre.body.angularVelocity.set(
    -state.releaseSpeed / tyreRadius,
    0,
    0,
  );
  statusEl.textContent = `Released at ${state.releaseSpeed.toFixed(1)} m/s`;
}

export function respawnTyre(message = "Tyre respawned. Pick it up again") {
  if (!context.tyre) return;
  setTyreDynamic(context.tyre.body);
  state.tyreState = "free";
  state.towerHit = false;
  state.launchedRestTime = 0;
  state.goalResetTimer = 0;
  state.rollerCharge = 0;
  state.releaseSpeed = 0;
  context.tyre.body.position.set(-1.2, tyreRadius + 0.08, 1.0);
  context.tyre.body.velocity.setZero();
  context.tyre.body.angularVelocity.setZero();
  context.tyre.body.quaternion.setFromEuler(0, 0, 0);
  statusEl.textContent = message;
}

export function interact() {
  if (!context.tyre) return;
  const tyrePosition = new THREE.Vector3(
    context.tyre.body.position.x,
    context.tyre.body.position.y,
    context.tyre.body.position.z,
  );
  const playerFeet = player.position.clone();
  playerFeet.y = tyrePosition.y;

  if (state.tyreState === "free" || state.tyreState === "launched") {
    if (playerFeet.distanceTo(tyrePosition) < 2.15) carryTyre();
    return;
  }

  if (state.tyreState === "carried") {
    const nearMachine =
      player.position.distanceTo(
        new THREE.Vector3(
          rollerCenter.x,
          player.position.y,
          rollerCenter.z,
        ),
      ) < 3.0;
    if (nearMachine) loadTyre();
    else {
      setTyreDynamic(context.tyre.body);
      state.tyreState = "free";
      statusEl.textContent = "Dropped. Get closer and pick it up again";
    }
  }
}

export function updateTyreRespawn(dt: number) {
  if (!context.tyre) return;
  if (state.towerHit) {
    state.goalResetTimer -= dt;
    if (state.goalResetTimer <= 0)
      respawnTyre("Goal hit. Tyre respawned for another try");
    return;
  }

  const p = context.tyre.body.position;
  if (p.y < -5 || p.z < -76 || Math.abs(p.x) > 18) {
    respawnTyre("Tyre reset. Pick it up again");
    return;
  }

  if (
    state.tyreState === "launched" &&
    context.tyre.body.velocity.length() < 0.8
  ) {
    state.launchedRestTime += dt;
    if (state.launchedRestTime >= 1.2)
      respawnTyre("Tyre slowed down. Respawned for another try");
  } else {
    state.launchedRestTime = 0;
  }
}

export function checkLaunchedTyreTowerOverlap() {
  if (!context.tyre || !context.towerBody) return;
  if (state.tyreState !== "launched" || state.towerHit) return;
  const p = context.tyre.body.position;
  const horiz = Math.hypot(p.x, p.z - TOWER_Z);
  const r = towerHorizRadiusAtWorldY(p.y) + tyreRadius * 0.92;
  if (horiz > r) return;
  const yMin = TOWER_CENTER_Y - TOWER_HALF_HEIGHT - tyreRadius;
  const yMax = TOWER_CENTER_Y + TOWER_HALF_HEIGHT + 0.55;
  if (p.y >= yMin && p.y <= yMax) registerTowerHit();
}
