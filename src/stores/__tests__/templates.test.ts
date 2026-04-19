import { renderHook, waitFor, act } from '@testing-library/react'
import { useTemplatesStore, createTemplateStore } from '../templates'
import type { PromptTemplate, CreateTemplateData } from '@/lib/api/templates'

vi.mock('@/lib/api/templates', () => ({
  listTemplates: vi.fn(),
  getTemplate: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}))

import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/lib/api/templates'

const mockTemplate: PromptTemplate = {
  id: 'template-1',
  name: 'Test Template',
  description: 'Test description',
  content: 'Hello {{name}}!',
  category: 'text',
  variables: [
    { name: 'name', description: 'The name to greet', required: true },
  ],
  is_builtin: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('useTemplatesStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTemplatesStore.setState({
      templates: [],
      currentTemplate: null,
      isLoading: false,
      error: null,
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useTemplatesStore())
      expect(result.current.templates).toEqual([])
      expect(result.current.currentTemplate).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('fetchTemplates', () => {
    it('should fetch templates from API', async () => {
      ;(listTemplates as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { templates: [mockTemplate] },
      })

      const { result } = renderHook(() => useTemplatesStore())
      await result.current.fetchTemplates()

      expect(listTemplates).toHaveBeenCalled()
      expect(result.current.templates).toHaveLength(1)
      expect(result.current.templates[0].id).toBe('template-1')
      expect(result.current.templates[0].name).toBe('Test Template')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void
      ;(listTemplates as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve })
      )

      const { result } = renderHook(() => useTemplatesStore())
      const promise = result.current.fetchTemplates()

      await waitFor(() => expect(result.current.isLoading).toBe(true))

      resolvePromise!({ success: true, data: { templates: [] } })
      await promise

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })

    it('should handle API errors gracefully', async () => {
      ;(listTemplates as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Network error',
      })

      const { result } = renderHook(() => useTemplatesStore())
      await result.current.fetchTemplates()

      expect(result.current.error).toBe('Network error')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.templates).toEqual([])
    })

    it('should handle null data response', async () => {
      ;(listTemplates as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        data: null,
        error: 'No data available',
      })

      const { result } = renderHook(() => useTemplatesStore())
      await result.current.fetchTemplates()

      expect(result.current.error).toBe('No data available')
    })

    it('should pass params to API', async () => {
      ;(listTemplates as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { templates: [] },
      })

      const { result } = renderHook(() => useTemplatesStore())
      await result.current.fetchTemplates({ category: 'text' })

      expect(listTemplates).toHaveBeenCalledWith({ category: 'text' })
    })

    it('should handle response with missing templates key', async () => {
      ;(listTemplates as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { },
      })

      const { result } = renderHook(() => useTemplatesStore())
      await result.current.fetchTemplates()

      expect(result.current.error).toBe('Invalid response format from prompt-templates API')
    })
  })

  describe('fetchTemplate', () => {
    it('should fetch single template from API', async () => {
      ;(getTemplate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: mockTemplate,
      })

      const { result } = renderHook(() => useTemplatesStore())
      await result.current.fetchTemplate('template-1')

      expect(getTemplate).toHaveBeenCalledWith('template-1')
      expect(result.current.currentTemplate).toEqual(mockTemplate)
      expect(result.current.isLoading).toBe(false)
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void
      ;(getTemplate as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve })
      )

      const { result } = renderHook(() => useTemplatesStore())
      const promise = result.current.fetchTemplate('template-1')

      await waitFor(() => expect(result.current.isLoading).toBe(true))

      resolvePromise!({ success: true, data: mockTemplate })
      await promise

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })

    it('should handle API errors gracefully', async () => {
      ;(getTemplate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Template not found',
      })

      const { result } = renderHook(() => useTemplatesStore())
      await result.current.fetchTemplate('template-1')

      expect(result.current.error).toBe('Template not found')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.currentTemplate).toBeNull()
    })

    
  })

  describe('addTemplate', () => {
    it('should create template via API and prepend to list', async () => {
      ;(createTemplate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: mockTemplate,
      })

      const { result } = renderHook(() => useTemplatesStore())
      const newTemplateData: CreateTemplateData = {
        name: 'Test Template',
        description: 'Test description',
        content: 'Hello {{name}}!',
        category: 'text',
        variables: [{ name: 'name', required: true }],
      }

      const success = await result.current.addTemplate(newTemplateData)

      expect(createTemplate).toHaveBeenCalledWith(newTemplateData)
      expect(success).toBe(true)
      expect(result.current.templates).toHaveLength(1)
      expect(result.current.templates[0]).toEqual(mockTemplate)
      expect(result.current.isLoading).toBe(false)
    })

    it('should return false on API failure', async () => {
      ;(createTemplate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Validation failed',
      })

      const { result } = renderHook(() => useTemplatesStore())
      const success = await result.current.addTemplate({
        name: 'Test',
        content: 'Content',
        category: 'text',
      })

      expect(success).toBe(false)
      expect(result.current.error).toBe('Validation failed')
      expect(result.current.isLoading).toBe(false)
    })

    
  })

  describe('editTemplate', () => {
    it('should update template via API', async () => {
      useTemplatesStore.setState({ templates: [mockTemplate] })

      const updatedTemplate = {
        ...mockTemplate,
        name: 'Updated Template',
      }

      ;(updateTemplate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: updatedTemplate,
      })

      const { result } = renderHook(() => useTemplatesStore())
      const success = await result.current.editTemplate('template-1', { name: 'Updated Template' })

      expect(updateTemplate).toHaveBeenCalledWith('template-1', { name: 'Updated Template' })
      expect(success).toBe(true)
      expect(result.current.templates[0].name).toBe('Updated Template')
      expect(result.current.isLoading).toBe(false)
    })

    it('should update currentTemplate if it matches', async () => {
      useTemplatesStore.setState({
        templates: [mockTemplate],
        currentTemplate: mockTemplate,
      })

      const updatedTemplate = {
        ...mockTemplate,
        name: 'Updated Template',
      }

      ;(updateTemplate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: updatedTemplate,
      })

      const { result } = renderHook(() => useTemplatesStore())
      await result.current.editTemplate('template-1', { name: 'Updated Template' })

      expect(result.current.currentTemplate?.name).toBe('Updated Template')
    })

    it('should not update currentTemplate if it does not match', async () => {
      const otherTemplate = { ...mockTemplate, id: 'other-template' }
      useTemplatesStore.setState({
        templates: [mockTemplate, otherTemplate],
        currentTemplate: otherTemplate,
      })

      const updatedTemplate = {
        ...mockTemplate,
        name: 'Updated Template',
      }

      ;(updateTemplate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: updatedTemplate,
      })

      const { result } = renderHook(() => useTemplatesStore())
      await result.current.editTemplate('template-1', { name: 'Updated Template' })

      expect(result.current.currentTemplate?.id).toBe('other-template')
    })

    it('should return false on API failure', async () => {
      useTemplatesStore.setState({ templates: [mockTemplate] })

      ;(updateTemplate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Update failed',
      })

      const { result } = renderHook(() => useTemplatesStore())
      const success = await result.current.editTemplate('template-1', { name: 'Updated' })

      expect(success).toBe(false)
      expect(result.current.error).toBe('Update failed')
    })

    
  })

  describe('removeTemplate', () => {
    it('should delete template via API', async () => {
      useTemplatesStore.setState({ templates: [mockTemplate] })

      ;(deleteTemplate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { deleted: true },
      })

      const { result } = renderHook(() => useTemplatesStore())
      const success = await result.current.removeTemplate('template-1')

      expect(deleteTemplate).toHaveBeenCalledWith('template-1')
      expect(success).toBe(true)
      expect(result.current.templates).toHaveLength(0)
      expect(result.current.isLoading).toBe(false)
    })

    it('should clear currentTemplate if deleted template was current', async () => {
      useTemplatesStore.setState({
        templates: [mockTemplate],
        currentTemplate: mockTemplate,
      })

      ;(deleteTemplate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { deleted: true },
      })

      const { result } = renderHook(() => useTemplatesStore())
      await result.current.removeTemplate('template-1')

      expect(result.current.currentTemplate).toBeNull()
    })

    it('should not clear currentTemplate if deleted template was not current', async () => {
      const otherTemplate = { ...mockTemplate, id: 'other-template' }
      useTemplatesStore.setState({
        templates: [mockTemplate, otherTemplate],
        currentTemplate: otherTemplate,
      })

      ;(deleteTemplate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { deleted: true },
      })

      const { result } = renderHook(() => useTemplatesStore())
      await result.current.removeTemplate('template-1')

      expect(result.current.currentTemplate?.id).toBe('other-template')
    })

    it('should return false on API failure', async () => {
      useTemplatesStore.setState({ templates: [mockTemplate] })

      ;(deleteTemplate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Delete failed',
      })

      const { result } = renderHook(() => useTemplatesStore())
      const success = await result.current.removeTemplate('template-1')

      expect(success).toBe(false)
      expect(result.current.error).toBe('Delete failed')
    })

    
  })

  describe('setCurrentTemplate', () => {
    it('should set currentTemplate', () => {
      const { result } = renderHook(() => useTemplatesStore())
      act(() => {
        result.current.setCurrentTemplate(mockTemplate)
      })
      expect(result.current.currentTemplate).toEqual(mockTemplate)
    })

    it('should set currentTemplate to null', () => {
      useTemplatesStore.setState({ currentTemplate: mockTemplate })
      const { result } = renderHook(() => useTemplatesStore())
      act(() => {
        result.current.setCurrentTemplate(null)
      })
      expect(result.current.currentTemplate).toBeNull()
    })
  })

  describe('clearError', () => {
    it('should clear error', () => {
      useTemplatesStore.setState({ error: 'Some error' })
      const { result } = renderHook(() => useTemplatesStore())
      act(() => {
        result.current.clearError()
      })
      expect(result.current.error).toBeNull()
    })
  })
})

