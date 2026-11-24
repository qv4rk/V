#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
JAR="$ANDROID_HOME/platforms/android-35/android.jar"
D8="$ANDROID_HOME/cmdline-tools/latest/bin/d8"
B="$ROOT/build"; C="$B/classes"; D="$B/dex"
KEY="${KEYSTORE:-$HOME/.feisttech-test.keystore}"
FINAL="$B/FeistTech-APK-Test.apk"
rm -rf "$B"; mkdir -p "$C" "$D"
javac -source 8 -target 8 -classpath "$JAR" -d "$C" src/com/feisttech/apktest/MainActivity.java
"$D8" --lib "$JAR" --min-api 24 --output "$D" "$C/com/feisttech/apktest/MainActivity.class"
test -s "$D/classes.dex"
aapt2 link -I "$JAR" --manifest AndroidManifest.xml --min-sdk-version 24 --target-sdk-version 35 --version-code 1 --version-name 1.0 -o "$B/base.apk"
unzip -l "$B/base.apk" | grep -q AndroidManifest.xml
unzip -l "$B/base.apk" | grep -q resources.arsc
aapt2 dump badging "$B/base.apk" | grep -q "package: name='com.feisttech.apktest'"
cp "$B/base.apk" "$B/unsigned.apk"
(cd "$D" && zip -q "$B/unsigned.apk" classes.dex)
for f in AndroidManifest.xml resources.arsc classes.dex; do unzip -l "$B/unsigned.apk" | grep -q "$f"; done
if [ ! -f "$KEY" ]; then
 keytool -genkeypair -keystore "$KEY" -alias feisttech -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=FeistTech Test, O=FeistTech, C=US"
fi
cp "$B/unsigned.apk" "$FINAL"
apksigner sign --ks "$KEY" --ks-key-alias feisttech "$FINAL"
apksigner verify --verbose --print-certs "$FINAL"
aapt2 dump badging "$FINAL" | head -6
unzip -l "$FINAL"
echo "BUILD SUCCESS: $FINAL"
ls -lh "$FINAL"
