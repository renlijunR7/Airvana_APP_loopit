#!/usr/bin/env bash
# 等待本机服务就绪。可选第一个参数覆盖健康检查 URL。
set -euo pipefail

URL="${1:-http://127.0.0.1:8082/api/health}"
ATTEMPTS="${HEALTHCHECK_ATTEMPTS:-20}"

for ((attempt = 1; attempt <= ATTEMPTS; attempt += 1)); do
  if curl --fail --silent --show-error --max-time 3 "${URL}" >/dev/null; then
    echo "健康检查通过：${URL}"
    exit 0
  fi
  sleep 1
done

echo "健康检查失败：${URL}" >&2
exit 1
