export interface AsyncState {
  loading: boolean
  error: string | null
}

export interface AsyncActionConfig<TParams, TData> {
  apiCall: (params: TParams) => Promise<{ success: boolean; data?: TData; error?: string }>
  onSuccess?: (state: any, data: TData) => void
  onError?: (state: any, error: string) => void
}

export interface CreateAsyncStoreConfig<TState extends AsyncState, TActions> {
  name: string
  initialState: TState
  actions: Record<keyof TActions, AsyncActionConfig<any, any>>
}