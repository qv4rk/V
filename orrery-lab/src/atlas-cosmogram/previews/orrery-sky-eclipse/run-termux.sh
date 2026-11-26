#!/usr/bin/env bash
set -eu
atlas_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if ! command -v python3 >/dev/null 2>&1; then
  if command -v pkg >/dev/null 2>&1; then pkg install -y python; else
    echo "Install Python 3, then run this script again." >&2
    exit 1
  fi
fi
exec python3 "$atlas_root/serve.py" "$@"
