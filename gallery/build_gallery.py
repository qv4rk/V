#!/usr/bin/env python3
"""Build a public gallery manifest and small alpha-preserving thumbnails.

Run from anywhere: python gallery/build_gallery.py
Images live in gallery/images; the script never rewrites originals.
"""
import json
from pathlib import Path
from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'images'
THUMBS = HERE / 'thumbs'
EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'}

def main():
    SOURCE.mkdir(exist_ok=True)
    THUMBS.mkdir(exist_ok=True)
    entries = []
    for path in sorted(SOURCE.rglob('*'), key=lambda p: str(p).lower()):
        if not path.is_file() or path.suffix.lower() not in EXTS:
            continue
        relative = path.relative_to(SOURCE)
        thumb = (THUMBS / relative).with_suffix('.webp')
        thumb.parent.mkdir(parents=True, exist_ok=True)
        if not thumb.exists() or thumb.stat().st_mtime < path.stat().st_mtime:
            with Image.open(path) as original:
                image = ImageOps.exif_transpose(original)
                image.thumbnail((400, 400), Image.Resampling.LANCZOS)
                image = image.convert('RGBA') if 'A' in image.getbands() or 'transparency' in image.info else image.convert('RGB')
                image.save(thumb, 'WEBP', quality=78, method=4)
        entries.append({'name': relative.as_posix(),
                        'url': 'images/' + relative.as_posix(),
                        'thumb': 'thumbs/' + thumb.relative_to(THUMBS).as_posix()})
    (HERE / 'gallery.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(entries)} images indexed; originals unchanged')

if __name__ == '__main__':
    main()
