# FeistTech On-Device Android APK Build Guide

**Known-good baseline validated:** September 26, 2026  
**Host:** Android + Termux on ARM64/aarch64  
**Result:** APK built directly on the phone, signed, verified, installed, and launched on the physical device.

## What “known-good environment” means

A known-good environment is the specific combination of host OS, CPU architecture, Java runtime/compiler, Android SDK components, packaging/signing tools, dependent libraries, paths, and configuration that has completed the entire build chain successfully.

For this project, “known-good” means:

**Java source → `.class` → `classes.dex` → binary Android manifest/resources → APK assembly → APK signing → signature verification → Android installation → successful `MainActivity` launch.**

Four levels matter:

1. **Tool working:** e.g. `aapt2 version` executes.
2. **Artifact working:** an intermediate artifact contains what the next stage requires.
3. **Package working:** Android metadata parses and the signature verifies.
4. **End-to-end known-good:** the physical Android device installs and launches the application.

The September 26 build reached level 4.

## Validated environment

```text
Host:
  Android / Termux
  Architecture: ARM64 / aarch64
  Build executed directly on the phone

Android SDK:
  ANDROID_HOME=$HOME/Android/Sdk
  Platform: Android API 35
  android.jar=$HOME/Android/Sdk/platforms/android-35/android.jar

Java:
  OpenJDK 21

Java -> DEX:
  D8 9.3.16
  $HOME/Android/Sdk/cmdline-tools/latest/bin/d8

Packaging:
  Termux-native ARM64 aapt2
  Android Asset Packaging Tool 2.20-android-16.0.0_r4

Signing:
  apksigner
  Validated APK Signature Scheme v2: true
  Validated APK Signature Scheme v3: true

Reference application:
  package: com.feisttech.apktest
  versionCode: 1
  versionName: 1.0
  minSdk: 24
  targetSdk: 35
  compileSdk: 35

Validated final package:
  AndroidManifest.xml ✓
  resources.arsc      ✓
  classes.dex         ✓
  signature           ✓
  installation        ✓
  MainActivity launch ✓
```

The successful minimal APK was approximately 8.5 KB.

## Package-management safety

The original Termux installation is customized. Do not run broad maintenance commands merely to reproduce this build.

Avoid on an existing customized environment:

```sh
pkg upgrade
apt upgrade
apt autoremove
```

For a missing or mismatched package, inspect first:

```sh
apt-cache policy PACKAGE
apt-get -s install PACKAGE
```

Use targeted changes only after reviewing the simulation.

## 1. Check the host

```sh
uname -m
java -version
javac -version
command -v curl
command -v wget
command -v unzip
command -v zip
command -v keytool
```

Validated architecture:

```text
aarch64
```

Validated Java major version: 21.

## 2. Install Android command-line tools

The validated build used Google's archive:

```text
commandlinetools-linux-15859902_latest.zip
```

Create the SDK tree:

```sh
mkdir -p "$HOME/Android/Sdk/cmdline-tools"
```

After downloading that archive from Google's Android command-line-tools distribution, unpack it:

```sh
TMP="$HOME/android-cmdline-tools-tmp"
rm -rf "$TMP"
mkdir -p "$TMP"
unzip "$HOME/commandlinetools.zip" -d "$TMP"

mkdir -p "$HOME/Android/Sdk/cmdline-tools/latest"
cp -a "$TMP/cmdline-tools/." "$HOME/Android/Sdk/cmdline-tools/latest/"
```

Set paths:

```sh
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

Verify:

```sh
sdkmanager --version
"$ANDROID_HOME/cmdline-tools/latest/bin/d8" --version
```

The validated run reported SDK manager 22.0 and D8 9.3.16.

## 3. Install Android API 35

```sh
sdkmanager "platforms;android-35"
```

Verify:

```sh
ANDROID_JAR="$ANDROID_HOME/platforms/android-35/android.jar"
ls -lh "$ANDROID_JAR"
file "$ANDROID_JAR"
```

This `android.jar` is used by `javac`, D8, and AAPT2.

## 4. Install native ARM64 AAPT2 and APK signer

The on-phone build used Termux-native packaging tools.

Inspect first:

```sh
apt-cache policy aapt2 apksigner
apt-get -s install --no-upgrade aapt2 apksigner
```

If the simulation is acceptable:

```sh
apt-get install --no-upgrade aapt2 apksigner
```

Verify:

```sh
aapt2 version
apksigner --version
file "$(command -v aapt2)"
```

Validated AAPT2 output:

```text
Android Asset Packaging Tool (aapt) 2.20-android-16.0.0_r4
```

## 5. Verify the complete environment

This repository includes `verify-environment.sh`:

```sh
chmod +x verify-environment.sh
./verify-environment.sh
```

Do not build until all required checks pass.

## 6. Project layout

```text
feisttech-android-guide/
├── README.md
├── FEISTTECH_ANDROID_BUILD_GUIDE.md
├── verify-environment.sh
├── build-apk.sh
├── AndroidManifest.xml
└── src/
    └── com/feisttech/apktest/
        └── MainActivity.java
