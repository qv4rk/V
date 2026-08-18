#!/usr/bin/env python3
"""
build.py
Reads all nodes/*.md files and generates:
  - data/events.json          slim metadata (all fields + content for dossier)
  - articles/{id}.html        standalone article pages with TTS / RSVP reader
  - sitemap.xml               for SEO

Run locally or via GitHub Action.
Requires: pip install PyYAML Markdown
"""

import os
import json
import re
import datetime

import yaml
import markdown as md_lib

# ── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
NODES_DIR    = os.path.join(SCRIPT_DIR, 'nodes')
TAGS_DIR     = os.path.join(NODES_DIR, 'tags')
DATA_DIR     = os.path.join(SCRIPT_DIR, 'data')
ARTICLES_DIR = os.path.join(SCRIPT_DIR, 'articles')
SITE_URL     = 'https://feisttech.com'
TAG_KEYWORDS_PATH = os.path.join(SCRIPT_DIR, 'tag-keywords.json')

MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN',
               'JUL','AUG','SEP','OCT','NOV','DEC']

# ── Multi-language node support ──────────────────────────────────────────────
# A node's frontmatter may set `lang: ar` / `lang: he` (default: en) and
# `translationOf: n01` to mark it as a translation of another node. The
# canonical (translationOf-less) node is the only one plotted on the Atlas
# globe/search; translations still get their own article page + sitemap
# entry, and a language-switcher linking all siblings together.
LANG_LABELS = {'en': 'English', 'ar': 'العربية', 'he': 'עברית', 'zh': '中文'}
RTL_LANGS   = {'ar', 'he'}
LANG_FONT_LINKS = {
    'en': '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">',
    'ar': '<link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">',
    'he': '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">',
    'zh': '<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">',
}
LANG_BODY_FONTS = {
    'en': "'Cormorant Garamond', serif",
    'ar': "'Noto Naskh Arabic', serif",
    'he': "'Noto Sans Hebrew', serif",
    'zh': "'Noto Serif SC', serif",
}

# ── Helpers ──────────────────────────────────────────────────────────────────

def parse_node_file(path):
    """Return (frontmatter dict, body markdown string) for a .md file."""
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    text = text.strip()
    if not text.startswith('---'):
        return {}, text
    end = text.find('\n---', 3)
    if end == -1:
        return {}, text
    fm_text = text[3:end].strip()
    body    = text[end + 4:].strip()
    fm = yaml.safe_load(fm_text) or {}
    return fm, body


def fmt_date_label(date):
    year  = date.get('year', 0)
    month = date.get('month', 1)
    day   = date.get('day', 1)
    era   = ' BCE' if year < 1 else (' CE' if year < 1000 else '')
    mon_s = MONTH_NAMES[max(0, min(11, (month or 1) - 1))]
    return f"{(day or 1):02d} {mon_s} {abs(year)}{era}"


def md_to_html_segments(text):
    """
    Convert markdown body to HTML. Returns a single HTML string where
    each top-level paragraph is a <p> — the TTS engine reads paragraph by paragraph.
    """
    extensions = ['extra', 'nl2br']
    return md_lib.markdown(text or '', extensions=extensions)


def escape_html_attr(s):
    return (str(s or '')
            .replace('&', '&amp;')
            .replace('"', '&quot;')
            .replace('<', '&lt;')
            .replace('>', '&gt;'))


