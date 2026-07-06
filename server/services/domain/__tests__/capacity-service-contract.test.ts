import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'

describe('CapacityService 仓储化契约', () => {
  it('CapacityService 构造函数不依赖 DatabaseService', () => {
    const source = readFileSync('server/services/domain/capacity.service.ts', 'utf-8')
    expect(source).toContain('CapacityRepository')
    expect(source).toContain('private readonly capacityRepo')
    expect(source).not.toContain('private readonly db: DatabaseService')
  })
})
