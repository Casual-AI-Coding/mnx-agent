import { create, type StateCreator } from 'zustand'

/**
 * 列表 Store 基础状态
 * 消除 stores 中重复的 loading/error/items 模式
 */
export interface ListStoreBase<T> {
  items: T[]
  loading: boolean
  error: string | null
}

/**
 * 列表 Store 基础 Actions
 */
export interface ListStoreActions<T> {
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setItems: (items: T[]) => void
  updateItem: (id: string, updates: Partial<T>) => void
  removeItem: (id: string) => void
}

/**
 * 创建列表 Store 的初始化状态
 */
export function createListInitialState<T>(): ListStoreBase<T> {
  return { items: [], loading: false, error: null }
}

/**
 * 通用 API 调用包装器 — 消除 try/catch + loading/error 样板
 */
export async function withLoadingState<T>(
  set: (partial: Partial<ListStoreBase<T>>) => void,
  fn: () => Promise<T>
): Promise<T | undefined> {
  set({ loading: true, error: null })
  try {
    const result = await fn()
    set({ loading: false })
    return result
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    set({ error: message, loading: false })
    return undefined
  }
}

/**
 * 通用列表 Actions
 */
export function createListActions<T extends { id: string }>(
  set: (partial: Partial<ListStoreBase<T>>) => void,
  get: () => ListStoreBase<T>
): ListStoreActions<T> {
  return {
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setItems: (items) => set({ items, loading: false }),
    updateItem: (id, updates) => {
      const { items } = get()
      set({ items: items.map((item) => (item.id === id ? { ...item, ...updates } : item)) })
    },
    removeItem: (id) => {
      const { items } = get()
      set({ items: items.filter((item) => item.id !== id) })
    },
  }
}
