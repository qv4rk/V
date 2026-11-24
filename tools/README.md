# tools/

This folder holds site helper scripts and the public copies of Termux APK build files and Chrome extensions listed at `/tools/`.

## Layout

- `index.html` — the public tools page
- `feisttech.sh` — Termux/bash helpers for this repository
- `android-on-device-build/` — on-phone APK build pipeline (no keystore)
- `downloads/` — zip files linked from the tools page
- other existing scripts (`publish_article.py`, and so on) stay here

## Adding a script or extension

1. Put secret-free files in `tools/` or a zip in `tools/downloads/`.
2. Never commit a keystore, a password, or an API key.
3. Add a short entry to `index.html` with the name, what it does, how to run it, and a download link.
4. If the item should appear in the site menu and search, add it to the Tools list in `site.js`.

Source of the APK pipeline and the batch image extension: `qv4rk/ftechbuilds`.
