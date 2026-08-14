#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
XCODE_APP_PATH="${XCODE_APP_PATH:-/Applications/Xcode.app}"
PROJECT_PATH="${SCRIPT_DIR}/AirvanaDemo.xcodeproj"
DERIVED_DATA="${AIRVANA_IOS_DERIVED_DATA:-/private/tmp/airvana-ios-derived-data}"
BUNDLE_ID="com.renlijun.airvana.loopit.demo"
DEVICE_ID="${1:-${AIRVANA_IOS_DEVICE_ID:-}}"
TEAM_ID="${DEVELOPMENT_TEAM:-}"

if [[ ! -d "${XCODE_APP_PATH}" ]]; then
  print -u2 "未找到完整 Xcode：${XCODE_APP_PATH}"
  print -u2 "请先从 Mac App Store 安装 Xcode，然后重新运行此脚本。"
  exit 2
fi

export DEVELOPER_DIR="${XCODE_APP_PATH}/Contents/Developer"

if ! xcodebuild -version >/dev/null 2>&1; then
  print -u2 "Xcode 工具链尚未完成首次启动。请打开 Xcode 并完成许可与组件安装。"
  exit 3
fi

if [[ ! -d "${PROJECT_PATH}" ]]; then
  if command -v xcodegen >/dev/null 2>&1; then
    (cd "${SCRIPT_DIR}" && xcodegen generate)
  else
    print -u2 "缺少 ${PROJECT_PATH}，且系统中没有 xcodegen。"
    exit 4
  fi
fi

if [[ -z "${TEAM_ID}" ]]; then
  TEAM_ID="$(sed -n 's/^[[:space:]]*DEVELOPMENT_TEAM:[[:space:]]*\([A-Z0-9][A-Z0-9]*\)[[:space:]]*$/\1/p' "${SCRIPT_DIR}/project.yml" | head -n 1)"
fi
if [[ -z "${TEAM_ID}" ]]; then
  TEAM_ID="$(security find-identity -v -p codesigning 2>/dev/null | sed -n 's/.*Apple Development:.*(\([A-Z0-9][A-Z0-9]*\)).*/\1/p' | head -n 1)"
fi
if [[ -z "${TEAM_ID}" ]]; then
  print -u2 "未检测到 Apple Development 签名。"
  print -u2 "请在 Xcode → Settings → Accounts 登录 Apple ID，并点击 Manage Certificates 创建 Apple Development 证书。"
  exit 5
fi

if [[ -z "${DEVICE_ID}" ]]; then
  DEVICE_ID="$(xcrun devicectl list devices 2>/dev/null | awk '
    {
      is_available = 0
      is_iphone = 0
      identifier = ""
      for (i = 1; i <= NF; i++) {
        if ($i == "available") is_available = 1
        if ($i ~ /^iPhone/) is_iphone = 1
        if ($i ~ /^[0-9A-Fa-f-]{20,}$/) identifier = $i
      }
      if (is_available && is_iphone && identifier != "") {
        print identifier
        exit
      }
    }
  ')"
fi
if [[ -z "${DEVICE_ID}" ]]; then
  print -u2 "没有检测到已连接并配对的 iPhone。"
  print -u2 "请解锁手机、连接数据线、选择“信任此电脑”，并确认 iPhone 已打开开发者模式。"
  exit 6
fi

print "Building Airvana for iPhone ${DEVICE_ID} with team ${TEAM_ID}..."
xcodebuild \
  -project "${PROJECT_PATH}" \
  -scheme AirvanaDemo \
  -configuration Debug \
  -destination "platform=iOS,id=${DEVICE_ID}" \
  -derivedDataPath "${DERIVED_DATA}" \
  -allowProvisioningUpdates \
  -allowProvisioningDeviceRegistration \
  DEVELOPMENT_TEAM="${TEAM_ID}" \
  CODE_SIGN_STYLE=Automatic \
  build

APP_PATH="${DERIVED_DATA}/Build/Products/Debug-iphoneos/Airvana.app"
if [[ ! -d "${APP_PATH}" ]]; then
  print -u2 "构建完成但未找到 App：${APP_PATH}"
  exit 7
fi

xcrun devicectl device install app --device "${DEVICE_ID}" "${APP_PATH}"
xcrun devicectl device process launch --device "${DEVICE_ID}" "${BUNDLE_ID}"

print "Airvana 已安装并启动：${BUNDLE_ID}"
