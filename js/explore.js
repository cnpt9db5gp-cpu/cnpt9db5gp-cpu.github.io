/* ============================================================================
   Explore — renders the cinematic scroll: intro, one scene per category.
   ========================================================================= */

import { el, baht, dishImage } from "./util.js";

/* Each category leans into a different light, so scrolling reads as moving
   through different rooms rather than nine identical blocks.               */
const MOOD = {
  coffee: "neutral", tea: "cool", "milk-smoothie": "sweet", soda: "cool",
  float: "sweet", "herbal-drinks": "cool", other: "neutral",
  "thai-desserts": "warm", "thai-desserts-with-ice-cream": "sweet",
};

/* The Thai head is the part before the slash: "COFFEE / กาแฟ" -> กาแฟ */
function splitCat(name) {
  const [en, th] = name.split("/");
  return {
    en: en.trim(),
    th: th ? th.trim() : "",
  };
}

function dishCard(item, sizes) {
  const glyph = el("span", { class: "plate__glyph lang-th", text: item.thai[0] });
  const slot = el("span", { class: "dish__slot plate" }, glyph);

  // The photo doesn't exist yet; dishImage() removes itself on error and the
  // gradient + glyph underneath shows through.
  slot.append(dishImage(item.id, { sizes, loading: "lazy" }));

  return el("a", {
      class: "dish",
      href: `#/dish/${item.id}`,
      dataset: { depth: "", id: item.id },
    },
    slot,
    el("span", { class: "dish__text" },
      el("span", { class: "dish__thai", text: item.thai }),
      el("span", { class: "dish__en",   text: item.english }),
    ),
    el("span", { class: "dish__price", text: baht(item.price) }),
  );
}

export function renderExplore(host, menu) {
  const frag = document.createDocumentFragment();

  /* ---- intro ---- */
  frag.append(el("header", { class: "intro" },
    el("p", { class: "intro__eyebrow", text: menu.brand.tagline_en }),
    el("h1", { class: "intro__name", text: menu.brand.name }),
    menu.brand.thai
      ? el("p", { class: "intro__thai lang-th", text: menu.brand.thai })
      : el("p", { class: "intro__thai lang-th", text: menu.brand.tagline_th }),
    el("div", { class: "intro__rule" }),
    el("p", { class: "intro__cue" }, el("span", { text: "Scroll" })),
  ));

  /* ---- one scene per category ---- */
  for (const cat of menu.categories) {
    const { en, th } = splitCat(cat.name);

    const grid = el("div", { class: "cat__grid" },
      cat.items.map((i) => dishCard(i, "(min-width: 900px) 22vw, 300px")),
    );

    frag.append(el("section", {
        class: `cat cat--${MOOD[cat.id] || "neutral"}`,
        id: `cat-${cat.id}`,
        dataset: { reveal: "", cat: cat.id },
        "aria-labelledby": `cat-${cat.id}-name`,
      },
      el("div", { class: "cat__glow", "aria-hidden": "true" }),
      el("div", { class: "shell" },
        el("header", { class: "cat__head" },
          el("p", { class: "cat__kicker", text: cat.section || "" }),
          el("h2", { class: "cat__name", id: `cat-${cat.id}-name`, text: en }),
          th ? el("p", { class: "cat__thai", text: th }) : null,
          el("span", { class: "cat__chofa", "aria-hidden": "true" },
            el("svg", { class: "chofa", viewBox: "0 0 40 48" },
              el("use", { href: "#g-chofa" }))),
          el("p", { class: "cat__count", text: `${cat.itemCount} items` }),
        ),
        grid,
      ),
    ));
  }

  /* ---- outro ---- */
  frag.append(el("section", { class: "outro" },
    el("p", { class: "outro__thai", text: menu.brand.tagline_th }),
    el("p", { style: "color:var(--ink-soft)", text: "Use List view to order." }),
  ));

  host.replaceChildren(frag);
}