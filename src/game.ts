import * as THREE from "three";
import * as CANNON from "cannon-es";

type TyreState = "free" | "carried" | "loaded" | "launched";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
const statusEl = document.querySelector<HTMLElement>("#status");
const speedBar = document.querySelector<HTMLElement>("#speedBar");
const speedText = document.querySelector<HTMLElement>("#speedText");
const releaseButton = document.querySelector<HTMLButtonElement>("#releaseButton");

if (!canvas || !statusEl || !speedBar || !speedText || !releaseButton) {
  throw new Error("Game UI failed to load");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaed0e6);
scene.fog = new THREE.Fog(0xaed0e6, 18, 74);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 220);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

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

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
});
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.defaultContactMaterial.friction = 0.85;
world.defaultContactMaterial.restitution = 0.06;

const tyreMaterial = new CANNON.Material("tyre");
const dustMaterial = new CANNON.Material("packed-dirt");
world.addContactMaterial(
  new CANNON.ContactMaterial(tyreMaterial, dustMaterial, {
    friction: 1.35,
    restitution: 0.04,
    contactEquationStiffness: 1e7,
  }),
);

const groundBody = new CANNON.Body({ mass: 0, material: dustMaterial });
groundBody.addShape(new CANNON.Plane());
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

const clock = new THREE.Clock();
const keys = new Set<string>();
const player = {
  position: new THREE.Vector3(0, 1.65, 4.8),
  yaw: Math.PI,
  pitch: -0.1,
  velocity: new THREE.Vector3(),
};

let tyreState: TyreState = "free";
let rollerCharge = 0;
let releaseSpeed = 0;
const tyreRadius = 0.62;
const rollerDrumRadius = 0.18;
/** Roller cylinder length 2.65 along world X; center at x = 0.2 */
const ROLLER_AXIS_X = 0.2;
const ROLLER_HALF_LENGTH = 2.65 / 2;
/** Keep tyre contact patch on the drum */
const ROLLER_SLOT_X_MARGIN = 0.28;
const rollerSlotXMin = ROLLER_AXIS_X - ROLLER_HALF_LENGTH + ROLLER_SLOT_X_MARGIN;
const rollerSlotXMax = ROLLER_AXIS_X + ROLLER_HALF_LENGTH - ROLLER_SLOT_X_MARGIN;
const rollerCenter = new THREE.Vector3(ROLLER_AXIS_X, tyreRadius + 0.22, -2.9);
/** X position along the rollers while loaded / on release (set when placing) */
let loadedTyreSlotX = ROLLER_AXIS_X;
const launchDirection = new THREE.Vector3(0, 0, -1);
const carryOffset = new THREE.Vector3(0, -0.48, -1.55);
let towerHit = false;
let launchedRestTime = 0;
let goalResetTimer = 0;

let tyreVisualRollAngle = 0;

const materials = {
  dust: new THREE.MeshStandardMaterial({ color: 0xb9965f, roughness: 0.95 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xc9a06c, roughness: 0.98 }),
  wallDark: new THREE.MeshStandardMaterial({ color: 0x9f7347, roughness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x47793d, roughness: 0.9 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x624026, roughness: 0.9 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x22635e, roughness: 0.44, metalness: 0.45 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x17221e, roughness: 0.5, metalness: 0.6 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x0d0f0f, roughness: 0.72 }),
  rubberSide: new THREE.MeshStandardMaterial({ color: 0x252929, roughness: 0.88 }),
  accent: new THREE.MeshStandardMaterial({ color: 0xffae33, roughness: 0.5, emissive: 0x4d2500 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6b4526, roughness: 0.84 }),
  tower: new THREE.MeshStandardMaterial({ color: 0xb77f55, roughness: 0.96 }),
  towerTop: new THREE.MeshStandardMaterial({ color: 0x6f4b36, roughness: 0.92 }),
};

function addBox(
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  cast = true,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function addPhysicsBox(
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  rotation: [number, number, number] = [0, 0, 0],
) {
  const mesh = addBox(size, position, material);
  mesh.rotation.set(...rotation);
  const body = new CANNON.Body({ mass: 0, material: dustMaterial });
  body.addShape(new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2)));
  body.position.set(...position);
  body.quaternion.setFromEuler(...rotation);
  world.addBody(body);
  return { mesh, body };
}