```

## 7. Manifest

The root manifest must carry the package identifier:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.feisttech.apktest">
```

The included manifest declares minSdk 24, targetSdk 35, and exported launcher activity `.MainActivity`.

The missing `package` attribute was one of the failures discovered during the original build. AAPT2 correctly reported:

```text
<manifest> must have a 'package' attribute.
```

## 8. Compile Java

```sh
export ANDROID_HOME="$HOME/Android/Sdk"
ANDROID_JAR="$ANDROID_HOME/platforms/android-35/android.jar"
D8="$ANDROID_HOME/cmdline-tools/latest/bin/d8"

mkdir -p build/classes build/dex

javac   -source 8   -target 8   -classpath "$ANDROID_JAR"   -d build/classes   src/com/feisttech/apktest/MainActivity.java
```

OpenJDK 21 may warn that source/target 8 are obsolete. They were warnings in the validated build.

Verify:

```sh
test -s build/classes/com/feisttech/apktest/MainActivity.class
```

## 9. Convert `.class` to DEX

```sh
"$D8"   --lib "$ANDROID_JAR"   --min-api 24   --output build/dex   build/classes/com/feisttech/apktest/MainActivity.class
```

Verify:

```sh
test -s build/dex/classes.dex
ls -lh build/dex/classes.dex
```

The minimal validated DEX was approximately 1.7 KB.

## 10. Build the manifest/resource APK

```sh
aapt2 link   -I "$ANDROID_JAR"   --manifest AndroidManifest.xml   --min-sdk-version 24   --target-sdk-version 35   --version-code 1   --version-name "1.0"   -o build/base.apk
```

Immediately inspect it:

```sh
unzip -l build/base.apk
```

It must contain:

```text
AndroidManifest.xml
resources.arsc
```

Validate metadata:

```sh
aapt2 dump badging build/base.apk
```

Core expected output:

```text
package: name='com.feisttech.apktest' versionCode='1' versionName='1.0'
minSdkVersion:'24'
targetSdkVersion:'35'
launchable-activity: name='com.feisttech.apktest.MainActivity'
```

Stop if this stage fails.

## 11. Add `classes.dex`

```sh
cp build/base.apk build/unsigned.apk

(
  cd build/dex
  zip -q ../unsigned.apk classes.dex
)
```

Inspect:

```sh
unzip -l build/unsigned.apk
```

Require all three:

```text
AndroidManifest.xml
resources.arsc
classes.dex
```

## 12. Generate a development signing key

Never publish a private production signing key.

For this disposable sample:

```sh
KEYSTORE="$HOME/.feisttech-test.keystore"

if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -keystore "$KEYSTORE" -alias feisttech -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=FeistTech Test, O=FeistTech, C=US"
fi
```

Choose a password at the interactive prompt. Keep the keystore and password private. Retain the keystore if you plan to update an installed app signed with it.

## 13. Sign

```sh
cp build/unsigned.apk build/FeistTech-APK-Test.apk

apksigner sign --ks "$HOME/.feisttech-test.keystore" --ks-key-alias feisttech build/FeistTech-APK-Test.apk
```

## 14. Verify

```sh
apksigner verify --verbose --print-certs   build/FeistTech-APK-Test.apk

aapt2 dump badging build/FeistTech-APK-Test.apk
unzip -l build/FeistTech-APK-Test.apk
```

The validated APK reported:

```text
Verifies
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
Number of signers: 1
```

## 15. Copy to Downloads and install

With Termux shared storage configured:

```sh
cp build/FeistTech-APK-Test.apk   "$HOME/storage/downloads/FeistTech-APK-Test.apk"
```

Alternate common path:

```sh
cp build/FeistTech-APK-Test.apk   /sdcard/Download/FeistTech-APK-Test.apk
```

Open the APK from Android's file manager/Downloads and install it. Android may request permission for that source to install applications.

## 16. Definition of end-to-end success

```text
[ ] javac created MainActivity.class
[ ] D8 created classes.dex
[ ] AAPT2 created AndroidManifest.xml + resources.arsc
[ ] AAPT2 parsed the package and launcher activity
[ ] final APK contains manifest + resources + DEX
[ ] apksigner reports Verifies
[ ] Android accepts the APK
[ ] Android installs the APK
[ ] application launches
[ ] MainActivity renders
```

All checks were completed on September 26, 2026.

## 17. Automated repeat build

The companion `build-apk.sh` performs the compile, DEX, package, validation, signing, and verification stages.

