import { describe, expect, it, vi } from 'vitest'
import { BackupService, createBackupConfigFromEnv } from '../backup-service.js'

describe('BackupService', () => {
  it('creates a local media/database snapshot and uploads it to configured R2 remote', async () => {
    const executedCommands: string[] = []
    const runner = vi.fn(async (command: string) => {
      executedCommands.push(command)
    })

    const service = new BackupService({
      runner,
      now: () => new Date('2026-07-07T06:30:00.000Z'),
    })

    const result = await service.createSnapshot({
      sourceDir: '/app/data/media',
      backupRoot: '/backups/media',
      databaseName: 'mnx_agent',
      pgDumpCommand: 'pg_dump mnx_agent',
      cloud: {
        enabled: true,
        provider: 'r2',
        remote: 'r2-prod',
        bucket: 'mnx-backups',
        prefix: 'media',
      },
      retentionDays: 7,
    })

    expect(result.snapshotId).toBe('20260707063000')
    expect(result.snapshotDir).toBe('/backups/media/20260707063000')
    expect(result.uploaded).toBe(true)
    expect(result.cloudTarget).toBe('r2-prod:mnx-backups/media/20260707063000')
    expect(executedCommands).toEqual([
      "mkdir -p '/backups/media/20260707063000/media'",
      "rsync -a --delete '/app/data/media/' '/backups/media/20260707063000/media/'",
      "pg_dump mnx_agent > '/backups/media/20260707063000/mnx_agent.sql'",
      "rclone sync '/backups/media/20260707063000' 'r2-prod:mnx-backups/media/20260707063000'",
      "find '/backups/media' -mindepth 1 -maxdepth 1 -type d -name \"20*\" -mtime +7 -exec rm -rf {} +",
    ])
  })

  it('keeps the existing local snapshot behavior when cloud backup is disabled', async () => {
    const runner = vi.fn(async () => {})
    const service = new BackupService({
      runner,
      now: () => new Date('2026-07-07T18:05:09.000Z'),
    })

    const result = await service.createSnapshot({
      sourceDir: '/app/data/media',
      backupRoot: '/backups/media',
      databaseName: 'mnx_agent',
      cloud: { enabled: false },
      retentionDays: 7,
    })

    expect(result.uploaded).toBe(false)
    expect(result.cloudTarget).toBeUndefined()
    expect(runner).toHaveBeenCalledWith("pg_dump mnx_agent > '/backups/media/20260707180509/mnx_agent.sql'")
    expect(runner).not.toHaveBeenCalledWith(expect.stringContaining('rclone sync'))
  })

  it('parses Backblaze B2 cloud backup configuration from environment variables', () => {
    const config = createBackupConfigFromEnv({
      MEDIA_SOURCE_DIR: '/srv/media',
      MEDIA_BACKUP_ROOT: '/srv/backups',
      MEDIA_BACKUP_RETENTION_DAYS: '14',
      MEDIA_BACKUP_CLOUD_ENABLED: 'true',
      MEDIA_BACKUP_CLOUD_PROVIDER: 'b2',
      MEDIA_BACKUP_CLOUD_REMOTE: 'b2-prod',
      MEDIA_BACKUP_CLOUD_BUCKET: 'mnx-agent-prod',
      MEDIA_BACKUP_CLOUD_PREFIX: 'daily/media',
      DB_NAME: 'mnx_agent_prod',
    })

    expect(config).toEqual({
      sourceDir: '/srv/media',
      backupRoot: '/srv/backups',
      databaseName: 'mnx_agent_prod',
      pgDumpCommand: 'pg_dump mnx_agent_prod',
      retentionDays: 14,
      cloud: {
        enabled: true,
        provider: 'b2',
        remote: 'b2-prod',
        bucket: 'mnx-agent-prod',
        prefix: 'daily/media',
      },
    })
  })
})
