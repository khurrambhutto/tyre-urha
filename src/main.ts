import "./style.css";

const statusEl = document.querySelector<HTMLElement>("#status");
if (statusEl) statusEl.textContent = "Loading…";

void import("./game").catch((err) => {
  console.error(err);
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  if (statusEl) {
    statusEl.textContent = "Could not load the game. Try refreshing.";
    const pre = document.createElement("pre");
    pre.style.color = "#ff8888";
    pre.style.fontSize = "12px";
    pre.style.whiteSpace = "pre-wrap";
    pre.textContent = msg + (err instanceof Error ? "\n" + err.stack : "");
    statusEl.parentElement?.appendChild(pre);
  }
});
