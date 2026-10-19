/* ============================================================================
   App — wiring: render both views, route, switch modes, open dish sheets.

   Routes (hash, so they work straight from file:// with no server):
     #/              explore, top
     #/list          list view
     #/dish/<id>     dish sheet
   ========================================================================= */

import menu from "./menu.data.js";
import { el, prefersReduced, schedule } from "./util.js";
import { initScene } from "./scene.js";
import { initDepth, initReveals } from "./depth.js";
import { renderExplore } from "./explore.js";
import { renderList } from "./list.js";

const exploreHost = document.getElementById("viewExplore");
const listHost    = document.getElementById("viewList");
const catNav      = document.getElementById("catNav");
const sheet       = document.getElementById("sheet");

const byId = new Map();
for (const c of menu.categories) {
  for (const i of c.items) byId.set(i.id, { ...i, category: c.name });
}

const catName = new Map(menu.categories.map((c) => [c.id, c.name]));

/* ------------------------------------------------------------------ brand -- */

function paintBrand() {
  document.title = `${menu.brand.name} — ${menu.brand.tagline_en}`;
  for (const n of document.querySelectorAll("[data-brand-name]")) {
    n.textContent = menu.brand.name;
  }
  for (const n of document.querySelectorAll("[data-brand-thai]")) {
    n.textContent = menu.brand.thai || "";
    n.hidden = !menu.brand.thai;
  }
}

/* -------------------------------------------------------------- cat nav -- */

function buildCatNav() {
  const frag = document.createDocumentFragment();
  for (const cat of menu.categories) {
    const th = cat.name.split("/")[1]?.trim() || cat.name;
    frag.append(el("li", null,
      el("button", {
        type: "button", class: "cat-nav__btn", dataset: { cat: cat.id },
        text: th,
      })));
  }
  catNav.replaceChildren(frag);

  catNav.addEventListener("click", (e) => {
    const btn = e.target.closest(".cat-nav__btn");
    if (!btn) return;
    go("explore", `#/cat/${btn.dataset.cat}`);
    document.getElementById(`cat-${btn.dataset.cat}`)
      ?.scrollIntoView({ behavior: prefersReduced() ? "instant" : "smooth", block: "start" });
  });
}

/* ------------------------------------------------------------------ mode -- */

let mode = "explore";

function setMode(next, { push = true } = {}) {
  mode = next;
  exploreHost.hidden = next !== "explore";
  listHost.hidden = next !== "list";

  document.getElementById("modeExplore").setAttribute("aria-pressed", String(next === "explore"));
  document.getElementById("modeList").setAttribute("aria-pressed", String(next === "list"));

  document.body.dataset.mode = next;
  if (next === "explore") schedule(320);
  else if (push) history.replaceState(null, "", "#/list");
}

/* ----------------------------------------------------------------- sheet -- */

let lastFocus = null;

function openSheet(id) {
  const item = byId.get(id);
  if (!item) return go("explore", "#/");

  lastFocus = document.activeElement;

  const glyph = item.thai[0];
  const plate = document.getElementById("sheetPlate");
  const g = document.getElementById("sheetGlyph");
  g.textContent = glyph;

  // Swap in the photo if it ever exists; otherwise the gradient stays.
  plate.querySelectorAll("img").forEach((n) => n.remove());
  const img = new Image();
  img.alt = "";
  img.decoding = "async";
  img.addEventListener("load", () => plate.append(img), { once: true });
  img.src = `assets/items/${item.id}.webp`;

  document.getElementById("sheetCat").textContent = item.category;
  document.getElementById("sheetThai").textContent = item.thai;
  document.getElementById("sheetEn").textContent = item.english;
  document.getElementById("sheetPrice").textContent = `${item.price} THB`;

  sheet.hidden = false;
  requestAnimationFrame(() => sheet.classList.add("is-open"));
  document.getElementById("sheetClose").focus();
  history.replaceState(null, "", `#/dish/${item.id}`);
}

function closeSheet() {
  sheet.classList.remove("is-open");
  setTimeout(() => { sheet.hidden = true; }, 240);
  lastFocus?.focus?.();
  go("explore", "#/");
}

function go(next, hash) {
  setMode(next, { push: false });
  if (hash && location.hash !== hash) history.replaceState(null, "", hash);
}

/* --------------------------------------------------------------- routing -- */

function route() {
  const hash = location.hash || "#/";
  const [a, b] = hash.replace(/^#\/?/, "").split("/");

  if (a === "dish" && b) {
    const still = sheet.hidden;
    if (still || !byId.has(b)) openSheet(b);
    return;
  }
  if (!sheet.hidden) {
    sheet.classList.remove("is-open");
    setTimeout(() => { sheet.hidden = true; }, 240);
  }

  if (a === "list") { setMode("list", { push: false }); return; }
  setMode("explore", { push: false });

  if (a === "cat" && b) {
    // Wait a frame so layout is settled, then a beat more so the reveal
    // observer has marked the section in before we scroll to it.
    const target = document.getElementById(`cat-${b}`);
    if (!target) return;
    requestAnimationFrame(() => setTimeout(() => {
      target.scrollIntoView({ behavior: prefersReduced() ? "instant" : "smooth", block: "start" });
    }, 60));
  }
}

/* ---------------------------------------------------------------- active -- */

function trackActiveCategory() {
  const sections = [...exploreHost.querySelectorAll("[data-reveal]")];
  if (!sections.length) return;
  if (!("IntersectionObserver" in window)) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = e.target.dataset.cat;
        for (const b of catNav.querySelectorAll(".cat-nav__btn")) {
          b.setAttribute("aria-current", String(b.dataset.cat === id));
        }
      }
    },
    { rootMargin: "-45% 0px -45% 0px" }
  );
  sections.forEach((s) => io.observe(s));
}

/* ------------------------------------------------------------------ boot -- */

function boot() {
  paintBrand();
  renderExplore(exploreHost, menu);
  renderList(listHost, menu);
  buildCatNav();

  initScene();
  initReveals(exploreHost);
  initDepthAll();   // depth is per-category grid

  document.getElementById("modeExplore").addEventListener("click", () => go("explore", "#/"));
  document.getElementById("modeList").addEventListener("click", () => go("list", "#/list"));

  document.getElementById("sheetClose").addEventListener("click", closeSheet);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });

  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !sheet.hidden) closeSheet();
  });

  addEventListener("hashchange", route);
  trackActiveCategory();
  route();

  // Reduced motion: skip the cinematic layer entirely and start in List.
  if (prefersReduced()) setMode("list", { push: false });
}

/* Depth is per-grid, so register one pass per category grid. */
function initDepthAll() {
  for (const grid of exploreHost.querySelectorAll(".cat__grid")) {
    initDepth(grid);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}