#!/bin/sh
# Start the harness. This script does not install or upgrade packages.
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is not available."
  echo "Install it yourself if you want (for example: pkg install python)."
  echo "This script will not install packages."
  exit 1
fi
cd "$(dirname "$0")"
exec python3 serve.py "$@"
