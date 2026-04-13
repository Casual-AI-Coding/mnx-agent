import { createApiMethod } from '../create-api-method'
import { apiClient } from '../client'
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('createApiMethod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('method returning success response', () => {
    it('should create method that returns success response for GET', async () => {
      const mockData = { id: '1', name: 'Test Job' }
      ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: mockData } })

      const getItem = createApiMethod<{ id: string }, { id: string; name: string }>({
        method: 'GET',
        path: '/items/:id',
      })

      const result = await getItem({ id: '1' })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockData)
      expect(apiClient.get).toHaveBeenCalledWith('/items/1', { params: undefined })
    })

    it('should create method that returns success response for POST', async () => {
      const mockData = { id: '123', name: 'New Job' }
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: mockData } })

      const createItem = createApiMethod<{ body: { name: string } }, { id: string; name: string }>({
        method: 'POST',
        path: '/items',
      })

      const result = await createItem({ body: { name: 'New Job' } })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockData)
      expect(apiClient.post).toHaveBeenCalledWith('/items', { name: 'New Job' })
    })

    it('should create method that returns success response for PUT', async () => {
      const mockData = { id: '1', name: 'Updated Job' }
      ;(apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: mockData } })

      const updateItem = createApiMethod<{ id: string; body: { name: string } }, { id: string; name: string }>({
        method: 'PUT',
        path: '/items/:id',
      })

      const result = await updateItem({ id: '1', body: { name: 'Updated Job' } })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockData)
      expect(apiClient.put).toHaveBeenCalledWith('/items/1', { name: 'Updated Job' })
    })

    it('should create method that returns success response for PATCH', async () => {
      const mockData = { id: '1', name: 'Patched Job' }
      ;(apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: mockData } })

      const patchItem = createApiMethod<{ id: string; body: { name: string } }, { id: string; name: string }>({
        method: 'PATCH',
        path: '/items/:id',
      })

      const result = await patchItem({ id: '1', body: { name: 'Patched Job' } })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockData)
      expect(apiClient.patch).toHaveBeenCalledWith('/items/1', { name: 'Patched Job' })
    })

    it('should create method that returns success response for DELETE', async () => {
      ;(apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: undefined } })

      const deleteItem = createApiMethod<{ id: string }, void>({
        method: 'DELETE',
        path: '/items/:id',
      })

      const result = await deleteItem({ id: '1' })

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
      expect(apiClient.delete).toHaveBeenCalledWith('/items/1')
    })

    it('should resolve path params correctly', async () => {
      const mockData = { id: 'job-123', status: 'active' }
      ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: mockData } })

      const getJob = createApiMethod<{ jobId: string }, { id: string; status: string }>({
        method: 'GET',
        path: '/cron/jobs/:jobId',
      })

      const result = await getJob({ jobId: 'job-123' })

      expect(result.success).toBe(true)
      expect(apiClient.get).toHaveBeenCalledWith('/cron/jobs/job-123', { params: undefined })
    })

    it('should support transformResult option', async () => {
      const rawData = { job_id: '1', job_name: 'Test', is_active: true }
      ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: rawData } })

      const getJob = createApiMethod<{ id: string }, { id: string; name: string; active: boolean }>({
        method: 'GET',
        path: '/jobs/:id',
        transformResult: (data) => ({
          id: data.job_id,
          name: data.job_name,
          active: data.is_active,
        }),
      })

      const result = await getJob({ id: '1' })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ id: '1', name: 'Test', active: true })
    })
  })

  describe('handling API errors', () => {
    it('should handle API errors and return error response for GET', async () => {
      const axiosError = new Error('Not found')
      axiosError.name = 'AxiosError'
      ;(axiosError as unknown as { response?: object }).response = { data: { error: 'Not found' } }
      ;(apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(axiosError)

      const getItem = createApiMethod<{ id: string }, any>({
        method: 'GET',
        path: '/items/:id',
      })

      const result = await getItem({ id: '999' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not found')
    })

    it('should handle API errors and return error response for POST', async () => {
      const axiosError = new Error('Validation failed')
      axiosError.name = 'AxiosError'
      ;(axiosError as unknown as { response?: object }).response = { data: { error: 'Validation failed' } }
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(axiosError)

      const createItem = createApiMethod<{ body: any }, any>({
        method: 'POST',
        path: '/items',
      })

      const result = await createItem({ body: { name: '' } })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Validation failed')
    })

    it('should handle network errors', async () => {
      ;(apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const getItem = createApiMethod<{ id: string }, any>({
        method: 'GET',
        path: '/items/:id',
      })

      const result = await getItem({ id: '1' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })
})