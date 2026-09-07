#!/usr/bin/env bash
# 原子发版：获取代码 -> 独立 release 安装与验证 -> 切换软链接 -> 健康检查。
# 用法：sudo bash /opt/airvana/current/deploy/deploy.sh [分支名，默认 main]
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo '请使用 sudo 或 root 运行。' >&2
  exit 1
fi

BRANCH="${1:-main}"
ROOT_DIR=/opt/airvana
SOURCE_DIR=${ROOT_DIR}/source
RELEASES_DIR=${ROOT_DIR}/releases

if [[ ! "${BRANCH}" =~ ^[A-Za-z0-9._/-]+$ ]]; then
  echo '分支名包含不支持的字符。' >&2
  exit 1
fi
if [ ! -d "${SOURCE_DIR}/.git" ]; then
  echo "未找到源码仓库：${SOURCE_DIR}" >&2
  exit 1
fi

echo "== 获取 ${BRANCH} 最新提交 =="
runuser -u airvana -- git -C "${SOURCE_DIR}" fetch --prune origin "${BRANCH}"
COMMIT="$(runuser -u airvana -- git -C "${SOURCE_DIR}" rev-parse FETCH_HEAD)"
SHORT_SHA="$(runuser -u airvana -- git -C "${SOURCE_DIR}" rev-parse --short=12 "${COMMIT}")"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-${SHORT_SHA}"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
install -d -o airvana -g airvana -m 750 "${RELEASE_DIR}"
runuser -u airvana -- git -C "${SOURCE_DIR}" archive "${COMMIT}" | tar -x -C "${RELEASE_DIR}"
chown -R airvana:airvana "${RELEASE_DIR}"

echo "== 在隔离目录验证 ${SHORT_SHA} =="
runuser -u airvana -- npm --prefix "${RELEASE_DIR}" ci --omit=dev
runuser -u airvana -- npm --prefix "${RELEASE_DIR}" test
runuser -u airvana -- npm --prefix "${RELEASE_DIR}" run verify

PREVIOUS_RELEASE="$(readlink -f "${ROOT_DIR}/current" 2>/dev/null || true)"
ln -sfn "${RELEASE_DIR}" "${ROOT_DIR}/current.next"
mv -Tf "${ROOT_DIR}/current.next" "${ROOT_DIR}/current"

echo '== 切换版本并验证服务 =='
systemctl restart airvana
if bash "${RELEASE_DIR}/deploy/healthcheck.sh"; then
  if [ -n "${PREVIOUS_RELEASE}" ] && [ -d "${PREVIOUS_RELEASE}" ]; then
    ln -sfn "${PREVIOUS_RELEASE}" "${ROOT_DIR}/previous"
  fi
  echo "发布成功：${RELEASE_ID}"
  exit 0
fi

echo '新版本健康检查失败，开始自动回滚。' >&2
if [ -n "${PREVIOUS_RELEASE}" ] && [ -d "${PREVIOUS_RELEASE}" ]; then
  ln -sfn "${PREVIOUS_RELEASE}" "${ROOT_DIR}/current.next"
  mv -Tf "${ROOT_DIR}/current.next" "${ROOT_DIR}/current"
  systemctl restart airvana
  bash "${PREVIOUS_RELEASE}/deploy/healthcheck.sh"
  echo "已回滚到：$(basename "${PREVIOUS_RELEASE}")" >&2
else
  systemctl stop airvana
  echo '首次发布失败且没有可回滚版本，服务已停止。' >&2
fi
systemctl --no-pager --lines=30 status airvana || true
exit 1
