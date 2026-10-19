#!/usr/bin/env python3
"""Generate the table QR code for the MHOKAENGMAEYAI menu.

    python3 tools/make_qr.py https://your-site.netlify.app

Writes:
    qr/menu-qr.png    1200px, for print (a table tent, the counter)
    qr/menu-qr.svg    vector, for a signwriter or a laser print

Error correction is HIGH (30%): the code gets scuffed, spilt on, or taped
over on a café table, and it still has to scan.
"""
import sys
from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_H

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "qr"

# Ayutthaya palette, matching the site.
DARK = "#3A2E26"
LIGHT = "#FCF8F1"


def build(url: str):
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,
        box_size=10,
        border=4,          # the quiet zone; below 4 modules many scanners fail
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color=DARK, back_color=LIGHT)
    return qr, img


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    url = sys.argv[1].strip()
    if not url.startswith(("http://", "https://")):
        sys.exit(f"error: pass a full URL starting with https:// — got {url!r}")

    OUT.mkdir(exist_ok=True)
    qr, img = build(url)

    png = OUT / "menu-qr.png"
    img.save(png)

    # Vector output, scaled so one module is 1 unit.
    svg = OUT / "menu-qr.svg"
    n = qr.modules_count
    border = 4
    side = n + border * 2
    path = "".join(
        f"M{x + border},{y + border}h1v1h-1z"
        for y in range(n)
        for x in range(n)
        if qr.modules[y][x]
    )
    svg.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side} {side}" '
        f'width="{side * 4}" height="{side * 4}" shape-rendering="crispEdges">'
        f'<rect width="{side}" height="{side}" fill="{LIGHT}"/>'
        f'<path d="{path}" fill="{DARK}"/></svg>\n',
        encoding="utf-8",
    )

    print(f"URL   {url}")
    print(f"grid  {n}x{n} modules (version {qr.version})")
    print(f"wrote {png.relative_to(ROOT)}  ({png.stat().st_size // 1024} KB)")
    print(f"wrote {svg.relative_to(ROOT)}")
    print("\nPrint it at least 3 cm square. Below that, especially on a glossy or")
    print("creased surface, phones start to struggle.")


if __name__ == "__main__":
    main()