import { player } from "../entities/player";
import { interact, releaseTyre } from "./gameLogic";

export const keys = new Set<string>();

export function updateCameraFromMouse(event: MouseEvent) {
  if (!event.ctrlKey) return;
  player.yaw -= event.movementX * 0.0024;
  player.pitch -= event.movementY * 0.0018;
  player.pitch = Math.min(Math.max(player.pitch, -0.65), 0.55);
}

export function initInput() {
  document.addEventListener("mousemove", updateCameraFromMouse);
  document.addEventListener("keydown", (event) => {
    keys.add(event.code);
    if (event.code === "KeyE") interact();
    if (event.code === "Space") releaseTyre();
  });
  document.addEventListener("keyup", (event) => keys.delete(event.code));
}