function addPhysicsCylinder(
  radii: [number, number],
  height: number,
  position: [number, number, number],
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radii[0], radii[1], height, 36), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const body = new CANNON.Body({ mass: 0, material: dustMaterial });
  const shape = new CANNON.Cylinder(radii[0], radii[1], height, 36);
  const shapeOrientation = new CANNON.Quaternion();
  shapeOrientation.setFromEuler(Math.PI / 2, 0, 0);
  body.addShape(shape, new CANNON.Vec3(), shapeOrientation);
  body.position.set(...position);
  world.addBody(body);

  return { mesh, body };
}

function buildTargetChallenge() {
  const ladderCenterX = 0;
  const ladderCenterZ = -19.7;
  const ladderCenterY = 1.02;
  const ladderAngle = Math.PI / 6;
  const ladderLength = 3.6;

  for (const x of [-0.62, 0.62]) {
    addPhysicsBox(
      [0.14, 0.12, ladderLength],
      [ladderCenterX + x, ladderCenterY, ladderCenterZ],
      materials.wood,
      [ladderAngle, 0, 0],
    );
  }

  for (let i = 0; i < 6; i += 1) {
    const localZ = 1.25 - i * 0.5;
    addPhysicsBox(
      [1.52, 0.105, 0.14],
      [
        ladderCenterX,
        ladderCenterY - Math.sin(ladderAngle) * localZ,
        ladderCenterZ + Math.cos(ladderAngle) * localZ,
      ],
      materials.wood,
      [ladderAngle, 0, 0],
    );
  }

  const towerZ = -31;
  const tower = addPhysicsCylinder([0.62, 1.28], 8.2, [0, 4.1, towerZ], materials.tower);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.66, 0.45, 36), materials.towerTop);
  cap.position.set(0, 8.42, towerZ);
  cap.castShadow = true;
  cap.receiveShadow = true;
  scene.add(cap);

  const targetBand = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.035, 10, 64), materials.accent);
  targetBand.rotation.x = Math.PI / 2;
  targetBand.position.set(0, 1.3, towerZ);
  targetBand.castShadow = true;
  scene.add(targetBand);

  return tower.body;
}

function buildScene() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(48, 110, 12, 28), materials.dust);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const lane = addBox([7.2, 0.035, 74], [0, 0.025, -22], materials.dust, false);
  lane.material = new THREE.MeshStandardMaterial({ color: 0xc4a16a, roughness: 1 });

  addPhysicsBox([0.7, 3.2, 58], [-4.1, 1.6, -14], materials.wall);
  addPhysicsBox([0.6, 2.0, 44], [4.2, 1.0, -20], materials.wallDark);

  for (let z = 0; z > -52; z -= 4.7) {
    addBox([0.12, 3.45, 0.18], [-3.72, 1.72, z], materials.wallDark);
    addBox([0.09, 2.1, 0.13], [3.88, 1.05, z - 1.2], materials.wall);
  }

  for (let i = 0; i < 10; i += 1) {
    const z = -5 - i * 5.3;
    const x = i % 2 === 0 ? 6.1 : 5.15;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 2.0, 9), materials.trunk);
    trunk.position.set(x, 1, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25 + (i % 3) * 0.18, 2), materials.leaf);
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

function buildRollerMachine() {
  addPhysicsBox([2.5, 0.22, 1.72], [0.2, 0.11, -2.9], materials.darkMetal);
  addBox([0.22, 1.0, 1.95], [1.6, 0.54, -2.9], materials.metal);

  const rollerGroup = new THREE.Group();
  scene.add(rollerGroup);
  for (const z of [-3.25, -2.55]) {
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.65, 32), materials.darkMetal);
    roller.rotation.z = Math.PI / 2;
    roller.position.set(0.2, 0.52, z);
    roller.castShadow = true;
    roller.receiveShadow = true;
    rollerGroup.add(roller);
  }

  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.78, 0.82), materials.metal);
  engine.position.set(2.45, 0.55, -2.95);
  engine.castShadow = true;
  engine.receiveShadow = true;
  scene.add(engine);

  const flywheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 48), materials.metal);
  flywheel.rotation.z = Math.PI / 2;
  flywheel.position.set(1.88, 0.66, -2.95);
  flywheel.castShadow = true;
  scene.add(flywheel);

  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.52, 24), materials.accent);
  arrow.rotation.x = -Math.PI / 2;
  arrow.position.set(0.2, 0.62, -4.25);
  arrow.castShadow = true;
  scene.add(arrow);

  return { rollerGroup, flywheel };
}

const wobbleQ = new THREE.Quaternion();
const wobbleEuler = new THREE.Euler(0, 0, 0, "XYZ");

