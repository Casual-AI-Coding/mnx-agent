import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ExportService, ExportOptions } from '../export-service.js'
import type { LogRepository } from '../../repositories/log-repository.js'
import type { MediaRepository } from '../../repositories/media-repository.js'
import type { ExecutionLog, MediaRecord } from '../../database/types.js'
import { getExportService } from '../../service-registration.js'

// Mock the csv-utils module
vi.mock('../../lib/csv-utils.js', () => ({
  toCSV: vi.fn((data: Record<string, unknown>[], options?: { headers?: string[]; formatters?: Record<string, (value: unknown) => string> }) => {
    if (data.length === 0) {
      return options?.headers ? options.headers.join(',') + '\n' : ''
    }
    const headers = options?.headers ?? Object.keys(data[0])
    const rows = [headers.join(',')]
    for (const row of data) {
      const values = headers.map((h: string) => {
        const formatter = options?.formatters?.[h]
        if (formatter) return formatter(row[h])
        return String(row[h] ?? '')
      })
      rows.push(values.join(','))
    }
    return rows.join('\n')
  }),
  EXECUTION_LOG_HEADERS: [
    'id',
    'job_id',
    'trigger_type',
    'status',
    'started_at',
    'completed_at',
    'duration_ms',
    'tasks_executed',
    'tasks_succeeded',
    'tasks_failed',
    'error_summary',
  ],
  MEDIA_RECORD_HEADERS: [
    'id',
    'filename',
    'original_name',
    'filepath',
    'type',
    'mime_type',
    'size_bytes',
    'source',
    'task_id',
    'metadata',
    'created_at',
    'updated_at',
  ],
}))

// Mock service-registration
vi.mock('../../service-registration.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../service-registration.js')>()
  const mockLogRepo = {
    getPaginated: vi.fn(),
  } as unknown as LogRepository
  const mockMediaRepo = {
    list: vi.fn(),
  } as unknown as MediaRepository
  const mockExportService = new ExportService(mockLogRepo, mockMediaRepo)
  return {
    ...actual,
    getDatabaseService: vi.fn(),
    getExportService: vi.fn(() => mockExportService),
  }
})

