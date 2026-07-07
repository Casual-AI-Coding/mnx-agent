export type FavoriteFilter = 'favorite' | 'non-favorite'
export type PublicFilter = 'private' | 'public' | 'others-public'
export type MediaListRole = 'user' | 'pro' | 'admin' | 'super'
export type MediaListQueryParam = string | number | boolean | undefined

export interface MediaListQueryInput {
  readonly type?: string
  readonly source?: string
  readonly search?: string
  readonly limit: number
  readonly offset: number
  readonly includeDeleted?: boolean
  readonly visibilityOwnerId?: string
  readonly favoriteFilter?: readonly FavoriteFilter[]
  readonly publicFilter?: readonly PublicFilter[]
  readonly favoriteUserId?: string
  readonly pinnedUserId?: string
  readonly role?: MediaListRole
  readonly isPostgres: boolean
}

export interface MediaListQuery {
  readonly selectClause: string
  readonly joinClause: string
  readonly whereClause: string
  readonly orderByClause: string
  readonly params: readonly MediaListQueryParam[]
  readonly pagination: {
    readonly clause: string
    readonly params: readonly [number, number]
  }
}

interface MediaListQueryState {
  readonly selectClause: string
  readonly joinClause: string
  readonly whereConditions: readonly string[]
  readonly params: readonly MediaListQueryParam[]
  readonly paramIndex: number
  readonly orderByClause: string
}

interface MediaListFilterFlags {
  readonly hasFavorite: boolean
  readonly hasNonFavorite: boolean
  readonly hasPrivate: boolean
  readonly hasPublic: boolean
  readonly hasOthersPublic: boolean
  readonly isAdminOrSuper: boolean
}

function buildMediaListFilterFlags(input: MediaListQueryInput): MediaListFilterFlags {
  return {
    hasFavorite: input.favoriteFilter?.includes('favorite') ?? false,
    hasNonFavorite: input.favoriteFilter?.includes('non-favorite') ?? false,
    hasPrivate: input.publicFilter?.includes('private') ?? false,
    hasPublic: input.publicFilter?.includes('public') ?? false,
    hasOthersPublic: input.publicFilter?.includes('others-public') ?? false,
    isAdminOrSuper: input.role === 'admin' || input.role === 'super',
  }
}

function appendCondition(state: MediaListQueryState, condition: string): MediaListQueryState {
  return {
    ...state,
    whereConditions: [...state.whereConditions, condition],
  }
}

function appendConditionWithParam(
  state: MediaListQueryState,
  condition: string,
  value: MediaListQueryParam
): MediaListQueryState {
  return {
    ...state,
    whereConditions: [...state.whereConditions, condition],
    params: [...state.params, value],
    paramIndex: state.paramIndex + 1,
  }
}

function appendJoinClause(existing: string, addition: string): string {
  if (existing.length === 0) {
    return addition
  }
  return `${existing} ${addition}`
}

function buildFavoriteClause(
  state: MediaListQueryState,
  favoriteUserId: string | undefined,
  flags: MediaListFilterFlags
): MediaListQueryState {
  if (!favoriteUserId) {
    return state
  }

  const selectClause = `${state.selectClause}, CASE WHEN f.id IS NOT NULL AND f.is_deleted = false THEN true ELSE false END as is_favorite`

  if (flags.hasFavorite && !flags.hasNonFavorite) {
    return {
      ...state,
      selectClause,
      joinClause: appendJoinClause(state.joinClause, `INNER JOIN user_media_favorites f ON m.id = f.media_id AND f.user_id = $${state.paramIndex} AND f.is_deleted = false`),
      params: [...state.params, favoriteUserId],
      paramIndex: state.paramIndex + 1,
    }
  }

  const result: MediaListQueryState = {
    ...state,
    selectClause,
    joinClause: appendJoinClause(state.joinClause, `LEFT JOIN user_media_favorites f ON m.id = f.media_id AND f.user_id = $${state.paramIndex}`),
    params: [...state.params, favoriteUserId],
    paramIndex: state.paramIndex + 1,
  }

  if (!flags.hasFavorite && flags.hasNonFavorite) {
    return appendCondition(result, '(f.id IS NULL OR f.is_deleted = true)')
  }

  return result
}

function buildPinClause(state: MediaListQueryState, pinnedUserId: string | undefined): MediaListQueryState {
  if (!pinnedUserId) {
    return state
  }

  return {
    ...state,
    selectClause: `${state.selectClause}, CASE WHEN p.id IS NOT NULL AND p.is_deleted = false THEN true ELSE false END as is_pinned`,
    joinClause: appendJoinClause(state.joinClause, `LEFT JOIN user_media_pins p ON m.id = p.media_id AND p.user_id = $${state.paramIndex}`),
    params: [...state.params, pinnedUserId],
    paramIndex: state.paramIndex + 1,
    orderByClause: 'is_pinned DESC, m.created_at DESC',
  }
}

function buildVisibilityClause(
  state: MediaListQueryState,
  visibilityOwnerId: string | undefined,
  flags: MediaListFilterFlags
): MediaListQueryState {
  if (!visibilityOwnerId || flags.isAdminOrSuper) {
    return state
  }

  return appendConditionWithParam(state, `(m.owner_id = $${state.paramIndex} OR m.is_public = true)`, visibilityOwnerId)
}

