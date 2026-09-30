#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
IOS_DIR="${SCRIPT_DIR:h}"
PROJECT_DIR="${IOS_DIR:h}"
SOURCE_DIR="${PROJECT_DIR}/public"
DESTINATION_DIR="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/www"

if [[ ! -f "${SOURCE_DIR}/index.html" ]]; then
  print -u2 "Airvana web entry not found: ${SOURCE_DIR}/index.html"
  exit 1
fi

mkdir -p "${DESTINATION_DIR}"
# 可选媒体（HeyGen 样片）不进原生包：Web 端按需加载，壳内自动回退静态身份卡
rsync -a --delete --exclude '.DS_Store' --exclude 'ai-twin/heygen/**' "${SOURCE_DIR}/" "${DESTINATION_DIR}/"

# This checkout lives under Documents/iCloud, which can attach Finder metadata
# to the generated bundle. Apple code signing rejects those extended attributes.
/usr/bin/xattr -cr "${TARGET_BUILD_DIR}/${WRAPPER_NAME}"

if ! rg -q 'native-platform=ios' "${SOURCE_DIR}/index.html"; then
  print -u2 "iOS native-shell metadata is missing from the embedded UI"
  exit 1
fi
if [[ ! -f "${DESTINATION_DIR}/airvana-v4.css" || ! -f "${DESTINATION_DIR}/logo.png" ]]; then
  print -u2 "Airvana web bundle is incomplete"
  exit 1
fi

print "Synced Loopit v2 web bundle to ${DESTINATION_DIR}"
