import { Search, AlertCircle, ChevronLeft, ChevronRight, X, RefreshCw, Loader2, LayoutGrid, Calendar, List, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { useMediaManagement } from '@/hooks/useMediaManagement'
import { AnimatedMediaGrid } from '@/components/media/AnimatedMediaGrid'
import { TimelineItem } from '@/components/media/TimelineItem'
import { MediaTableView } from '@/components/media/MediaTableView'
import { BatchOperationsToolbar, BatchDeleteDialog } from '@/components/media/BatchOperationsToolbar'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { MEDIA_TABS } from '@/lib/constants/media'
import { formatDateHeader, getDateKey } from '@/lib/utils/media'
import { cn } from '@/lib/utils'

export default function MediaManagement() {
  const {
    records,
    pagination,
    isLoading,
    isInitialLoad,
    error,
    setError,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    deleteDialog,
    setDeleteDialog,
    lightboxOpen,
    setLightboxOpen,
    lightboxIndex,
    setLightboxIndex,
    selectedIds,
    setSelectedIds,
    signedUrls,
    batchDeleteDialogOpen,
    setBatchDeleteDialogOpen,
    isBatchDeleting,
    isBatchDownloading,
    viewMode,
    setViewMode,
    pageInput,
    setPageInput,
    timelineRecords,
    hasMore,
    isLoadingMore,
    loadMoreRef,
    filteredRecords,
    lightboxSlides,
    pageNumbers,
    handleSelectAll,
    handleSelect,
    handleBatchDelete,
    handleBatchDownload,
    fetchMedia,
    handleDelete,
    handleDownload,
    handlePreview,
    handlePageChange,
    handleRename,
    handleToggleFavorite,
    handleTabChange,
  } = useMediaManagement()

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<HardDrive className="w-5 h-5" />}
        title="媒体管理"
        gradient="green-emerald"
        actions={
          <>
            <div className="flex items-center bg-muted/50 rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 px-3"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="h-8 px-3"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                className="h-8 px-3"
              >
                <Calendar className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={() => fetchMedia(false)} disabled={isLoading}>
              <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
              刷新
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                {MEDIA_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    <span className="flex items-center gap-2">
                      {tab.icon}
                      {tab.label}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索文件名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">
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
                onSelect={handleSelect}
                onPreview={handlePreview}
                onDownload={handleDownload}
                onDelete={(record) => setDeleteDialog({ isOpen: true, record })}
                onRename={handleRename}
                onToggleFavorite={handleToggleFavorite}
              />
            ) : viewMode === 'timeline' ? (
              <div className="rounded-lg overflow-hidden bg-muted/30">
                {timelineRecords.length === 0 && isLoadingMore ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">加载中...</p>
                  </div>
                ) : timelineRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无媒体文件
                  </div>
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
                              onSelect={() => handleSelect(record.id)}
                              onPreview={() => handlePreview(record)}
                              onDownload={() => handleDownload(record)}
                              onDelete={() => setDeleteDialog({ isOpen: true, record })}
                              onRename={handleRename}
                              onToggleFavorite={handleToggleFavorite}
                            />
                          </div>
                        )
                      })
                    })()}
                    <div ref={loadMoreRef} className="flex justify-center py-4">
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
                onSelectAll={handleSelectAll}
                onSelect={handleSelect}
                onPreview={handlePreview}
                onDownload={handleDownload}
                onDelete={(record) => setDeleteDialog({ isOpen: true, record })}
                onRename={handleRename}
                onToggleFavorite={handleToggleFavorite}
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
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setPageInput(value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const page = parseInt(pageInput)
                        if (page >= 1 && page <= pagination.totalPages) {
                          handlePageChange(page)
                          setPageInput('')
                        }
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
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {pageNumbers.map((page, index) => (
                    <Button
                      key={index}
                      variant={page === pagination.page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => typeof page === 'number' && handlePageChange(page)}
                      disabled={typeof page !== 'number'}
                      className={typeof page !== 'number' ? 'cursor-default' : ''}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, record: null })}
        onConfirm={() => handleDelete(deleteDialog.record!)}
        title="确认删除"
        description={`确定要删除文件 "${deleteDialog.record?.original_name || deleteDialog.record?.filename || ''}" 吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
      />

      <BatchDeleteDialog
        isOpen={batchDeleteDialogOpen}
        onClose={() => setBatchDeleteDialogOpen(false)}
        onConfirm={handleBatchDelete}
        selectedCount={selectedIds.size}
        isDeleting={isBatchDeleting}
      />

      <BatchOperationsToolbar
        selectedCount={selectedIds.size}
        onDelete={() => setBatchDeleteDialogOpen(true)}
        onDownload={handleBatchDownload}
        onClearSelection={() => setSelectedIds(new Set())}
        isDeleting={isBatchDeleting}
        isDownloading={isBatchDownloading}
      />

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        on={{ view: ({ index }) => setLightboxIndex(index) }}
        slides={lightboxSlides}
      />
    </div>
  )
}
