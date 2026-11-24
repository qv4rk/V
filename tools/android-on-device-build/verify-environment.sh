#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
JAR="$ANDROID_HOME/platforms/android-35/android.jar"
D8="$ANDROID_HOME/cmdline-tools/latest/bin/d8"
fail=0
for c in java javac aapt2 apksigner zip unzip keytool; do
  command -v "$c" >/dev/null || { echo "MISSING: $c"; fail=1; }
done
[ -f "$JAR" ] || { echo "MISSING: $JAR"; fail=1; }
[ -x "$D8" ] || { echo "MISSING: $D8"; fail=1; }
[ "$fail" -eq 0 ] || exit 1
java -version
aapt2 version
apksigner --version
"$D8" --version
echo "Environment verification PASSED."
