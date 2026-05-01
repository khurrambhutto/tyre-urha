import * as THREE from "three";
import * as CANNON from "cannon-es";
import { scene, camera, renderer, onWindowResize } from "./core/graphics";
import { stepPhysics } from "./core/physics";
import { buildEnvironment } from "./entities/environment";
import { buildTargetChallenge } from "./entities/targetChallenge";
import { buildRollerMachine, animateMachine } from "./entities/rollerMachine";
import { createTyre, updateTyre } from "./entities/tyre";
import { updatePlayer } from "./entities/player";
import { initInput, keys } from "./systems/input";
import { releaseButton, updateHud } from "./systems/hud";
import { buildRollerSmoke } from "./systems/particles/rollerSmoke";
import { buildChimneySmoke } from "./systems/particles/chimneySmoke";
import { buildTowerConfetti } from "./systems/particles/towerConfetti";
import {
  registerTowerHit,
  checkLaunchedTyreTowerOverlap,
  updateTyreRespawn,
  releaseTyre,
} from "./systems/gameLogic";
import { context } from "./context";
import { state } from "./state";
import { TOWER_Z } from "./config/constants";

// Lights
const hemi = new THREE.HemisphereLight(0xf5fbff, 0x6b4d29, 1.45);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffe1a3, 2.25);
sun.position.set(-8, 12, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -24;
sun.shadow.camera.right = 24;
sun.shadow.camera.top = 24;
sun.shadow.camera.bottom = -24;
scene.add(sun);

// Build world
buildEnvironment();
const towerBody = buildTargetChallenge();
const machine = buildRollerMachine();
const tyre = createTyre();
const rollerSmoke = buildRollerSmoke();
const chimneySmoke = buildChimneySmoke(new THREE.Vector3(0, 8.68, TOWER_Z));
const towerConfetti = buildTowerConfetti();

// Populate context
context.tyre = tyre;
context.machine = machine;
context.towerBody = towerBody;
context.confetti = towerConfetti;

// Collision listener
tyre.body.addEventListener("collide", (event: { body: CANNON.Body }) => {
  if (event.body !== towerBody) return;
  registerTowerHit();
});

// Input & UI bindings
releaseButton.addEventListener("click", releaseTyre);
initInput();
window.addEventListener("resize", onWindowResize);

// Clock
const clock = new THREE.Clock();

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.033);

  updatePlayer(dt, keys);
  updateTyre(dt, tyre, releaseButton, clock.elapsedTime);

  if (state.tyreState !== "carried" && state.tyreState !== "loaded") {
    const maxSubSteps = state.tyreState === "launched" ? 16 : 3;
    stepPhysics(dt, maxSubSteps);
    checkLaunchedTyreTowerOverlap();
  }

  updateTyreRespawn(dt);
  animateMachine(dt, machine);
  rollerSmoke.update(
    dt,
    state.rollerCharge,
    state.tyreState === "loaded",
    tyre.mesh,
  );
  chimneySmoke.update(dt);
  towerConfetti.update(dt);
  updateHud(tyre.body);
  renderer.render(scene, camera);
}

loop();
