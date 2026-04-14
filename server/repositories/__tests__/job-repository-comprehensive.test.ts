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

    it('should get jobs by tag without owner filter', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'job-1', name: 'Job 1', is_active: true, owner_id: 'owner-1', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
        { id: 'job-2', name: 'Job 2', is_active: true, owner_id: 'owner-2', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
      ] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.getByTag('important')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE jt.tag = $1'),
        ['important']
      )
      expect(result).toHaveLength(2)
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

  describe('getAll', () => {
    it('should return all jobs without owner filter', async () => {
      const mockRows = [
        { id: 'job-1', name: 'Job 1', is_active: true, owner_id: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
        { id: 'job-2', name: 'Job 2', is_active: false, owner_id: null, created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.getAll()

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM cron_jobs ORDER BY created_at DESC'
      )
      expect(result).toHaveLength(2)
    })

    it('should return all jobs for specific owner', async () => {
      const mockRows = [
        { id: 'job-1', name: 'My Job', is_active: true, owner_id: 'owner-1', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.getAll('owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM cron_jobs WHERE owner_id = $1 ORDER BY created_at DESC',
        ['owner-1']
      )
      expect(result).toHaveLength(1)
      expect(result[0].owner_id).toBe('owner-1')
    })
  })

  describe('getById edge cases', () => {
    it('should return null when job not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.getById('non-existent-id')

      expect(result).toBeNull()
    })

    it('should return null when job not found with owner filter', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.getById('non-existent-id', 'owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM cron_jobs WHERE id = $1 AND owner_id = $2',
        ['non-existent-id', 'owner-1']
      )
      expect(result).toBeNull()
    })

    it('should return job when found without owner', async () => {
      const mockRow = {
        id: 'job-1',
        name: 'Test Job',
        is_active: true,
        owner_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.getById('job-1')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('job-1')
    })

    it('should return job when found with matching owner', async () => {
      const mockRow = {
        id: 'job-1',
        name: 'Test Job',
        is_active: true,
        owner_id: 'owner-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.getById('job-1', 'owner-1')

      expect(result).not.toBeNull()
      expect(result?.owner_id).toBe('owner-1')
    })
  })

  describe('update with various fields', () => {
    const existingJob = {
      id: 'job-1',
      name: 'Original Name',
      description: 'Original description',
      cron_expression: '0 * * * *',
      is_active: true,
      workflow_id: null,
      timezone: 'UTC',
      last_run_at: null,
      next_run_at: null,
      total_runs: 0,
      total_failures: 0,
      timeout_ms: 300000,
      misfire_policy: 'fire_once',
      owner_id: 'owner-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    beforeEach(() => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingJob] as any)
        .mockResolvedValueOnce([{ ...existingJob, name: 'New Name' }] as any)
    })

    it('should update name field', async () => {
      const repo = new JobRepository(mockDb)
      const result = await repo.update('job-1', { name: 'New Name' }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('name = $1'),
        expect.arrayContaining(['New Name'])
      )
      expect(result?.name).toBe('New Name')
    })

    it('should update description field', async () => {
      const repo = new JobRepository(mockDb)
      await repo.update('job-1', { description: 'New description' }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('description = $1'),
        expect.arrayContaining(['New description'])
      )
    })

    it('should update cron_expression field', async () => {
      const repo = new JobRepository(mockDb)
      await repo.update('job-1', { cron_expression: '0 0 * * *' }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('cron_expression = $1'),
        expect.arrayContaining(['0 0 * * *'])
      )
    })

    it('should update is_active field', async () => {
      const repo = new JobRepository(mockDb)
      await repo.update('job-1', { is_active: false }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('is_active = $1'),
        expect.arrayContaining([false])
      )
    })

    it('should update workflow_id field', async () => {
      const repo = new JobRepository(mockDb)
      await repo.update('job-1', { workflow_id: 'workflow-1' }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('workflow_id = $1'),
        expect.arrayContaining(['workflow-1'])
      )
    })

    it('should update timezone field', async () => {
      const repo = new JobRepository(mockDb)
      await repo.update('job-1', { timezone: 'Asia/Shanghai' }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('timezone = $1'),
        expect.arrayContaining(['Asia/Shanghai'])
      )
    })

    it('should update last_run_at field', async () => {
      const repo = new JobRepository(mockDb)
      const date = '2026-01-15T10:00:00Z'
      await repo.update('job-1', { last_run_at: date }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('last_run_at = $1'),
        expect.arrayContaining([date])
      )
    })

    it('should update next_run_at field', async () => {
      const repo = new JobRepository(mockDb)
      const date = '2026-01-16T10:00:00Z'
      await repo.update('job-1', { next_run_at: date }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('next_run_at = $1'),
        expect.arrayContaining([date])
      )
    })

    it('should update total_runs field', async () => {
      const repo = new JobRepository(mockDb)
      await repo.update('job-1', { total_runs: 100 }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('total_runs = $1'),
        expect.arrayContaining([100])
      )
    })

    it('should update total_failures field', async () => {
      const repo = new JobRepository(mockDb)
      await repo.update('job-1', { total_failures: 5 }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('total_failures = $1'),
        expect.arrayContaining([5])
      )
    })

    it('should update timeout_ms field', async () => {
      const repo = new JobRepository(mockDb)
      await repo.update('job-1', { timeout_ms: 600000 }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('timeout_ms = $1'),
        expect.arrayContaining([600000])
      )
    })

    it('should update misfire_policy field', async () => {
      const repo = new JobRepository(mockDb)
      await repo.update('job-1', { misfire_policy: 'fire_once' }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('misfire_policy = $1'),
        expect.arrayContaining(['fire_once'])
      )
    })

    it('should update multiple fields at once', async () => {
      const repo = new JobRepository(mockDb)
      await repo.update('job-1', {
        name: 'New Name',
        description: 'New description',
        is_active: false,
      }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('name = $1'),
        expect.arrayContaining(['New Name', 'New description', false])
      )
    })

    it('should return existing when no fields to update', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([existingJob] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.update('job-1', {}, 'owner-1')

      expect(mockDb.execute).not.toHaveBeenCalled()
      expect(result?.name).toBe('Original Name')
    })

    it('should return null when job not found for update', async () => {
      mockDb.query = vi.fn().mockResolvedValueOnce([] as any)
      mockDb.execute = vi.fn()

      const repo = new JobRepository(mockDb)
      const result = await repo.update('non-existent', { name: 'New Name' }, 'owner-1')

      expect(result).toBeNull()
    })
  })

  describe('toggleActive', () => {
    it('should toggle job from active to inactive', async () => {
      const activeJob = {
        id: 'job-1',
        name: 'Test Job',
        is_active: true,
        owner_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([activeJob] as any)
        .mockResolvedValueOnce([{ ...activeJob, is_active: false }] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.toggleActive('job-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE cron_jobs SET is_active = $1'),
        expect.arrayContaining([false])
      )
      expect(result?.is_active).toBe(false)
    })

    it('should toggle job from inactive to active', async () => {
      const inactiveJob = {
        id: 'job-1',
        name: 'Test Job',
        is_active: false,
        owner_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([inactiveJob] as any)
        .mockResolvedValueOnce([{ ...inactiveJob, is_active: true }] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.toggleActive('job-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE cron_jobs SET is_active = $1'),
        expect.arrayContaining([true])
      )
      expect(result?.is_active).toBe(true)
    })

    it('should return null when job not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.toggleActive('non-existent')

      expect(result).toBeNull()
    })

    it('should apply owner filter when toggling', async () => {
      const activeJob = {
        id: 'job-1',
        name: 'Test Job',
        is_active: true,
        owner_id: 'owner-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      mockDb.query = vi.fn()
        .mockResolvedValueOnce([activeJob] as any)
        .mockResolvedValueOnce([{ ...activeJob, is_active: false }] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.toggleActive('job-1', 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE cron_jobs SET is_active = $1, updated_at = $2 WHERE id = $3'),
        expect.arrayContaining([false, expect.any(String), 'job-1'])
      )
      expect(result).not.toBeNull()
    })
  })

  describe('updateLastRun', () => {
    it('should update last_run_at and next_run_at', async () => {
      const job = {
        id: 'job-1',
        name: 'Test Job',
        is_active: true,
        owner_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([job] as any)
        .mockResolvedValueOnce([job] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.updateLastRun('job-1', '2026-01-16T10:00:00Z')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE cron_jobs SET last_run_at = $1, next_run_at = $2'),
        expect.arrayContaining(['2026-01-16T10:00:00Z'])
      )
      expect(result).not.toBeNull()
    })

    it('should apply owner filter when updating last run', async () => {
      const job = {
        id: 'job-1',
        name: 'Test Job',
        is_active: true,
        owner_id: 'owner-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([job] as any)
        .mockResolvedValueOnce([job] as any)

      const repo = new JobRepository(mockDb)
      const result = await repo.updateLastRun('job-1', '2026-01-16T10:00:00Z', 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $4 AND owner_id = $5'),
        expect.arrayContaining(['owner-1'])
      )
      expect(result).not.toBeNull()
    })
  })
})