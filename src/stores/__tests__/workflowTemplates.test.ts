import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkflowTemplatesStore } from '../workflowTemplates'

vi.mock('@/lib/api/workflows', () => ({
  listWorkflows: vi.fn(),
  getWorkflow: vi.fn(),
  createWorkflow: vi.fn(),
  updateWorkflow: vi.fn(),
  deleteWorkflow: vi.fn(),
}))

import { listWorkflows, getWorkflow, createWorkflow, updateWorkflow, deleteWorkflow } from '@/lib/api/workflows'

describe('useWorkflowTemplatesStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mockWorkflow = {
    id: 'wf-1',
    name: 'Test Workflow',
    description: 'A test workflow',
    workflow: { nodes: [], edges: [] },
    category: 'automation',
    isPublic: false,
    usageCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }

  describe('fetchTemplates', () => {
    it('should fetch templates from API', async () => {
      const workflows = [mockWorkflow]
      ;(listWorkflows as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: { workflows, total: 1 } })

      const { result } = renderHook(() => useWorkflowTemplatesStore())

      await act(async () => {
        await result.current.fetchTemplates()
      })

      expect(listWorkflows).toHaveBeenCalled()
      expect(result.current.templates).toEqual(workflows)
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle API errors', async () => {
      ;(listWorkflows as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'Network error' })

      const { result } = renderHook(() => useWorkflowTemplatesStore())

      await act(async () => {
        await result.current.fetchTemplates()
      })

      expect(result.current.error).toBe('Network error')
    })
  })

  describe('addTemplate', () => {
    it('should add template via API', async () => {
      const created = { ...mockWorkflow, id: 'new-wf' }
      ;(createWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: created })

      const { result } = renderHook(() => useWorkflowTemplatesStore())

      let success: boolean = false
      await act(async () => {
        success = await result.current.addTemplate({
          name: 'Test Workflow',
          description: 'A test workflow',
          workflow: { nodes: [], edges: [] },
          category: 'automation',
        })
      })

      expect(success).toBe(true)
      expect(createWorkflow).toHaveBeenCalled()
    })
  })

  describe('editTemplate', () => {
    it('should edit template via API', async () => {
      const updated = { ...mockWorkflow, name: 'Updated Name' }
      ;(updateWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: updated })

      const { result } = renderHook(() => useWorkflowTemplatesStore())

      let success: boolean = false
      await act(async () => {
        success = await result.current.editTemplate('wf-1', { name: 'Updated Name' })
      })

      expect(success).toBe(true)
      expect(updateWorkflow).toHaveBeenCalledWith('wf-1', { name: 'Updated Name' })
    })
  })

  describe('removeTemplate', () => {
    it('should remove template via API', async () => {
      ;(deleteWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true })

      const { result } = renderHook(() => useWorkflowTemplatesStore())

      let success: boolean = false
      await act(async () => {
        success = await result.current.removeTemplate('wf-1')
      })

      expect(success).toBe(true)
      expect(deleteWorkflow).toHaveBeenCalledWith('wf-1')
    })
  })

  describe('fetchTemplate', () => {
    it('should fetch single template', async () => {
      ;(getWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: mockWorkflow })

      const { result } = renderHook(() => useWorkflowTemplatesStore())

      await act(async () => {
        await result.current.fetchTemplate('wf-1')
      })

      expect(getWorkflow).toHaveBeenCalledWith('wf-1')
      expect(result.current.currentTemplate).toEqual(mockWorkflow)
    })
  })

  describe('setCurrentTemplate', () => {
    it('should set current template', () => {
      const { result } = renderHook(() => useWorkflowTemplatesStore())

      act(() => {
        result.current.setCurrentTemplate(mockWorkflow)
      })

      expect(result.current.currentTemplate).toEqual(mockWorkflow)
    })

    it('should clear current template when set to null', () => {
      const { result } = renderHook(() => useWorkflowTemplatesStore())

      act(() => {
        result.current.setCurrentTemplate(mockWorkflow)
      })
      expect(result.current.currentTemplate).toEqual(mockWorkflow)

      act(() => {
        result.current.setCurrentTemplate(null)
      })
      expect(result.current.currentTemplate).toBeNull()
    })
  })

  describe('clearError', () => {
    it('should clear error state', async () => {
      ;(listWorkflows as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'Some error' })

      const { result } = renderHook(() => useWorkflowTemplatesStore())

      await act(async () => {
        await result.current.fetchTemplates()
      })
      expect(result.current.error).toBe('Some error')

      act(() => {
        result.current.clearError()
      })
      expect(result.current.error).toBeNull()
    })
  })
})