#!/usr/bin/env python3
"""
split_to_nodes.py
One-time migration: splits events.json and necronomy-events.json
into individual Markdown files with YAML frontmatter in /nodes/.

Usage:
  python split_to_nodes.py

Each .md filename is the event id. If a file already exists it is
skipped so you can safely re-run without overwriting manual edits.
"""

import json
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
NODES_DIR  = os.path.join(SCRIPT_DIR, 'nodes')

MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN',
               'JUL','AUG','SEP','OCT','NOV','DEC']


def _ystr(v):
    """Safely quote a string for YAML."""
    if v is None:
        return '""'
    s = str(v)
    # Use JSON quoting if the value contains YAML special characters
    need_quote = any(c in s for c in [':', '#', '{', '}', '[', ']',
                                       ',', '&', '*', '?', '|', '>',
                                       "'", '"', '\n', '\\'])
    return json.dumps(s) if need_quote else s


def write_node(event, source_tag):
    """Write one event dict to nodes/{id}.md."""
    os.makedirs(NODES_DIR, exist_ok=True)

    eid = event.get('id') or re.sub(r'[^\w-]', '-', event.get('title', 'node').lower())[:60]
    fname = eid + '.md'
    filepath = os.path.join(NODES_DIR, fname)

    if os.path.exists(filepath):
        print(f'  SKIP (exists): {fname}')
        return

    date     = event.get('date', {})
    location = event.get('location', {})
    tags     = event.get('tags') or event.get('mechanism') or []
    conns    = event.get('connections') or []

    lines = ['---']
    lines.append(f'id: {_ystr(eid)}')
    lines.append(f'title: {_ystr(event.get("title", ""))}')
    lines.append(f'source: {_ystr(source_tag)}')
    lines.append('date:')
    lines.append(f'  year: {date.get("year", 0)}')
    lines.append(f'  month: {date.get("month", 1)}')
    lines.append(f'  day: {date.get("day", 1)}')
    lines.append('location:')
    lines.append(f'  lat: {location.get("lat", 0)}')
    lines.append(f'  lon: {location.get("lon", 0)}')
    lines.append(f'  name: {_ystr(location.get("name", ""))}')
    lines.append(f'type: {_ystr(event.get("type", ""))}')

    # Optional fields present in manifold but not necronomy
    if 'empire' in event:
        lines.append(f'empire: {_ystr(event["empire"])}')
    if 'mechanism' in event and isinstance(event['mechanism'], list):
        lines.append(f'mechanism: {json.dumps(event["mechanism"])}')

    lines.append(f'nodeColor: {_ystr(event.get("nodeColor", "#a67041"))}')
    lines.append(f'nodeSize: {float(event.get("nodeSize", 0.5))}')

    if tags:
        lines.append('tags:')
        for t in tags:
            lines.append(f'  - {_ystr(t)}')
    else:
        lines.append('tags: []')

    if conns:
        lines.append('connections:')
        for c in conns:
            lines.append(f'  - {_ystr(c)}')
    else:
        lines.append('connections: []')

    lines.append(f'excerpt: {_ystr(event.get("excerpt", ""))}')
    lines.append('references: []')
    lines.append('---')
    lines.append('')
    lines.append(event.get('content', '').strip())
    lines.append('')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'  Written: {fname}')


def load_and_migrate(json_path, source_tag):
    if not os.path.exists(json_path):
        print(f'  Not found, skipping: {json_path}')
        return 0
    print(f'Processing {json_path} ...')
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    events = data if isinstance(data, list) else data.get('events', [])
    for ev in events:
        write_node(ev, source_tag)
    return len(events)


def main():
    n1 = load_and_migrate(
        os.path.join(SCRIPT_DIR, 'data', 'events.json'),
        'manifold'
    )
    n2 = load_and_migrate(
        os.path.join(SCRIPT_DIR, 'necronomy-atlas', 'src', 'data', 'necronomy-events.json'),
        'necronomy'
    )
    print(f'\nDone: {n1} manifold + {n2} necronomy nodes written to {NODES_DIR}/')
    print('Run build.py to regenerate outputs.')


if __name__ == '__main__':
    main()
