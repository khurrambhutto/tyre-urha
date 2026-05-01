import * as CANNON from "cannon-es";
import { state } from "../state";

export const statusEl = document.querySelector<HTMLElement>("#status")!;
export const speedBar = document.querySelector<HTMLElement>("#speedBar")!;
export const speedText = document.querySelector<HTMLElement>("#speedText")!;
export const releaseButton =
  document.querySelector<HTMLButtonElement>("#releaseButton")!;

if (!statusEl || !speedBar || !speedText || !releaseButton) {
  throw new Error("Game UI failed to load");
}

export function updateHud(tyreBody: CANNON.Body) {
  const percent = Math.round(state.rollerCharge * 100);
  speedBar.style.width = `${percent}%`;
  speedText.textContent = `${percent}%`;

  if (state.towerHit) {
    statusEl.textContent = "Goal hit: the tyre struck the tower";
    return;
  }

  if (state.tyreState === "free")
    statusEl.textContent = "Walk to tyre and press E";
  if (state.tyreState === "loaded" && state.rollerCharge >= 0.18)
    statusEl.textContent = "Release when the roller speed feels right";
  if (state.tyreState === "launched" && tyreBody.velocity.length() < 0.8)
    statusEl.textContent = "Tyre slowed down. Pick it up again";
}
