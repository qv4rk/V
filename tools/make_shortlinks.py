#!/usr/bin/env python3
"""Generate feisttech.com/<name> short links as tiny redirect pages.

GitHub Pages has no server-side rewrites, so each short name is a folder
holding an index.html that forwards to the real app, carrying along any
?query and #hash (so /reader/?article=n01 still opens that article).

Edit SHORTLINKS and re-run:  python3 tools/make_shortlinks.py
Folders that hold a real page (not one of these stubs) are never touched.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = '<!-- feisttech-shortlink -->'

SHORTLINKS = {
    'reader':     '/apps/webapps/tts/reader/',
    'readingroom': '/apps/webapps/tts/reader/',
    'gaza':       '/gaza-damage/',
    'gaspi':      '/gaspi5/',
    'sky':        '/Manifold%20Atlas.html',
    'natal':      '/apps/webapps/natal-chart/',
    'eigenstate': '/apps/webapps/eigenstate-roll/',
    'trends':     '/apps/webapps/signature-trends/',
    'solsys':     '/apps/webapps/solsys.html',
    'omniscope':  '/apps/webapps/kalidascope/omniscope.html',
    'axial':      '/apps/webapps/kalidascope/axial.html',
    'keyforge':   '/apps/webapps/keyforge-sand-plate/',
    'veil':       '/apps/webapps/veil-of-babel/',
}

TEMPLATE = """<!DOCTYPE html>
{marker}
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url={target}">
<link rel="canonical" href="https://feisttech.com{target}">
<title>FeistTech</title>
<script>location.replace('{target}' + location.search + location.hash);</script>
</head>
<body style="background:#0b0c10;color:#8d9099;font:14px system-ui;padding:24px">
<a href="{target}" style="color:#c9a84c">Continue</a>
</body>
</html>
"""


def main():
    for name, target in SHORTLINKS.items():
        page = ROOT / name / 'index.html'
        if page.exists() and MARKER not in page.read_text(encoding='utf-8', errors='ignore'):
            print(f'skip /{name}/ (holds a real page)')
            continue
        page.parent.mkdir(exist_ok=True)
        page.write_text(TEMPLATE.format(marker=MARKER, target=target), encoding='utf-8')
        print(f'/{name}/ -> {target}')


if __name__ == '__main__':
    main()
