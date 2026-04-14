import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JobRepository } from '../job-repository'
import { DatabaseConnection } from '../../database/connection'

describe('JobRepository - Comprehensive', () => {
  let mockDb: DatabaseConnection

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = {
      query: vi.fn(),
      execute: vi.fn(),
      transaction: vi.fn(async (fn) => {
        const txConnection = {
          query: mockDb.query,
          execute: mockDb.execute,
          isPostgres: mockDb.isPostgres,
        }
        return await fn(txConnection as unknown as DatabaseConnection)
      }),
      isPostgres: vi.fn().mockReturnValue(true),
    } as unknown as DatabaseConnection
  })

  describe('getActive filtering', () => {
    it('should return only active jobs without owner filter', async () => {
      const mockRows = [
        {
          id: 'job-1',
          name: 'Active Job 1',
          is_active: true,
          owner_id: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'job-2',
          name: 'Active Job 2',
          is_active: true,
          owner_id: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.getActive()

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM cron_jobs WHERE is_active = true ORDER BY created_at DESC'
      )
      expect(result).toHaveLength(2)
      expect(result[0].is_active).toBe(true)
    })

    it('should return only active jobs for specific owner', async () => {
      const mockRows = [
        {
          id: 'job-1',
          name: 'My Active Job',
          is_active: true,
          owner_id: 'owner-1',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.getActive('owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM cron_jobs WHERE is_active = true AND owner_id = $1 ORDER BY created_at DESC',
        ['owner-1']
      )
      expect(result).toHaveLength(1)
      expect(result[0].owner_id).toBe('owner-1')
    })
  })

  describe('updateRunStats', () => {
    it('should increment total_runs and total_failures on failure', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([{
        id: 'job-1',
        name: 'Test Job',
        is_active: true,
        total_runs: 5,
        total_failures: 2,
        owner_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.updateRunStats('job-1', { success: false })

      expect(mockDb.execute).toHaveBeenCalledWith(
        'UPDATE cron_jobs SET total_runs = total_runs + 1, total_failures = total_failures + $1, last_run_at = $2, updated_at = $3 WHERE id = $4',
        expect.arrayContaining([1, expect.any(String), expect.any(String), 'job-1'])
      )
      expect(result).not.toBeNull()
      expect(result?.total_runs).toBe(5)
      expect(result?.total_failures).toBe(2)
    })

    it('should increment total_runs only (not failures) on success', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([{
        id: 'job-1',
        name: 'Test Job',
        is_active: true,
        total_runs: 5,
        total_failures: 2,
        owner_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }] as any)

      const repo = new JobRepository(mockDb)
      await repo.updateRunStats('job-1', { success: true })

      expect(mockDb.execute).toHaveBeenCalledWith(
        'UPDATE cron_jobs SET total_runs = total_runs + 1, total_failures = total_failures + $1, last_run_at = $2, updated_at = $3 WHERE id = $4',
        expect.arrayContaining([0, expect.any(String), expect.any(String), 'job-1'])
      )
    })

    it('should return null when job not found with owner filter', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 0 } as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.updateRunStats('job-1', { success: true }, 'owner-1')

      expect(result).toBeNull()
    })

    it('should apply owner filter when provided', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([{
        id: 'job-1',
        name: 'Test Job',
        is_active: true,
        total_runs: 1,
        total_failures: 0,
        owner_id: 'owner-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.updateRunStats('job-1', { success: true }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        'UPDATE cron_jobs SET total_runs = total_runs + 1, total_failures = total_failures + $1, last_run_at = $2, updated_at = $3 WHERE id = $4 AND owner_id = $5',
        expect.arrayContaining([0, expect.any(String), expect.any(String), 'job-1', 'owner-1'])
      )
      expect(result).not.toBeNull()
    })
  })

  describe('dependencies', () => {
    it('should add dependency between jobs', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new JobRepository(mockDb)
      await repo.addDependency('job-1', 'job-2')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO job_dependencies'),
        expect.arrayContaining(['job-1', 'job-2'])
      )
    })

    it('should remove dependency between jobs', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new JobRepository(mockDb)
      await repo.removeDependency('job-1', 'job-2')

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM job_dependencies WHERE job_id = $1 AND depends_on_job_id = $2',
        ['job-1', 'job-2']
      )
    })

    it('should get dependencies for a job', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { depends_on_job_id: 'job-2' },
        { depends_on_job_id: 'job-3' },
      ] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.getDependencies('job-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT depends_on_job_id FROM job_dependencies WHERE job_id = $1 ORDER BY created_at',
        ['job-1']
      )
      expect(result).toEqual(['job-2', 'job-3'])
    })

    it('should get dependents for a job', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { job_id: 'job-4' },
        { job_id: 'job-5' },
      ] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.getDependents('job-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT job_id FROM job_dependencies WHERE depends_on_job_id = $1 ORDER BY created_at',
        ['job-1']
      )
      expect(result).toEqual(['job-4', 'job-5'])
    })

    it('should detect circular dependency', async () => {
      const getDepMock = vi.fn()
        .mockResolvedValueOnce([{ depends_on_job_id: 'job-1' }] as any)
        .mockResolvedValueOnce([{ depends_on_job_id: 'job-2' }] as any)
      const testDb = { ...mockDb, query: getDepMock }

      const repo = new JobRepository(testDb as any)
      const result = await repo.hasCircularDependency('job-1', 'job-2')

      expect(result).toBe(true)
    })

    it('should not detect circular dependency when none exists', async () => {
      const getDepMock = vi.fn()
        .mockResolvedValue([{ depends_on_job_id: 'job-4' }] as any)
      const testDb = { ...mockDb, query: getDepMock }

      const repo = new JobRepository(testDb as any)
      const result = await repo.hasCircularDependency('job-1', 'job-3')

      expect(result).toBe(false)
    })

    it('should not detect circular dependency when none exists', async () => {
      const querySpy = vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce([{ depends_on_job_id: 'job-3' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.hasCircularDependency('job-1', 'job-3')

      expect(result).toBe(false)
    })
  })

  describe('tags', () => {
    it('should add tag to job', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new JobRepository(mockDb)
      await repo.addTag('job-1', 'important')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO job_tags'),
        expect.arrayContaining(['job-1', 'important'])
      )
    })

    it('should remove tag from job', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new JobRepository(mockDb)
      await repo.removeTag('job-1', 'important')

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM job_tags WHERE job_id = $1 AND tag = $2',
        ['job-1', 'important']
      )
    })

    it('should get tags for a job', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { tag: 'important' },
        { tag: 'daily' },
        { tag: 'workflow' },
      ] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.getTags('job-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT tag FROM job_tags WHERE job_id = $1 ORDER BY tag',
        ['job-1']
      )
      expect(result).toEqual(['important', 'daily', 'workflow'])
    })

    it('should get jobs by tag with owner filter', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'job-1', name: 'Job 1', is_active: true, owner_id: 'owner-1', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
      ] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.getByTag('important', 'owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN job_tags'),
        ['important', 'owner-1']
      )
      expect(result).toHaveLength(1)
    })

    it('should get all tags with counts', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { tag: 'important', count: '5' },
        { tag: 'daily', count: '10' },
      ] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.getAllTags()

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT tag, COUNT(*) as count FROM job_tags GROUP BY tag ORDER BY tag'
      )
      expect(result).toEqual([
        { tag: 'important', count: 5 },
        { tag: 'daily', count: 10 },
      ])
    })
  })
})