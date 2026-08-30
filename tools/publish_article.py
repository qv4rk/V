#!/usr/bin/env python3
"""Publish a Reading Room article from a plain markdown file.

Usage:
    python3 tools/publish_article.py path/to/article.md
    python3 tools/publish_article.py path/to/article.md --id my-slug
    python3 tools/publish_article.py path/to/article.md --no-push

Run this from anywhere inside the repo (it finds the repo root itself).

Input file format -- simple frontmatter, then a line of only "---", then
the body:

    title: Route 60 to the Master Fund
    published: 2026-09-01
    excerpt: One or two sentences describing the piece.
    tags: october-7, gaza, reconstruction
    date: 2023-10-07
    location_name: The Gaza perimeter, Route 232
    location_lat: 31.4667
    location_lon: 34.4917
    ---
    First paragraph.

    Second paragraph. Blank lines between paragraphs are what the
    Reading Room uses to split them for reading aloud.

Only `title` is required. `published` defaults to today if left out --
but you almost always want to set it explicitly, since whichever
article has the latest `published` date becomes the homepage's featured
article automatically. `date`/`location_*` are optional (the in-story
historical date/place, separate from `published`). If `--id` isn't
given, the id is slugified from the title.

What this script does, in order:
  1. Parses the frontmatter + body.
  2. Writes data/reading-room/articles/{id}.json.
  3. Adds {id} to data/reading-room/manifest.json if it isn't already there.
  4. Unless --no-push is given: git add, git commit, git push -- all the
     way to GitHub, in one run.
"""
import argparse
import datetime
import json
import re
import subprocess
import sys
from pathlib import Path


def find_repo_root(start: Path) -> Path:
    p = start.resolve()
    for candidate in [p, *p.parents]:
        if (candidate / '.git').exists():
            return candidate
    sys.exit('Could not find the repo root (no .git directory found above ' + str(start) + ').')


def slugify(title: str) -> str:
    s = title.lower().strip()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')[:60] or 'article'


def parse_input(text: str):
    parts = re.split(r'(?m)^---\s*$', text, maxsplit=1)
    if len(parts) != 2:
        sys.exit('Could not find a line containing only "---" separating the frontmatter from the article text.')
    front, body = parts
    fields = {}
    for line in front.strip().splitlines():
        line = line.strip()
        if not line or ':' not in line:
            continue
        key, _, val = line.partition(':')
        fields[key.strip().lower()] = val.strip()
    return fields, body.strip()


def build_article(fields: dict, body: str, article_id: str):
    title = fields.get('title')
    if not title:
        sys.exit('Frontmatter needs a "title:" line.')

    published = fields.get('published') or datetime.date.today().isoformat()
    try:
        datetime.date.fromisoformat(published)
    except ValueError:
        sys.exit('"published:" must look like YYYY-MM-DD (got: %r)' % published)

    article = {
        'id': article_id,
        'title': title,
        'published': published,
        'excerpt': fields.get('excerpt', ''),
        'content': body,
    }

    date_str = fields.get('date')
    if date_str:
        try:
            d = datetime.date.fromisoformat(date_str)
            article['date'] = {'year': d.year, 'month': d.month, 'day': d.day}
        except ValueError:
            print('Warning: could not parse "date: %s" as YYYY-MM-DD -- skipping it.' % date_str, file=sys.stderr)

    loc_name = fields.get('location_name')
    lat, lon = fields.get('location_lat'), fields.get('location_lon')
    if loc_name or lat or lon:
        try:
            article['location'] = {
                'lat': float(lat) if lat else None,
                'lon': float(lon) if lon else None,
                'name': loc_name or '',
            }
        except ValueError:
            print('Warning: could not parse location_lat/location_lon as numbers -- skipping location.', file=sys.stderr)

    tags = fields.get('tags')
    if tags:
        article['tags'] = [t.strip() for t in tags.split(',') if t.strip()]

    return article


def update_manifest(manifest_path: Path, article_id: str):
    ids = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else []
    if article_id in ids:
        return ids, False
    ids.append(article_id)
    manifest_path.write_text(json.dumps(ids, indent=2) + '\n', encoding='utf-8')
    return ids, True


def run_git(repo_root: Path, args):
    result = subprocess.run(['git', *args], cwd=repo_root, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        sys.exit('git %s failed (exit %d) -- see output above.' % (' '.join(args), result.returncode))
    if result.stdout.strip():
        print(result.stdout.strip())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('input', help='Path to the markdown/text file to publish.')
    ap.add_argument('--id', help='Article id/slug (default: derived from the title).')
    ap.add_argument('--no-push', action='store_true', help="Write the files but don't run git add/commit/push.")
    args = ap.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        sys.exit('No such file: %s' % input_path)

    repo_root = find_repo_root(Path.cwd())
    fields, body = parse_input(input_path.read_text(encoding='utf-8'))
    article_id = args.id or slugify(fields.get('title', input_path.stem))
    article = build_article(fields, body, article_id)

    articles_dir = repo_root / 'data' / 'reading-room' / 'articles'
    articles_dir.mkdir(parents=True, exist_ok=True)
    article_path = articles_dir / (article_id + '.json')
    article_path.write_text(json.dumps(article, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Wrote %s' % article_path.relative_to(repo_root))

    manifest_path = repo_root / 'data' / 'reading-room' / 'manifest.json'
    ids, changed = update_manifest(manifest_path, article_id)
    if changed:
        print('Added "%s" to manifest.json (%d articles total)' % (article_id, len(ids)))
    else:
        print('"%s" was already in manifest.json' % article_id)

    if args.no_push:
        print('--no-push given: not touching git. Files are ready to review, add, commit, and push yourself.')
        return

    rel_article = article_path.relative_to(repo_root).as_posix()
    rel_manifest = manifest_path.relative_to(repo_root).as_posix()
    print('\nPushing to GitHub...')
    run_git(repo_root, ['add', rel_article, rel_manifest])
    run_git(repo_root, ['commit', '-m', 'Add article: %s' % article['title']])
    run_git(repo_root, ['push'])
    print('\nDone. "%s" is pushed -- it\'ll be live once the site redeploys (usually a minute or two).' % article['title'])


if __name__ == '__main__':
    main()
