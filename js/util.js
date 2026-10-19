/* Small helpers shared across the site. No dependencies, no build step. */

/** Terse element factory. `props` may be null for plain containers. */
export function el(tag, props, ...children) {
  const node = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === "dataset") Object.assign(node.dataset, v);
      else node.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const baht = (n) => `${n} THB`;

export const prefersReduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ ticker --
   One rAF loop for the whole page. Scroll handlers only mark it dirty, so we
   never schedule a frame per scroll event and never touch the DOM outside a
   frame. `settle` keeps the loop alive briefly after scrolling stops so eased
   motion can finish without a layout read.                            */

const subs = new Set();
let queued = false;
let settleUntil = 0;
let settleTimer = 0;

function frame(now) {
  queued = false;
  for (const fn of subs) {
    try { fn(now); } catch (err) { console.error(err); }
  }
  if (now < settleUntil) schedule();
}

export function onFrame(fn) {
  subs.add(fn);
  schedule();
  return () => subs.delete(fn);
}

export function schedule(settleMs = 0) {
  settleUntil = Math.max(settleUntil, performance.now() + settleMs);
  if (!queued) {
    queued = true;
    requestAnimationFrame(frame);
  }
}

export function watchScroll(fn, { settleMs = 260 } = {}) {
  const run = () => { schedule(settleMs); fn(); };
  addEventListener("scroll", run, { passive: true });
  addEventListener("resize", run, { passive: true });
  return run;
}

export function debounce(fn, ms = 150) {
  let t = 0;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* Throttle a high-frequency handler to one call per animation frame. */
export function rafThrottle(fn) {
  let pending = null;
  return (...args) => {
    if (pending) { pending = args; return; }
    pending = args;
    requestAnimationFrame(() => {
      const a = pending;
      pending = null;
      fn(...a);
    });
  };
}

/* -------------------------------------------------------------- images --
   assets/items/<id>.webp        master, 2000px
   assets/items/<id>-1200.webp   tablet
   assets/items/<id>-800.webp    phone
   Written by tools/prep_images.py. Until a file exists the .plate gradient
   underneath shows through, so nothing ever renders a broken image.        */

/* The largest candidate is the master, named <id>.webp (not <id>-2000.webp) --
   written by tools/prep_images.py. Naming it explicitly here keeps the srcset
   from requesting a file that does not exist. */
function srcsetFor(id) {
  return [
    `assets/items/${id}-800.webp 800w`,
    `assets/items/${id}-1200.webp 1200w`,
    `assets/items/${id}.webp 2000w`,
  ].join(", ");
}

/**
 * Image for a dish slot. The master is a fallback only -- a browser that
 * supports srcset always picks a width from the list.
 * Returns null if we cannot even offer a srcset, so the caller can skip the
 * <img> entirely rather than issue a request we know will 404.
 */
export function dishImage(id, { sizes, loading = "lazy" } = {}) {
  const img = el("img", {
    src: `assets/items/${id}.webp`,
    srcset: srcsetFor(id),
    sizes,
    alt: "",
    loading,
    decoding: "async",
  });
  // Any failure (no file, or a 404 on every candidate) drops the <img> so the
  // gradient + Thai glyph plate behind it is what shows.
  img.addEventListener("error", () => img.remove(), { once: true });
  return img;
}