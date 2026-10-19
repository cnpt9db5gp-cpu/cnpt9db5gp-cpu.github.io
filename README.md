# MHOKAENGMAEYAI — menu experience

An interactive menu site for **MHOKAENGMAEYAI**, built from the 45-item menu PDF.

No build step, no dependencies, no Node. Plain HTML, CSS and ES modules.

---

## Run it

```bash
cd ~/Projects/menu-experience
python3 -m http.server 8765
# then open http://localhost:8765
```

You can also just double-click `index.html` — the data ships as a JS module
specifically so it works from `file://` (fetching a local `.json` is blocked
by CORS).

---

## What's here

```
data/menu.json        45 items, 9 categories  (source of truth)
data/brand.json       name, Thai name, taglines
ASSET-SPEC.md         image brief — read before generating photos

tools/build_data.py   regenerates js/menu.data.js from data/*.json

index.html            shell + the Ayutthaya SVG silhouettes
css/tokens.css        palette, type scale, spacing
css/base.css          reset, shared components, category nav
css/scene.css         the parallax scene layers
css/explore.css       cinematic scroll, 3D depth, dish sheet
css/list.css          the ordering view

js/app.js             routing, modes, dish sheet
js/scene.js           one scroll pass driving every scene layer
js/depth.js           the 3D depth + section reveals
js/explore.js         renders the cinematic view
js/list.js            renders the list view
js/menu.data.js       GENERATED — do not edit

assets/items/         empty; drop <id>.webp in (see ASSET-SPEC.md)
```

## Routes

Hash-based, so they work from `file://` with no server:

| Route | |
|---|---|
| `#/` | explore view |
| `#/list` | list view |
| `#/cat/<category>` | jump to a category |
| `#/dish/<id>` | dish sheet (shareable) |

## Two views

- **Explore** — cinematic scroll, one scene per category, cards recede on the
  z-axis as they cross the viewport.
- **List** — compact and scannable, for actually ordering.

List is also the automatic fallback: it is what renders under
`prefers-reduced-motion`, so the motion layer can never be the only way to
reach the menu.

---

## Design

Ayutthaya in cream, read off the white chedi at Wat Phra Sri Sanphet rather
than the usual gold-and-red: aged plaster, faded laterite, restrained gold
leaf, dark teak.

The scene is six parallax layers: a sky that shifts dawn → late amber as you
scroll, prang spires and chedi domes on the horizon, a lai rot fai lattice
framing the top and bottom edges, drifting dust motes, and a warm pointer
light. The whole scene fades back to an ambient backdrop once you scroll past
the hero, so the temple horizon frames the menu rather than fighting it.

**Colour rule:** `--gold-leaf` (`#C9A227`) is decorative only — about 2.5:1 on
plaster, which fails WCAG for text. Anything that must be read uses
`--gold-text` (`#9A7B1E`, ~4.9:1) or `--teak`.

**Thai typography:** Thai stacks vowel marks above and below the x-height, so
Thai blocks get `--lh-thai: 1.85` rather than the Latin 1.5. The page is
`lang="th"` so the browser breaks Thai text correctly.

---

## Performance rules this codebase keeps

These are the reasons showy menu sites feel bad on a cheap phone:

- Animate **only `transform` and `opacity`** — never `width`, `top`, `height`.
- One `requestAnimationFrame` loop for the whole page (`js/util.js`); scroll
  handlers only mark it dirty.
- Card offsets are **cached**, never read from the DOM inside the scroll loop.
- `will-change` is applied only to cards inside the active range and removed
  on exit — not left on all 45.
- No `filter: blur()` on large layers during scroll. The pointer glow is
  capped small and disabled on touch.
- CSS `fill` is set on the `<svg>`, never on elements inside `<defs>` —
  selectors don't cross the `<use>` shadow boundary, but inherited properties
  do.

---

## Adding photos

Drop `assets/items/<id>.webp` into `assets/items/`. IDs are in
`data/menu.json`. Until a file exists, its slot falls back to a lattice
gradient with the dish's first Thai letter, so nothing ever shows a broken
image. See `ASSET-SPEC.md`.

## Changing the menu

Edit `data/menu.json`, then:

```bash
python3 tools/build_data.py
```

Both the site and the LCD renderer read from that one file.