import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'

describe('MediaService 仓储化契约', () => {
  it('MediaService 构造函数不依赖 DatabaseService', () => {
    const source = readFileSync('server/services/domain/media.service.ts', 'utf-8')
    expect(source).toContain('MediaRepository')
    expect(source).toContain('private readonly mediaRepo')
    expect(source).not.toContain('private readonly db: DatabaseService')
  })
})
