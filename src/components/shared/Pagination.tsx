import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizeOptions?: number[]
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        if (i > 1 && i < totalPages) {
          pages.push(i)
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      pages.push(totalPages)
    }

    return pages
  }

  const canGoFirst = currentPage > 1
  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages
  const canGoLast = currentPage < totalPages

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border/50">
      <div className="text-sm text-muted-foreground">
        <span>显示 </span>
        <span className="font-medium text-foreground">{startItem}</span>
        <span> - </span>
        <span className="font-medium text-foreground">{endItem}</span>
        <span> 条，共 </span>
        <span className="font-medium text-foreground">{totalItems}</span>
        <span> 条</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>每页</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="w-[70px] h-8 text-xs border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>条</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
            onClick={() => onPageChange(1)}
            disabled={!canGoFirst}
            title="首页"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrev}
            title="上一页"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span
                key={`ellipsis-${index}`}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground text-sm"
              >
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-8 min-w-8 px-2 text-xs transition-all duration-200',
                  currentPage === page
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                )}
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </Button>
            )
          ))}

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            title="下一页"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoLast}
            title="末页"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
