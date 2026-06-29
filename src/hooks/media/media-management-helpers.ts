import type { ListMediaParams, FavoriteFilter, PublicFilter } from '@/lib/api/media'
import type { MediaRecord, MediaType } from '@/types/media'

export interface BuildMediaListParamsInput {
  readonly activeTab: string
  readonly searchQuery: string
  readonly page: number
  readonly limit: number
  readonly favoriteFilters: ReadonlySet<FavoriteFilter>
  readonly publicFilters: ReadonlySet<PublicFilter>
}

export interface SignedUrlResult {
  readonly id: string
  readonly url: string
}

export interface BuildPaginationItemsInput {
  readonly currentPage: number
  readonly totalPages: number
  readonly maxVisible?: number
}

const PLAYABLE_MEDIA_TYPES: readonly MediaType[] = ['image', 'audio', 'music']
const FILTERABLE_MEDIA_TYPES = ['audio', 'image', 'video', 'music', 'lyrics'] as const satisfies readonly MediaType[]

export function isPlayableMedia(record: Pick<MediaRecord, 'type'>): boolean {
  return PLAYABLE_MEDIA_TYPES.includes(record.type)
}

export function buildMediaListParams(input: BuildMediaListParamsInput): ListMediaParams {
  const trimmedSearch = input.searchQuery.trim()
  const type = FILTERABLE_MEDIA_TYPES.find(mediaType => mediaType === input.activeTab)

  return {
    type,
    search: trimmedSearch || undefined,
    page: input.page,
    limit: input.limit,
    favoriteFilter: Array.from(input.favoriteFilters),
    publicFilter: Array.from(input.publicFilters),
  }
}

export function collectUnfetchedPlayableRecords(
  records: readonly MediaRecord[],
  fetchedIds: ReadonlySet<string>
): MediaRecord[] {
  return records.filter(record => isPlayableMedia(record) && !fetchedIds.has(record.id))
}

export function mergeSignedUrlResults(
  currentUrls: Readonly<Record<string, string>>,
  results: readonly SignedUrlResult[]
): Record<string, string> {
  const urlMap = { ...currentUrls }
  for (const result of results) {
    if (result.url) {
      urlMap[result.id] = result.url
    }
  }
  return urlMap
}

export function applyMediaPatch(
  records: readonly MediaRecord[],
  id: string,
  patch: Readonly<Partial<Pick<MediaRecord, 'original_name' | 'is_favorite' | 'is_public'>>>
): MediaRecord[] {
  return records.map(record => (record.id === id ? { ...record, ...patch } : record))
}

export function applyMediaPatchByIds(
  records: readonly MediaRecord[],
  ids: ReadonlySet<string>,
  patch: Readonly<Partial<Pick<MediaRecord, 'original_name' | 'is_favorite' | 'is_public'>>>
): MediaRecord[] {
  return records.map(record => (ids.has(record.id) ? { ...record, ...patch } : record))
}

export function buildPaginationItems(input: BuildPaginationItemsInput): (number | string)[] {
  const pages: (number | string)[] = []
  const maxVisible = input.maxVisible ?? 5

  if (input.totalPages <= maxVisible) {
    for (let page = 1; page <= input.totalPages; page += 1) {
      pages.push(page)
    }
    return pages
  }

  if (input.currentPage <= 3) {
    for (let page = 1; page <= 4; page += 1) {
      pages.push(page)
    }
    pages.push('...')
    pages.push(input.totalPages)
    return pages
  }

  if (input.currentPage >= input.totalPages - 2) {
    pages.push(1)
    pages.push('...')
    for (let page = input.totalPages - 3; page <= input.totalPages; page += 1) {
      pages.push(page)
    }
    return pages
  }

  pages.push(1)
  pages.push('...')
  for (let page = input.currentPage - 1; page <= input.currentPage + 1; page += 1) {
    pages.push(page)
  }
  pages.push('...')
  pages.push(input.totalPages)
  return pages
}

export function toggleAllSelectedIds(
  selectedIds: ReadonlySet<string>,
  visibleRecords: readonly Pick<MediaRecord, 'id'>[]
): Set<string> {
  if (visibleRecords.length === 0) {
    return new Set()
  }

  if (selectedIds.size === visibleRecords.length) {
    return new Set()
  }

  return new Set(visibleRecords.map(record => record.id))
}

export function toggleSelectedId(selectedIds: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selectedIds)
  if (next.has(id)) {
    next.delete(id)
    return next
  }

  next.add(id)
  return next
}

export function toggleSetValueWithFallback<T extends string>(
  currentValues: ReadonlySet<T>,
  value: T,
  fallbackValues: readonly T[]
): Set<T> {
  const next = new Set(currentValues)
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }

  return next.size === 0 ? new Set(fallbackValues) : next
}
