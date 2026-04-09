import { Search, Grid3X3, List, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/shared/PageHeader'
import { Store } from 'lucide-react'
import type { TemplateFiltersProps } from './types'

interface HeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  onCreateWorkflow: () => void
}

export function MarketplaceHeader({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onCreateWorkflow,
}: HeaderProps) {
  return (
    <PageHeader
      icon={<Store className="w-5 h-5" />}
      title="工作流模板市场"
      description="发现和使用预定义的工作流模板"
      gradient="purple-pink"
      actions={
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => onViewModeChange('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => onViewModeChange('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateWorkflow}
          >
            <GitBranch className="w-4 h-4 mr-2" />
            创建工作流
          </Button>
        </div>
      }
    />
  )
}
