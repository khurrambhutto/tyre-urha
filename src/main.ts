import "./style.css";

const statusEl = document.querySelector<HTMLElement>("#status");
if (statusEl) statusEl.textContent = "Loading…";

void import("./game").catch((err) => {
  console.error(err);
  if (statusEl) statusEl.textContent = "Could not load the game. Try refreshing.";
});