def load_tag_keywords():
    if not os.path.isfile(TAG_KEYWORDS_PATH):
        return {}
    with open(TAG_KEYWORDS_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def resolve_tags(eid, fm, body, tag_keywords):
    """
    Manual tags in the node's frontmatter always win. If none are given,
    look for a companion file at nodes/tags/{id}.json (never touches the
    original node .md file). If that doesn't exist yet either, scan the
    body against tag-keywords.json and write the result to that companion
    file so it stays stable across rebuilds until the file is deleted.
    """
    manual_tags = fm.get('tags') or []
    if manual_tags:
        return manual_tags

    tag_path = os.path.join(TAGS_DIR, f'{eid}.json')
    if os.path.isfile(tag_path):
        with open(tag_path, 'r', encoding='utf-8') as f:
            return (json.load(f) or {}).get('tags', [])

    lower_body = (body or '').lower()
    matched = [tag for tag, keywords in tag_keywords.items()
               if any(kw in lower_body for kw in keywords)]

    os.makedirs(TAGS_DIR, exist_ok=True)
    with open(tag_path, 'w', encoding='utf-8') as f:
        json.dump({'tags': matched, 'auto_generated': True}, f, ensure_ascii=False, indent=2)
    print(f'    Auto-tagged {eid}: {matched}')
    return matched

# ── Article HTML template ────────────────────────────────────────────────────
# Uses __TOKEN__ placeholders (avoids collisions with CSS/JS curly braces).

ARTICLE_TMPL = r"""<!DOCTYPE html>
<html lang="__LANG__" dir="__DIR__">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__TITLE__ · The Atlas</title>
<meta name="description" content="__EXCERPT_ATTR__">
<meta name="robots" content="index, follow">
<meta property="og:title" content="__TITLE_ATTR__">
<meta property="og:description" content="__EXCERPT_ATTR__">
<meta property="og:type" content="article">
<meta property="og:url" content="__CANONICAL__">
<meta property="article:published_time" content="__PUBDATE__">
<link rel="canonical" href="__CANONICAL__">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
__FONT_LINK__
<style>
:root {
  --bg: #050810;
  --bg2: #0a0c14;
  --primary: #00e5ff;
  --gold: #c9a84c;
  --gold-dim: rgba(201,168,76,.3);
  --ink: #ddd5c0;
  --ink-dim: #8a7e6a;
  --ink-mute: #3a3228;
  --border: rgba(0,229,255,.12);
  --panel: rgba(5,8,16,.96);
  --reading-bg: rgba(0,229,255,.07);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: __BODY_FONT__;
  font-size: 18px;
  line-height: 1.8;
  min-height: 100vh;
}

/* ── Nav ── */
.site-nav {
  position: sticky; top: 0; z-index: 50;
  background: rgba(5,8,16,.97);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 10px 18px;
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.nav-btn {
  font-family: 'Space Mono', monospace;
  font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
  color: var(--ink-dim); text-decoration: none;
  background: transparent; border: 1px solid var(--gold-dim);
  padding: 6px 12px; border-radius: 2px; cursor: pointer;
  transition: color .2s, border-color .2s;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.nav-btn:hover { color: var(--gold); border-color: var(--gold); }
.nav-btn.atlas { border-color: rgba(0,229,255,.25); color: rgba(0,229,255,.7); }
.nav-btn.atlas:hover { border-color: var(--primary); color: var(--primary); }
.nav-spacer { flex: 1; min-width: 8px; }

/* ── Language switcher ── */
.lang-switch {
  max-width: 720px; margin: 0 auto; padding: 10px 1.5rem 0;
  font-family: 'Space Mono', monospace;
  font-size: 9px; letter-spacing: 1px; text-transform: uppercase;
  color: var(--ink-mute);
}
.lang-switch a.lang-link { color: var(--gold); text-decoration: none; }
.lang-switch a.lang-link:hover { text-decoration: underline; }
.lang-switch .lang-current { color: var(--ink); }

/* ── Article ── */
article {
  max-width: 720px; margin: 0 auto;
  padding: 3rem 1.5rem 120px;
}
.article-meta {
  font-family: 'Space Mono', monospace;
  font-size: 8px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--ink-dim); margin-bottom: 1rem;
}
.article-tag {
  display: inline-block;
  background: rgba(201,168,76,.08);
  border: 1px solid var(--gold-dim);
  color: var(--gold); padding: 2px 8px; border-radius: 2px;
  font-size: 8px; letter-spacing: 2px; text-transform: uppercase;
  font-family: 'Space Mono', monospace;
  margin: 0 4px 4px 0;
}
.article-title {
  font-family: __BODY_FONT__;
  font-size: clamp(1.7rem, 5vw, 2.5rem);
  font-weight: 600; line-height: 1.25;
  color: var(--ink); margin: 1rem 0 1.5rem;
}
.article-excerpt {
  font-size: 1.1rem; line-height: 1.65;
  color: var(--ink-dim); font-style: italic;
  border-left: 3px solid rgba(201,168,76,.4);
  padding: 0.5rem 1rem; margin-bottom: 2.5rem;
}
/* Content paragraphs — clickable for TTS */
#article-content p {
  margin-bottom: 1.4em;
  padding: 0.35rem 0.6rem;
  border-radius: 3px;
  cursor: pointer;
  transition: background .15s;
  border-left: 3px solid transparent;
}
#article-content p:hover { background: rgba(255,255,255,.025); }
#article-content p.reading {
  background: var(--reading-bg);
  border-left-color: var(--primary);
}
#article-content h1, #article-content h2, #article-content h3 {
  font-family: __BODY_FONT__;
  margin: 2.5rem 0 0.75rem; font-weight: 600; line-height: 1.3;
}
#article-content h1 { font-size: 1.9rem; }
#article-content h2 { font-size: 1.5rem; color: var(--gold); }
#article-content h3 { font-size: 1.2rem; color: var(--ink-dim); }
#article-content strong { color: var(--ink); }
#article-content em { font-style: italic; color: var(--ink-dim); }
#article-content code { font-family: 'Space Mono', monospace; font-size: .82em; background: rgba(255,255,255,.05); padding: 1px 5px; border-radius: 2px; }

/* ── Works Cited (outside main, never TTS-read) ── */
#works-cited {
  max-width: 720px; margin: 0 auto 6rem;
  padding: 2rem 1.5rem;
  border-top: 1px solid rgba(255,255,255,.06);
}
#works-cited h2 {
  font-family: 'Space Mono', monospace;
  font-size: 8px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--ink-mute); margin-bottom: 1.25rem;
}
#works-cited ol { padding-left: 1.5rem; }
#works-cited li { font-size: .82rem; color: var(--ink-dim); line-height: 1.7; margin-bottom: .75rem; }

/* ── TTS Bar ── */
#tts-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
  background: rgba(5,8,16,.98);
  border-top: 1px solid var(--border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 10px 14px;
  display: flex; align-items: center; gap: 6px; flex-wrap: nowrap;
  padding-bottom: max(10px, env(safe-area-inset-bottom, 0px));
}
.tts-btn {
  background: transparent;
  border: 1px solid var(--gold-dim);
  color: var(--ink-dim);
  width: 36px; height: 36px;
  border-radius: 2px; cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: color .2s, border-color .2s, background .2s;
}
.tts-btn:hover { color: var(--gold); border-color: var(--gold); }
.tts-btn.active { background: rgba(201,168,76,.12); color: var(--gold); border-color: var(--gold); }
#tts-progress {
  flex: 1; font-family: 'Space Mono', monospace;
  font-size: 8px; letter-spacing: 1px; color: var(--ink-dim);
  text-align: center; min-width: 50px;
}
#tts-voice, #tts-speed {
  background: var(--bg2); color: var(--ink-dim);
  border: 1px solid var(--gold-dim); border-radius: 2px;
  font-family: 'Space Mono', monospace; font-size: 8px;
  letter-spacing: 1px; padding: 4px 6px; cursor: pointer;
}
#tts-voice { max-width: 130px; flex: 1 1 80px; }
#tts-speed { width: 68px; flex-shrink: 0; }

/* ── RSVP Overlay ── */
#rsvp-overlay {
  display: none;
  position: fixed; inset: 0; z-index: 200;
  background: rgba(2,4,10,.98);
  flex-direction: column; align-items: center; justify-content: center;
  gap: 1.5rem; padding: 2rem;
}
#rsvp-word {
  font-family: __BODY_FONT__;
  font-size: clamp(2.5rem, 10vw, 5rem);
  color: var(--ink); text-align: center; min-height: 1.3em;
  letter-spacing: -.01em;
}
#rsvp-wpm-display {
  font-family: 'Space Mono', monospace;
  font-size: 9px; letter-spacing: 3px; color: var(--ink-dim);
}
.rsvp-btns { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

/* Mobile */
@media (max-width: 600px) {
  .site-nav { padding: 8px 12px; }
  article { padding: 2rem 1rem 110px; }
  #tts-bar { flex-wrap: wrap; }
  #tts-voice { display: none; }
}
</style>
</head>
<body>

<nav class="site-nav">
  <a href="../index.html" class="nav-btn">← Home</a>
  <a href="../Manifold%20Atlas.html#node-__ID__" class="nav-btn atlas">◆ View on Atlas</a>
  <span class="nav-spacer"></span>
  <button class="nav-btn" onclick="launchRSVP()">⚡ RSVP</button>
</nav>
__LANG_SWITCHER__
<article>
  <div class="article-meta">__TYPE_LABEL__ · __DATE_LABEL__ · __LOCATION__</div>
  __TAGS_HTML__
  <h1 class="article-title">__TITLE__</h1>
  <blockquote class="article-excerpt">__EXCERPT__</blockquote>
  <div id="article-content">
__CONTENT_HTML__
  </div>
</article>

<!-- Works Cited — outside <article>, skipped by TTS engine -->
<section id="works-cited">
__WORKS_CITED__
</section>

<!-- RSVP Overlay -->
<div id="rsvp-overlay">
  <div id="rsvp-word">—</div>
  <div id="rsvp-wpm-display">300 WPM</div>
  <div class="rsvp-btns">
    <button class="nav-btn" onclick="rsvpAdjust(-50)">− Slower</button>
    <button class="nav-btn" id="rsvp-toggle" onclick="rsvpToggle()">⏸ Pause</button>
    <button class="nav-btn" onclick="stopRSVP()">✕ Close</button>
    <button class="nav-btn" onclick="rsvpAdjust(50)">+ Faster</button>
  </div>
</div>

<!-- TTS Control Bar -->
<div id="tts-bar">
  <button class="tts-btn" onclick="ttsStep(-1)" title="Previous">◀</button>
  <button class="tts-btn" id="tts-play" onclick="ttsToggle()" title="Play">▶</button>
  <button class="tts-btn" onclick="ttsStep(1)" title="Next">▶▶</button>
  <button class="tts-btn" onclick="ttsStop()" title="Stop">■</button>
  <div id="tts-progress">— / —</div>
  <select id="tts-voice" onchange="voiceChange()"></select>
  <select id="tts-speed" onchange="speedChange()">
    <option value="0.7">0.7×</option>
    <option value="0.85">0.85×</option>
    <option value="1.0" selected>1.0×</option>
    <option value="1.2">1.2×</option>
    <option value="1.5">1.5×</option>
    <option value="1.8">1.8×</option>
  </select>
</div>

<script>
// ── TTS (Web Speech API — no CDN) ────────────────────────────────────────────
const segs = Array.from(document.querySelectorAll('#article-content p'));
let cur = -1, playing = false, rate = 1.0, voice = null;
const synth = window.speechSynthesis;

segs.forEach((p, i) => p.addEventListener('click', () => { ttsStop(); _speakFrom(i); }));

function _loadVoices() {
  if (!synth) return;
  const vs = synth.getVoices().filter(v => v.lang && v.lang.startsWith('en'));
  const sel = document.getElementById('tts-voice');
  sel.innerHTML = '';
  vs.forEach((v, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = v.name.slice(0, 22);
    if (v.default) { o.selected = true; voice = v; }
    sel.appendChild(o);
  });
  if (!voice && vs.length) voice = vs[0];
}
if (synth) { synth.onvoiceschanged = _loadVoices; _loadVoices(); }

function voiceChange() {
  const vs = synth.getVoices().filter(v => v.lang && v.lang.startsWith('en'));
  voice = vs[+document.getElementById('tts-voice').value] || null;
}
function speedChange() { rate = +document.getElementById('tts-speed').value; }

function _speakFrom(idx) {
  if (!synth || idx < 0 || idx >= segs.length) return;
  synth.cancel();
  cur = idx; playing = true;
  _say(idx);
}

function _say(idx) {
  if (!synth || !playing || idx < 0 || idx >= segs.length) return;
  cur = idx;
  _highlight(idx);
  const u = new SpeechSynthesisUtterance(segs[idx].innerText);
  u.rate = rate;
  if (voice) u.voice = voice;
  u.onend = () => { if (playing && idx + 1 < segs.length) _say(idx + 1); else { playing = false; _ui(); } };
  u.onerror = () => { playing = false; _ui(); };
  synth.speak(u);
  _ui();
}

function ttsToggle() {
  if (!synth) return;
  if (playing) { synth.pause(); playing = false; }
  else if (synth.paused) { synth.resume(); playing = true; }
  else _speakFrom(cur < 0 ? 0 : cur);
  _ui();
}

function ttsStep(dir) {
  const next = Math.max(0, Math.min(segs.length - 1, (cur < 0 ? 0 : cur) + dir));
  ttsStop(); _speakFrom(next);
}

function ttsStop() {
  if (synth) synth.cancel();
  playing = false; cur = -1;
  segs.forEach(s => s.classList.remove('reading'));
  _ui();
}

function _highlight(idx) {
  segs.forEach((s, i) => s.classList.toggle('reading', i === idx));
  if (segs[idx]) segs[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function _ui() {
  document.getElementById('tts-play').textContent = (playing && !synth.paused) ? '⏸' : '▶';
  document.getElementById('tts-play').classList.toggle('active', playing);
  document.getElementById('tts-progress').textContent =
    (cur < 0 ? '—' : cur + 1) + ' / ' + segs.length;
}

// ── RSVP ─────────────────────────────────────────────────────────────────────
let rWords = [], rIdx = 0, rTimer = null, rRunning = false, rWpm = 300;

function launchRSVP() {
  ttsStop();
  rWords = segs.map(p => p.innerText).join(' ').split(/\s+/).filter(Boolean);
  rIdx = 0; rRunning = true;
  document.getElementById('rsvp-overlay').style.display = 'flex';
  document.getElementById('rsvp-toggle').textContent = '⏸ Pause';
  _rTick();
}

function _rTick() {
  if (!rRunning) return;
  if (rIdx >= rWords.length) { stopRSVP(); return; }
  document.getElementById('rsvp-word').textContent = rWords[rIdx++];
  rTimer = setTimeout(_rTick, 60000 / rWpm);
}

function rsvpToggle() {
  rRunning = !rRunning;
  document.getElementById('rsvp-toggle').textContent = rRunning ? '⏸ Pause' : '▶ Resume';
  if (rRunning) _rTick();
}

function stopRSVP() {
  rRunning = false; clearTimeout(rTimer);
  document.getElementById('rsvp-overlay').style.display = 'none';
}

function rsvpAdjust(delta) {
  rWpm = Math.max(60, Math.min(1200, rWpm + delta));
  document.getElementById('rsvp-wpm-display').textContent = rWpm + ' WPM';
}

// Init
_ui();
</script>
</body>
</html>
"""


# ── Works-cited renderer ─────────────────────────────────────────────────────

def render_lang_switcher(eid, family):
    """family: list of (sibling_eid, lang) tuples sharing one canonical id."""
    if len(family) < 2:
        return ''
    links = []
    for sib_id, sib_lang in sorted(family, key=lambda x: x[1] != 'en'):
        label = LANG_LABELS.get(sib_lang, sib_lang.upper())
        if sib_id == eid:
            links.append(f'<span class="lang-current">{label}</span>')
        else:
            links.append(f'<a href="{sib_id}.html" class="lang-link">{label}</a>')
    return '<div class="lang-switch">Read in: ' + ' · '.join(links) + '</div>'


def render_works_cited(references):
    if not references:
        return ''
    items = ''.join(f'<li>{escape_html_attr(r)}</li>' for r in references)
    return f'<h2>Works Cited</h2><ol>{items}</ol>'


def escape_html_attr(s):
    return (str(s or '')
            .replace('&', '&amp;')
            .replace('"', '&quot;')
            .replace('<', '&lt;')
            .replace('>', '&gt;'))


# ── Core builder ─────────────────────────────────────────────────────────────

def build():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(ARTICLES_DIR, exist_ok=True)

    if not os.path.isdir(NODES_DIR):
        print(f'No nodes/ directory found at {NODES_DIR}')
        print('Run split_to_nodes.py first to create node files.')
        return

    md_files = sorted(f for f in os.listdir(NODES_DIR) if f.endswith('.md'))
    if not md_files:
        print('No .md files in nodes/ — nothing to build.')
        return

    all_events = []
    sitemap_urls = []
    tag_keywords = load_tag_keywords()

    # ── First pass: parse every node and group translations by canonical id ──
    # so each generated page can link to its siblings, regardless of which
    # order the files happen to be processed in.
    parsed = {}
    for fname in md_files:
        path = os.path.join(NODES_DIR, fname)
        fm, body = parse_node_file(path)
        if not fm:
            print(f'  SKIP (no frontmatter): {fname}')
            continue
        eid = fm.get('id') or fname[:-3]
        parsed[eid] = (fm, body)

    families = {}  # canonical_id -> [(eid, lang), ...]
    for eid, (fm, _body) in parsed.items():
        canonical_id = fm.get('translationOf') or eid
        lang = fm.get('lang', 'en')
        families.setdefault(canonical_id, []).append((eid, lang))

    for eid, (fm, body) in parsed.items():
        print(f'  Building: {eid}')
        resolved_tags = resolve_tags(eid, fm, body, tag_keywords)
        lang = fm.get('lang', 'en')
        direction = 'rtl' if lang in RTL_LANGS else 'ltr'
        canonical_id = fm.get('translationOf') or eid
        lang_switcher_html = render_lang_switcher(eid, families.get(canonical_id, []))

        # ── Event record for events.json ─────────────────────────────────────
        # Translations don't get their own dot on the Atlas globe/search —
        # only the canonical (translationOf-less) node does. They still get
        # a full article page, sitemap entry, and a switcher linking back.
        date     = fm.get('date') or {}
        location = fm.get('location') or {}
        if not fm.get('translationOf'):
            event = {
                'id':         eid,
                'title':      fm.get('title', ''),
                'source':     fm.get('source', 'manifold'),
                'date':       {
                    'year':  date.get('year', 0),
                    'month': date.get('month', 1),
                    'day':   date.get('day', 1),
                },
                'location': {
                    'lat':  location.get('lat', 0),
                    'lon':  location.get('lon', 0),
                    'name': location.get('name', ''),
                },
                'type':        fm.get('type', ''),
                'nodeColor':   fm.get('nodeColor', '#a67041'),
                'nodeSize':    fm.get('nodeSize', 0.5),
                'tags':        resolved_tags,
                'connections': fm.get('connections') or [],
                'excerpt':     fm.get('excerpt', ''),
                'content':     body,
                'article_url': f'articles/{eid}.html',
            }
            # Optional manifold-only fields
            for k in ('empire', 'mechanism'):
                if k in fm:
                    event[k] = fm[k]

            all_events.append(event)

        # ── Generate article HTML ────────────────────────────────────────────
        content_html = md_to_html_segments(body)
        tags_html    = ''.join(
            f'<span class="article-tag">{escape_html_attr(t)}</span>'
            for t in resolved_tags[:10]
        )
        works_cited  = render_works_cited(fm.get('references') or [])
        date_label   = fmt_date_label(date)
        canonical    = f'{SITE_URL}/articles/{eid}.html'
        year  = date.get('year', 0)
        month = date.get('month', 1)
        day   = date.get('day', 1)
        pub_date = f"{abs(year):04d}-{month:02d}-{day:02d}"

        html = ARTICLE_TMPL
        html = html.replace('__TITLE_ATTR__', escape_html_attr(fm.get('title', '')))
        html = html.replace('__TITLE__',      fm.get('title', ''))
        html = html.replace('__EXCERPT_ATTR__', escape_html_attr(fm.get('excerpt', '')))
        html = html.replace('__EXCERPT__',    fm.get('excerpt', ''))
        html = html.replace('__ID__',         eid)
        html = html.replace('__TYPE_LABEL__', (fm.get('type') or '').upper())
        html = html.replace('__DATE_LABEL__', date_label)
        html = html.replace('__LOCATION__',   location.get('name', ''))
        html = html.replace('__TAGS_HTML__',  tags_html)
        html = html.replace('__CONTENT_HTML__', content_html)
        html = html.replace('__WORKS_CITED__',  works_cited)
        html = html.replace('__CANONICAL__',    canonical)
        html = html.replace('__PUBDATE__',      pub_date)
        html = html.replace('__LANG__',         lang)
        html = html.replace('__DIR__',          direction)
        html = html.replace('__FONT_LINK__',    LANG_FONT_LINKS.get(lang, LANG_FONT_LINKS['en']))
        html = html.replace('__BODY_FONT__',    LANG_BODY_FONTS.get(lang, LANG_BODY_FONTS['en']))
        html = html.replace('__LANG_SWITCHER__', lang_switcher_html)

        art_path = os.path.join(ARTICLES_DIR, f'{eid}.html')
        with open(art_path, 'w', encoding='utf-8') as f:
            f.write(html)

        sitemap_urls.append(canonical)

    # ── Write data/events.json ───────────────────────────────────────────────
    events_path = os.path.join(DATA_DIR, 'events.json')
    with open(events_path, 'w', encoding='utf-8') as f:
        json.dump(all_events, f, ensure_ascii=False, indent=2)
    print(f'\nWrote {len(all_events)} events to {events_path}')

    # ── Write sitemap.xml ────────────────────────────────────────────────────
    today = datetime.date.today().isoformat()
    # Always include the main app pages
    static_urls = [
        SITE_URL + '/',
        SITE_URL + '/Manifold%20Atlas.html',
    ]
    all_urls = static_urls + sitemap_urls
    sitemap_lines = ['<?xml version="1.0" encoding="UTF-8"?>',
                     '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url in all_urls:
        sitemap_lines += [
            '  <url>',
            f'    <loc>{url}</loc>',
            f'    <lastmod>{today}</lastmod>',
            '    <changefreq>weekly</changefreq>',
            '  </url>',
        ]
    sitemap_lines.append('</urlset>')
    sitemap_path = os.path.join(SCRIPT_DIR, 'sitemap.xml')
    with open(sitemap_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sitemap_lines))
    print(f'Wrote sitemap.xml ({len(all_urls)} URLs)')

    print(f'\nBuild complete: {len(all_events)} nodes → articles/ + data/events.json + sitemap.xml')


if __name__ == '__main__':
    build()
