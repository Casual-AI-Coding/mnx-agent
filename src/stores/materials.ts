import { create } from 'zustand'
import type { Material, CreateMaterial, MaterialType } from '@/types/material'
import { listMaterials, createMaterial, deleteMaterial } from '@/lib/api/materials'
import { PAGINATION } from '@/lib/config'

export type SortField = 'name' | 'created_at' | 'updated_at'
export type SortOrder = 'asc' | 'desc'

interface MaterialsState {
  materials: Material[]
  isLoading: boolean
  error: string | null
  total: number
  page: number
  limit: number
  totalPages: number
  typeFilter: MaterialType | 'all'
  sortField: SortField
  sortOrder: SortOrder
  fetchMaterials: () => Promise<void>
  addMaterial: (data: CreateMaterial) => Promise<boolean>
  removeMaterial: (id: string) => Promise<boolean>
  clearError: () => void
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setTypeFilter: (type: MaterialType | 'all') => void
  setSortField: (field: SortField) => void
  setSortOrder: (order: SortOrder) => void
  toggleSort: (field: SortField) => void
}

export const useMaterialsStore = create<MaterialsState>((set, get) => ({
  materials: [],
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  limit: PAGINATION.DEFAULT_PAGE_SIZE,
  totalPages: 1,
  typeFilter: 'all',
  sortField: 'updated_at',
  sortOrder: 'desc',

  fetchMaterials: async () => {
    const { page, limit, typeFilter, sortField, sortOrder } = get()
    set({ isLoading: true, error: null })
    const params: Record<string, string | number> = {
      limit,
      offset: (page - 1) * limit,
    }
    if (typeFilter !== 'all') {
      params.material_type = typeFilter
    }
    // Backend sorts by created_at/updated_at, frontend can sort name locally
    if (sortField !== 'name') {
      params.sort_by = sortField
      params.sort_order = sortOrder
    }
    const result = await listMaterials(params as Parameters<typeof listMaterials>[0])
    if (result.success && result.data) {
      let records = result.data.records || []
      if (sortField === 'name') {
        records = [...records].sort((a, b) => {
          const cmp = a.name.localeCompare(b.name, 'zh-CN')
          return sortOrder === 'asc' ? cmp : -cmp
        })
      }
      const pagination = result.data.pagination
      set({
        materials: records,
        total: pagination?.total || 0,
        totalPages: pagination?.totalPages || 1,
        isLoading: false,
      })
    } else {
      set({ error: result.error || 'Failed to fetch materials', isLoading: false })
    }
  },

  addMaterial: async (data) => {
    set({ isLoading: true, error: null })
    const result = await createMaterial(data)
    if (result.success && result.data) {
      // Refetch to get correct pagination
      await get().fetchMaterials()
      return true
    }
    set({ error: result.error || 'Failed to create material', isLoading: false })
    return false
  },

  removeMaterial: async (id) => {
    set({ isLoading: true, error: null })
    const result = await deleteMaterial(id)
    if (result.success) {
      // Refetch to get correct pagination
      await get().fetchMaterials()
      return true
    }
    set({ error: result.error || 'Failed to delete material', isLoading: false })
    return false
  },

  clearError: () => {
    set({ error: null })
  },

  setPage: (page) => {
    set({ page })
    get().fetchMaterials()
  },

  setLimit: (limit) => {
    set({ limit, page: 1 })
    get().fetchMaterials()
  },

  setTypeFilter: (type) => {
    set({ typeFilter: type, page: 1 })
    get().fetchMaterials()
  },

  setSortField: (field) => {
    set({ sortField: field })
    get().fetchMaterials()
  },

  setSortOrder: (order) => {
    set({ sortOrder: order })
    get().fetchMaterials()
  },

  toggleSort: (field) => {
    const { sortField, sortOrder } = get()
    if (sortField === field) {
      set({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' })
    } else {
      set({ sortField: field, sortOrder: 'desc' })
    }
    get().fetchMaterials()
  },
}))
