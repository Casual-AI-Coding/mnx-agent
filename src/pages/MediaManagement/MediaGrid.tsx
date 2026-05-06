import type { ComponentProps, RefObject } from 'react'
import { AlertCircle, Calendar, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AnimatedMediaGrid } from '@/components/media/AnimatedMediaGrid'
import { TimelineItem } from '@/components/media/TimelineItem'
import { MediaTableView } from '@/components/media/MediaTableView'
import { formatDateHeader, getDateKey } from '@/lib/utils/media'

type AnimatedMediaGridProps = ComponentProps<typeof AnimatedMediaGrid>
type MediaTableViewProps = ComponentProps<typeof MediaTableView>
type TimelineItemProps = ComponentProps<typeof TimelineItem>

interface MediaGridProps {
  error: string | null
  onClearError: () => void
  isLoading: boolean
  isInitialLoad: boolean
  filteredRecords: AnimatedMediaGridProps['records']
  searchQuery: string
  viewMode: 'table' | 'card' | 'timeline'
  timelineRecords: TimelineItemProps['record'][]
  isLoadingMore: boolean
  signedUrls: AnimatedMediaGridProps['signedUrls']
  selectedIds: AnimatedMediaGridProps['selectedIds']
  onSelectAll: MediaTableViewProps['onSelectAll']
  onSelect: (id: string) => void
  onPreview: (record: AnimatedMediaGridProps['records'][number]) => void
  onDownload: (record: AnimatedMediaGridProps['records'][number]) => void
  onDelete: (record: AnimatedMediaGridProps['records'][number]) => void
  onRename: AnimatedMediaGridProps['onRename']
  onToggleFavorite: AnimatedMediaGridProps['onToggleFavorite']
  onTogglePublic: AnimatedMediaGridProps['onTogglePublic']
  currentUserId?: string
  userRole?: string
  hasMore: boolean
  loadMoreRef: RefObject<HTMLDivElement | null>
  pagination: {
    total: number
    page: number
    totalPages: number
  }
  pageInput: string
  onPageInputChange: (value: string) => void
  onPageInputSubmit: () => void
  onPageChange: (page: number) => void
  pageNumbers: Array<number | string>
}

export function MediaGrid({
  error,
  onClearError,
  isLoading,
  isInitialLoad,
  filteredRecords,
  searchQuery,
  viewMode,
  timelineRecords,
  isLoadingMore,
  signedUrls,
  selectedIds,
  onSelectAll,
  onSelect,
  onPreview,
  onDownload,
  onDelete,
  onRename,
  onToggleFavorite,
  onTogglePublic,
  currentUserId,
  userRole,
  hasMore,
  loadMoreRef,
  pagination,
  pageInput,
  onPageInputChange,
  onPageInputSubmit,
  onPageChange,
  pageNumbers,
}: MediaGridProps) {
  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={onClearError} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={`transition-opacity duration-200 ${isLoading && !isInitialLoad ? 'opacity-50' : 'opacity-100'}`}>
        {isInitialLoad ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground mt-2">加载中...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? '没有找到匹配的文件' : '暂无媒体文件'}
          </div>
        ) : viewMode === 'card' ? (
          <AnimatedMediaGrid
            records={filteredRecords}
            signedUrls={signedUrls}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onPreview={onPreview}
            onDownload={onDownload}
            onDelete={onDelete}
            onRename={onRename}
            onToggleFavorite={onToggleFavorite}
            onTogglePublic={onTogglePublic}
            currentUserId={currentUserId}
            userRole={userRole}
          />
        ) : viewMode === 'timeline' ? (
          <div className="rounded-lg overflow-hidden bg-muted/30">
            {timelineRecords.length === 0 && isLoadingMore ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground mt-2">加载中...</p>
              </div>
            ) : timelineRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">暂无媒体文件</div>
            ) : (
              <>
                {(() => {
                  let lastDateKey = ''
                  return timelineRecords.map((record) => {
                    const dateKey = getDateKey(record.created_at)
                    const showDateHeader = dateKey !== lastDateKey
                    lastDateKey = dateKey

                    return (
                      <div key={record.id}>
                        {showDateHeader && (
                          <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-2 bg-muted/50 text-sm font-medium">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{formatDateHeader(record.created_at)}</span>
                          </div>
                        )}
                        <TimelineItem
                          record={record}
                          signedUrl={signedUrls[record.id]}
                          isSelected={selectedIds.has(record.id)}
                          onSelect={() => onSelect(record.id)}
                          onPreview={() => onPreview(record)}
                          onDownload={() => onDownload(record)}
                          onDelete={() => onDelete(record)}
                          onRename={onRename}
                          onToggleFavorite={onToggleFavorite}
            onTogglePublic={onTogglePublic ? (mediaId: string) => onTogglePublic(mediaId, false) : undefined}
                          currentUserId={currentUserId}
                          userRole={userRole}
                        />
                      </div>
                    )
                  })
                })()}
                <div ref={loadMoreRef as React.Ref<HTMLDivElement>} className="flex justify-center py-4">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>加载更多...</span>
                    </div>
                  )}
                  {!hasMore && timelineRecords.length > 0 && (
                    <span className="text-muted-foreground text-sm">已加载全部</span>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <MediaTableView
            records={filteredRecords}
            signedUrls={signedUrls}
            selectedIds={selectedIds}
            onSelectAll={onSelectAll}
            onSelect={onSelect}
            onPreview={onPreview}
            onDownload={onDownload}
            onDelete={onDelete}
            onRename={onRename}
            onToggleFavorite={onToggleFavorite}
            onTogglePublic={onTogglePublic ? (mediaId: string) => onTogglePublic(mediaId, false) : undefined}
            currentUserId={currentUserId}
            userRole={userRole}
          />
        )}
      </div>

      {pagination.totalPages > 0 && viewMode !== 'timeline' && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">跳转到</span>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pageInput}
                onChange={(e) => onPageInputChange(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onPageInputSubmit()
                  }
                }}
                placeholder={String(pagination.page)}
                className="w-16 h-8 text-center"
              />
              <span className="text-sm text-muted-foreground">页</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {pageNumbers.map((page, index) => (
                <Button
                  key={index}
                  variant={page === pagination.page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => typeof page === 'number' && onPageChange(page)}
                  disabled={typeof page !== 'number'}
                  className={typeof page !== 'number' ? 'cursor-default' : ''}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
