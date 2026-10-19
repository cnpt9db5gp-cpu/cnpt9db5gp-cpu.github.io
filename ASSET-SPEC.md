# Image asset spec — 45 menu items

**Read this before generating anything.** 45 images generated on inconsistent
settings will look like 45 different cafés. Generating one *style anchor*,
getting it approved, then batching the rest off that anchor is the difference
between a site that looks designed and one that looks assembled.

---

## 1. Master format

| | Value |
|---|---|
| Aspect | **3:2 landscape** |
| Resolution | **2400 × 1600 px** (crop-safe) |
| Format delivered to me | `.webp`, q80, plus a 1200px-wide `@2x` variant |
| Colour | sRGB, no HDR |

3:2 on purpose: the immersive scroll wants full-bleed 16:9, and the menu grids
want 4:5 or 1:1. One 3:2 master crops cleanly to all three. Don't generate
square-only or 9:16 — I'll have to crop into the dish and lose the composition.

## 2. The style anchor (non-negotiable across all 45)

Every image is one world. Same for all 45:

- **Camera:** 45° elevated three-quarter. Same for every item — no top-downs, no
  straight-on. This is the single biggest consistency lever.
- **Light:** soft directional window light from camera-left, one consistent
  highlight direction, soft shadows falling to camera-right.
- **Surface:** one dark, matte stone or weathered wood table. Same across all.
- **Vessel:** one family of ceramics. Pick 2–3 shapes and reuse them — a tall
  ceramic mug for hot drinks, a low wide bowl for desserts, a clear footed
  glass for floats. Do **not** invent a new vessel per dish.
- **Grade:** warm but not orange. Slight contrast lift. No heavy filters.
- **Props:** max two, from one small set (banana leaf, linen napkin, sesame).
  Never a different prop per dish.
- **Negative space:** dish sits right-of-centre or lower-third, leaving clean
  space on the left for the Thai name + price overlay.

## 3. Process

1. **Generate 3 candidates for ONE hero item** — pick `poached-pumpkin-in-coconut-milk`
   (the one we just renamed, it's a good test: warm colour, visible texture).
2. **Manager signs off** on the look. This is the gate — do not batch before it.
3. Use that approved image as the **reference/seed** for the remaining 44, same
   prompt skeleton, only the dish changes.

If Higgsfields supports reference-image locking or seed reuse, use it. If it
doesn't, keep the prompt skeleton byte-identical and vary only the dish clause.

## 4. Prompt skeleton

```
[45-degree elevated three-quarter] photo of [DISH], [VESSEL], on a dark matte
stone table, soft directional window light from the left, gentle shadows to the
right, shallow depth of field, warm natural colour grade, minimal Thai-style
food styling, one small linen napkin, generous negative space on the left side,
editorial food photography, high detail
```

Negative prompt:
```
harsh flash, cluttered background, text, watermark, hands, faces, bright
coloured plates, plastic look, oversaturated, cartoon, 3d render
```

## 5. Dish-specific clause

Keep it physical and specific — AI models do better on "cubed pumpkin in pale
coconut milk" than "Thai dessert":

| Category | Vessels | Dish clause example |
|---|---|---|
| Coffee | tall ceramic mug | `dark espresso with a thin hazelnut crema` |
| Tea | tall ceramic mug | `bright orange Thai iced tea, visible tapioca pearls` |
| Milk & Smoothie | tall clear glass | `thick mango smoothie, bright yellow, condensation` |
| Soda | clear footed glass | `deep red lime soda with ice cubes and mint` |
| Float | tall footed glass | `green tea ice cream float, scoops clearly visible` |
| Herbal | small glass carafe | `pale golden chrysanthemum tea in a small carafe` |
| Thai Desserts | low wide bowl | `golden pumpkin chunks poached in white coconut milk` |
| + Ice Cream | low wide bowl | `three scoops of white coconut ice cream in a bowl` |

## 6. File naming — match the data layer exactly

```
assets/items/<id>.webp
```

`<id>` comes from `data/menu.json` — these are already generated, ASCII-safe and
unique. Examples:

```
assets/items/espresso.webp
assets/items/thai-tea.webp
assets/items/poached-pumpkin-in-coconut-milk.webp
```

Do not rename by hand. If an image doesn't map to an id, tell me — don't invent
a filename. Get it from `data/menu.json`.

## 7. Known limitation — decide now, not later

Generative images will **not** match what the customer is actually served. A
customer orders the pumpkin and gets a different bowl. For a food business that's
a real expectation-management risk, and it's the one thing about the
picture-first plan I can't engineer away.

Cheapest mitigation: generate all 45 now to build and sign off the design, but
put real photography on the roadmap as a phase 2. Real photos of the actual
dishes would make this site dramatically more credible — and the layout won't
change, only the pixels.