import * as THREE from "three";

export const materials = {
  dust: new THREE.MeshStandardMaterial({ color: 0xb9965f, roughness: 0.95 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xc9a06c, roughness: 0.98 }),
  wallDark: new THREE.MeshStandardMaterial({ color: 0x9f7347, roughness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x47793d, roughness: 0.9 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x624026, roughness: 0.9 }),
  metal: new THREE.MeshStandardMaterial({
    color: 0x22635e,
    roughness: 0.44,
    metalness: 0.45,
  }),
  darkMetal: new THREE.MeshStandardMaterial({
    color: 0x17221e,
    roughness: 0.5,
    metalness: 0.6,
  }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x0d0f0f, roughness: 0.72 }),
  rubberSide: new THREE.MeshStandardMaterial({
    color: 0x252929,
    roughness: 0.88,
  }),
  accent: new THREE.MeshStandardMaterial({
    color: 0xffae33,
    roughness: 0.5,
    emissive: 0x4d2500,
  }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6b4526, roughness: 0.84 }),
  tower: new THREE.MeshStandardMaterial({
    color: 0xb77f55,
    roughness: 0.96,
  }),
  towerTop: new THREE.MeshStandardMaterial({
    color: 0x6f4b36,
    roughness: 0.92,
  }),
};
