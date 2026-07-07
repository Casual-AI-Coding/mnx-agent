#!/bin/bash
# Media Snapshot Backup Script
# 每日两次快照备份，保留7天

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SOURCE_DIR="${MEDIA_SOURCE_DIR:-$PROJECT_ROOT/data/media}"
BACKUP_ROOT="${MEDIA_BACKUP_ROOT:-$HOME/data/mnx-agent/media}"
DB_NAME="${DB_NAME:-mnx_agent}"
RETENTION_DAYS="${MEDIA_BACKUP_RETENTION_DAYS:-7}"
PG_DUMP_COMMAND="${PG_DUMP_COMMAND:-pg_dump $DB_NAME}"
DATE=$(date +%Y%m%d%H%M%S)
TIMESTAMP=$(date +%H%M)

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

cloud_backup_enabled() {
  [ "${MEDIA_BACKUP_CLOUD_ENABLED:-false}" = "true" ]
}

build_cloud_target() {
  local prefix="${MEDIA_BACKUP_CLOUD_PREFIX:-}"
  if [ -n "$prefix" ]; then
    echo "${MEDIA_BACKUP_CLOUD_REMOTE}:${MEDIA_BACKUP_CLOUD_BUCKET}/${prefix}/${DATE}"
  else
    echo "${MEDIA_BACKUP_CLOUD_REMOTE}:${MEDIA_BACKUP_CLOUD_BUCKET}/${DATE}"
  fi
}

validate_cloud_config() {
  if ! cloud_backup_enabled; then
    return 0
  fi

  if [ -z "${MEDIA_BACKUP_CLOUD_PROVIDER:-}" ] || [ -z "${MEDIA_BACKUP_CLOUD_REMOTE:-}" ] || [ -z "${MEDIA_BACKUP_CLOUD_BUCKET:-}" ]; then
    log "Cloud backup requires MEDIA_BACKUP_CLOUD_PROVIDER, MEDIA_BACKUP_CLOUD_REMOTE and MEDIA_BACKUP_CLOUD_BUCKET"
    exit 1
  fi

  if [ "${MEDIA_BACKUP_CLOUD_PROVIDER}" != "b2" ] && [ "${MEDIA_BACKUP_CLOUD_PROVIDER}" != "r2" ]; then
    log "Unsupported cloud backup provider: ${MEDIA_BACKUP_CLOUD_PROVIDER}"
    exit 1
  fi
}

log "Starting backup snapshot..."
validate_cloud_config

mkdir -p "$BACKUP_ROOT"

SNAPSHOT_DIR="$BACKUP_ROOT/$DATE"
mkdir -p "$SNAPSHOT_DIR"

rsync -av "$SOURCE_DIR/" "$SNAPSHOT_DIR/media/" 2>&1 | while read line; do
  log "rsync: $line"
done

$PG_DUMP_COMMAND > "$SNAPSHOT_DIR/mnx_agent.sql" 2>&1
log "Database backup completed: mnx_agent.sql"

BACKUP_SIZE=$(du -sh "$SNAPSHOT_DIR" | cut -f1)
log "Snapshot size: $BACKUP_SIZE"

if cloud_backup_enabled; then
  CLOUD_TARGET=$(build_cloud_target)
  log "Uploading snapshot to ${MEDIA_BACKUP_CLOUD_PROVIDER}: $CLOUD_TARGET"
  rclone sync "$SNAPSHOT_DIR" "$CLOUD_TARGET" 2>&1 | while read line; do
    log "rclone: $line"
  done
  log "Cloud backup completed: $CLOUD_TARGET"
fi

log "Cleaning snapshots older than ${RETENTION_DAYS} days..."
DELETED_COUNT=$(find "$BACKUP_ROOT" -type d -name "20*" -mtime +"$RETENTION_DAYS" | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
  find "$BACKUP_ROOT" -type d -name "20*" -mtime +"$RETENTION_DAYS" -exec rm -rf {} \; 2>/dev/null || true
  log "Deleted $DELETED_COUNT old snapshots"
else
  log "No snapshots to delete"
fi

REMAINING=$(ls -1 "$BACKUP_ROOT" | grep -E "^20[0-9]{6}" | wc -l)
log "Remaining snapshots: $REMAINING"

log "Backup snapshot completed: $DATE"