describe('createTemplateStore factory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a store with custom API config', async () => {
    const mockListApi = vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'item-1', name: 'Custom Item' }] },
    })
    const mockGetApi = vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'item-1', name: 'Custom Item' },
    })
    const mockCreateApi = vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'item-2', name: 'New Item' },
    })
    const mockUpdateApi = vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'item-1', name: 'Updated Item' },
    })
    const mockDeleteApi = vi.fn().mockResolvedValue({
      success: true,
      data: { deleted: true },
    })

    interface CustomItem {
      id: string
      name: string
    }

    const useCustomStore = createTemplateStore<CustomItem>({
      name: 'custom-items',
      listApi: mockListApi,
      getApi: mockGetApi,
      createApi: mockCreateApi,
      updateApi: mockUpdateApi,
      deleteApi: mockDeleteApi,
      listKey: 'items',
    })

    // Reset state
    useCustomStore.setState({
      templates: [],
      currentTemplate: null,
      isLoading: false,
      error: null,
    })

    const { result } = renderHook(() => useCustomStore())
    expect(result.current.templates).toEqual([])
    expect(result.current.isLoading).toBe(false)

    // Test fetchTemplates
    await result.current.fetchTemplates()
    expect(mockListApi).toHaveBeenCalled()
    expect(result.current.templates).toHaveLength(1)

    // Test fetchTemplate
    await result.current.fetchTemplate('item-1')
    expect(mockGetApi).toHaveBeenCalledWith('item-1')

    // Test addTemplate
    await result.current.addTemplate({ name: 'New Item' } as Record<string, unknown>)
    expect(mockCreateApi).toHaveBeenCalledWith({ name: 'New Item' })

    // Test editTemplate
    await result.current.editTemplate('item-1', { name: 'Updated Item' })
    expect(mockUpdateApi).toHaveBeenCalledWith('item-1', { name: 'Updated Item' })

    // Test removeTemplate
    await result.current.removeTemplate('item-1')
    expect(mockDeleteApi).toHaveBeenCalledWith('item-1')

    // Test setCurrentTemplate
    act(() => {
      result.current.setCurrentTemplate({ id: 'item-1', name: 'Custom Item' })
    })
    expect(result.current.currentTemplate).toEqual({ id: 'item-1', name: 'Custom Item' })

    // Test clearError
    act(() => {
      useCustomStore.setState({ error: 'Some error' })
      result.current.clearError()
    })
    expect(result.current.error).toBeNull()
  })
})