```sh
chmod +x build-apk.sh verify-environment.sh
./verify-environment.sh
./build-apk.sh
```

It uses:

```sh
set -euo pipefail
```

A failed stage therefore stops the build rather than allowing later commands to create a misleading partial APK.

## 18. Failure encountered: APK containing only `classes.dex`

The first failed package contained:

```text
1688  classes.dex
```

and nothing else.

`apksigner` correctly reported:

```text
Missing AndroidManifest.xml
```

AAPT2 had failed earlier, but the shell continued. `zip` then created a new file containing only DEX.

Permanent safeguards:

- fail-fast shell script;
- validate `base.apk`;
- require manifest, resources and DEX;
- run `aapt2 dump badging`;
- run `apksigner verify`;
- finish with physical installation/launch.

## 19. Failure encountered: zero-byte Abseil library

AAPT2 later failed to start with an error referring to:

```text
libabsl_hashtablez_sampler.so
```

Diagnostics:

```sh
LIB="$PREFIX/lib/libabsl_hashtablez_sampler.so"

ls -lh "$LIB"
stat "$LIB"
file "$LIB"

find "$PREFIX/lib" -maxdepth 1 -name 'libabsl*.so' -size 0 -print
dpkg -V abseil-cpp
```

The library was exactly zero bytes and `dpkg -V` detected the altered file.

Because the correct package version was already installed, the targeted repair was:

```sh
apt-get install --reinstall abseil-cpp
```

Then:

```sh
find "$PREFIX/lib" -maxdepth 1 -name 'libabsl*.so' -size 0 -print
dpkg -V abseil-cpp
aapt2 version
```

The repaired library was approximately 43 KB and AAPT2 ran again.

This is a repair for the observed corruption, not a routine build step.

## 20. Dependency mismatch encountered during setup

A partial package transaction also produced dependency mismatches. For the AAPT2-related mismatch, inspection showed older installed Abseil/protobuf components than the repository candidates. A targeted update of:

```text
abseil-cpp
libprotobuf
protobuf
```

resolved that specific mismatch.

On another machine, inspect and simulate rather than copying the update blindly:

```sh
apt-cache policy abseil-cpp libprotobuf protobuf
apt-get -s install --only-upgrade abseil-cpp libprotobuf protobuf
```

## 21. `apksigner` cannot determine minSdk

If `apksigner` says it cannot determine minSdk and the cause mentions:

```text
Missing AndroidManifest.xml
```

inspect the APK:

```sh
unzip -l build/unsigned.apk
```

The observed failure was fixed by restoring proper APK assembly. Overriding the minimum SDK in the signer would not repair a missing manifest.

## 22. Preserve the golden baseline

The original known-good project was:

```text
$HOME/feisttech-apk-test
```

Preserve it before evolving the Reading Room build. Keep a known-good reference separate from experimental application work.

## 23. Capture the exact environment

For long-term reproducibility:

```sh
{
  echo "=== DATE ==="
  date -Iseconds
  echo "=== ARCH ==="
  uname -a
  echo "=== JAVA ==="
  java -version 2>&1
  javac -version 2>&1
  echo "=== AAPT2 ==="
  aapt2 version 2>&1
  echo "=== APKSIGNER ==="
  apksigner --version 2>&1
  echo "=== D8 ==="
  "$HOME/Android/Sdk/cmdline-tools/latest/bin/d8" --version 2>&1
  echo "=== PACKAGES ==="
  dpkg-query -W aapt2 apksigner abseil-cpp libprotobuf protobuf openjdk-21     2>/dev/null || true
} > environment-snapshot.txt
```

A clean-room reproduction on another compatible ARM64 Android/Termux environment would provide an even stronger reproducibility test. Package repositories and Google's SDK distribution evolve, so record exact versions and archive checksums when possible.

## 24. From test APK to Reading Room

This baseline establishes the packaging infrastructure. The next application layer can reuse it:

```text
Known-good Android build pipeline
        ↓
Reading Room Android shell
        ↓
Shared Reading Room HTML/CSS/JavaScript
        ↓
TTS / document / RSVP / audio components
        ↓
Android-specific integrations
        ↓
Packaged native ARM64 libraries
```

Native libraries intended for the installed APK need to be packaged with that application; Termux's private `$PREFIX` is a separate application sandbox.

The build system should remain stable while Reading Room functionality evolves above it.

## Quick repeat

Once the environment is prepared:

```sh
export ANDROID_HOME="$HOME/Android/Sdk"
chmod +x verify-environment.sh build-apk.sh
./verify-environment.sh
./build-apk.sh
```

Output:

```text
build/FeistTech-APK-Test.apk
```

Then install and launch it on the device. That final physical run is the end-to-end validation.
