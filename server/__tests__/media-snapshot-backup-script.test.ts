import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const projectRoot = path.resolve(__dirname, '../..')
const scriptPath = path.join(projectRoot, 'scripts/media-snapshot-backup.sh')
const tempRoots: string[] = []

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'mnx-media-backup-test-'))
  tempRoots.push(root)
  return root
}

async function writeExecutable(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, { mode: 0o755 })
}

describe('media-snapshot-backup.sh', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
  })

  it('uploads the completed snapshot to configured R2 remote after local backup succeeds', async () => {
    const tempRoot = await createTempRoot()
    const binDir = path.join(tempRoot, 'bin')
    const homeDir = path.join(tempRoot, 'home')
    const commandLog = path.join(tempRoot, 'commands.log')
    await mkdir(binDir, { recursive: true })
    await mkdir(homeDir, { recursive: true })
    await mkdir(path.join(projectRoot, 'data/media'), { recursive: true })

    await writeExecutable(path.join(binDir, 'rsync'), `#!/bin/bash\necho "rsync $*" >> "${commandLog}"\nmkdir -p "$3"\n`)
    await writeExecutable(path.join(binDir, 'pg_dump'), `#!/bin/bash\necho "pg_dump $*" >> "${commandLog}"\nprintf 'SQL dump'\n`)
    await writeExecutable(path.join(binDir, 'rclone'), `#!/bin/bash\necho "rclone $*" >> "${commandLog}"\n`)

    await execFileAsync('bash', [scriptPath], {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH ?? ''}`,
        HOME: homeDir,
        MEDIA_BACKUP_CLOUD_ENABLED: 'true',
        MEDIA_BACKUP_CLOUD_PROVIDER: 'r2',
        MEDIA_BACKUP_CLOUD_REMOTE: 'r2-prod',
        MEDIA_BACKUP_CLOUD_BUCKET: 'mnx-agent-prod',
        MEDIA_BACKUP_CLOUD_PREFIX: 'daily/media',
      },
    })

    const log = await readFile(commandLog, 'utf8')
    expect(log).toContain('rsync -av')
    expect(log).toContain('pg_dump mnx_agent')
    expect(log).toMatch(/rclone sync .* r2-prod:mnx-agent-prod\/daily\/media\/20\d{12}/)
  })
})
