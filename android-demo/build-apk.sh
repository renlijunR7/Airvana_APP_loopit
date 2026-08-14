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
APK_PATH="${OUTPUT_DIR}/Airvana-v1.0.14-debug.apk"
EMBEDDED_INDEX="${BUILD_DIR}/embedded-index.html"
EMBEDDED_CSS="${BUILD_DIR}/embedded-airvana-v4.css"
APK_LISTING="${BUILD_DIR}/apk-file-list.txt"
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
  --version-code 15 \
  --version-name 1.0.14 \
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
  --out "${APK_PATH}" \
  "${BUILD_DIR}/app-aligned.apk"

"${BUILD_TOOLS_DIR}/apksigner" verify --verbose --print-certs \
  "${APK_PATH}"

unzip -p "${APK_PATH}" assets/www/index.html > "${EMBEDDED_INDEX}"
unzip -p "${APK_PATH}" assets/www/airvana-v4.css > "${EMBEDDED_CSS}"
unzip -Z1 "${APK_PATH}" > "${APK_LISTING}"
if ! rg -q 'data-message-tabs="通知|互动|私信"' "${EMBEDDED_INDEX}"; then
  print -u2 "APK verification failed: fixed message tab bar is missing"
  exit 1
fi
for label in 通知 互动 私信; do
  if ! rg -q "aria-label=\"${label}\"" "${EMBEDDED_INDEX}"; then
    print -u2 "APK verification failed: message tab ${label} is missing"
    exit 1
  fi
done
if ! rg -q 'airvana-v4\.css\?v=[0-9]+\.[0-9]+\.[0-9]+' "${EMBEDDED_INDEX}"; then
  print -u2 "APK verification failed: current CSS bundle is missing"
  exit 1
fi
if ! rg -q 'class="messages-page"' "${EMBEDDED_INDEX}" \
  || ! rg -q 'data-message-list' "${EMBEDDED_INDEX}"; then
  print -u2 "APK verification failed: fixed tab bar is not separated from the scrolling message list"
  exit 1
fi
if ! rg -q 'native-app-shell \.system-modal' "${EMBEDDED_CSS}" \
  || ! rg -q 'padding-bottom: calc\(24px \+ var\(--safe-bottom\)\)' "${EMBEDDED_CSS}"; then
  print -u2 "APK verification failed: native modal safe-area gap is missing"
  exit 1
fi
if ! rg -q 'data-settings-drawer-scroll' "${EMBEDDED_INDEX}" \
  || ! rg -q 'drawerScrollMove' "${EMBEDDED_INDEX}" \
  || ! rg -q 'native-app-shell \.settings-drawer-scroll' "${EMBEDDED_CSS}" \
  || ! rg -q 'touch-action: none' "${EMBEDDED_CSS}"; then
  print -u2 "APK verification failed: Android drawer scroll layer is missing"
  exit 1
fi
if ! rg -q 'aria-label="作品信息与上下切换区域"' "${EMBEDDED_INDEX}" \
  || ! rg -q 'feedInfoDown:e=>beginFeedDrag' "${EMBEDDED_INDEX}" \
  || ! rg -q 'runFeedInfoAction' "${EMBEDDED_INDEX}" \
  || ! rg -q 'play-feed__actions \[role="button"\].*touch-action: manipulation' "${EMBEDDED_CSS}"; then
  print -u2 "APK verification failed: Loopit-style game/info swipe interaction is missing"
  exit 1
fi
for playable_id in plb_neon_dash plb_pulse_forge plb_sky_stack plb_rune_circuit plb_prism_match plb_star_cups plb_deep_catch plb_ember_bastion plb_nova_drift plb_void_squadron; do
  if ! rg -q "${playable_id}" "${EMBEDDED_INDEX}"; then
    print -u2 "APK verification failed: original arcade game ${playable_id} is missing"
    exit 1
  fi
done
for playable_id in plb_orchard_merge plb_moonlight_tea_shop plb_microbe_arena plb_crystal_bastion plb_studio_wardrobe; do
  if ! rg -q "${playable_id}" "${EMBEDDED_INDEX}"; then
    print -u2 "APK verification failed: category expansion game ${playable_id} is missing"
    exit 1
  fi
done
for playable_id in plb_star_mower plb_star_deck plb_adventurer_journal plb_idiom_detective plb_hex_frontier plb_garden_renewal; do
  if ! rg -q "${playable_id}" "${EMBEDDED_INDEX}"; then
    print -u2 "APK verification failed: depth-playable ${playable_id} is missing"
    exit 1
  fi
done
if ! rg -q 'const homeArcadeDiscoverIds = \[34,35,36,37,38,39,40,41,42,43,44,24,25,26,27,28,29,30,31,32,33\]' "${EMBEDDED_INDEX}" \
  || ! rg -q "tag:'原创新游'" "${EMBEDDED_INDEX}"; then
  print -u2 "APK verification failed: original arcade Discover gallery is missing"
  exit 1
fi
for cover in neon-dash pulse-forge sky-stack rune-circuit prism-match star-cups deep-catch ember-bastion nova-drift void-squadron; do
  if ! rg -q "assets/www/assets/game-covers/home-arcade/${cover}-v2\.jpg" "${APK_LISTING}"; then
    print -u2 "APK verification failed: art-directed v2 cover ${cover} is missing"
    exit 1
  fi
done
for cover in orchard-merge star-mower moonlight-tea-shop microbe-arena star-deck crystal-bastion adventurer-journal idiom-detective hex-frontier studio-wardrobe garden-renewal; do
  if ! rg -q "assets/www/assets/game-covers/category-expansion/${cover}\.jpg" "${APK_LISTING}"; then
    print -u2 "APK verification failed: category expansion cover ${cover} is missing"
    exit 1
  fi
done
for asset in star-mower star-deck adventurer-journal idiom-detective hex-frontier garden-renewal; do
  if ! rg -q "assets/www/assets/deep-games/v2/${asset}-gameplay-v2\.png" "${APK_LISTING}"; then
    print -u2 "APK verification failed: depth-gameplay asset ${asset} is missing"
    exit 1
  fi
done
if ! rg -q 'assets/www/deep-games-v2\.js' "${APK_LISTING}" \
  || ! rg -q 'assets/www/deep-games-v2\.css' "${APK_LISTING}" \
  || ! rg -q 'AirvanaDeepGames' "${EMBEDDED_INDEX}"; then
  print -u2 "APK verification failed: depth-game runtime is missing"
  exit 1
fi
if ! rg -q 'ensureFeedAudio\(\)' "${EMBEDDED_INDEX}" \
  || ! rg -q 'feedMiniGameBestScores' "${EMBEDDED_INDEX}" \
  || ! rg -q 'class="feed-mini-game__sound"' "${EMBEDDED_INDEX}"; then
  print -u2 "APK verification failed: local audio, mute, or best-score controls are missing"
  exit 1
fi
if ! rg -q 'class="play-feed__cover"' "${EMBEDDED_INDEX}" \
  || ! rg -q '\.feed-mini-game\.is-arcade\.state-idle' "${EMBEDDED_CSS}" \
  || ! rg -q 'backdrop-filter:none' "${EMBEDDED_CSS}"; then
  print -u2 "APK verification failed: Home arcade cover visibility fix is missing"
  exit 1
fi
print "APK embedded UI verified: 通知 / 互动 / 私信 / 发现 21 款原创新游 / 11 张品类封面 / 11 款品类完整试玩 / 6 款三阶段深度玩法 / 音效 / 本地最高分"

shasum -a 256 "${APK_PATH}"
ls -lh "${APK_PATH}"
