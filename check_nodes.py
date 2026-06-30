#!/usr/bin/env python3
"""
check_nodes.py
Audits every file in nodes/ and prints a report of problems to fix.

Run from repo root:
  python check_nodes.py

What it checks:
  - Content contains "NOT VERIFIED" or other draft markers
  - id field doesn't match the filename
  - Tags that look like paper numbers / IDs (should be thematic keywords)
  - Empty or missing excerpt
  - Missing required fields

No files are changed — this is read-only.
"""

import os
import re
import yaml

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
NODES_DIR  = os.path.join(SCRIPT_DIR, 'nodes')

DRAFT_MARKERS = [
    'not verified',
    'not verified.',
    '[draft]',
    '[wip]',
    'todo:',
    'placeholder',
    'insert citation',
    'fact check',
    '[citation needed]',
]

REQUIRED_FIELDS = ['id', 'title', 'date', 'location', 'excerpt']


def parse_frontmatter(text):
    text = text.strip()
    if not text.startswith('---'):
        return {}, text
    end = text.find('\n---', 3)
    if end == -1:
        return {}, text
    try:
        fm = yaml.safe_load(text[3:end]) or {}
    except Exception:
        fm = {}
    body = text[end + 4:].strip()
    return fm, body


def check_file(fname, path):
    issues = []
    with open(path, 'r', encoding='utf-8') as f:
        raw = f.read()

    fm, body = parse_frontmatter(raw)
    body_lower = body.lower()
    raw_lower  = raw.lower()

    # ── Draft markers in content ────────────────────────────────────────────
    found_markers = [m for m in DRAFT_MARKERS if m in body_lower]
    if found_markers:
        issues.append(f'  DRAFT CONTENT: contains → {found_markers}')

    # ── id / filename mismatch ──────────────────────────────────────────────
    stem = fname[:-3]  # strip .md
    fm_id = str(fm.get('id', ''))
    if fm_id and fm_id != stem:
        issues.append(f'  ID MISMATCH: filename="{stem}"  frontmatter id="{fm_id}"')

    # ── Tags that look like paper numbers / bad IDs ─────────────────────────
    tags = fm.get('tags') or []
    bad_tags = []
    for t in tags:
        t_str = str(t)
        # flags: contains digits only, or "paper", or matches the id pattern
        if re.search(r'\bpaper\s*\d+\b', t_str, re.IGNORECASE):
            bad_tags.append(t_str)
        elif re.match(r'^n\d{2,}$', t_str):   # n01, n80, etc.
            bad_tags.append(t_str)
        elif re.match(r'^necronomy.?paper', t_str, re.IGNORECASE):
            bad_tags.append(t_str)
    if bad_tags:
        issues.append(f'  BAD TAGS (paper numbers): {bad_tags}')

    # ── Tags duplicating the id ─────────────────────────────────────────────
    id_tags = [t for t in tags if str(t).lower() == fm_id.lower()]
    if id_tags:
        issues.append(f'  REDUNDANT TAG = id: {id_tags}')

    # ── Missing required fields ─────────────────────────────────────────────
    missing = [f for f in REQUIRED_FIELDS if not fm.get(f)]
    if missing:
        issues.append(f'  MISSING FIELDS: {missing}')

    # ── Empty excerpt ───────────────────────────────────────────────────────
    if not str(fm.get('excerpt', '')).strip():
        issues.append('  EMPTY EXCERPT')

    # ── Very short body (probably stub) ────────────────────────────────────
    if len(body.split()) < 50:
        issues.append(f'  SHORT BODY: only {len(body.split())} words — stub?')

    return issues


def main():
    if not os.path.isdir(NODES_DIR):
        print(f'nodes/ directory not found at {NODES_DIR}')
        print('Run split_to_nodes.py first.')
        return

    md_files = sorted(f for f in os.listdir(NODES_DIR) if f.endswith('.md'))
    if not md_files:
        print('No .md files in nodes/ — nothing to audit.')
        return

    clean = []
    dirty = []

    for fname in md_files:
        path = os.path.join(NODES_DIR, fname)
        issues = check_file(fname, path)
        if issues:
            dirty.append((fname, issues))
        else:
            clean.append(fname)

    # ── Report ──────────────────────────────────────────────────────────────
    print(f'\n{"="*60}')
    print(f'  NODE AUDIT — {len(md_files)} files')
    print(f'  {len(clean)} clean  |  {len(dirty)} need attention')
    print(f'{"="*60}\n')

    if dirty:
        print('NEEDS ATTENTION:')
        for fname, issues in dirty:
            print(f'\n  nodes/{fname}')
            for i in issues:
                print(i)

    if clean:
        print(f'\nCLEAN ({len(clean)} files):')
        for fname in clean:
            print(f'  nodes/{fname}')

    print(f'\n{"="*60}')
    if dirty:
        print(f'Fix the {len(dirty)} files above, then run: python build.py')
    else:
        print('All nodes are clean. Run: python build.py')
    print()


if __name__ == '__main__':
    main()