function buildPublicFilterClause(
  state: MediaListQueryState,
  input: MediaListQueryInput,
  flags: MediaListFilterFlags
): MediaListQueryState {
  if (!input.publicFilter || input.publicFilter.length === 0) {
    return state
  }

  if (flags.hasPrivate && !flags.hasPublic && !flags.hasOthersPublic) {
    const condition = flags.isAdminOrSuper
      ? `(m.owner_id = $${state.paramIndex} OR m.owner_id IS NULL) AND m.is_public = false`
      : `m.owner_id = $${state.paramIndex} AND m.is_public = false`
    return appendConditionWithParam(state, condition, input.visibilityOwnerId)
  }

  if (!flags.hasPrivate && flags.hasPublic && !flags.hasOthersPublic) {
    const condition = flags.isAdminOrSuper
      ? `(m.owner_id = $${state.paramIndex} OR m.owner_id IS NULL) AND m.is_public = true`
      : `m.owner_id = $${state.paramIndex} AND m.is_public = true`
    return appendConditionWithParam(state, condition, input.visibilityOwnerId)
  }

  if (!flags.hasPrivate && !flags.hasPublic && flags.hasOthersPublic) {
    if (flags.isAdminOrSuper && input.visibilityOwnerId) {
      return appendConditionWithParam(
        state,
        `m.owner_id != $${state.paramIndex} AND m.owner_id IS NOT NULL AND m.is_public = true`,
        input.visibilityOwnerId
      )
    }

    if (input.visibilityOwnerId) {
      return appendConditionWithParam(
        state,
        `(m.owner_id IS NULL OR m.owner_id != $${state.paramIndex}) AND m.is_public = true`,
        input.visibilityOwnerId
      )
    }

    return appendCondition(state, 'm.is_public = true')
  }

  if (flags.hasPrivate && flags.hasPublic && !flags.hasOthersPublic) {
    const condition = flags.isAdminOrSuper
      ? `(m.owner_id = $${state.paramIndex} OR m.owner_id IS NULL)`
      : `m.owner_id = $${state.paramIndex}`
    return appendConditionWithParam(state, condition, input.visibilityOwnerId)
  }

  if (flags.hasPrivate && !flags.hasPublic && flags.hasOthersPublic) {
    if (flags.isAdminOrSuper && input.visibilityOwnerId) {
      return appendConditionWithParam(
        state,
        `((m.owner_id = $${state.paramIndex} OR m.owner_id IS NULL) AND m.is_public = false OR m.owner_id != $${state.paramIndex} AND m.owner_id IS NOT NULL AND m.is_public = true)`,
        input.visibilityOwnerId
      )
    }

    if (input.visibilityOwnerId) {
      return appendConditionWithParam(
        state,
        `(m.owner_id = $${state.paramIndex} AND m.is_public = false OR m.is_public = true AND (m.owner_id IS NULL OR m.owner_id != $${state.paramIndex}))`,
        input.visibilityOwnerId
      )
    }
    return state
  }

  if (!flags.hasPrivate && flags.hasPublic && flags.hasOthersPublic) {
    return appendCondition(state, 'm.is_public = true')
  }

  return state
}

function buildDeletedClause(state: MediaListQueryState, input: MediaListQueryInput): MediaListQueryState {
  if (input.includeDeleted) {
    return state
  }
  return appendCondition(state, input.isPostgres ? 'm.is_deleted = false' : 'm.is_deleted = 0')
}

function buildFieldFilterClause(
  state: MediaListQueryState,
  field: 'm.type' | 'm.source',
  value: string | undefined
): MediaListQueryState {
  if (!value) {
    return state
  }
  return appendConditionWithParam(state, `${field} = $${state.paramIndex}`, value)
}

function buildSearchClause(state: MediaListQueryState, search: string | undefined): MediaListQueryState {
  if (!search || !search.trim()) {
    return state
  }
  return appendConditionWithParam(
    state,
    `(m.filename LIKE $${state.paramIndex} OR m.original_name LIKE $${state.paramIndex})`,
    `%${search.trim()}%`
  )
}

function buildWhereClause(whereConditions: readonly string[]): string {
  if (whereConditions.length === 0) {
    return ''
  }
  return `WHERE ${whereConditions.join(' AND ')}`
}

function buildPaginationClause(paramIndex: number, limit: number, offset: number): MediaListQuery['pagination'] {
  return {
    clause: `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params: [limit, offset],
  }
}

export function buildMediaListQuery(input: MediaListQueryInput): MediaListQuery {
  const flags = buildMediaListFilterFlags(input)
  let state: MediaListQueryState = {
    selectClause: 'm.*',
    joinClause: '',
    whereConditions: [],
    params: [],
    paramIndex: 1,
    orderByClause: 'm.created_at DESC',
  }

  state = buildFavoriteClause(state, input.favoriteUserId, flags)
  state = buildPinClause(state, input.pinnedUserId)
  state = buildVisibilityClause(state, input.visibilityOwnerId, flags)
  state = buildPublicFilterClause(state, input, flags)
  state = buildDeletedClause(state, input)
  state = buildFieldFilterClause(state, 'm.type', input.type)
  state = buildFieldFilterClause(state, 'm.source', input.source)
  state = buildSearchClause(state, input.search)

  return {
    selectClause: state.selectClause,
    joinClause: state.joinClause,
    whereClause: buildWhereClause(state.whereConditions),
    orderByClause: state.orderByClause,
    params: state.params,
    pagination: buildPaginationClause(state.paramIndex, input.limit, input.offset),
  }
}