function getRollerDriveSpin(): number {
  return tyreState === "loaded" ? THREE.MathUtils.lerp(10, 42, rollerCharge) : 2;
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

function buildRollerSmoke() {
  const count = 90;
  const positions = new Float32Array(count * 3);
  const puffs: { life: number; vx: number; vy: number; vz: number }[] = [];
  for (let i = 0; i < count; i += 1) puffs.push({ life: 0, vx: 0, vy: 0, vz: 0 });

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

  const spawn = (i: number, charge: number, mesh: THREE.Group) => {
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
    update(dt: number, charge: number, active: boolean, mesh: THREE.Group) {
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

function createTyre() {
  const tyre = new THREE.Group();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(tyreRadius, 0.16, 18, 72), materials.rubber);
  torus.rotation.y = Math.PI / 2;
  torus.castShadow = true;
  torus.receiveShadow = true;
  tyre.add(torus);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 12, 42), materials.rubberSide);
  rim.rotation.y = Math.PI / 2;
  rim.castShadow = true;
  tyre.add(rim);

  for (let i = 0; i < 12; i += 1) {
    const tread = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.25), materials.rubberSide);
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

buildScene();
const towerBody = buildTargetChallenge();
const machine = buildRollerMachine();
const tyre = createTyre();
const rollerSmoke = buildRollerSmoke();

tyre.body.addEventListener("collide", (event: { body: CANNON.Body }) => {
  if (event.body !== towerBody || towerHit) return;
  towerHit = true;
  goalResetTimer = 2.4;
  statusEl.textContent = "Goal hit: the tyre struck the tower";
});

function updateCameraFromMouse(event: MouseEvent) {
  if (!event.ctrlKey) return;
  player.yaw -= event.movementX * 0.0024;
  player.pitch -= event.movementY * 0.0018;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -0.65, 0.55);
}

function cameraForward(flat = false) {
  const direction = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(player.pitch, player.yaw, 0, "YXZ"));
  if (flat) {
    direction.y = 0;
    direction.normalize();
  }
  return direction;
}

function cameraRight() {
  return cameraForward(true).cross(new THREE.Vector3(0, 1, 0)).normalize();
}

