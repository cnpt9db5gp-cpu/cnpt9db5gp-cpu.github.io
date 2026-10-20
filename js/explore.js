/* ============================================================================
   Explore — renders the cinematic scroll: intro, one scene per category.

   Modeled on the CommeSoie reference: photography is the subject, rendered
   large and floating in whitespace, while dishes that have no photo yet stay
   quiet typographic lines. Photographed dishes become "heroes" (a big plate,
   landscape or portrait depending on the asset we have); the rest are sparse
   text lines with a price, which keeps the menu scannable without inventing
   imagery we don't have.
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

/* ---------------------------------------------------------------- hero -- */

function heroLine(item) {
  return el("a", {
      class: "hero__meta",
      href: `#/dish/${item.id}`,
    },
    el("span", { class: "hero__thai lang-th", text: item.thai }),
    el("span", { class: "hero__en", text: item.english }),
    el("span", { class: "hero__price", text: baht(item.price) }),
  );
}

/* A photographed dish: a large plate in the aspect we actually have.
   Drinks are photographed as tall cups -> portrait plates; plated desserts
   read best as landscape. Both portraits and landscape masters exist.     */
const DRINK_CATS = new Set([
  "coffee", "tea", "milk-smoothie", "soda", "float", "herbal-drinks", "other",
]);

function spreadHero(item, flip, catId) {
  const port = Boolean(item.photo && item.photo.portrait && DRINK_CATS.has(catId));
  const glyph = el("span", { class: "plate__glyph lang-th", text: item.thai[0] });
  const plate = el("figure", { class: `hero__plate${port ? " --portrait" : " --landscape"} plate` }, glyph);

  // The photo doesn't exist (or is wrong aspect); dishImage() removes itself
  // on error so the gradient + glyph under it is what shows.
  plate.append(dishImage(item.id, {
    sizes: port ? "(min-width: 900px) 34vw, 62vw" : "(min-width: 900px) 62vw, 90vw",
    loading: "lazy",
    portrait: port,
  }));

  return el("article", {
      class: `spread-hero${flip ? " --flip" : ""}`,
      dataset: { depth: "", id: item.id },
    },
    el("a", { class: "hero__plate-link",
              href: `#/dish/${item.id}`,
              "aria-label": `${item.english} — ${item.thai}` }, plate),
    heroLine(item),
  );
}

/* An unphotographed dish: one quiet text line. Still a link, still
   deep-layered, but it doesn't pretend to have a picture.                 */
function spreadLine(item, small) {
  return el("a", {
      class: small ? "spread-line --small" : "spread-line",
      href: `#/dish/${item.id}`,
      dataset: { depth: "", id: item.id },
    },
    el("span", { class: "line__thai lang-th", text: item.thai }),
    el("span", { class: "line__en", text: item.english }),
    el("span", { class: "line__price", text: baht(item.price) }),
  );
}

/* ------------------------------------------------------------ category -- */

function spread(cat) {
  /* Rhythm: photographed dishes become heroes (alignment alternating so
     consecutive heroes sit right, then left); unphotographed dishes stay
     text lines whose indent alternates so the column doesn't feel like a
     table. Consecutive heroes re-flip on each other.                     */
  const nodes = [];
  let runs = 0;
  let flips = 0;

  for (const item of cat.items) {
    if (item.photo) {
      nodes.push(spreadHero(item, (flips++) % 2 === 1, cat.id));
      runs = 0;
    } else {
      nodes.push(spreadLine(item, runs % 2 === 1));
      runs++;
    }
  }
  return nodes;
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
        el("div", { class: "cat__spread" }, spread(cat)),
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
