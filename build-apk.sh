#!/usr/bin/env bash
set -euo pipefail

# Load nvm if present
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

APK_OUTPUT="./cash-register.apk"
APK_SOURCE="mobile/android/app/build/outputs/apk/release/app-release.apk"

cd mobile && npx expo prebuild --platform android --no-install
cd android && ./gradlew assembleRelease
cd ../..

cp "$APK_SOURCE" "$APK_OUTPUT"
echo "APK built: $APK_OUTPUT"
