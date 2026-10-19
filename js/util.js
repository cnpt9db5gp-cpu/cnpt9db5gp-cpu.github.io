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

/* --------------------------------------------------------- image fallback --
   assets/items/<id>.webp doesn't exist yet. When a slot's image fails to
   load, strip it so the .plate gradient underneath shows through instead of
   a broken-image icon.                                                   */

export function dishImage(id, { sizes, loading = "lazy" } = {}) {
  const img = el("img", {
    src: `assets/items/${id}.webp`,
    alt: "",
    loading,
    decoding: "async",
    sizes,
  });
  img.addEventListener("error", () => img.remove(), { once: true });
  return img;
}