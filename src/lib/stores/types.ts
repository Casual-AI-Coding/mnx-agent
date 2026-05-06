export interface AsyncState {
  loading: boolean
  error: string | null
}

export interface AsyncActionConfig<TParams, TData> {
  preCheck?: (params: TParams, state: unknown) => boolean | string
  apiCall: (params: TParams) => Promise<{ success: boolean; data?: TData; error?: string }>
  onSuccess?: (state: unknown, data: TData | undefined, params: TParams) => void
  onError?: (state: unknown, error: string) => void
}

export interface CreateAsyncStoreConfig<TState extends AsyncState, TActions> {
  name: string
  initialState: TState
  actions: Record<keyof TActions, AsyncActionConfig<unknown, unknown>>
}