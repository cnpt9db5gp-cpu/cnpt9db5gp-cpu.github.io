#!/usr/bin/env python3
"""Stage real photography for prep_images.py.

Restaurant photos arrive from phones: portrait, sometimes stored sideways
(EXIF rotation), and every one a different length. The website shows food in
3:2 landscape slots (list thumbnails, dish sheet plate), so each photo needs
one decision: which horizontal band survives.

    python3 tools/crop_stage.py                      # stage, no previews
    python3 tools/crop_stage.py --montage            # + one check sheet
    python3 tools/crop_stage.py --refresh all        # re-stage every file

MAP records:  (source path, cy) where cy is the fraction of the ORIENTED
height on which the 3:2 crop band is centred -- 0.5 is the middle. Entries
whose id is not confirmed sit under UNCONFIRMED and are skipped unless
--refresh all is given; "pending" needs a human (see commits/notes).
"""
import argparse
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
DROPBOX = Path.home() / "Dropbox" / "Design blog"
ASPECT = 3 / 2

MAP = {
    # ---- confirmed: filename or photo content names the dish ----
    "ice-cream-with-sticky-rice-and-black-beans": (
        DROPBOX / "Desserts/(Butterfly Pea Ice Cream with Sticky Rice and Black Bean) 109.jpg", 0.47),
    "caramelized-thai-bananas-with-ice-cream": (
        DROPBOX / "Desserts/Photo 13-10-2569 BE, 14 36 23.jpg", 0.55),
    "poached-pumpkin-in-coconut-milk": (
        DROPBOX / "Desserts/Photo 13-10-2569 BE, 14 55 52.jpg", 0.53),
    "thai-mixed-ruammitr-ice-cream-with-bua-loy": (
        DROPBOX / "Desserts/(Thai Mixed (Ruammitr) Ice Cream with Bua Loy) 109.jpg", 0.48),
    "coconut-ice-cream-with-krong-krang-in-coconut-milk": (
        DROPBOX / "Desserts/(Toddy Palm Coconut Ice Cream with Krong Krang in Coconut Milk 109.jpg", 0.47),
    "green-tea": (
        DROPBOX / "Drinks/(Green Tea) 65.jpg", 0.50),
    "thai-tea": (
        DROPBOX / "Drinks/IMG_0307.JPG", 0.59),
    "spicy-pineapple-smoothie": (
        DROPBOX / "Drinks/Photo 27-9-2569 BE, 11 36 33 (1).jpg", 0.49),
    "passion-fruit-soda": (
        DROPBOX / "Drinks/Photo 30-1-2569 BE, 11 02 53.jpg", 0.52),
    "banoffee-macchiato-float": (
        DROPBOX / "Drinks/Photo 5-8-2568 BE, 09 53 01.jpg", 0.45),
    # ---- photo known, dish not: needs a human ----
    "UNCONFIRMED  (white scoop, golden crumble, translucent ball on blue plate)": (
        DROPBOX / "Desserts/Photo 27-9-2569 BE, 11 36 44.jpg", 0.55),
}

OUTDIR = Path("/tmp/opencode/stage-batch1")


def band(img, cy):
    w, h = img.size
    bh = round(w / ASPECT)
    top = round(cy * h - bh / 2)
    top = max(0, min(top, h - bh))
    return (0, top, w, top + bh)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--montage", action="store_true",
                    help="also write one check sheet of all crops")
    ap.add_argument("--refresh", default="changed", choices=("changed", "all"),
                    help="'all' also re-stages UNCONFIRMED entries")
    args = ap.parse_args()

    OUTDIR.mkdir(parents=True, exist_ok=True)
    thumbs = []
    for item_id, (src, cy) in MAP.items():
        if item_id.startswith("UNCONFIRMED"):
            tag = " (UNCONFIRMED - skipped)" if args.refresh != "all" else ""
            print(f"  skip  {src.name}{tag}")
            continue

        with Image.open(src) as im:
            o = ImageOps.exif_transpose(im).convert("RGB")
        w, h = o.size

        ow = 520                      # montage thumb of the source
        th = o.resize((ow, round(h * ow / w)), Image.LANCZOS)
        thumbs.append((item_id, src.name, th, cy))

        dest = OUTDIR / f"{item_id}.jpg"
        fresh = not dest.exists() or dest.stat().st_mtime < src.stat().st_mtime
        if args.refresh == "all" or fresh:
            o.crop(band(o, cy)).save(dest, "JPEG", quality=92)
            fresh = True

        c = Image.open(dest)
        print(f"  ok    {item_id:<40} {w}x{h} -> {c.size[0]}x{c.size[1]}")
        c.close()

    if not args.montage:
        return

    # per item: the staged crop it just made -- one tile in a row, labelled
    cw, label_h = 400, 20
    from PIL import ImageDraw
    sheet = Image.new("RGB", (cw * 5, (cw * 2 // 3 + label_h) * 2), (246, 241, 230))
    dr = ImageDraw.Draw(sheet)
    for n, (item_id, name, th, cy) in enumerate(thumbs):
        crop = Image.open(OUTDIR / f"{item_id}.jpg")
        tw = cw
        th2 = crop.resize((tw, round(tw * crop.height / crop.width)), Image.LANCZOS)
        x = (n % 5) * cw
        y = (n // 5) * (cw * 2 // 3 + label_h)
        sheet.paste(th2, (x, y))
        dr.rectangle([x, y, x + 3, y + th2.height], fill=(200, 60, 40) if cy != .5 else (120, 120, 120))
        dr.text((x + 8, y + th2.height + 3), f"{item_id}  ({name[:34]})", fill=(40, 30, 20))
        crop.close()
    out = OUTDIR / "previews" / "check-sheet.jpg"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, "JPEG", quality=82)
    print(f"\ncheck sheet: {out}")


if __name__ == "__main__":
    main()
