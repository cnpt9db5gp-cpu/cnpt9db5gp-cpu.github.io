/* ============================================================================
   List — the ordering view: all 45 items, scannable, filterable, still.
   This is also the fallback whenever Explore is switched off.
   ========================================================================= */

import { el, baht } from "./util.js";

function splitCat(name) {
  const [en, th] = name.split("/");
  return { en: en.trim(), th: th ? th.trim() : "" };
}

function row(item) {
  return el("a", { class: "row", href: `#/dish/${item.id}` },
    el("span", null,
      el("span", { class: "row__thai", text: item.thai }),
      el("span", { class: "row__en",   text: item.english }),
    ),
    el("span", { class: "row__price", text: baht(item.price) }),
  );
}

export function renderList(host, menu, { onFilter } = {}) {
  const shell = el("div", { class: "shell" });
  const frag = document.createDocumentFragment();

  frag.append(el("header", { class: "list__head" },
    el("h1", { class: "list__title", text: "Menu" }),
    el("p", { class: "list__meta",
      text: `${menu.meta.itemCount} items · ${menu.meta.categoryCount} categories · THB` }),
  ));

  const filters = el("div", { class: "list__filters", role: "group",
                              "aria-label": "Filter by category" });

  const all = el("button", {
    type: "button", class: "list__filter",
    "aria-pressed": "true", dataset: { cat: "all" }, text: "All",
  });
  filters.append(all);

  for (const cat of menu.categories) {
    const { th } = splitCat(cat.name);
    filters.append(el("button", {
      type: "button", class: "list__filter",
      "aria-pressed": "false", dataset: { cat: cat.id },
      text: th || splitCat(cat.name).en,
    }));
  }

  frag.append(filters);

  const groups = new Map();
  for (const cat of menu.categories) {
    const { en, th } = splitCat(cat.name);
    const body = el("div", { class: "list__items" }, cat.items.map(row));
    const group = el("section", {
        class: "list__group", dataset: { cat: cat.id },
        "aria-labelledby": `lg-${cat.id}`,
      },
      el("header", { class: "list__grouphead" },
        el("h2", { class: "list__groupname", id: `lg-${cat.id}`, text: en }),
        th ? el("span", { class: "list__groupthai", text: th }) : null,
        el("span", { class: "list__groupcount", text: String(cat.itemCount) }),
      ),
      body,
    );
    groups.set(cat.id, group);
    frag.append(group);
  }

  shell.append(frag);
  host.replaceChildren(shell);

  /* ---- filtering ----
     The listener is attached unconditionally. onFilter is optional and only
     reports the choice upward (e.g. to sync the Explore nav); if it is
     missing the filter still has to work. */
  filters.addEventListener("click", (e) => {
    const btn = e.target.closest(".list__filter");
    if (!btn) return;
    const id = btn.dataset.cat;

    for (const b of filters.children) {
      b.setAttribute("aria-pressed", String(b === btn));
    }
    for (const [cid, group] of groups) {
      group.hidden = id !== "all" && cid !== id;
    }
    onFilter?.(id);
  });

  return { groups };
}