/** Where on the roller length the crosshair is pointing (plane z = roller bed). */
function getAimPlacementOnRollerX(): number {
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

function setTyreKinematic() {
  tyre.body.type = CANNON.Body.KINEMATIC;
  tyre.body.mass = 0;
  tyre.body.velocity.setZero();
  tyre.body.angularVelocity.setZero();
  tyre.body.updateMassProperties();
  tyre.body.collisionResponse = false;
}

function setTyreDynamic() {
  tyre.body.type = CANNON.Body.DYNAMIC;
  tyre.body.mass = 16;
  tyre.body.updateMassProperties();
  tyre.body.collisionResponse = true;
  tyre.body.wakeUp();
}

function carryTyre() {
  setTyreKinematic();
  tyreState = "carried";
  rollerCharge = 0;
  statusEl.textContent = "Carry it to the roller machine";
}

function loadTyre() {
  setTyreKinematic();
  tyreState = "loaded";
  tyreVisualRollAngle = 0;
  loadedTyreSlotX = getAimPlacementOnRollerX();
  tyre.body.position.copy(new CANNON.Vec3(loadedTyreSlotX, rollerCenter.y, rollerCenter.z));
  tyre.body.quaternion.setFromEuler(0, 0, 0);
  statusEl.textContent = "Tyre is accelerating in the rollers";
}

function releaseTyre() {
  if (tyreState !== "loaded") return;

  towerHit = false;
  launchedRestTime = 0;
  goalResetTimer = 0;
  releaseSpeed = THREE.MathUtils.lerp(7, 25, rollerCharge);
  setTyreDynamic();
  tyreState = "launched";
  tyre.body.position.set(loadedTyreSlotX, rollerCenter.y, rollerCenter.z - 0.72);
  tyre.body.velocity.set(launchDirection.x * releaseSpeed, 0.2, launchDirection.z * releaseSpeed);
  tyre.body.angularVelocity.set(-releaseSpeed / tyreRadius, 0, 0);
  statusEl.textContent = `Released at ${releaseSpeed.toFixed(1)} m/s`;
}

function respawnTyre(message = "Tyre respawned. Pick it up again") {
  setTyreDynamic();
  tyreState = "free";
  towerHit = false;
  launchedRestTime = 0;
  goalResetTimer = 0;
  rollerCharge = 0;
  releaseSpeed = 0;
  tyre.body.position.set(-1.2, tyreRadius + 0.08, 1.0);
  tyre.body.velocity.setZero();
  tyre.body.angularVelocity.setZero();
  tyre.body.quaternion.setFromEuler(0, 0, 0);
  statusEl.textContent = message;
}

function updateTyreRespawn(dt: number) {
  if (towerHit) {
    goalResetTimer -= dt;
    if (goalResetTimer <= 0) respawnTyre("Goal hit. Tyre respawned for another try");
    return;
  }

  if (tyre.body.position.y < -5 || tyre.body.position.z < -76 || Math.abs(tyre.body.position.x) > 18) {
    respawnTyre("Tyre reset. Pick it up again");
    return;
  }

  if (tyreState === "launched" && tyre.body.velocity.length() < 0.8) {
    launchedRestTime += dt;
    if (launchedRestTime >= 1.2) respawnTyre("Tyre slowed down. Respawned for another try");
  } else {
    launchedRestTime = 0;
  }
}

function interact() {
  const tyrePosition = new THREE.Vector3(tyre.body.position.x, tyre.body.position.y, tyre.body.position.z);
  const playerFeet = player.position.clone();
  playerFeet.y = tyrePosition.y;

  if (tyreState === "free" || tyreState === "launched") {
    if (playerFeet.distanceTo(tyrePosition) < 2.15) carryTyre();
    return;
  }

  if (tyreState === "carried") {
    const nearMachine = player.position.distanceTo(new THREE.Vector3(rollerCenter.x, player.position.y, rollerCenter.z)) < 3.0;
    if (nearMachine) loadTyre();
    else {
      setTyreDynamic();
      tyreState = "free";
      statusEl.textContent = "Dropped. Get closer and pick it up again";
    }
  }
}

function updatePlayer(dt: number) {
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

function updateTyre(dt: number) {
  if (tyreState === "carried") {
    const offset = carryOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
    const target = player.position.clone().add(offset);
    tyre.body.position.copy(new CANNON.Vec3(target.x, target.y, target.z));
    tyre.body.quaternion.setFromEuler(0, player.yaw, 0);
  }

  if (tyreState === "loaded") {
    rollerCharge = Math.min(1, rollerCharge + dt * 0.22);
    const drive = getRollerDriveSpin();
    const tyreOmega = (drive * rollerDrumRadius) / tyreRadius;
    tyreVisualRollAngle += tyreOmega * dt;
    tyre.body.position.copy(new CANNON.Vec3(loadedTyreSlotX, rollerCenter.y, rollerCenter.z));
    tyre.body.quaternion.setFromEuler(tyreVisualRollAngle, 0, 0);
    releaseButton.disabled = rollerCharge < 0.18;
  } else {
    releaseButton.disabled = true;
  }

  tyre.mesh.position.copy(tyre.body.position as unknown as THREE.Vector3);
  tyre.mesh.quaternion.copy(tyre.body.quaternion as unknown as THREE.Quaternion);

  if (tyreState === "loaded") {
    const t = clock.elapsedTime;
    const c = rollerCharge;
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

function updateHud() {
  const percent = Math.round(rollerCharge * 100);
  speedBar.style.width = `${percent}%`;
  speedText.textContent = `${percent}%`;

  if (towerHit) {
    statusEl.textContent = "Goal hit: the tyre struck the tower";
    return;
  }

  if (tyreState === "free") statusEl.textContent = "Walk to tyre and press E";
  if (tyreState === "loaded" && rollerCharge >= 0.18) statusEl.textContent = "Release when the roller speed feels right";
  if (tyreState === "launched" && tyre.body.velocity.length() < 0.8) statusEl.textContent = "Tyre slowed down. Pick it up again";
}

function animateMachine(dt: number) {
  const spin = getRollerDriveSpin();
  machine.rollerGroup.children.forEach((roller) => {
    roller.rotation.x += spin * dt;
  });
  machine.flywheel.rotation.x += spin * 0.8 * dt;
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.033);

  updatePlayer(dt);
  updateTyre(dt);
  if (tyreState !== "carried" && tyreState !== "loaded") world.step(1 / 60, dt, 3);
  updateTyreRespawn(dt);
  animateMachine(dt);
  rollerSmoke.update(dt, rollerCharge, tyreState === "loaded", tyre.mesh);
  updateHud();
  renderer.render(scene, camera);
}

document.addEventListener("mousemove", updateCameraFromMouse);
document.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "KeyE") interact();
  if (event.code === "Space") releaseTyre();
});
document.addEventListener("keyup", (event) => keys.delete(event.code));
releaseButton.addEventListener("click", releaseTyre);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

loop();
