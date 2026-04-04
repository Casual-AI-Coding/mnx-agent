import { describe, expect, it, vi, beforeEach } from 'vitest'
import axios, { AxiosError } from 'axios'
import type { WorkflowTemplate, CreateWorkflowDTO, UpdateWorkflowDTO } from '../workflows'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
    create: vi.fn(() => mockAxiosInstance),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  const isAxiosErrorMock = vi.fn((error: unknown) => error && (error as AxiosError).isAxiosError === true)
  return {
    default: {
      ...mockAxiosInstance,
      isAxiosError: isAxiosErrorMock,
    },
    ...mockAxiosInstance,
    isAxiosError: isAxiosErrorMock,
  }
})

vi.stubGlobal('import.meta', {
  env: {
    VITE_API_URL: 'http://localhost:4511',
  },
})

describe('Workflows API Module', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('listWorkflows', () => {
    it('should return workflows on successful response', async () => {
      const { listWorkflows } = await import('../workflows')
      const mockWorkflows: WorkflowTemplate[] = [
        {
          id: 'wf-1',
          name: 'Test Workflow',
          description: 'Test description',
          nodes_json: '{"nodes":[]}',
          edges_json: '{"edges":[]}',
          created_at: '2024-01-01T00:00:00Z',
          is_template: false,
        },
      ]

      mockGet.mockResolvedValueOnce({
        data: { data: { workflows: mockWorkflows, pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } },
      })

      const result = await listWorkflows()

      expect(mockGet).toHaveBeenCalledWith('/workflows', { params: undefined })
      expect(result.success).toBe(true)
      expect(result.data?.workflows).toEqual(mockWorkflows)
    })

    it('should pass query params', async () => {
      const { listWorkflows } = await import('../workflows')
      mockGet.mockResolvedValueOnce({
        data: { data: { workflows: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } },
      })

      await listWorkflows({ is_template: true, page: 2, limit: 10 })

      expect(mockGet).toHaveBeenCalledWith('/workflows', { params: { is_template: true, page: 2, limit: 10 } })
    })

    it('should handle Axios error', async () => {
      const { listWorkflows } = await import('../workflows')
      const axiosError = new Error('Request failed') as AxiosError<{ error: string }>
      axiosError.isAxiosError = true
      axiosError.response = {
        data: { error: 'Network error' },
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as never,
      }

      mockGet.mockRejectedValueOnce(axiosError)

      const result = await listWorkflows()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('getWorkflow', () => {
    it('should return single workflow on success', async () => {
      const { getWorkflow } = await import('../workflows')
      const mockWorkflow: WorkflowTemplate = {
        id: 'wf-1',
        name: 'Test Workflow',
        description: 'Test description',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
        created_at: '2024-01-01T00:00:00Z',
        is_template: false,
      }

      mockGet.mockResolvedValueOnce({
        data: { data: mockWorkflow },
      })

      const result = await getWorkflow('wf-1')

      expect(mockGet).toHaveBeenCalledWith('/workflows/wf-1')
      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('wf-1')
    })

    it('should handle 404 error', async () => {
      const { getWorkflow } = await import('../workflows')
      const axiosError = new Error('Not found') as AxiosError
      axiosError.isAxiosError = true
      axiosError.response = {
        data: { error: 'Workflow not found' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as never,
      }

      mockGet.mockRejectedValueOnce(axiosError)

      const result = await getWorkflow('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Workflow not found')
    })
  })

  describe('createWorkflow', () => {
    it('should create workflow and return data on success', async () => {
      const { createWorkflow } = await import('../workflows')
      const createDto: CreateWorkflowDTO = {
        name: 'New Workflow',
        description: 'New description',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
        is_template: false,
      }

      const mockWorkflow: WorkflowTemplate = {
        id: 'wf-2',
        name: 'New Workflow',
        description: 'New description',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
        created_at: '2024-01-01T00:00:00Z',
        is_template: false,
      }

      mockPost.mockResolvedValueOnce({
        data: { data: mockWorkflow },
      })

      const result = await createWorkflow(createDto)

      expect(mockPost).toHaveBeenCalledWith('/workflows', createDto)
      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('wf-2')
    })

    it('should handle create failure', async () => {
      const { createWorkflow } = await import('../workflows')
      const axiosError = new Error('Bad request') as AxiosError<{ error: string }>
      axiosError.isAxiosError = true
      axiosError.response = {
        data: { error: 'Invalid workflow data' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as never,
      }

      mockPost.mockRejectedValueOnce(axiosError)

      const result = await createWorkflow({
        name: 'Bad Workflow',
        nodes_json: '',
        edges_json: '',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid workflow data')
    })
  })

  describe('updateWorkflow', () => {
    it('should update workflow and return updated data', async () => {
      const { updateWorkflow } = await import('../workflows')
      const updates: UpdateWorkflowDTO = {
        name: 'Updated Workflow',
        description: 'Updated description',
      }

      const mockWorkflow: WorkflowTemplate = {
        id: 'wf-1',
        name: 'Updated Workflow',
        description: 'Updated description',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
        created_at: '2024-01-01T00:00:00Z',
        is_template: false,
      }

      mockPut.mockResolvedValueOnce({
        data: { data: mockWorkflow },
      })

      const result = await updateWorkflow('wf-1', updates)

      expect(mockPut).toHaveBeenCalledWith('/workflows/wf-1', updates)
      expect(result.success).toBe(true)
      expect(result.data?.name).toBe('Updated Workflow')
    })

    it('should only send defined fields', async () => {
      const { updateWorkflow } = await import('../workflows')
      const updates: UpdateWorkflowDTO = {
        name: 'Only name updated',
      }

      mockPut.mockResolvedValueOnce({
        data: { data: {} },
      })

      await updateWorkflow('wf-1', updates)

      expect(mockPut).toHaveBeenCalledWith('/workflows/wf-1', { name: 'Only name updated' })
    })
  })

  describe('deleteWorkflow', () => {
    it('should return success on delete', async () => {
      const { deleteWorkflow } = await import('../workflows')
      mockDelete.mockResolvedValueOnce({
        data: { data: { deleted: true } },
      })

      const result = await deleteWorkflow('wf-1')

      expect(mockDelete).toHaveBeenCalledWith('/workflows/wf-1')
      expect(result.success).toBe(true)
      expect(result.data?.deleted).toBe(true)
    })

    it('should handle delete error', async () => {
      const { deleteWorkflow } = await import('../workflows')
      const axiosError = new Error() as AxiosError<{ error: string }>
      axiosError.isAxiosError = true
      axiosError.response = {
        data: { error: 'Cannot delete workflow' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as never,
      }

      mockDelete.mockRejectedValueOnce(axiosError)

      const result = await deleteWorkflow('wf-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot delete workflow')
    })
  })
})