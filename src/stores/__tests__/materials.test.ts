import { renderHook, waitFor, act } from '@testing-library/react'
import { useMaterialsStore } from '../materials'
import type { Material } from '@/types/material'
import {
  listMaterials,
  createMaterial,
  deleteMaterial,
} from '@/lib/api/materials'

vi.mock('@/lib/api/materials', () => ({
  listMaterials: vi.fn(),
  getMaterial: vi.fn(),
  getMaterialDetail: vi.fn(),
  createMaterial: vi.fn(),
  deleteMaterial: vi.fn(),
}))

const mockMaterial: Material = {
  id: 'material-1',
  material_type: 'artist',
  name: 'Test Artist',
  description: 'Test description',
  metadata: null,
  owner_id: 'user-1',
  sort_order: 0,
  is_deleted: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
}

describe('useMaterialsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMaterialsStore.setState({
      materials: [],
      isLoading: false,
      error: null,
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useMaterialsStore())
      expect(result.current.materials).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('fetchMaterials', () => {
    it('should fetch materials from API', async () => {
      ;(listMaterials as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { records: [mockMaterial] },
      })

      const { result } = renderHook(() => useMaterialsStore())
      await result.current.fetchMaterials()

      expect(listMaterials).toHaveBeenCalled()
      expect(listMaterials).toHaveBeenCalledWith({ material_type: 'artist' })
      expect(result.current.materials).toHaveLength(1)
      expect(result.current.materials[0].id).toBe('material-1')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void
      ;(listMaterials as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve })
      )

      const { result } = renderHook(() => useMaterialsStore())
      const promise = result.current.fetchMaterials()

      await waitFor(() => expect(result.current.isLoading).toBe(true))

      resolvePromise!({ success: true, data: { records: [] } })
      await promise

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })

    it('should handle API errors gracefully', async () => {
      ;(listMaterials as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Network error',
      })

      const { result } = renderHook(() => useMaterialsStore())
      await result.current.fetchMaterials()

      expect(result.current.error).toBe('Network error')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.materials).toEqual([])
    })
  })

  describe('addMaterial', () => {
    it('should create material via API and prepend to list', async () => {
      ;(createMaterial as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: mockMaterial,
      })

      const { result } = renderHook(() => useMaterialsStore())
      const success = await result.current.addMaterial({
        material_type: 'artist',
        name: 'Test Artist',
        description: 'Test description',
      })

      expect(createMaterial).toHaveBeenCalledWith({
        material_type: 'artist',
        name: 'Test Artist',
        description: 'Test description',
      })
      expect(success).toBe(true)
      expect(result.current.materials).toHaveLength(1)
      expect(result.current.materials[0]).toEqual(mockMaterial)
      expect(result.current.isLoading).toBe(false)
    })

    it('should return false on API failure', async () => {
      ;(createMaterial as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Validation failed',
      })

      const { result } = renderHook(() => useMaterialsStore())
      const success = await result.current.addMaterial({
        material_type: 'artist',
        name: 'Test',
      })

      expect(success).toBe(false)
      expect(result.current.error).toBe('Validation failed')
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('removeMaterial', () => {
    it('should delete material via API', async () => {
      useMaterialsStore.setState({ materials: [mockMaterial] })

      ;(deleteMaterial as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { deleted: true },
      })

      const { result } = renderHook(() => useMaterialsStore())
      const success = await result.current.removeMaterial('material-1')

      expect(deleteMaterial).toHaveBeenCalledWith('material-1')
      expect(success).toBe(true)
      expect(result.current.materials).toHaveLength(0)
      expect(result.current.isLoading).toBe(false)
    })

    it('should return false on API failure', async () => {
      useMaterialsStore.setState({ materials: [mockMaterial] })

      ;(deleteMaterial as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Delete failed',
      })

      const { result } = renderHook(() => useMaterialsStore())
      const success = await result.current.removeMaterial('material-1')

      expect(success).toBe(false)
      expect(result.current.error).toBe('Delete failed')
    })
  })

  describe('clearError', () => {
    it('should clear error', async () => {
      useMaterialsStore.setState({ error: 'Some error' })
      const { result } = renderHook(() => useMaterialsStore())
      act(() => {
        result.current.clearError()
      })
      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })
  })
})
