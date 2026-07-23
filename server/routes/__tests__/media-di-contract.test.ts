import { describe, expect, it } from 'vitest'
import { readFile, readdir } from 'fs/promises'
import { resolve } from 'path'

const MEDIA_ROUTES_DIR = resolve(process.cwd(), 'server/routes/media')

/**
 * Media 路由层依赖契约
 *
 * ADR-0013 Phase B 之前，本测试断言单文件 `server/routes/media.ts` 不直接实例化
 * ExternalApiLogRepository。Phase B 拆分后路由层由 `server/routes/media/index.ts`
 * 聚合 5 个子 router (recovery/upload/download/operations/crud) 组成，契约需对
 * 整个目录的所有路由源文件成立——任何 .ts 文件都不得绕过 service-registration
 * 直接 `new ExternalApiLogRepository(...)` 或 import 数据库连接。
 */
async function listRouteSources(): Promise<string[]> {
  const entries = await readdir(MEDIA_ROUTES_DIR, { withFileTypes: true })
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts'))
    .map(entry => resolve(MEDIA_ROUTES_DIR, entry.name))
}

describe('media route dependency contract', () => {
  it('resolves external API log repository through service registration in every route file', async () => {
    const sources = await listRouteSources()
    expect(sources.length).toBeGreaterThan(0)

    const files = await Promise.all(
      sources.map(async path => ({ path, content: await readFile(path, 'utf8') })),
    )

    // recovery.ts 是唯一需要 ExternalApiLogRepository 的子域; 其它子域不需要但允许出现 getExternalApiLogRepository 调用
    const aggregated = files.map(f => f.content).join('\n')
    expect(aggregated).toContain('getExternalApiLogRepository')

    // 铁律: 任何路由文件不得直接实例化仓库或 import 数据库连接
    for (const { path, content } of files) {
      expect(content, `${path} must not instantiate repository`).not.toContain('new ExternalApiLogRepository')
      expect(content, `${path} must not import repository module`).not.toContain('../repositories/external-api-log.repository')
      expect(content, `${path} must not import database connection`).not.toContain('../database/connection')
    }
  })
})
