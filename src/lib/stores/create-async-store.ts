import { create, StateCreator } from 'zustand'
import { persist } from 'zustand/middleware'
import { AsyncState, CreateAsyncStoreConfig, AsyncActionConfig } from './types'

export function createAsyncStore<
  TState extends AsyncState,
  TActions extends object = Record<string, void>
>(config: CreateAsyncStoreConfig<TState, TActions>) {

  type StoreState = TState & {
    [K in keyof TActions]: (params?: any) => Promise<any>
  }

  const storeCreator: StateCreator<StoreState> = (set, get) => {
    const baseState = config.initialState

    // Generate action methods from config
    const actions = Object.fromEntries(
      Object.entries(config.actions).map(([actionName, actionConfig]) => {
        const cfg = actionConfig as AsyncActionConfig<any, any>
        return [actionName, async (params?: any) => {
          if (cfg.preCheck) {
            const checkResult = cfg.preCheck(params, get())
            if (checkResult === false) return
            if (typeof checkResult === 'string') {
              set({ error: checkResult, loading: false } as unknown as Partial<StoreState>)
              return
            }
          }

          set({ loading: true, error: null } as unknown as Partial<StoreState>)

          try {
            const response = await cfg.apiCall(params)

            if (!response.success) {
              const errorMsg = response.error || `${actionName} failed`
              set({
                error: errorMsg,
                loading: false
              } as Partial<StoreState>)
              cfg.onError?.(get(), errorMsg)
              throw new Error(errorMsg)
            }

            set((state) => {
              cfg.onSuccess?.(state, response.data, params)
              return { ...state, loading: false } as Partial<StoreState>
            })

            return response.data
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : `${actionName} failed`
            set({
              error: errorMsg,
              loading: false
            } as Partial<StoreState>)
            cfg.onError?.(get(), errorMsg)
            if (err instanceof Error) throw err
            throw new Error(errorMsg)
          }
        }]
      })
    )

    return {
      ...baseState,
      ...actions
    } as StoreState
  }

  return create<StoreState>()(
    persist(storeCreator, { name: config.name })
  )
}