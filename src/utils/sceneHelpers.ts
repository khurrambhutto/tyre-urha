import * as THREE from "three";
import * as CANNON from "cannon-es";
import { scene } from "../core/graphics";
import { world, dustMaterial } from "../core/physics";

export function addBox(
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

export function addPhysicsBox(
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  rotation: [number, number, number] = [0, 0, 0],
) {
  const mesh = addBox(size, position, material);
  mesh.rotation.set(...rotation);
  const body = new CANNON.Body({ mass: 0, material: dustMaterial });
  body.addShape(
    new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2)),
  );
  body.position.set(...position);
  body.quaternion.setFromEuler(...rotation);
  world.addBody(body);
  return { mesh, body };
}

export function addPhysicsCylinder(
  radii: [number, number],
  height: number,
  position: [number, number, number],
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radii[0], radii[1], height, 36),
    material,
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const body = new CANNON.Body({ mass: 0, material: dustMaterial });
  const shape = new CANNON.Cylinder(radii[0], radii[1], height, 36);
  body.addShape(shape);
  body.position.set(...position);
  world.addBody(body);

  return { mesh, body };
}
