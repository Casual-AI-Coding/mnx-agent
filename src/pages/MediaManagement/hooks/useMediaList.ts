import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/stores/app'
import { getMediaDownloadUrl } from '@/lib/api/media'
import { listMedia } from '../api'
import type { MediaType, MediaRecord, PaginationInfo } from '../types'

export function useMediaList(activeTab: string) {
  const { apiKey } = useAppStore()
  const [records, setRecords] = useState<MediaRecord[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  const fetchMedia = useCallback(async (isInitial = false) => {
    if (!apiKey) return

    setIsLoading(true)
    if (isInitial) setIsInitialLoad(true)
    setError(null)

    try {
      const type = activeTab === 'all' ? undefined : (activeTab as MediaType)
      const response = await listMedia({
        type,
        page: pagination.page,
        limit: pagination.limit,
      })

      if (response.success) {
        setRecords(response.data.records)
        setPagination(response.data.pagination)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取媒体列表失败')
    } finally {
      setIsLoading(false)
      setIsInitialLoad(false)
    }
  }, [apiKey, activeTab, pagination.page, pagination.limit])

  useEffect(() => {
    if (isInitialLoad) {
      fetchMedia(true)
    }
  }, [fetchMedia, isInitialLoad])

  useEffect(() => {
    if (!isInitialLoad) {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [activeTab])

  useEffect(() => {
    if (!isInitialLoad) {
      fetchMedia(false)
    }
  }, [activeTab, pagination.page])

  useEffect(() => {
    if (records.length > 0) {
      const imageRecords = records.filter(r => r.type === 'image' && !signedUrls[r.id])
      if (imageRecords.length === 0) return

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
  }, [records])

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page }))
    }
  }, [pagination.totalPages])

  const refresh = useCallback(() => {
    fetchMedia(false)
  }, [fetchMedia])

  return {
    records,
    setRecords,
    pagination,
    setPagination,
    isLoading,
    isInitialLoad,
    error,
    setError,
    signedUrls,
    handlePageChange,
    refresh,
  }
}
