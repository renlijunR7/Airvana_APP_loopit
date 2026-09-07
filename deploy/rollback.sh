#!/usr/bin/env bash
# 把 current 与 previous 交换，重启后执行健康检查；失败时恢复原版本。
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo '请使用 sudo 或 root 运行。' >&2
  exit 1
fi

ROOT_DIR=/opt/airvana
CURRENT="$(readlink -f "${ROOT_DIR}/current" 2>/dev/null || true)"
PREVIOUS="$(readlink -f "${ROOT_DIR}/previous" 2>/dev/null || true)"

if [ -z "${CURRENT}" ] || [ -z "${PREVIOUS}" ] || [ ! -d "${PREVIOUS}" ]; then
  echo '没有可用的上一版本。' >&2
  exit 1
fi

ln -sfn "${PREVIOUS}" "${ROOT_DIR}/current.next"
mv -Tf "${ROOT_DIR}/current.next" "${ROOT_DIR}/current"
systemctl restart airvana

if bash "${PREVIOUS}/deploy/healthcheck.sh"; then
  ln -sfn "${CURRENT}" "${ROOT_DIR}/previous"
  echo "回滚成功：$(basename "${PREVIOUS}")"
  exit 0
fi

ln -sfn "${CURRENT}" "${ROOT_DIR}/current.next"
mv -Tf "${ROOT_DIR}/current.next" "${ROOT_DIR}/current"
systemctl restart airvana
bash "${CURRENT}/deploy/healthcheck.sh" || true
echo '回滚版本不可用，已恢复到回滚前版本。' >&2
exit 1
