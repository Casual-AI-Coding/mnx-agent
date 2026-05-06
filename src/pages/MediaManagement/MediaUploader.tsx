import type { ReactNode } from 'react'
import { Globe, List, Lock, Loader2, RefreshCw, Search, Star, StarOff, Undo2, Users, X, Calendar, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'
import type { RecoverableMediaRecord } from '@/lib/api/media'

interface MediaUploaderProps {
  mediaTabs: Array<{ value: string; label: string; icon: ReactNode }>
  viewMode: 'table' | 'card' | 'timeline'
  onViewModeChange: (mode: 'table' | 'card' | 'timeline') => void
  onRefresh: () => void
  isRefreshing: boolean
  onFetchRecoverable: () => void
  isLoadingRecoverable: boolean
  activeTab: string
  onTabChange: (value: string) => void
  favoriteFilters: Set<string>
  publicFilters: Set<string>
  onToggleFavoriteFilter: (value: 'favorite' | 'non-favorite') => void
  onTogglePublicFilter: (value: 'private' | 'public' | 'others-public') => void
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  onSearch: () => void
  isSearching: boolean
  recoverDialogOpen: boolean
  onCloseRecoverDialog: () => void
  recoverableRecords: RecoverableMediaRecord[]
  onRecover: (logId: number, resourceUrl: string) => void
  recoveringId: string | null
}

export function MediaUploader({
  mediaTabs,
  viewMode,
  onViewModeChange,
  onRefresh,
  isRefreshing,
  onFetchRecoverable,
  isLoadingRecoverable,
  activeTab,
  onTabChange,
  favoriteFilters,
  publicFilters,
  onToggleFavoriteFilter,
  onTogglePublicFilter,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  isSearching,
  recoverDialogOpen,
  onCloseRecoverDialog,
  recoverableRecords,
  onRecover,
  recoveringId,
}: MediaUploaderProps) {
  return (
    <>
      <PageHeader
        icon={<List className="w-5 h-5" />}
        title="媒体管理"
        gradient="green-emerald"
        actions={
          <>
            <div className="flex items-center bg-muted/50 rounded-lg p-1">
              <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => onViewModeChange('table')} className="h-8 px-3">
                <List className="w-4 h-4" />
              </Button>
              <Button variant={viewMode === 'card' ? 'default' : 'ghost'} size="sm" onClick={() => onViewModeChange('card')} className="h-8 px-3">
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button variant={viewMode === 'timeline' ? 'default' : 'ghost'} size="sm" onClick={() => onViewModeChange('timeline')} className="h-8 px-3">
                <Calendar className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={onRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
              刷新
            </Button>
            <Button variant="outline" onClick={onFetchRecoverable} disabled={isLoadingRecoverable}>
              <Undo2 className={cn('w-4 h-4 mr-2', isLoadingRecoverable && 'animate-spin')} />
              恢复上传
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Tabs value={activeTab} onValueChange={onTabChange}>
              <TabsList>
                {mediaTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    <span className="flex items-center gap-2">
                      {tab.icon}
                      {tab.label}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted/30 rounded-lg p-1.5 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleFavoriteFilter('favorite')}
                  className={cn(
                    'h-8 px-3 rounded-md transition-all',
                    favoriteFilters.has('favorite')
                      ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                  title="已收藏"
                >
                  <Star className={cn('w-4 h-4', favoriteFilters.has('favorite') && 'fill-yellow-500/50')} />
                  <span className="ml-1 text-sm font-medium">已收藏</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleFavoriteFilter('non-favorite')}
                  className={cn(
                    'h-8 px-3 rounded-md transition-all',
                    favoriteFilters.has('non-favorite')
                      ? 'bg-muted/40 border border-muted-foreground/20 text-foreground hover:bg-muted/60'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                  title="未收藏"
                >
                  <StarOff className="w-4 h-4" />
                  <span className="ml-1 text-sm font-medium">未收藏</span>
                </Button>
              </div>

              <div className="flex items-center bg-muted/30 rounded-lg p-1.5 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTogglePublicFilter('private')}
                  className={cn(
                    'h-8 px-3 rounded-md transition-all',
                    publicFilters.has('private')
                      ? 'bg-orange-500/15 border border-orange-500/30 text-orange-600 hover:bg-orange-500/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                  title="私有"
                >
                  <Lock className="w-4 h-4" />
                  <span className="ml-1 text-sm font-medium">私有</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTogglePublicFilter('public')}
                  className={cn(
                    'h-8 px-3 rounded-md transition-all',
                    publicFilters.has('public')
                      ? 'bg-green-500/15 border border-green-500/30 text-green-600 hover:bg-green-500/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                  title="公开"
                >
                  <Globe className="w-4 h-4" />
                  <span className="ml-1 text-sm font-medium">公开</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTogglePublicFilter('others-public')}
                  className={cn(
                    'h-8 px-3 rounded-md transition-all',
                    publicFilters.has('others-public')
                      ? 'bg-blue-500/15 border border-blue-500/30 text-blue-600 hover:bg-blue-500/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                  title="他人公开"
                >
                  <Users className="w-4 h-4" />
                  <span className="ml-1 text-sm font-medium">他人</span>
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-none sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索文件名..."
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  className="pl-9 w-full"
                />
                {searchQuery && (
                  <button onClick={() => onSearchQueryChange('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <Button variant="default" size="sm" onClick={onSearch} disabled={isSearching} className="h-9 px-4">
                <Search className="w-4 h-4 mr-1" />
                搜索
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent />
      </Card>

      <Dialog
        open={recoverDialogOpen}
        onClose={onCloseRecoverDialog}
        title="恢复上传失败的文件"
        description={recoverableRecords.length === 0 ? '没有发现需要恢复的文件' : `发现 ${recoverableRecords.length} 个文件可以恢复`}
        size="lg"
      >
        {recoverableRecords.length > 0 && (
          <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
            {recoverableRecords.map((record) => (
              <div key={record.resource_url} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {record.operation}
                    {record.image_index !== undefined ? ` #${record.image_index + 1}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {record.type} · {record.source} · {new Date(record.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRecover(record.log_id, record.resource_url)}
                  disabled={recoveringId === record.resource_url}
                >
                  {recoveringId === record.resource_url ? <Loader2 className="w-4 h-4 animate-spin" /> : '恢复'}
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onCloseRecoverDialog}>关闭</Button>
        </div>
      </Dialog>
    </>
  )
}
