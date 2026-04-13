export interface AsyncState {
  loading: boolean
  error: string | null
}

export interface AsyncActionConfig<TParams, TData> {
  preCheck?: (params: TParams, state: any) => boolean | string
  apiCall: (params: TParams) => Promise<{ success: boolean; data?: TData; error?: string }>
  onSuccess?: (state: any, data: TData | undefined, params: TParams) => void
  onError?: (state: any, error: string) => void
}

export interface CreateAsyncStoreConfig<TState extends AsyncState, TActions> {
  name: string
  initialState: TState
  actions: Record<keyof TActions, AsyncActionConfig<any, any>>
}