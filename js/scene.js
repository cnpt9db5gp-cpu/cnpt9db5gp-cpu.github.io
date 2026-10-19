/* ============================================================================
   Scene — drives the Ayutthaya backdrop from a single scroll pass.
   Every layer is moved with translate (a custom property, not top/height),
   so the compositor animates them and the main thread only writes four
   numbers per frame.
   ========================================================================= */

import { onFrame, rafThrottle, prefersReduced, schedule } from "./util.js";

const FAR   = 0.10;   // px of drift per px scrolled, per layer
const MID   = 0.22;
const NEAR  = 0.06;

/* --------------------------------------------------------------- motes -- */

function buildMotes(host, count = 14) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const mote = document.createElement("span");
    mote.className = "mote";
    mote.style.left = `${(i * 37 + (i % 5) * 11) % 100}%`;
    mote.style.setProperty("--dur", `${22 + (i % 6) * 5}s`);
    mote.style.setProperty("--delay", `${-(i * 3.7).toFixed(1)}s`);
    mote.style.setProperty("--drift", `${((i % 4) - 1.5) * 5}vw`);
    mote.style.width = mote.style.height = `${2 + (i % 3)}px`;
    frag.append(mote);
  }
  host.replaceChildren(frag);
}

/* -------------------------------------------------------- pointer light -- */

function bindPointerLight(node) {
  if (!node || !window.matchMedia("(hover: hover)").matches) return;
  if (prefersReduced()) return;

  const move = rafThrottle((x, y) => {
    node.style.setProperty("--px", `${x}px`);
    node.style.setProperty("--py", `${y}px`);
    node.classList.add("is-on");
  });

  addEventListener("pointermove", (e) => move(e.clientX, e.clientY), { passive: true });
  addEventListener("pointerleave", () => node.classList.remove("is-on"));
}

/* --------------------------------------------------------------- export -- */

export function initScene() {
  const root = document.documentElement;
  buildMotes(document.getElementById("motes"));
  bindPointerLight(document.getElementById("pointerLight"));

  // Everything below is decorative motion; freeze it under reduced-motion.
  if (prefersReduced()) {
    root.style.setProperty("--p-far", "0px");
    root.style.setProperty("--p-mid", "0px");
    root.style.setProperty("--p-near", "0px");
    root.style.setProperty("--day", "0");
    return { destroy() {} };
  }

  let last = -1;

  const update = onFrame(() => {
    const max = root.scrollHeight - innerHeight;
    const y = scrollY;
    // Cheap guard: nothing to do if we are still on the same pixel.
    if (y === last) return;
    last = y;

    const t = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;

    root.style.setProperty("--p-far",  `${(y * FAR).toFixed(1)}px`);
    root.style.setProperty("--p-mid",  `${(y * MID).toFixed(1)}px`);
    root.style.setProperty("--p-near", `${(y * NEAR).toFixed(1)}px`);
    root.style.setProperty("--day", t.toFixed(4));

    // Full drama across the hero, then recede to an ambient backdrop: the
    // temple horizon should frame the menu, not compete with it. The fade is
    // measured against one viewport height so it completes quickly.
    const amp = 1 - Math.min(1, y / (innerHeight * 1.15)) * 0.72;
    root.style.setProperty("--scene-a", amp.toFixed(3));
  });

  addEventListener("scroll", () => schedule(300), { passive: true });
  addEventListener("resize", () => schedule(0), { passive: true });

  return { destroy: () => update() };
}