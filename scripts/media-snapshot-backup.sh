#!/bin/bash
# Media Snapshot Backup Script
# 每日两次快照备份，保留7天

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SOURCE_DIR="$PROJECT_ROOT/data/media"
BACKUP_ROOT="$HOME/data/mnx-agent/media"
DATE=$(date +%Y%m%d%H%M%S)
TIMESTAMP=$(date +%H%M)

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting backup snapshot..."

mkdir -p "$BACKUP_ROOT"

SNAPSHOT_DIR="$BACKUP_ROOT/$DATE"
mkdir -p "$SNAPSHOT_DIR"

rsync -av "$SOURCE_DIR/" "$SNAPSHOT_DIR/media/" 2>&1 | while read line; do
  log "rsync: $line"
done

pg_dump mnx_agent > "$SNAPSHOT_DIR/mnx_agent.sql" 2>&1
log "Database backup completed: mnx_agent.sql"

BACKUP_SIZE=$(du -sh "$SNAPSHOT_DIR" | cut -f1)
log "Snapshot size: $BACKUP_SIZE"

log "Cleaning snapshots older than 7 days..."
DELETED_COUNT=$(find "$BACKUP_ROOT" -type d -name "20*" -mtime +7 | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
  find "$BACKUP_ROOT" -type d -name "20*" -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
  log "Deleted $DELETED_COUNT old snapshots"
else
  log "No snapshots to delete"
fi

REMAINING=$(ls -1 "$BACKUP_ROOT" | grep -E "^20[0-9]{6}" | wc -l)
log "Remaining snapshots: $REMAINING"

log "Backup snapshot completed: $DATE"