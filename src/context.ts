import type { TyreObject } from "./entities/tyre";
import type { RollerMachine } from "./entities/rollerMachine";
import type { TowerConfetti } from "./systems/particles/towerConfetti";
import type * as CANNON from "cannon-es";

export const context = {
  tyre: null as TyreObject | null,
  machine: null as RollerMachine | null,
  towerBody: null as CANNON.Body | null,
  confetti: null as TowerConfetti | null,
};
