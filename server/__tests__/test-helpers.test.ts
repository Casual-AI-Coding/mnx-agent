import { beforeEach, describe, expect, it } from 'vitest'
import { getTestFileMarker, resetTestFileMarker } from './test-helpers.js'

describe('test-helpers', () => {
  beforeEach(() => {
    resetTestFileMarker()
  })

  it('对同一测试文件 URL 返回稳定 marker', () => {
    const firstMarker = getTestFileMarker('file:///tests/a.test.ts')
    const secondMarker = getTestFileMarker('file:///tests/a.test.ts')

    expect(firstMarker).toBe(secondMarker)
  })

  it('对不同测试文件 URL 返回不同 marker', () => {
    const firstMarker = getTestFileMarker('file:///tests/a.test.ts')
    const secondMarker = getTestFileMarker('file:///tests/b.test.ts')

    expect(firstMarker).not.toBe(secondMarker)
  })
})
