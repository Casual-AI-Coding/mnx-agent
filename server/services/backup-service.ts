import { exec } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import { z } from 'zod'

const execAsync = promisify(exec)

const CLOUD_PROVIDER_VALUES = ['b2', 'r2'] as const

type CloudProvider = (typeof CLOUD_PROVIDER_VALUES)[number]

export interface CloudBackupConfig {
  readonly enabled: true
  readonly provider: CloudProvider
  readonly remote: string
  readonly bucket: string
  readonly prefix?: string
}

export interface DisabledCloudBackupConfig {
  readonly enabled: false
}

export type BackupCloudConfig = CloudBackupConfig | DisabledCloudBackupConfig

export interface BackupConfig {
  readonly sourceDir: string
  readonly backupRoot: string
  readonly databaseName: string
  readonly pgDumpCommand?: string
  readonly cloud: BackupCloudConfig
  readonly retentionDays: number
}

export interface BackupResult {
  readonly snapshotId: string
  readonly snapshotDir: string
  readonly uploaded: boolean
  readonly cloudTarget?: string
}

export type BackupCommandRunner = (command: string) => Promise<void>

export interface BackupServiceDependencies {
  readonly runner?: BackupCommandRunner
  readonly now?: () => Date
}

export class BackupConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupConfigError'
  }
}

const envSchema = z.object({
  MEDIA_SOURCE_DIR: z.string().min(1).optional(),
  MEDIA_BACKUP_ROOT: z.string().min(1).optional(),
  MEDIA_BACKUP_RETENTION_DAYS: z.string().regex(/^\d+$/).optional(),
  MEDIA_BACKUP_CLOUD_ENABLED: z.string().optional(),
  MEDIA_BACKUP_CLOUD_PROVIDER: z.enum(CLOUD_PROVIDER_VALUES).optional(),
  MEDIA_BACKUP_CLOUD_REMOTE: z.string().min(1).optional(),
  MEDIA_BACKUP_CLOUD_BUCKET: z.string().min(1).optional(),
  MEDIA_BACKUP_CLOUD_PREFIX: z.string().min(1).optional(),
  DB_NAME: z.string().min(1).optional(),
  PG_DUMP_COMMAND: z.string().min(1).optional(),
})

async function defaultRunner(command: string): Promise<void> {
  await execAsync(command)
}

function padDatePart(value: number): string {
  return value.toString().padStart(2, '0')
}

function formatSnapshotId(date: Date): string {
  return `${date.getUTCFullYear()}${padDatePart(date.getUTCMonth() + 1)}${padDatePart(date.getUTCDate())}${padDatePart(date.getUTCHours())}${padDatePart(date.getUTCMinutes())}${padDatePart(date.getUTCSeconds())}`
}

function buildCloudTarget(config: CloudBackupConfig, snapshotId: string): string {
  const targetPath = [config.bucket, config.prefix, snapshotId]
    .filter((part): part is string => Boolean(part))
    .join('/')
  return `${config.remote}:${targetPath}`
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`
}

function toCloudConfig(env: z.infer<typeof envSchema>): BackupCloudConfig {
  if (env.MEDIA_BACKUP_CLOUD_ENABLED !== 'true') {
    return { enabled: false }
  }

  if (!env.MEDIA_BACKUP_CLOUD_PROVIDER || !env.MEDIA_BACKUP_CLOUD_REMOTE || !env.MEDIA_BACKUP_CLOUD_BUCKET) {
    throw new BackupConfigError('MEDIA_BACKUP_CLOUD_PROVIDER, MEDIA_BACKUP_CLOUD_REMOTE and MEDIA_BACKUP_CLOUD_BUCKET are required when cloud backup is enabled')
  }

  return {
    enabled: true,
    provider: env.MEDIA_BACKUP_CLOUD_PROVIDER,
    remote: env.MEDIA_BACKUP_CLOUD_REMOTE,
    bucket: env.MEDIA_BACKUP_CLOUD_BUCKET,
    prefix: env.MEDIA_BACKUP_CLOUD_PREFIX,
  }
}

export function createBackupConfigFromEnv(input: Readonly<Record<string, string | undefined>> = process.env): BackupConfig {
  const env = envSchema.parse(input)
  const databaseName = env.DB_NAME ?? 'mnx_agent'
  const pgDumpCommand = env.PG_DUMP_COMMAND ?? `pg_dump ${databaseName}`

  return {
    sourceDir: env.MEDIA_SOURCE_DIR ?? path.join(process.cwd(), 'data/media'),
    backupRoot: env.MEDIA_BACKUP_ROOT ?? path.join(process.env.HOME ?? process.cwd(), 'data/mnx-agent/media'),
    databaseName,
    pgDumpCommand,
    retentionDays: Number(env.MEDIA_BACKUP_RETENTION_DAYS ?? '7'),
    cloud: toCloudConfig(env),
  }
}

export class BackupService {
  private readonly runner: BackupCommandRunner
  private readonly now: () => Date

  constructor(dependencies: BackupServiceDependencies = {}) {
    this.runner = dependencies.runner ?? defaultRunner
    this.now = dependencies.now ?? (() => new Date())
  }

  async createSnapshot(config: BackupConfig): Promise<BackupResult> {
    const snapshotId = formatSnapshotId(this.now())
    const snapshotDir = path.join(config.backupRoot, snapshotId)
    const mediaDir = path.join(snapshotDir, 'media')
    const pgDumpCommand = config.pgDumpCommand ?? `pg_dump ${config.databaseName}`

    await this.runner(`mkdir -p ${shellQuote(mediaDir)}`)
    await this.runner(`rsync -a --delete ${shellQuote(`${config.sourceDir}/`)} ${shellQuote(`${mediaDir}/`)}`)
    await this.runner(`${pgDumpCommand} > ${shellQuote(path.join(snapshotDir, 'mnx_agent.sql'))}`)

    let cloudTarget: string | undefined
    if (config.cloud.enabled) {
      cloudTarget = buildCloudTarget(config.cloud, snapshotId)
      await this.runner(`rclone sync ${shellQuote(snapshotDir)} ${shellQuote(cloudTarget)}`)
    }

    await this.runner(`find ${shellQuote(config.backupRoot)} -mindepth 1 -maxdepth 1 -type d -name "20*" -mtime +${config.retentionDays} -exec rm -rf {} +`)

    return {
      snapshotId,
      snapshotDir,
      uploaded: config.cloud.enabled,
      cloudTarget,
    }
  }
}
