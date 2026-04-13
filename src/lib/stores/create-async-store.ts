import { create, StateCreator } from 'zustand'
import { persist } from 'zustand/middleware'
import { AsyncState, CreateAsyncStoreConfig, AsyncActionConfig } from './types'

/**
 * Factory for creating async-capable Zustand stores.
 * Eliminates ~750 lines of duplicate try/catch/loading/error patterns.
 *
 * @example
 * const useJobsStore = createAsyncStore({
 *   name: 'cron-jobs',
 *   initialState: { jobs: [], loading: false, error: null },
 *   actions: {
 *     fetchJobs: {
 *       apiCall: () => apiCron.getJobs(),
 *       onSuccess: (state, data) => { state.jobs = data.items }
 *     },
 *     createJob: {
 *       apiCall: (params) => apiCron.createJob(params),
 *       onSuccess: (state, data) => { state.jobs.push(data) }
 *     }
 *   }
 * })
 */
export function createAsyncStore<
  TState extends AsyncState,
  TActions extends Record<string, AsyncActionConfig<any, any>>
>(config: CreateAsyncStoreConfig<TState, TActions>) {

  type StoreState = TState & {
    [K in keyof TActions]: (params?: any) => Promise<void>
  }

  const storeCreator: StateCreator<StoreState> = (set, get) => {
    const baseState = config.initialState

    // Generate action methods from config
    const actions = Object.fromEntries(
      Object.entries(config.actions).map(([actionName, actionConfig]) => {
        return [actionName, async (params?: any) => {
          // Standard pattern: set loading, try API, handle result
          set({ loading: true, error: null } as unknown as Partial<StoreState>)

          try {
            const response = await actionConfig.apiCall(params)

            if (!response.success || !response.data) {
              const errorMsg = response.error || `${actionName} failed`
              set({
                error: errorMsg,
                loading: false
              } as Partial<StoreState>)
              actionConfig.onError?.(get(), errorMsg)
              return
            }

            // Apply success transformation
            set((state) => {
              actionConfig.onSuccess?.(state, response.data)
              return { ...state, loading: false } as Partial<StoreState>
            })
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : `${actionName} failed`
            set({
              error: errorMsg,
              loading: false
            } as Partial<StoreState>)
            actionConfig.onError?.(get(), errorMsg)
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