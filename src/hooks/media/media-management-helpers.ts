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
