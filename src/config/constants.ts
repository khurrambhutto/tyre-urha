import * as THREE from "three";

export const tyreRadius = 0.62;
export const rollerDrumRadius = 0.18;
export const ROLLER_AXIS_X = 0.2;
export const ROLLER_HALF_LENGTH = 2.65 / 2;
export const ROLLER_SLOT_X_MARGIN = 0.28;
export const rollerSlotXMin =
  ROLLER_AXIS_X - ROLLER_HALF_LENGTH + ROLLER_SLOT_X_MARGIN;
export const rollerSlotXMax =
  ROLLER_AXIS_X + ROLLER_HALF_LENGTH - ROLLER_SLOT_X_MARGIN;
export const rollerCenter = new THREE.Vector3(
  ROLLER_AXIS_X,
  tyreRadius + 0.22,
  -2.9,
);
export const launchDirection = new THREE.Vector3(0, 0, -1);
export const carryOffset = new THREE.Vector3(0, -0.48, -1.55);

export const TOWER_Z = -31;
export const TOWER_CENTER_Y = 4.1;
export const TOWER_HEIGHT = 8.2;
export const TOWER_HALF_HEIGHT = TOWER_HEIGHT / 2;
export const TOWER_RADIUS_TOP = 0.62;
export const TOWER_RADIUS_BOTTOM = 1.28;
