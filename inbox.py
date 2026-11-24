#!/usr/bin/env python3
"""
inbox.py: turns files in reading_room_inbox/ into Reading Room articles.

build.py calls collect() on every build (the GitHub Action runs build.py on
every push to main), so dropping a file into reading_room_inbox/ and pushing
is all it takes to publish. Nothing in nodes/ is written or overwritten: each
inbox article is added to the build in memory, and only the generated outputs
(articles/<id>.html, articles/images/<id>/..., data/reading-room/...) are
committed back by the build bot.

Supported, best first:
  name.md    Markdown with optional YAML frontmatter; images in a sibling
             folder (e.g. name/ or images/) referenced by relative path.
  name.docx  Word file; pictures embedded in the document are extracted.
             Optional name.yml next to it for title/excerpt/date/location.
  name.json  {"title":..., "content": "markdown", "images": {"a.jpg": "<base64>"}}
Not supported: .pdf (export it to .docx or .md first). The build log says so.

Files or folders whose name starts with "_" or "." are ignored (templates,
work in progress). So is README.md. Frontmatter `draft: true` also skips one.
"""
import base64
import datetime
import hashlib
import json
import mimetypes
import os
import re
import urllib.parse

import yaml

INBOX_DIRNAME = 'reading_room_inbox'
IGNORE = {'readme.md'}
IMG_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'}

MD_IMG_RE = re.compile(r'!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)')
HTML_IMG_RE = re.compile(r'(<img\b[^>]*?\bsrc\s*=\s*)(["\'])(.*?)\2', re.I | re.S)
DATA_URI_RE = re.compile(r'^data:(image/[a-z0-9.+-]+);base64,(.+)$', re.I | re.S)


def _log(msg):
    print(f'  [inbox] {msg}')


def slugify(s):
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-') or 'article'


