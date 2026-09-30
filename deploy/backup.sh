#!/usr/bin/env bash
# SQLite 在线一致性备份，默认保留 14 天。
set -euo pipefail
umask 077

DB="${DATABASE_PATH:-/var/lib/airvana/airvana.db}"
DEST="${BACKUP_DIR:-/var/backups/airvana}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SNAPSHOT="${DEST}/airvana-${STAMP}.db"

if [ ! -f "${DB}" ]; then
  echo "数据库不存在，跳过备份：${DB}" >&2
  exit 0
fi

install -d -m 700 "${DEST}"
DB_PATH="${DB}" SNAPSHOT_PATH="${SNAPSHOT}" node "$(dirname "$0")/backup.mjs"
gzip "${SNAPSHOT}"
find "${DEST}" -type f -name 'airvana-*.db.gz' -mtime "+${RETENTION_DAYS}" -delete
echo "backup ok: $(basename "${SNAPSHOT}.gz") ($(du -h "${SNAPSHOT}.gz" | cut -f1))"