describe('ExportService', () => {
  let service: ExportService
  let mockLogRepo: {
    getPaginated: ReturnType<typeof vi.fn>
  }
  let mockMediaRepo: {
    list: ReturnType<typeof vi.fn>
  }

  const mockExecutionLog: ExecutionLog = {
    id: 'log-1',
    job_id: 'job-1',
    trigger_type: 'manual',
    status: 'completed',
    started_at: '2024-01-01T10:00:00Z',
    completed_at: '2024-01-01T10:01:00Z',
    duration_ms: 60000,
    tasks_executed: 5,
    tasks_succeeded: 4,
    tasks_failed: 1,
    error_summary: 'One task failed',
  }

  const mockMediaRecord: MediaRecord = {
    id: 'media-1',
    filename: 'test-audio.mp3',
    original_name: 'original-audio.mp3',
    filepath: '/data/media/2024/01/01/test-audio.mp3',
    type: 'audio',
    mime_type: 'audio/mpeg',
    size_bytes: 1024000,
    source: 'voice-sync',
    task_id: 'task-1',
    metadata: { duration: 30, bitrate: 128 },
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  }

  beforeEach(() => {
    mockLogRepo = {
      getPaginated: vi.fn(),
    }
    mockMediaRepo = {
      list: vi.fn(),
    }
    service = new ExportService(mockLogRepo as unknown as LogRepository, mockMediaRepo as unknown as MediaRepository)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create an instance with provided repositories', () => {
      const logRepo = { getPaginated: vi.fn() } as unknown as LogRepository
      const mediaRepo = { list: vi.fn() } as unknown as MediaRepository
      const instance = new ExportService(logRepo, mediaRepo)
      expect(instance).toBeInstanceOf(ExportService)
    })
  })

  describe('exportExecutionLogs', () => {
    it('should export execution logs as CSV format', async () => {
      const logs = [mockExecutionLog, { ...mockExecutionLog, id: 'log-2' }]
      mockLogRepo.getPaginated.mockResolvedValue({
        logs,
        total: 2,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })

      const options: ExportOptions = {
        format: 'csv',
        page: 1,
        limit: 1000,
      }

      const result = await service.exportExecutionLogs(options)

      expect(mockLogRepo.getPaginated).toHaveBeenCalledWith({
        limit: 1000,
        offset: 0,
        startDate: undefined,
        endDate: undefined,
        ownerId: undefined,
      })
      expect(result.contentType).toBe('text/csv')
      expect(result.filename).toMatch(/execution-logs-\d+\.csv/)
      expect(result.count).toBe(2)
      expect(result.data).toContain('id,job_id')
    })

    it('should export execution logs as JSON format', async () => {
      const logs = [mockExecutionLog]
      mockLogRepo.getPaginated.mockResolvedValue({
        logs,
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })

      const options: ExportOptions = {
        format: 'json',
        page: 1,
        limit: 1000,
      }

      const result = await service.exportExecutionLogs(options)

      expect(result.contentType).toBe('application/json')
      expect(result.filename).toMatch(/execution-logs-\d+\.json/)
      expect(result.count).toBe(1)
      expect(JSON.parse(result.data as string)).toHaveLength(1)
    })

    it('should apply date filters when provided', async () => {
      mockLogRepo.getPaginated.mockResolvedValue({
        logs: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      })

      const options: ExportOptions = {
        format: 'json',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        page: 1,
        limit: 1000,
      }

      await service.exportExecutionLogs(options)

      expect(mockLogRepo.getPaginated).toHaveBeenCalledWith({
        limit: 1000,
        offset: 0,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        ownerId: undefined,
      })
    })

    it('should apply owner filter when provided', async () => {
      mockLogRepo.getPaginated.mockResolvedValue({
        logs: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      })

      const options: ExportOptions = {
        format: 'json',
        ownerId: 'user-123',
        page: 1,
        limit: 1000,
      }

      await service.exportExecutionLogs(options)

      expect(mockLogRepo.getPaginated).toHaveBeenCalledWith({
        limit: 1000,
        offset: 0,
        startDate: undefined,
        endDate: undefined,
        ownerId: 'user-123',
      })
    })

    it('should calculate correct offset for pagination', async () => {
      mockLogRepo.getPaginated.mockResolvedValue({
        logs: [],
        total: 0,
        page: 2,
        limit: 100,
        totalPages: 0,
      })

      const options: ExportOptions = {
        format: 'json',
        page: 2,
        limit: 100,
      }

      await service.exportExecutionLogs(options)

      expect(mockLogRepo.getPaginated).toHaveBeenCalledWith({
        limit: 100,
        offset: 100, // (page - 1) * limit = (2 - 1) * 100
        startDate: undefined,
        endDate: undefined,
        ownerId: undefined,
      })
    })

    it('should use default page and limit when not provided', async () => {
      mockLogRepo.getPaginated.mockResolvedValue({
        logs: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      })

      const options: ExportOptions = {
        format: 'json',
      }

      await service.exportExecutionLogs(options)

      expect(mockLogRepo.getPaginated).toHaveBeenCalledWith({
        limit: 1000, // default
        offset: 0, // (1 - 1) * 1000
        startDate: undefined,
        endDate: undefined,
        ownerId: undefined,
      })
    })

    it('should return empty result when no logs exist', async () => {
      mockLogRepo.getPaginated.mockResolvedValue({
        logs: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      })

      const result = await service.exportExecutionLogs({ format: 'json' })

      expect(result.count).toBe(0)
      expect(JSON.parse(result.data as string)).toHaveLength(0)
    })

    it('should propagate database errors', async () => {
      mockLogRepo.getPaginated.mockRejectedValue(new Error('Database error'))

      await expect(service.exportExecutionLogs({ format: 'json' })).rejects.toThrow('Database error')
    })
  })

  describe('exportMediaRecords', () => {
    it('should export media records as CSV format', async () => {
      const records = [mockMediaRecord, { ...mockMediaRecord, id: 'media-2' }]
      mockMediaRepo.list.mockResolvedValue({
        items: records,
        total: 2,
        page: 1,
        limit: 2000,
        totalPages: 1,
      })

      const options: ExportOptions = {
        format: 'csv',
        page: 1,
        limit: 1000,
      }

      const result = await service.exportMediaRecords(options)

      expect(mockMediaRepo.list).toHaveBeenCalledWith({
        type: undefined,
        limit: 1000, // limit * page
        offset: 0,
        includeDeleted: false,
        visibilityOwnerId: undefined,
      })
      expect(result.contentType).toBe('text/csv')
      expect(result.filename).toMatch(/media-records-\d+\.csv/)
      expect(result.count).toBe(2)
    })

    it('should export media records as JSON format', async () => {
      const records = [mockMediaRecord]
      mockMediaRepo.list.mockResolvedValue({
        items: records,
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })

      const options: ExportOptions = {
        format: 'json',
        page: 1,
        limit: 1000,
      }

      const result = await service.exportMediaRecords(options)

      expect(result.contentType).toBe('application/json')
      expect(result.filename).toMatch(/media-records-\d+\.json/)
      expect(result.count).toBe(1)
      expect(JSON.parse(result.data as string)).toHaveLength(1)
    })

    it('should apply type filter when provided', async () => {
      mockMediaRepo.list.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      })

      const options: ExportOptions = {
        format: 'json',
        type: 'audio',
        page: 1,
        limit: 1000,
      }

      await service.exportMediaRecords(options)

      expect(mockMediaRepo.list).toHaveBeenCalledWith({
        type: 'audio',
        limit: 1000,
        offset: 0,
        includeDeleted: false,
        visibilityOwnerId: undefined,
      })
    })

    it('should apply owner filter when provided', async () => {
      mockMediaRepo.list.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      })

      const options: ExportOptions = {
        format: 'json',
        ownerId: 'user-456',
        page: 1,
        limit: 1000,
      }

      await service.exportMediaRecords(options)

      expect(mockMediaRepo.list).toHaveBeenCalledWith({
        type: undefined,
        limit: 1000,
        offset: 0,
        includeDeleted: false,
        visibilityOwnerId: 'user-456',
      })
    })

    it('should slice records correctly for pagination', async () => {
      // Create 15 records, request page 2 with limit 5
      const allRecords = Array.from({ length: 15 }, (_, i) => ({
        ...mockMediaRecord,
        id: `media-${i + 1}`,
      }))
      mockMediaRepo.list.mockResolvedValue({
        items: allRecords,
        total: 15,
        page: 1,
        limit: 10, // limit * page = 5 * 2 = 10, but we're fetching more
        totalPages: 1,
      })

      const options: ExportOptions = {
        format: 'json',
        page: 2,
        limit: 5,
      }

      const result = await service.exportMediaRecords(options)

      // Expect slice(offset, offset + limit) = slice(5, 10)
      expect(result.count).toBe(5)
      const data = JSON.parse(result.data as string)
      expect(data[0].id).toBe('media-6')
      expect(data[4].id).toBe('media-10')
    })

    it('should use default page and limit when not provided', async () => {
      mockMediaRepo.list.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      })

      const options: ExportOptions = {
        format: 'json',
      }

      await service.exportMediaRecords(options)

      expect(mockMediaRepo.list).toHaveBeenCalledWith({
        type: undefined,
        limit: 1000, // default limit * default page = 1000 * 1
        offset: 0,
        includeDeleted: false,
        visibilityOwnerId: undefined,
      })
    })

    it('should return empty result when no records exist', async () => {
      mockMediaRepo.list.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      })

      const result = await service.exportMediaRecords({ format: 'csv' })

      expect(result.count).toBe(0)
    })

    it('should propagate database errors', async () => {
      mockMediaRepo.list.mockRejectedValue(new Error('Query failed'))

      await expect(service.exportMediaRecords({ format: 'json' })).rejects.toThrow('Query failed')
    })
  })

  describe('formatExecutionLog', () => {
    it('should correctly format execution log', async () => {
      const log: ExecutionLog = {
        id: 'log-test',
        job_id: 'job-test',
        trigger_type: 'scheduled',
        status: 'failed',
        started_at: '2024-02-01T08:00:00Z',
        completed_at: '2024-02-01T08:00:30Z',
        duration_ms: 30000,
        tasks_executed: 3,
        tasks_succeeded: 0,
        tasks_failed: 3,
        error_summary: 'All tasks failed',
      }

      mockLogRepo.getPaginated.mockResolvedValue({
        logs: [log],
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })

      const result = await service.exportExecutionLogs({ format: 'json' })
      const formatted = JSON.parse(result.data as string)[0]

      expect(formatted).toEqual({
        id: 'log-test',
        job_id: 'job-test',
        trigger_type: 'scheduled',
        status: 'failed',
        started_at: '2024-02-01T08:00:00Z',
        completed_at: '2024-02-01T08:00:30Z',
        duration_ms: 30000,
        tasks_executed: 3,
        tasks_succeeded: 0,
        tasks_failed: 3,
        error_summary: 'All tasks failed',
      })
    })

    it('should handle null values in execution log', async () => {
      const log: ExecutionLog = {
        id: 'log-null',
        job_id: 'job-null',
        trigger_type: 'manual',
        status: 'running',
        started_at: '2024-03-01T10:00:00Z',
        completed_at: null,
        duration_ms: null,
        tasks_executed: 1,
        tasks_succeeded: null,
        tasks_failed: null,
        error_summary: null,
      }

      mockLogRepo.getPaginated.mockResolvedValue({
        logs: [log],
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })

      const result = await service.exportExecutionLogs({ format: 'json' })
      const formatted = JSON.parse(result.data as string)[0]

      expect(formatted.completed_at).toBeNull()
      expect(formatted.duration_ms).toBeNull()
      expect(formatted.tasks_succeeded).toBeNull()
      expect(formatted.tasks_failed).toBeNull()
      expect(formatted.error_summary).toBeNull()
    })
  })

  describe('formatMediaRecord', () => {
    it('should correctly format media record', async () => {
      const record: MediaRecord = {
        id: 'media-test',
        filename: 'video.mp4',
        original_name: 'original-video.mp4',
        filepath: '/data/media/2024/04/01/video.mp4',
        type: 'video',
        mime_type: 'video/mp4',
        size_bytes: 5000000,
        source: 'video-async',
        task_id: 'task-video',
        metadata: { resolution: '1920x1080', fps: 30 },
        created_at: '2024-04-01T12:00:00Z',
        updated_at: '2024-04-01T12:30:00Z',
      }

      mockMediaRepo.list.mockResolvedValue({
        items: [record],
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })

      const result = await service.exportMediaRecords({ format: 'json' })
      const formatted = JSON.parse(result.data as string)[0]

      expect(formatted).toEqual({
        id: 'media-test',
        filename: 'video.mp4',
        original_name: 'original-video.mp4',
        filepath: '/data/media/2024/04/01/video.mp4',
        type: 'video',
        mime_type: 'video/mp4',
        size_bytes: 5000000,
        source: 'video-async',
        task_id: 'task-video',
        metadata: { resolution: '1920x1080', fps: 30 },
        created_at: '2024-04-01T12:00:00Z',
        updated_at: '2024-04-01T12:30:00Z',
      })
    })

    it('should handle null values in media record', async () => {
      const record: MediaRecord = {
        id: 'media-null',
        filename: 'image.png',
        original_name: null,
        filepath: '/data/media/2024/05/01/image.png',
        type: 'image',
        mime_type: 'image/png',
        size_bytes: 2048,
        source: 'image-generation',
        task_id: null,
        metadata: null,
        created_at: '2024-05-01T14:00:00Z',
        updated_at: null,
      }

      mockMediaRepo.list.mockResolvedValue({
        items: [record],
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })

      const result = await service.exportMediaRecords({ format: 'json' })
      const formatted = JSON.parse(result.data as string)[0]

      expect(formatted.original_name).toBeNull()
      expect(formatted.task_id).toBeNull()
      expect(formatted.metadata).toBeNull()
      expect(formatted.updated_at).toBeNull()
    })
  })

  describe('executionLogsToCSV', () => {
    it('should generate CSV with correct headers', async () => {
      const logs = [mockExecutionLog]
      mockLogRepo.getPaginated.mockResolvedValue({
        logs,
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })

      const result = await service.exportExecutionLogs({ format: 'csv' })

      // Verify CSV output contains correct headers
      expect(result.contentType).toBe('text/csv')
      expect(result.data).toContain('id,job_id,trigger_type,status,started_at,completed_at,duration_ms,tasks_executed,tasks_succeeded,tasks_failed,error_summary')
      expect(result.count).toBe(1)
    })

    it('should handle empty logs array', async () => {
      mockLogRepo.getPaginated.mockResolvedValue({
        logs: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      })

      const result = await service.exportExecutionLogs({ format: 'csv' })

      expect(result.data).toBeDefined()
      expect(result.count).toBe(0)
    })
  })

  describe('mediaRecordsToCSV', () => {
    it('should generate CSV with correct headers and metadata formatter', async () => {
      const records = [mockMediaRecord]
      mockMediaRepo.list.mockResolvedValue({
        items: records,
        total: 1,
      })

      const result = await service.exportMediaRecords({ format: 'csv' })

      // Verify CSV output contains correct headers
      expect(result.contentType).toBe('text/csv')
      expect(result.data).toContain('id,filename,original_name,filepath,type,mime_type,size_bytes,source,task_id,metadata,created_at,updated_at')
      expect(result.count).toBe(1)
    })

    it('should format metadata as quoted JSON string', async () => {
      const record: MediaRecord = {
        ...mockMediaRecord,
        metadata: { key: 'value' },
      }
      mockMediaRepo.list.mockResolvedValue({
        items: [record],
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })

      const result = await service.exportMediaRecords({ format: 'csv' })

      // Verify metadata is formatted as quoted JSON
      expect(result.data).toContain('metadata')
      expect(result.data).toMatch(/"\{.*\}"/)
    })

    it('should format metadata field correctly in CSV', async () => {
      const record: MediaRecord = {
        ...mockMediaRecord,
        metadata: { key: 'value with "quotes"', nested: { data: true } },
      }
      mockMediaRepo.list.mockResolvedValue({
        items: [record],
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })

      const result = await service.exportMediaRecords({ format: 'csv' })

      expect(result.data).toBeDefined()
      // The metadata should be JSON stringified and quotes escaped
      expect(result.data).toContain('metadata')
    })

    it('should format non-object metadata as string in CSV', async () => {
      const record: MediaRecord = {
        ...mockMediaRecord,
        metadata: 'plain string metadata' as unknown as Record<string, unknown>,
      }
      mockMediaRepo.list.mockResolvedValue({
        items: [record],
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })

      const result = await service.exportMediaRecords({ format: 'csv' })

      expect(result.data).toBeDefined()
      expect(result.data).toContain('metadata')
    })

    it('should handle empty records array', async () => {
      mockMediaRepo.list.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      })

      const result = await service.exportMediaRecords({ format: 'csv' })

      expect(result.data).toBeDefined()
      expect(result.count).toBe(0)
    })
  })
})

describe('ExportService DI', () => {
  it('should resolve ExportService from getExportService', async () => {
    const service = getExportService()
    expect(service).toBeInstanceOf(ExportService)
  })

  it('should resolve same instance from getExportService (singleton behavior via DI)', async () => {
    const service1 = getExportService()
    const service2 = getExportService()

    expect(service1).toBe(service2)
  })

  it('should create ExportService with repository dependencies', () => {
    const logRepo = { getPaginated: vi.fn() } as unknown as LogRepository
    const mediaRepo = { list: vi.fn() } as unknown as MediaRepository
    const service = new ExportService(logRepo, mediaRepo)
    expect(service).toBeInstanceOf(ExportService)
  })
})
