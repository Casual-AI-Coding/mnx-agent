import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useAppStore } from '@/stores/app'
import { getMediaDownloadUrl } from '@/lib/api/media'
import { listMedia } from '../api'
import { filterRecordsBySearch, getDateKey } from '../utils'
import type { MediaType, MediaRecord } from '../types'

export function useMediaTimeline(activeTab: string) {
  const { apiKey } = useAppStore()
  const [timelineRecords, setTimelineRecords] = useState<MediaRecord[]>([])
  const [timelinePage, setTimelinePage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const fetchTimelineMedia = useCallback(async (page: number, reset = false) => {
    if (!apiKey || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const type = activeTab === 'all' ? undefined : (activeTab as MediaType)
      const response = await listMedia({
        type,
        page,
        limit: 20,
      })

      if (response.success) {
        const newRecords = response.data.records
        if (reset) {
          setTimelineRecords(newRecords)
        } else {
          setTimelineRecords(prev => [...prev, ...newRecords])
        }
        setHasMore(page < response.data.pagination.totalPages)
        setTimelinePage(page)
      }
    } catch {
      // Empty catch is intentional - parent component handles error display
    } finally {
      setIsLoadingMore(false)
    }
  }, [apiKey, activeTab, isLoadingMore])

  useEffect(() => {
    if (timelineRecords.length > 0) {
      const imageRecords = timelineRecords.filter(r => r.type === 'image' && !signedUrls[r.id])
      if (imageRecords.length > 0) {
        Promise.all(
          imageRecords.map(async (r) => {
            try {
              const url = await getMediaDownloadUrl(r.id)
              return { id: r.id, url }
            } catch {
              return { id: r.id, url: '' }
            }
          })
        ).then(results => {
          setSignedUrls(prev => {
            const urlMap = { ...prev }
            results.forEach(r => { if (r.url) urlMap[r.id] = r.url })
            return urlMap
          })
        })
      }
    }
  }, [timelineRecords])

  const reset = useCallback(() => {
    setTimelineRecords([])
    setTimelinePage(1)
    setHasMore(true)
  }, [])

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      fetchTimelineMedia(timelinePage + 1)
    }
  }, [hasMore, isLoadingMore, timelinePage, fetchTimelineMedia])

  return {
    timelineRecords,
    timelinePage,
    hasMore,
    isLoadingMore,
    signedUrls,
    loadMoreRef,
    fetchTimelineMedia,
    reset,
    loadMore,
  }
}
