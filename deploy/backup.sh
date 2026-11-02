#!/usr/bin/env bash
set -euo pipefail

# 备份 MySQL 与产物存储，默认保留 7 天。
ROOT="${VAKAO_HUB_ROOT:-/www/wwwroot/vakao-hub}"
BACKUP_DIR="${BACKUP_DIR:-/www/backup/vakaohub}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

ENV_FILE="$ROOT/packages/server/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "未找到 $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

DATE="$(date +%F_%H%M%S)"
mkdir -p "$BACKUP_DIR"

MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

if [[ -d "$ROOT/packages/server/storage" ]]; then
  tar -czf "$BACKUP_DIR/storage_$DATE.tar.gz" \
    -C "$ROOT/packages/server" storage
fi

find "$BACKUP_DIR" -type f -name '*.gz' -mtime "+$RETENTION_DAYS" -delete
echo "备份完成：$BACKUP_DIR/db_$DATE.sql.gz"
