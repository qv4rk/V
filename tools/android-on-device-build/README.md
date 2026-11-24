# FeistTech Android On-Device Build Baseline

A known-good reference for building a signed Android APK directly on an ARM64 Android phone with Termux.

Read **FEISTTECH_ANDROID_BUILD_GUIDE.md** first.

After preparing the environment:

```sh
chmod +x verify-environment.sh build-apk.sh
./verify-environment.sh
./build-apk.sh
```

The reference pipeline was validated end-to-end on September 26, 2026: the APK was compiled, assembled, signed, verified, installed, and launched on the physical device.

Private signing keys are excluded from the repository.