def _write_if_changed(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        with open(path, 'rb') as f:
            if f.read() == data:
                return
    with open(path, 'wb') as f:
        f.write(data)


def _ext_for_mime(mime):
    ext = mimetypes.guess_extension(mime or '') or '.png'
    return '.jpg' if ext in ('.jpe', '.jpeg') else ext


class _Images:
    """Saves extracted/decoded pictures under articles/images/<id>/."""

    def __init__(self, root, eid):
        self.root, self.eid, self.n = root, eid, 0

    def save(self, data, name=None, mime=None):
        self.n += 1
        if name:
            base, ext = os.path.splitext(os.path.basename(name))
            fname = slugify(base) + (ext.lower() if ext.lower() in IMG_EXTS else _ext_for_mime(mime))
        else:
            fname = f'image-{self.n:02d}{_ext_for_mime(mime)}'
        _write_if_changed(os.path.join(self.root, 'articles', 'images', self.eid, fname), data)
        return f'/articles/images/{self.eid}/{fname}'


def _fix_image_refs(body, base_dir, root, images, missing):
    """Make every picture reference an absolute site URL that will exist:
    relative files next to the article -> /reading_room_inbox/...,
    base64 data: URIs -> decoded into /articles/images/<id>/."""

    def resolve(src):
        src = src.strip()
        m = DATA_URI_RE.match(src)
        if m:
            try:
                return images.save(base64.b64decode(re.sub(r'\s+', '', m.group(2))), mime=m.group(1))
            except Exception:
                missing.append('(broken base64 image)')
                return src
        if re.match(r'^(https?:)?//', src) or src.startswith('/'):
            return src
        local = os.path.normpath(os.path.join(base_dir, urllib.parse.unquote(src)))
        if os.path.isfile(local):
            rel = os.path.relpath(local, root).replace(os.sep, '/')
            return '/' + urllib.parse.quote(rel)
        missing.append(src)
        return src

    body = MD_IMG_RE.sub(lambda m: f'![{m.group(1)}]({resolve(m.group(2))})', body)
    body = HTML_IMG_RE.sub(lambda m: f'{m.group(1)}{m.group(2)}{resolve(m.group(3))}{m.group(2)}', body)
    return body


def _split_frontmatter(text):
    text = text.lstrip('\ufeff').strip()
    if text.startswith('---'):
        end = text.find('\n---', 3)
        if end != -1:
            fm = yaml.safe_load(text[3:end]) or {}
            return (fm if isinstance(fm, dict) else {}), text[end + 4:].strip()
    return {}, text


def _sidecar(path):
    for ext in ('.yml', '.yaml'):
        p = os.path.splitext(path)[0] + ext
        if os.path.isfile(p):
            with open(p, encoding='utf-8') as f:
                d = yaml.safe_load(f) or {}
                return d if isinstance(d, dict) else {}
    return {}


def _first_heading(body):
    m = re.search(r'^#{1,2}\s+(.+?)\s*#*$', body, re.M) or re.search(r'<h[12][^>]*>(.*?)</h[12]>', body, re.S | re.I)
    return re.sub(r'<[^>]+>', '', m.group(1)).strip() if m else ''


def _load_md(path):
    with open(path, encoding='utf-8') as f:
        return _split_frontmatter(f.read())


def _load_docx(path, images):
    import mammoth  # listed in requirements.txt

    def convert(image):
        with image.open() as stream:
            data = stream.read()
        return {'src': images.save(data, mime=image.content_type), 'alt': image.alt_text or ''}

    with open(path, 'rb') as f:
        result = mammoth.convert_to_html(f, convert_image=mammoth.images.img_element(convert))
    html = result.value
    # One block per line, blank line between blocks: Markdown keeps them as raw
    # HTML blocks and the Reading Room splits paragraphs on blank lines.
    html = re.sub(r'(</(?:p|h[1-6]|li|ul|ol|table|blockquote)>)', r'\1\n\n', html)
    html = re.sub(r'(<p>\s*)(<img\b[^>]*>)(\s*</p>)',
                  r'<figure>\2</figure>', html)
    return _sidecar(path), html.strip()


def _load_json(path, images):
    with open(path, encoding='utf-8') as f:
        d = json.load(f)
    if not isinstance(d, dict):
        raise ValueError('JSON article must be an object with "title" and "content"')
    body = str(d.pop('content', '') or '')
    imgs = d.pop('images', None) or {}
    for name, b64 in imgs.items():
        m = DATA_URI_RE.match(str(b64))
        raw = m.group(2) if m else str(b64)
        url = images.save(base64.b64decode(re.sub(r'\s+', '', raw)), name=name, mime=m.group(1) if m else None)
        body = body.replace(f']({name})', f']({url})').replace(f'"{name}"', f'"{url}"')
    return d, body


def collect(root, existing_ids):
    """Return {id: (frontmatter, markdown_body)} for every publishable inbox file."""
    inbox = os.path.join(root, INBOX_DIRNAME)
    out = {}
    if not os.path.isdir(inbox):
        return out
    today = datetime.date.today()
    for fn in sorted(os.listdir(inbox)):
        path = os.path.join(inbox, fn)
        stem, ext = os.path.splitext(fn)
        ext = ext.lower()
        if os.path.isdir(path) or fn[0] in '._' or fn.lower() in IGNORE or ext in IMG_EXTS or ext in ('.yml', '.yaml'):
            continue
        if ext == '.pdf':
            _log(f'SKIPPED {fn}: PDF is not supported. Save it as .docx (Word: File > Save As) or .md and push again.')
            continue
        if ext not in ('.md', '.markdown', '.docx', '.json'):
            _log(f'SKIPPED {fn}: unknown type {ext}')
            continue
        try:
            fm0 = {}
            if ext in ('.md', '.markdown'):
                fm0, _ = _load_md(path)
            elif ext == '.docx':
                fm0 = _sidecar(path)
            else:
                with open(path, encoding='utf-8') as f:
                    fm0 = json.load(f)
                fm0 = fm0 if isinstance(fm0, dict) else {}
            eid = slugify(str(fm0.get('id') or stem))
            images = _Images(root, eid)
            if ext in ('.md', '.markdown'):
                fm, body = _load_md(path)
            elif ext == '.docx':
                fm, body = _load_docx(path, images)
            else:
                fm, body = _load_json(path, images)
        except Exception as e:  # never break the whole site build for one file
            _log(f'ERROR reading {fn}: {e}')
            continue
        if fm.get('draft'):
            _log(f'skipped {fn}: draft: true')
            continue
        if eid in existing_ids or eid in out:
            _log(f'SKIPPED {fn}: an article with id "{eid}" already exists. Rename the file (or set id:) to publish it.')
            continue
        missing = []
        body = _fix_image_refs(body, os.path.dirname(path), root, images, missing)
        for m in missing:
            _log(f'WARNING {fn}: picture not found: {m} (commit the image file next to the article)')

        fm['id'] = eid
        fm.setdefault('title', _first_heading(body) or stem.replace('-', ' ').replace('_', ' ').strip().title())
        fm.setdefault('source', 'reading-room')
        fm.setdefault('type', 'Article')
        pub = fm.get('published') or today.isoformat()
        fm['published'] = str(pub)
        if not isinstance(fm.get('date'), dict):
            try:
                d = datetime.date.fromisoformat(str(pub)[:10])
            except ValueError:
                d = today
            fm['date'] = {'year': d.year, 'month': d.month, 'day': d.day}
        loc = fm.get('location')
        if not (isinstance(loc, dict) and 'lat' in loc and 'lon' in loc):
            # No coordinates: publish the page and Reading Room entry, but
            # don't drop a dot at 0,0 on the Atlas globe.
            fm['location'] = {'name': (loc or {}).get('name', '') if isinstance(loc, dict) else str(loc or '')}
            fm.setdefault('atlas', False)
        if not fm.get('excerpt'):
            text = re.sub(r'<[^>]+>|!\[[^\]]*\]\([^)]*\)|[#*_>`]', ' ', body)
            text = re.sub(r'\s+', ' ', text).strip()
            fm['excerpt'] = (text[:220].rsplit(' ', 1)[0] + '…') if len(text) > 220 else text
        out[eid] = (fm, body)
        _log(f'published {fn} -> articles/{eid}.html ({images.n} extracted picture(s), {len(missing)} missing)')
    return out
