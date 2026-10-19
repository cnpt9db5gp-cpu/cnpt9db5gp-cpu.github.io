/* ============================================================================
   Depth — the Option-A 3D effect.

   Each dish card recedes on the z-axis and fades as it crosses the viewport,
   which reads as flying through the menu. This is the effect that stands in
   for the Three.js z-axis on the CommeSoie reference, done with transforms.

   Performance rules for this file:
     - card offsets are cached, never read from the DOM inside the loop
     - only transform and opacity are written (no layout-triggering props)
     - will-change is applied only to cards inside the active range
     - cards outside the range are fully released
   ========================================================================= */

import { onFrame, debounce, prefersReduced } from "./util.js";

const MAX_Z   = 420;    // px pushed back at the viewport edge
const FADE    = 0.85;   // opacity at the edge
const SHRINK  = 0.11;   // scale at the edge
const RANGE   = 1.45;   // cull beyond this (viewport heights of offset)

export function initDepth(container) {
  if (!container) return { refresh() {}, destroy() {} };
  if (prefersReduced()) return { refresh() {}, destroy() {} };

  /** @type {{node: HTMLElement, y: number, active: boolean}[]} */
  let cards = [];
  let vh = innerHeight;
  let lastY = -1;

  function measure() {
    vh = innerHeight;
    // offsetTop is relative to the nearest positioned ancestor; walk up to the
    // grid so the cached y is document-absolute and independent of layout shifts.
    cards = [...container.querySelectorAll("[data-depth]")].map((node) => {
      let y = 0;
      for (let n = node; n && n !== document.body; n = n.offsetParent) y += n.offsetTop;
      return { node, y, active: false };
    });
  }

  function tick() {
    const y = scrollY;
    if (y === lastY) return;
    lastY = y;

    for (const c of cards) {
      // Centre of the card relative to the centre of the viewport, as a
      // fraction of viewport height: 0 = centred, ±1 = at the edge.
      const centre = c.y + c.node.offsetHeight / 2;
      const p = (centre - (y + vh / 2)) / vh;
      const within = Math.abs(p) < RANGE;

      if (!within) {
        if (c.active) {
          c.active = false;
          c.node.style.willChange = "";
          c.node.style.transform = "";
          c.node.style.opacity = "";
        }
        continue;
      }

      if (!c.active) {
        c.active = true;
        c.node.style.willChange = "transform, opacity";
      }

      const a = Math.min(1, Math.abs(p));
      const z = -(p * MAX_Z).toFixed(1);
      const sc = (1 - a * SHRINK).toFixed(4);
      c.node.style.transform = `translate3d(0,0,${z}px) scale(${sc})`;
      c.node.style.opacity = (1 - a * FADE).toFixed(3);
    }
  }

  const stop = onFrame(tick);
  const remeasure = debounce(() => { lastY = -1; measure(); tick(); }, 120);
  addEventListener("resize", remeasure, { passive: true });

  // Cards can still be settling right after first paint.
  requestAnimationFrame(() => { measure(); tick(); });
  setTimeout(() => { measure(); tick(); }, 400);

  return {
    refresh() { measure(); lastY = -1; tick(); },
    destroy() { stop(); },
  };
}

/* ---------------------------------------------------------------------------
   Section reveal: toggles .is-in so CSS owns the transition (a lai rot fai
   lattice wipe, the glow, the header fade). Compositor-only, no JS tweening.
   ------------------------------------------------------------------------ */

export function initReveals(root) {
  const sections = [...root.querySelectorAll("[data-reveal]")];
  if (!sections.length) return;

  if (prefersReduced() || !("IntersectionObserver" in window)) {
    sections.forEach((s) => s.classList.add("is-in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.target.classList.toggle("is-in", e.isIntersecting);
    },
    { rootMargin: "-12% 0px -12% 0px", threshold: 0.08 }
  );
  sections.forEach((s) => io.observe(s));

  // Anything already on screen at load reveals without waiting for a scroll.
  requestAnimationFrame(() => {
    for (const s of sections) {
      if (s.getBoundingClientRect().top < innerHeight) s.classList.add("is-in");
    }
  });
}