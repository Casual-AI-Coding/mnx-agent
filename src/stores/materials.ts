import { create } from 'zustand'
import type { Material, CreateMaterial } from '@/types/material'
import { listMaterials, createMaterial, deleteMaterial } from '@/lib/api/materials'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface MaterialsState {
  materials: Material[]
  isLoading: boolean
  error: string | null
  fetchMaterials: () => Promise<void>
  addMaterial: (data: CreateMaterial) => Promise<boolean>
  removeMaterial: (id: string) => Promise<boolean>
  clearError: () => void
}

export const useMaterialsStore = create<MaterialsState>((set) => ({
  materials: [],
  isLoading: false,
  error: null,

  fetchMaterials: async () => {
    set({ isLoading: true, error: null })
    const result: ApiResponse<{ records: Material[] }> = await listMaterials({
      material_type: 'artist',
    })
    if (result.success && result.data) {
      set({ materials: result.data.records || [], isLoading: false })
    } else {
      set({ error: result.error || 'Failed to fetch materials', isLoading: false })
    }
  },

  addMaterial: async (data) => {
    set({ isLoading: true, error: null })
    const result = await createMaterial(data)
    if (result.success && result.data) {
      set((state) => ({
        materials: [result.data!, ...state.materials],
        isLoading: false,
      }))
      return true
    }
    set({ error: result.error || 'Failed to create material', isLoading: false })
    return false
  },

  removeMaterial: async (id) => {
    set({ isLoading: true, error: null })
    const result = await deleteMaterial(id)
    if (result.success) {
      set((state) => ({
        materials: state.materials.filter((m) => m.id !== id),
        isLoading: false,
      }))
      return true
    }
    set({ error: result.error || 'Failed to delete material', isLoading: false })
    return false
  },

  clearError: () => {
    set({ error: null })
  },
}))
