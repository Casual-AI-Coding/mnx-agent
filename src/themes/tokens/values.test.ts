import { describe, it, expect } from 'vitest'
import { status, taskStatus, services, roles } from './values'
import type { StatusType, TaskStatusType, ServiceType, RoleType } from './semantic'

describe('Semantic Tokens', () => {
  describe('status tokens', () => {
    const statusKeys: StatusType[] = ['success', 'warning', 'error', 'info', 'pending']

    statusKeys.forEach((key) => {
      it(`should have all required properties for ${key}`, () => {
        const token = status[key]
        expect(token.bg).toBeDefined()
        expect(token.bgSubtle).toBeDefined()
        expect(token.text).toBeDefined()
        expect(token.border).toBeDefined()
        expect(token.icon).toBeDefined()
        expect(token.foreground).toBeDefined()
      })

      it(`should use CSS variable classes for ${key}`, () => {
        const token = status[key]
        // Should use semantic class names, not hardcoded colors
        expect(token.bg).not.toMatch(/blue-|green-|red-|yellow-|purple-/)
        expect(token.bg).toMatch(/^bg-/)
      })
    })
  })

  describe('taskStatus tokens', () => {
    const taskKeys: TaskStatusType[] = ['pending', 'running', 'completed', 'failed', 'cancelled']

    taskKeys.forEach((key) => {
      it(`should have all required properties for ${key}`, () => {
        const token = taskStatus[key]
        expect(token.bg).toBeDefined()
        expect(token.text).toBeDefined()
        expect(token.border).toBeDefined()
        expect(token.dot).toBeDefined()
      })
    })
  })

  describe('services tokens', () => {
    const serviceKeys: ServiceType[] = ['text', 'voice', 'image', 'music', 'video', 'cron', 'workflow']

    serviceKeys.forEach((key) => {
      it(`should have all required properties for ${key}`, () => {
        const token = services[key]
        expect(token.bg).toBeDefined()
        expect(token.text).toBeDefined()
        expect(token.icon).toBeDefined()
      })
    })
  })

  describe('roles tokens', () => {
    const roleKeys: RoleType[] = ['super', 'admin', 'pro', 'user']

    roleKeys.forEach((key) => {
      it(`should have all required properties for ${key}`, () => {
        const token = roles[key]
        expect(token.gradient).toBeDefined()
        expect(token.bg).toBeDefined()
        expect(token.bgLight).toBeDefined()
        expect(token.text).toBeDefined()
        expect(token.border).toBeDefined()
      })
    })
  })
})