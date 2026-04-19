import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MisfireHandler, createMisfireHandler } from '../misfire-handler.js'
import { MisfirePolicy } from '../../database/types.js'
import type { CronJob } from '../../database/types.js'
import type { ExecuteJobCallback } from '../interfaces/misfire-handler.interface.js'

describe('MisfireHandler', () => {
  let handler: MisfireHandler
  let mockExecuteJobCallback: ExecuteJobCallback
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  const createMockJob = (overrides?: Partial<CronJob>): CronJob => ({
    id: 'job-1',
    name: 'Test Job',
    description: null,
    cron_expression: '0 * * * *',
    timezone: 'UTC',
    workflow_id: null,
    owner_id: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_run_at: null,
    next_run_at: new Date(Date.now() - 60000).toISOString(),
    total_runs: 0,
    total_failures: 0,
    timeout_ms: 300000,
    misfire_policy: MisfirePolicy.FIRE_ONCE,
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    handler = new MisfireHandler()
    mockExecuteJobCallback = vi.fn((_job: CronJob) => Promise.resolve())
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================================================
  // createMisfireHandler Factory Function
  // ============================================================================

  describe('createMisfireHandler', () => {
    it('should create a MisfireHandler instance', () => {
      const callback = vi.fn().mockResolvedValue(undefined)
      const result = createMisfireHandler(callback)
      expect(result).toBeInstanceOf(MisfireHandler)
    })

    it('should set the executeJobCallback immediately', () => {
      const callback = vi.fn().mockResolvedValue(undefined)
      const result = createMisfireHandler(callback)

      const job = createMockJob()
      result.handleMisfire(job)

      expect(callback).toHaveBeenCalledWith(job)
    })

    it('should allow callback to be called right after creation', async () => {
      const callback = vi.fn().mockResolvedValue(undefined)
      const result = createMisfireHandler(callback)

      const job = createMockJob()
      await result.handleMisfire(job)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(job)
    })
  })

  // ============================================================================
  // setExecuteJobCallback Method
  // ============================================================================

  describe('setExecuteJobCallback', () => {
    it('should store the callback', () => {
      const callback = vi.fn().mockResolvedValue(undefined)
      handler.setExecuteJobCallback(callback)
      // The callback is stored internally, we verify this through handleMisfire
    })

    it('should allow setting callback multiple times', () => {
      const callback1 = vi.fn().mockResolvedValue(undefined)
      const callback2 = vi.fn().mockResolvedValue(undefined)

      handler.setExecuteJobCallback(callback1)
      handler.setExecuteJobCallback(callback2)

      const job = createMockJob()
      handler.handleMisfire(job)

      // Only the second callback should be called
      expect(callback2).toHaveBeenCalledWith(job)
      expect(callback1).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // handleMisfire Method
  // ============================================================================

  describe('handleMisfire', () => {
    it('should execute callback when job misfires with FIRE_ONCE policy', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const job = createMockJob({ misfire_policy: MisfirePolicy.FIRE_ONCE })

      await handler.handleMisfire(job)

      expect(mockExecuteJobCallback).toHaveBeenCalledWith(job)
    })

    it('should execute callback when job misfires with FIRE_ALL policy', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const job = createMockJob({ misfire_policy: MisfirePolicy.FIRE_ALL })

      await handler.handleMisfire(job)

      expect(mockExecuteJobCallback).toHaveBeenCalledWith(job)
    })

    it('should NOT execute callback when policy is IGNORE', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const job = createMockJob({ misfire_policy: MisfirePolicy.IGNORE })

      await handler.handleMisfire(job)

      expect(mockExecuteJobCallback).not.toHaveBeenCalled()
    })

    it('should NOT execute callback when executeJobCallback is not set', async () => {
      const job = createMockJob()

      await handler.handleMisfire(job)

      expect(mockExecuteJobCallback).not.toHaveBeenCalled()
    })

    it('should handle callback errors gracefully', async () => {
      const errorCallback = vi.fn().mockRejectedValue(new Error('Callback failed'))
      handler.setExecuteJobCallback(errorCallback)
      const job = createMockJob()

      // Should not throw
      await expect(handler.handleMisfire(job)).resolves.toBeUndefined()

      expect(errorCallback).toHaveBeenCalledWith(job)
    })

    it('should log misfire detection info', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const job = createMockJob({ id: 'test-job', name: 'Test Job Name' })

      await handler.handleMisfire(job)

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Misfire detected')
      )
    })

    it('should log catch-up completion info on success', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const job = createMockJob({ id: 'test-job', name: 'Test Job Name' })

      await handler.handleMisfire(job)

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Catch-up execution completed')
      )
    })

    it('should log error when callback fails', async () => {
      const failingCallback = vi.fn().mockRejectedValue(new Error('Test error'))
      handler.setExecuteJobCallback(failingCallback)
      const job = createMockJob({ id: 'test-job', name: 'Test Job Name' })

      await handler.handleMisfire(job)

      expect(consoleErrorSpy).toHaveBeenCalled()
      const firstCallArgs = consoleErrorSpy.mock.calls[0]
      expect(firstCallArgs[0]).toContain('Catch-up execution failed')
    })

    it('should log info when misfire is ignored', async () => {
      const job = createMockJob({ misfire_policy: MisfirePolicy.IGNORE, id: 'ignored-job', name: 'Ignored Job' })

      await handler.handleMisfire(job)

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('misfire ignored')
      )
    })

    it('should warn when FIRE_ALL policy is used', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const job = createMockJob({ misfire_policy: MisfirePolicy.FIRE_ALL, id: 'fire-all-job', name: 'Fire All Job' })

      await handler.handleMisfire(job)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('fire_all')
      )
    })

    it('should log error when callback is not set', async () => {
      const job = createMockJob({ id: 'no-callback-job', name: 'No Callback Job' })

      await handler.handleMisfire(job)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No executeJobCallback set')
      )
    })

    it('should return Promise<void>', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const job = createMockJob()

      const result = handler.handleMisfire(job)

      expect(result).toBeInstanceOf(Promise)
      await result
    })
  })

  // ============================================================================
  // checkAndHandleMisfires Method
  // ============================================================================

  describe('checkAndHandleMisfires', () => {
    it('should return early when jobs array is empty', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)

      await handler.checkAndHandleMisfires([])

      expect(mockExecuteJobCallback).not.toHaveBeenCalled()
    })

    it('should identify jobs with past next_run_at as misfired', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const pastTime = new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      const futureTime = new Date(Date.now() + 3600000).toISOString() // 1 hour from now

      const jobs = [
        createMockJob({ id: 'past-job', next_run_at: pastTime, is_active: true }),
        createMockJob({ id: 'future-job', next_run_at: futureTime, is_active: true }),
      ]

      await handler.checkAndHandleMisfires(jobs)

      // Advance timers to allow async setTimeout handlers to execute
      await vi.runAllTimersAsync()

      // Only past job should be handled
      expect(mockExecuteJobCallback).toHaveBeenCalledTimes(1)
      expect(mockExecuteJobCallback).toHaveBeenCalledWith(jobs[0])
    })

    it('should skip inactive jobs', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const pastTime = new Date(Date.now() - 3600000).toISOString()

      const jobs = [
        createMockJob({ id: 'inactive-job', next_run_at: pastTime, is_active: false }),
      ]

      await handler.checkAndHandleMisfires(jobs)

      await vi.runAllTimersAsync()

      expect(mockExecuteJobCallback).not.toHaveBeenCalled()
    })

    it('should skip jobs with no next_run_at', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)

      const jobs = [
        createMockJob({ id: 'no-next-run', next_run_at: null, is_active: true }),
      ]

      await handler.checkAndHandleMisfires(jobs)

      await vi.runAllTimersAsync()

      expect(mockExecuteJobCallback).not.toHaveBeenCalled()
    })

    it('should handle multiple misfired jobs with staggered delays', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const pastTime = new Date(Date.now() - 3600000).toISOString()

      const jobs = [
        createMockJob({ id: 'job-1', next_run_at: pastTime }),
        createMockJob({ id: 'job-2', next_run_at: pastTime }),
        createMockJob({ id: 'job-3', next_run_at: pastTime }),
      ]

      await handler.checkAndHandleMisfires(jobs)

      // Jobs should not be called immediately (they are scheduled with delay)
      expect(mockExecuteJobCallback).not.toHaveBeenCalled()

      // Advance timers to execute all setTimeout callbacks
      await vi.runAllTimersAsync()

      // All jobs should eventually be handled
      expect(mockExecuteJobCallback).toHaveBeenCalledTimes(3)
    })

    it('should log detection info for misfired jobs', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const pastTime = new Date(Date.now() - 3600000).toISOString()

      const jobs = [
        createMockJob({ id: 'job-1', next_run_at: pastTime }),
        createMockJob({ id: 'job-2', next_run_at: pastTime }),
      ]

      await handler.checkAndHandleMisfires(jobs)

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Detected')
      )
    })

    it('should return early when no jobs are misfired', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const futureTime = new Date(Date.now() + 3600000).toISOString()

      const jobs = [
        createMockJob({ id: 'future-job-1', next_run_at: futureTime }),
        createMockJob({ id: 'future-job-2', next_run_at: futureTime }),
      ]

      await handler.checkAndHandleMisfires(jobs)

      expect(consoleInfoSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Detected')
      )
      expect(mockExecuteJobCallback).not.toHaveBeenCalled()
    })

    it('should handle mixed active and inactive misfired jobs', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const pastTime = new Date(Date.now() - 3600000).toISOString()

      const jobs = [
        createMockJob({ id: 'active-1', next_run_at: pastTime, is_active: true }),
        createMockJob({ id: 'inactive-1', next_run_at: pastTime, is_active: false }),
        createMockJob({ id: 'active-2', next_run_at: pastTime, is_active: true }),
      ]

      await handler.checkAndHandleMisfires(jobs)

      await vi.runAllTimersAsync()

      // Only active jobs should be handled
      expect(mockExecuteJobCallback).toHaveBeenCalledTimes(2)
    })

    it('should handle mixed misfired and non-misfired jobs', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const pastTime = new Date(Date.now() - 3600000).toISOString()
      const futureTime = new Date(Date.now() + 3600000).toISOString()

      const jobs = [
        createMockJob({ id: 'misfired-1', next_run_at: pastTime, is_active: true }),
        createMockJob({ id: 'misfired-2', next_run_at: pastTime, is_active: true }),
        createMockJob({ id: 'not-misfired', next_run_at: futureTime, is_active: true }),
      ]

      await handler.checkAndHandleMisfires(jobs)

      await vi.runAllTimersAsync()

      expect(mockExecuteJobCallback).toHaveBeenCalledTimes(2)
    })

    it('should return Promise<void>', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const pastTime = new Date(Date.now() - 3600000).toISOString()
      const jobs = [createMockJob({ next_run_at: pastTime })]

      const result = handler.checkAndHandleMisfires(jobs)

      expect(result).toBeInstanceOf(Promise)
      await result
    })

    it('should handle IGNORE policy jobs without executing callback', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const pastTime = new Date(Date.now() - 3600000).toISOString()

      const jobs = [
        createMockJob({ id: 'ignore-job', next_run_at: pastTime, misfire_policy: MisfirePolicy.IGNORE }),
      ]

      await handler.checkAndHandleMisfires(jobs)

      await vi.runAllTimersAsync()

      // IGNORE policy should skip execution
      expect(mockExecuteJobCallback).not.toHaveBeenCalled()
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('misfire ignored')
      )
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle job with null description', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const job = createMockJob({ description: null })

      await handler.handleMisfire(job)

      expect(mockExecuteJobCallback).toHaveBeenCalled()
    })

    it('should handle job with null workflow_id', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const job = createMockJob({ workflow_id: null })

      await handler.handleMisfire(job)

      expect(mockExecuteJobCallback).toHaveBeenCalled()
    })

    it('should handle job with null owner_id', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const job = createMockJob({ owner_id: null })

      await handler.handleMisfire(job)

      expect(mockExecuteJobCallback).toHaveBeenCalled()
    })

    it('should handle very old misfire times', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const veryOldTime = new Date(Date.now() - 86400000 * 30).toISOString() // 30 days ago
      const job = createMockJob({ next_run_at: veryOldTime })

      await handler.checkAndHandleMisfires([job])

      await vi.runAllTimersAsync()

      expect(mockExecuteJobCallback).toHaveBeenCalled()
    })

    it('should handle job with zero timeout_ms', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const job = createMockJob({ timeout_ms: 0 })

      await handler.handleMisfire(job)

      expect(mockExecuteJobCallback).toHaveBeenCalled()
    })

    it('should handle concurrent handleMisfire calls', async () => {
      handler.setExecuteJobCallback(mockExecuteJobCallback)
      const jobs = [
        createMockJob({ id: 'job-1' }),
        createMockJob({ id: 'job-2' }),
        createMockJob({ id: 'job-3' }),
      ]

      await Promise.all(jobs.map(job => handler.handleMisfire(job)))

      expect(mockExecuteJobCallback).toHaveBeenCalledTimes(3)
    })
  })
})
