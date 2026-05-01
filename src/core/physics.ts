import * as CANNON from "cannon-es";

export const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
});
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.defaultContactMaterial.friction = 0.85;
world.defaultContactMaterial.restitution = 0.06;

export const tyreMaterial = new CANNON.Material("tyre");
export const dustMaterial = new CANNON.Material("packed-dirt");

world.addContactMaterial(
  new CANNON.ContactMaterial(tyreMaterial, dustMaterial, {
    friction: 1.35,
    restitution: 0.04,
    contactEquationStiffness: 1e7,
  }),
);

export const groundBody = new CANNON.Body({ mass: 0, material: dustMaterial });
groundBody.addShape(new CANNON.Plane());
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

export function stepPhysics(dt: number, maxSubSteps: number) {
  world.step(1 / 60, dt, maxSubSteps);
}
