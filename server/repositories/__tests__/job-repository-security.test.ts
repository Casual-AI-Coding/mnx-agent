/**
 * Security Tests for JobRepository - IDOR Prevention
 * 
 * Tests to ensure that job statistics updates are properly authorization-checked.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase, getConnection } from '../../__tests__/test-helpers.js'
import { JobRepository } from '../job-repository.js'
import type { CronJob, CreateCronJob, RunStats } from '../../database/types.js'

describe('JobRepository Security - updateRunStats IDOR Prevention', () => {
  let jobRepo: JobRepository
  let ownerAJobId: string
  let ownerBJobId: string
  const ownerAId = 'owner-a-security-test'
  const ownerBId = 'owner-b-security-test'

  beforeAll(async () => {
    await setupTestDatabase()
    jobRepo = new JobRepository(getConnection())
  })

  beforeEach(async () => {
    const conn = getConnection()
    // Clean up any existing test jobs
    await conn.execute('DELETE FROM cron_jobs WHERE owner_id IN ($1, $2)', [ownerAId, ownerBId])
    
    // Create jobs for two different owners
    const jobA: CreateCronJob = {
      name: 'Owner A Job',
      cron_expression: '0 * * * *',
    }
    const createdA = await jobRepo.create(jobA, ownerAId)
    ownerAJobId = createdA.id

    const jobB: CreateCronJob = {
      name: 'Owner B Job',
      cron_expression: '0 * * * *',
    }
    const createdB = await jobRepo.create(jobB, ownerBId)
    ownerBJobId = createdB.id
  })

  afterAll(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM cron_jobs WHERE owner_id IN ($1, $2)', [ownerAId, ownerBId])
    await teardownTestDatabase()
  })

  describe('IDOR Prevention', () => {
    it('should NOT allow owner A to update owner B job stats', async () => {
      // Owner A tries to update Owner B's job
      const stats: RunStats = {
        success: true,
        tasksExecuted: 5,
        tasksSucceeded: 5,
        tasksFailed: 0,
        durationMs: 1000,
      }

      // This should return null or 0 changes because owner doesn't match
      const result = await jobRepo.updateRunStats(ownerBJobId, stats, ownerAId)

      // The update should fail - either returning null or not updating the job
      if (result !== null) {
        // If it returned a job, verify it wasn't actually updated
        const originalJob = await jobRepo.getById(ownerBJobId, ownerBId)
        expect(originalJob?.total_runs).toBe(0)
        expect(originalJob?.total_failures).toBe(0)
      }

      // Verify owner B can still read their own job with correct stats
      const ownerBJob = await jobRepo.getById(ownerBJobId, ownerBId)
      expect(ownerBJob?.total_runs).toBe(0) // No update should have occurred
    })

    it('should allow owner A to update their own job stats', async () => {
      const stats: RunStats = {
        success: true,
        tasksExecuted: 3,
        tasksSucceeded: 3,
        tasksFailed: 0,
        durationMs: 500,
      }

      // Owner A updates their own job - should succeed
      const result = await jobRepo.updateRunStats(ownerAJobId, stats, ownerAId)

      expect(result).not.toBeNull()
      expect(result?.total_runs).toBe(1)
      expect(result?.total_failures).toBe(0)
    })

    it('should NOT allow updating job stats with wrong ownerId', async () => {
      // Try to update with a different ownerId (ownerB trying to update ownerA's job)
      const stats: RunStats = {
        success: true,
        tasksExecuted: 1,
        tasksSucceeded: 1,
        tasksFailed: 0,
        durationMs: 100,
      }

      // With wrong ownerId, the update should return null (job not found for that owner)
      const result = await jobRepo.updateRunStats(ownerAJobId, stats, ownerBId)

      // Should return null because ownerB doesn't own ownerA's job
      expect(result).toBeNull()
      
      // Verify the job's stats weren't actually updated
      const job = await jobRepo.getById(ownerAJobId, ownerAId)
      expect(job?.total_runs).toBe(0)
    })

    it('should allow owner B to update their own job stats', async () => {
      const stats: RunStats = {
        success: false, // Mark as failure
        tasksExecuted: 2,
        tasksSucceeded: 0,
        tasksFailed: 2,
        durationMs: 200,
      }

      const result = await jobRepo.updateRunStats(ownerBJobId, stats, ownerBId)

      expect(result).not.toBeNull()
      expect(result?.total_runs).toBe(1)
      expect(result?.total_failures).toBe(1) // Should track failure
    })
  })
})
