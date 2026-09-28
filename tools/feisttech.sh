# FeistTech toolchain for Termux / bash.
#
# Install once — add this line to ~/.bashrc, then open a new session:
#   source ~/v_project_fresh/tools/feisttech.sh
#
# Commands (run `ft` for this list):
#   ft-new "Title" [id]  start a new article in nodes/ and open it in your editor
#   ft-edit <id>         open an existing article
#   ft-list              every article: id, year, title
#   ft-build             rebuild the site locally (article pages, map data, Reading Room)
#   ft-serve [dir]       run the site at http://localhost:8000
#   ft-preview <id>      build, serve, and open that article, its map and its reader
#   ft-publish ["msg"]   pull, build, commit and push your article changes to main
#   ft-status            what's changed and not yet published
#   ft-check [branch]    download a branch into a separate folder to preview it
#   ft-check-rm          delete that preview folder
#
# Settings (override in ~/.bashrc before the source line if your paths differ):
FT_HOME="${FT_HOME:-$HOME/v_project_fresh}"
FT_CHECK="${FT_CHECK:-$HOME/v_project_claudechk}"
FT_REPO="${FT_REPO:-https://github.com/qv4rk/V.git}"
FT_PORT="${FT_PORT:-8000}"

ft() { sed -n '6,16p' "$FT_HOME/tools/feisttech.sh" 2>/dev/null || echo "FT_HOME=$FT_HOME not found"; }

_ft_cd() { cd "${1:-$FT_HOME}" 2>/dev/null || { echo "✗ No repo at ${1:-$FT_HOME}"; return 1; }; }
_ft_open() { command -v termux-open-url >/dev/null && termux-open-url "$1" || echo "  $1"; }

_ft_deps() {
  python -c 'import yaml, markdown' 2>/dev/null && return 0
  echo "• Installing build dependencies (PyYAML, Markdown)…"
  pip install -q -r requirements.txt
}

_ft_slug() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g' | cut -c1-48
}

ft-new() {
  [ -z "$1" ] && { echo 'Usage: ft-new "Article title" [id]'; return 1; }
  _ft_cd || return 1
  local id="${2:-$(_ft_slug "$1")}" file="nodes/${2:-$(_ft_slug "$1")}.md"
  [ -e "$file" ] && { echo "✗ $file already exists — use ft-edit $id"; return 1; }
  cat > "$file" <<EOF
---
id: $id
title: "$1"
published: $(date +%F)
date:
  year: 1900
  month: 1
  day: 1
location:
  lat: 0.0
  lon: 0.0
  name: "Place, Region"
type: "What kind of event this is"
nodeColor: "#a67041"
nodeSize: 0.6
tags:
  - example-tag
connections: []
# voice: en-IE-EmilyNeural   # optional; otherwise picked from the location
excerpt: "One or two sentences that appear on the map and in the library."
references:
  - title: "Author. Title. Publisher."
    url: "https://example.com"
---

First paragraph.

Second paragraph. Leave a blank line between paragraphs.
EOF
  echo "✓ Created $file"
  ${EDITOR:-nano} "$file"
}

ft-edit() {
  _ft_cd || return 1
  [ -f "nodes/$1.md" ] || { echo "✗ nodes/$1.md not found (try ft-list)"; return 1; }
  ${EDITOR:-nano} "nodes/$1.md"
}

ft-list() {
  _ft_cd || return 1
  for f in nodes/*.md; do
    awk -v id="$(basename "$f" .md)" '
      /^title:/ { sub(/^title: *"?/, ""); sub(/"$/, ""); t = $0 }
      /^  year:/ && !y { y = $2 }
      /^---$/ && ++n == 2 { exit }
      END { printf "%-12s %6s  %s\n", id, y, t }' "$f"
  done | sort -k2 -n
}

ft-build() {
  _ft_cd "${1:-}" || return 1
  _ft_deps || return 1
  python build.py | tail -3
}

ft-serve() {
  _ft_cd "${1:-}" || return 1
  echo "• Serving $(pwd) at http://localhost:$FT_PORT  (Ctrl+C to stop)"
  python -m http.server "$FT_PORT"
}

ft-preview() {
  _ft_cd || return 1
  ft-build || return 1
  local base="http://localhost:$FT_PORT"
  if [ -n "$1" ]; then
    echo "• Article:      $base/articles/$1.html"
    echo "• Reading Room: $base/reader/?article=$1"
    echo "• Globe & sky:  $base/sky/#node-$1"
    (sleep 1; _ft_open "$base/articles/$1.html") &
  else
    (sleep 1; _ft_open "$base/") &
  fi
  ft-serve
}

ft-status() {
  _ft_cd || return 1
  echo "• Branch: $(git branch --show-current)"
  git status --short nodes/ data/ articles/ | head -40
  git fetch -q origin 2>/dev/null
  local behind; behind=$(git rev-list --count HEAD..origin/main 2>/dev/null)
  [ "${behind:-0}" -gt 0 ] && echo "• main on GitHub has $behind newer commit(s) — ft-publish pulls them first"
}

ft-publish() {
  _ft_cd || return 1
  [ "$(git branch --show-current)" = "main" ] || { echo "✗ $FT_HOME is on $(git branch --show-current), not main"; return 1; }
  git diff --quiet nodes/ && git diff --cached --quiet nodes/ && [ -z "$(git ls-files --others --exclude-standard nodes/)" ] \
    && { echo "• No article changes in nodes/ to publish."; return 0; }
  echo "• Pulling the latest main…"
  git stash push -q -u -m ft-publish -- nodes/ || return 1
  git pull -q --rebase origin main || { git stash pop -q; echo "✗ Pull failed"; return 1; }
  git stash pop -q || { echo "✗ Your edits clash with changes on GitHub — resolve them in nodes/, then rerun"; return 1; }
  echo "• Building to check every article parses…"
  ft-build || { echo "✗ Build failed — fix the article above, nothing was pushed"; return 1; }
  git add nodes/ articles/ data/events.json data/reading-room/ sitemap.xml 2>/dev/null
  local msg="${1:-Update articles: $(git diff --cached --name-only nodes/ | xargs -n1 basename 2>/dev/null | sed 's/\.md$//' | paste -sd, -)}"
  git commit -q -m "$msg" && echo "✓ Committed: $msg"
  git push -q origin main && echo "✓ Pushed. The site updates in a minute or two."
}

ft-check() {
  local branch="${1:-ccr-1566d58b-s4gcpi}"
  if [ -d "$FT_CHECK/.git" ]; then
    echo "• Updating $FT_CHECK to $branch…"
    _ft_cd "$FT_CHECK" || return 1
    git fetch -q --depth 1 origin "$branch" && git checkout -q -B "$branch" FETCH_HEAD || return 1
  else
    echo "• Downloading $branch into $FT_CHECK (about 350 MB)…"
    git clone -q --depth 1 --single-branch --branch "$branch" "$FT_REPO" "$FT_CHECK" || return 1
    _ft_cd "$FT_CHECK" || return 1
  fi
  (sleep 1; _ft_open "http://localhost:$FT_PORT/") &
  ft-serve "$FT_CHECK"
}

ft-check-rm() {
  [ -d "$FT_CHECK" ] || { echo "• Nothing to remove"; return 0; }
  case "$FT_CHECK" in "$FT_HOME"|"$HOME"|"") echo "✗ Refusing to delete $FT_CHECK"; return 1;; esac
  rm -rf "$FT_CHECK" && echo "✓ Removed $FT_CHECK"
}
