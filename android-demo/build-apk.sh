#!/bin/zsh
set -euo pipefail

WRAPPER_DIR="${0:A:h}"
PROJECT_DIR="${WRAPPER_DIR:h}"
BUILD_DIR="${WRAPPER_DIR}/build"
APP_BUILD_DIR="${BUILD_DIR}/app"
ASSETS_DIR="${APP_BUILD_DIR}/assets"
GEN_DIR="${BUILD_DIR}/generated"
CLASSES_DIR="${BUILD_DIR}/classes"
DEX_DIR="${BUILD_DIR}/dex"
OUTPUT_DIR="${BUILD_DIR}/outputs"
CLASSES_JAR="${BUILD_DIR}/classes.jar"
SDK_DIR="${ANDROID_SDK_ROOT:-${HOME}/Library/Android/sdk}"
BUILD_TOOLS_DIR="${SDK_DIR}/build-tools/35.0.0"
ANDROID_JAR="${SDK_DIR}/platforms/android-35/android.jar"
JDK_DIR="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
KEYSTORE_PATH="${HOME}/.android/debug.keystore"

export JAVA_HOME="${JDK_DIR}"
export PATH="${JAVA_HOME}/bin:${PATH}"

if [[ ! -f "${ANDROID_JAR}" ]]; then
  print -u2 "Android 35 platform not found: ${ANDROID_JAR}"
  exit 1
fi

if [[ ! -x "${JDK_DIR}/bin/javac" ]]; then
  print -u2 "Android Studio JDK not found: ${JDK_DIR}"
  exit 1
fi

if [[ ! -f "${KEYSTORE_PATH}" ]]; then
  print -u2 "Android debug keystore not found: ${KEYSTORE_PATH}"
  exit 1
fi

rm -rf "${BUILD_DIR}"
mkdir -p "${ASSETS_DIR}/www" "${GEN_DIR}" "${CLASSES_DIR}" "${DEX_DIR}" "${OUTPUT_DIR}"

rsync -a "${PROJECT_DIR}/public/" "${ASSETS_DIR}/www/"

"${BUILD_TOOLS_DIR}/aapt2" compile \
  --dir "${WRAPPER_DIR}/app/src/main/res" \
  -o "${BUILD_DIR}/compiled-resources.zip"

"${BUILD_TOOLS_DIR}/aapt2" link \
  -o "${BUILD_DIR}/base-unsigned.apk" \
  -I "${ANDROID_JAR}" \
  --manifest "${WRAPPER_DIR}/app/src/main/AndroidManifest.xml" \
  --java "${GEN_DIR}" \
  --min-sdk-version 26 \
  --target-sdk-version 35 \
  --version-code 1 \
  --version-name 1.0.0 \
  --auto-add-overlay \
  -A "${ASSETS_DIR}" \
  "${BUILD_DIR}/compiled-resources.zip"

"${JDK_DIR}/bin/javac" \
  -source 8 \
  -target 8 \
  -Xlint:-options \
  -classpath "${ANDROID_JAR}" \
  -d "${CLASSES_DIR}" \
  "${WRAPPER_DIR}/app/src/main/java/ai/airvana/demo/LocalAssetServer.java" \
  "${WRAPPER_DIR}/app/src/main/java/ai/airvana/demo/MainActivity.java" \
  "${GEN_DIR}/ai/airvana/demo/R.java"

"${JDK_DIR}/bin/jar" --create --file "${CLASSES_JAR}" -C "${CLASSES_DIR}" .

"${BUILD_TOOLS_DIR}/d8" \
  --lib "${ANDROID_JAR}" \
  --min-api 26 \
  --output "${DEX_DIR}" \
  "${CLASSES_JAR}"

cp "${BUILD_DIR}/base-unsigned.apk" "${BUILD_DIR}/app-unaligned.apk"
(
  cd "${DEX_DIR}"
  zip -q -u "${BUILD_DIR}/app-unaligned.apk" classes.dex
)

"${BUILD_TOOLS_DIR}/zipalign" -f 4 \
  "${BUILD_DIR}/app-unaligned.apk" \
  "${BUILD_DIR}/app-aligned.apk"

"${BUILD_TOOLS_DIR}/apksigner" sign \
  --ks "${KEYSTORE_PATH}" \
  --ks-pass pass:android \
  --key-pass pass:android \
  --out "${OUTPUT_DIR}/Airvana-Demo-v1.0.0-debug.apk" \
  "${BUILD_DIR}/app-aligned.apk"

"${BUILD_TOOLS_DIR}/apksigner" verify --verbose --print-certs \
  "${OUTPUT_DIR}/Airvana-Demo-v1.0.0-debug.apk"

shasum -a 256 "${OUTPUT_DIR}/Airvana-Demo-v1.0.0-debug.apk"
ls -lh "${OUTPUT_DIR}/Airvana-Demo-v1.0.0-debug.apk"
