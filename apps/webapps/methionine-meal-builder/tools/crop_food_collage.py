#!/usr/bin/env python3
"""
Slice a grid-collage image (e.g. an AI-generated "micro collage of
square food photos") into individual labeled image files for use as
quick-add food icons.

Usage:
  python3 crop_food_collage.py collage.png --cols 5 --rows 5

  # with labels, one per line, in the same left-to-right, top-to-bottom
  # order as the tiles in the collage:
  python3 crop_food_collage.py collage.png --cols 5 --rows 5 --labels labels.txt

Without --labels, files are named tile_<row>_<col>.png so nothing is
silently overwritten and you can rename them by hand afterward.
"""

import argparse
import re
import sys
from pathlib import Path

from PIL import Image


def slugify(text):
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "untitled"


def load_labels(path, expected_count):
    labels = [line.strip() for line in Path(path).read_text().splitlines() if line.strip()]
    if len(labels) != expected_count:
        sys.exit(
            f"--labels has {len(labels)} entries but the grid has {expected_count} "
            f"tiles ({expected_count} = rows * cols) — they must match exactly."
        )
    return labels


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image", help="Path to the collage image")
    ap.add_argument("--cols", type=int, required=True, help="Number of tiles across")
    ap.add_argument("--rows", type=int, required=True, help="Number of tiles down")
    ap.add_argument("--size", type=int, default=250, help="Output tile size in pixels (square). Default 250.")
    ap.add_argument("--labels", help="Optional text file, one label per line, row-major order (left-to-right, top-to-bottom)")
    ap.add_argument("--out", default="../images/foods", help="Output directory (default: ../images/foods, relative to this script)")
    ap.add_argument("--format", default="png", choices=["png", "jpg", "webp"], help="Output image format (default png)")
    args = ap.parse_args()

    src = Image.open(args.image).convert("RGB")
    tile_w = src.width / args.cols
    tile_h = src.height / args.rows

    out_dir = Path(__file__).parent / args.out if not Path(args.out).is_absolute() else Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    labels = load_labels(args.labels, args.rows * args.cols) if args.labels else None

    written = []
    i = 0
    for row in range(args.rows):
        for col in range(args.cols):
            left = round(col * tile_w)
            upper = round(row * tile_h)
            right = round((col + 1) * tile_w)
            lower = round((row + 1) * tile_h)
            tile = src.crop((left, upper, right, lower))
            tile = tile.resize((args.size, args.size), Image.LANCZOS)

            name = slugify(labels[i]) if labels else f"tile_{row}_{col}"
            ext = "jpg" if args.format == "jpg" else args.format
            out_path = out_dir / f"{name}.{ext}"
            save_kwargs = {"quality": 90} if args.format == "jpg" else {}
            tile.save(out_path, **save_kwargs)
            written.append(out_path)
            i += 1

    print(f"Wrote {len(written)} tiles ({args.cols}x{args.rows} grid, {args.size}px each) to {out_dir}/")
    for p in written:
        print(f"  {p.name}")


if __name__ == "__main__":
    main()
