import { describe, it, expect } from 'vitest'
import { ROLE_HIERARCHY } from '../types/workflow'

describe('Role Hierarchy', () => {
  it('should be defined in workflow types', () => {
    expect(ROLE_HIERARCHY).toBeDefined()
    expect(ROLE_HIERARCHY.user).toBe(0)
    expect(ROLE_HIERARCHY.pro).toBe(1)
    expect(ROLE_HIERARCHY.admin).toBe(2)
    expect(ROLE_HIERARCHY.super).toBe(3)
  })
})