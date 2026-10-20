#!/usr/bin/env python3
"""Turn generated images into web-ready assets, and report what is unusable.

    python3 tools/prep_images.py ~/Downloads/higgsfields
    python3 tools/prep_images.py ~/Downloads/higgsfields --crop

Looks for images in the given folder, matches each one to a menu item by id,
checks it against the brief in ASSET-SPEC.md, and writes:

    assets/items/<id>.webp         master, 2000px wide, q80
    assets/items/<id>-800.webp     phone
    assets/items/<id>-1200.webp    tablet

Anything that cannot be matched, or that misses the brief, is reported rather
than quietly dropped -- a silently missing image looks like a bug later.
"""
import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MENU = ROOT / "data" / "menu.json"
OUT = ROOT / "assets" / "items"

MASTER_W, MASTER_H = 2000, 1333      # 3:2, the aspect in ASSET-SPEC.md
WIDTHS = (800, 1200, 2000)
QUALITY = 80
ASPECT_TOL = 0.04                    # 4%: accept, resizing only

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".bmp", ".tif", ".tiff"}

# Portrait twin files ("<id>-p.jpg") carry their own aspect and sizes.
P_ASPECT = 2 / 3
P_WIDTHS = (800, 1200, 1600)


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = re.sub(r"[^\w\s-]", " ", s, flags=re.UNICODE)
    return re.sub(r"[\s_]+", "-", s.strip().lower()).strip("-")


def crop_to(im, target):
    """Centre-crop an RGB image to the width/height ratio `target`."""
    w, h = im.size
    ratio = w / h
    if ratio > target:                      # too wide: trim sides
        new_w = int(h * target)
        left = (w - new_w) // 2
        return im.crop((left, 0, left + new_w, h))
    new_h = int(w / target)                 # too tall: trim top/bottom
    top = (h - new_h) // 2
    return im.crop((0, top, w, top + new_h))


def norm(stem: str) -> str:
    """Forgiving stem -> comparable id."""
    s = slug(stem)
    s = re.sub(r"\b(final|export|output|image|img|photo|pic|render|"
               r"copy|\d+x\d+|v\d+|a)\b", " ", s)
    return re.sub(r"[^a-z0-9]+", "", s)


def load_menu():
    m = json.loads(MENU.read_text(encoding="utf-8"))
    items = {}
    for c in m["categories"]:
        for i in c["items"]:
            items[i["id"]] = i
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path, nargs="?", help="folder of generated images")
    ap.add_argument("--crop", action="store_true",
                    help="centre-crop to 3:2 when the source is a different shape")
    ap.add_argument("--list-ids", action="store_true",
                    help="print the exact filenames expected, then exit")
    args = ap.parse_args()

    items = load_menu()

    if args.list_ids:
        print(f"{len(items)} images needed. Save each one as:\n")
        for i, it in items.items():
            print(f"  {i}.png      {it['thai']}  /  {it['english']}")
        print("\nThen:  python3 tools/prep_images.py <folder>")
        return

    if not args.source:
        sys.exit("error: give a folder, or use --list-ids")
    if not args.source.is_dir():
        sys.exit(f"error: {args.source} is not a folder")

    by_norm = {norm(k): k for k in items}
    OUT.mkdir(parents=True, exist_ok=True)

    files = sorted(p for p in args.source.iterdir()
                   if p.is_file() and p.suffix.lower() in IMAGE_EXT)
    if not files:
        sys.exit(f"no images found in {args.source}")

    print(f"{len(files)} image(s) in {args.source}\n")
    ok, warned, unmatched = [], [], []

    # Portrait twins are processed first so the landscape matcher below
    # never sees "<id>-p" (its stem regex would treat it as <id>).
    files, portraits = [], []
    for cand in sorted(p for p in args.source.iterdir()
                       if p.is_file() and p.suffix.lower() in IMAGE_EXT):
        if cand.stem.endswith("-p") and cand.stem[:-2] in items:
            portraits.append(cand)
        else:
            files.append(cand)

    for path in portraits:
        item_id = path.stem[:-2]
        item = items[item_id]
        with Image.open(path) as im:
            im = im.convert("RGB")
        w, h = im.size
        ratio = w / h
        target = P_ASPECT
        drift = abs(ratio - target) / target
        if drift > ASPECT_TOL:
            if not args.crop:
                warned.append((path.name, item_id,
                               f"{w}x{h} is {ratio:.2f}:1, portrait asks 0.67:1"
                               " -- run with --crop"))
                continue
            im = crop_to(im, target)
            w, h = im.size
        for width in P_WIDTHS:
            scale = min(1.0, width / im.width)
            size = (width, max(1, round(im.height * scale)))
            out = OUT / (f"{item_id}-p.webp" if width == P_WIDTHS[-1]
                         else f"{item_id}-p-{width}.webp")
            im.resize(size, Image.LANCZOS).save(
                out, "WEBP", quality=QUALITY, method=6)
        kb = sum(f.stat().st_size for f in OUT.glob(f"{item_id}-p*.webp")) // 1024
        ok.append(item_id)
        print(f"  ok   {item_id + '-p':<42} {w}x{h}  -> {kb} KB portrait")

    for path in files:
        key = norm(path.stem)
        item_id = by_norm.get(key)
        if item_id is None:
            # try a prefix match: "espresso-1" -> "espresso"
            cands = [k for n, k in by_norm.items() if n and (n.startswith(key) or key.startswith(n))]
            item_id = cands[0] if len(cands) == 1 else None
        if item_id is None:
            unmatched.append(path.name)
            continue

        item = items[item_id]
        with Image.open(path) as im:
            w, h = im.size
            ratio = w / h
            target = MASTER_W / MASTER_H
            drift = abs(ratio - target) / target

            if drift > ASPECT_TOL:
                msg = f"{w}x{h} is {ratio:.2f}:1, brief asks 1.50:1"
                if not args.crop:
                    warned.append((path.name, item_id, msg + " -- re-generate or run with --crop"))
                    continue
                im = crop_to(im.convert("RGB"), target)
                w, h = im.size

            im = im.convert("RGB")
            for width in WIDTHS:
                scale = min(1.0, width / im.width)
                size = (width, max(1, round(im.height * scale)))
                out = OUT / (f"{item_id}.webp" if width == WIDTHS[-1]
                             else f"{item_id}-{width}.webp")
                im.resize(size, Image.LANCZOS).save(
                    out, "WEBP", quality=QUALITY, method=6)

        kb = sum(f.stat().st_size for f in OUT.glob(f"{item_id}*.webp")) // 1024
        ok.append(item_id)
        print(f"  ok   {item_id:<38} {w}x{h}  -> {kb} KB across {len(WIDTHS)} sizes")
        print(f"       {item['thai']}  /  {item['english']}")

    total = len(items)
    print(f"\n{len(ok)}/{total} items have images.")
    if ok:
        print(f"missing: {total - len(ok)}  " + ", ".join(sorted(set(items) - set(ok))[:8])
              + (" ..." if total - len(ok) > 8 else ""))
    if warned:
        print("\nwrong aspect ratio, skipped:")
        for name, iid, msg in warned:
            print(f"  {name:<38} {msg}")
    if unmatched:
        print(f"\ncould not match to a menu item ({len(unmatched)}):")
        for name in unmatched[:20]:
            print(f"  {name}")
        if len(unmatched) > 20:
            print(f"  ... and {len(unmatched) - 20} more")
        print("\n  Run with --list-ids to see the exact names expected.")

    if len(ok) == total:
        print("\nAll 45 present. Commit assets/items/ and push to publish.")


if __name__ == "__main__":
    main()