import { Button } from '@/components/ui/Button'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { useState } from 'react'
import { useMediaManagement } from '@/hooks/useMediaManagement'
import { BatchOperationsToolbar, BatchDeleteDialog } from '@/components/media/BatchOperationsToolbar'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LyricsPreviewModal } from '@/components/lyrics'

import { MEDIA_TABS } from '@/lib/constants/media'
import { useAuthStore } from '@/stores/auth'
import { getRecoverableMedia, recoverMedia, type RecoverableMediaRecord } from '@/lib/api/media'
import { toastSuccess, toastError } from '@/lib/toast'
import { MediaGrid } from './media-management/MediaGrid.js'
import { MediaUploader } from './media-management/MediaUploader.js'

export default function MediaManagement() {
  const currentUser = useAuthStore((state) => state.user)

  const [recoverDialogOpen, setRecoverDialogOpen] = useState(false)
  const [recoverableRecords, setRecoverableRecords] = useState<RecoverableMediaRecord[]>([])
  const [isLoadingRecoverable, setIsLoadingRecoverable] = useState(false)
  const [recoveringId, setRecoveringId] = useState<string | null>(null)

  const handleFetchRecoverable = async () => {
    setIsLoadingRecoverable(true)
    try {
      const response = await getRecoverableMedia()
      if (response.success) {
        setRecoverableRecords(response.data.records)
        setRecoverDialogOpen(true)
      }
    } catch (error) {
      toastError('获取可恢复记录失败')
    } finally {
      setIsLoadingRecoverable(false)
    }
  }

  const handleRecover = async (logId: number, resourceUrl: string) => {
    setRecoveringId(String(logId))
    try {
      const response = await recoverMedia(logId, resourceUrl)
      if (response.success) {
        toastSuccess('文件恢复成功')
        setRecoverableRecords(prev => prev.filter(r => r.resource_url !== resourceUrl))
        fetchMedia(false)
      }
    } catch (error) {
      toastError('恢复失败')
    } finally {
      setRecoveringId(null)
    }
  }

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
    handleTogglePublic,
    handleBatchTogglePublic,
    handleManualSearch,
    handleTabChange,
    favoriteFilters,
    toggleFavoriteFilter,
    publicFilters,
    togglePublicFilter,
    lyricsPreviewRecord,
    setLyricsPreviewRecord,
    audioPreviewRecord,
    setAudioPreviewRecord,
  } = useMediaManagement()

  return (
    <div className="space-y-6">
      <MediaUploader
        mediaTabs={MEDIA_TABS}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={() => fetchMedia(false)}
        isRefreshing={isLoading}
        onFetchRecoverable={handleFetchRecoverable}
        isLoadingRecoverable={isLoadingRecoverable}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        favoriteFilters={favoriteFilters}
        publicFilters={publicFilters}
        onToggleFavoriteFilter={toggleFavoriteFilter}
        onTogglePublicFilter={togglePublicFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleManualSearch}
        isSearching={isLoading}
        recoverDialogOpen={recoverDialogOpen}
        onCloseRecoverDialog={() => setRecoverDialogOpen(false)}
        recoverableRecords={recoverableRecords}
        onRecover={handleRecover}
        recoveringId={recoveringId}
      />

      <MediaGrid
        error={error}
        onClearError={() => setError(null)}
        isLoading={isLoading}
        isInitialLoad={isInitialLoad}
        filteredRecords={filteredRecords}
        searchQuery={searchQuery}
        viewMode={viewMode}
        timelineRecords={timelineRecords}
        isLoadingMore={isLoadingMore}
        signedUrls={signedUrls}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelect={handleSelect}
        onPreview={handlePreview}
        onDownload={handleDownload}
        onDelete={(record) => setDeleteDialog({ isOpen: true, record })}
        onRename={handleRename}
        onToggleFavorite={handleToggleFavorite}
        onTogglePublic={handleTogglePublic}
        currentUserId={currentUser?.id}
        userRole={currentUser?.role}
        hasMore={hasMore}
        loadMoreRef={loadMoreRef}
        pagination={pagination}
        pageInput={pageInput}
        onPageInputChange={setPageInput}
        onPageInputSubmit={() => {
          const page = parseInt(pageInput)
          if (page >= 1 && page <= pagination.totalPages) {
            handlePageChange(page)
            setPageInput('')
          }
        }}
        onPageChange={handlePageChange}
        pageNumbers={pageNumbers}
      />

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
        onSetPublic={(isPublic) => handleBatchTogglePublic(Array.from(selectedIds), isPublic)}
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

      {lyricsPreviewRecord && (
        <LyricsPreviewModal
          record={lyricsPreviewRecord}
          open={true}
          onClose={() => setLyricsPreviewRecord(null)}
        />
      )}

      </div>
  )
}
