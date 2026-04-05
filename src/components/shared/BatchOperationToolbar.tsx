import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Square, Trash2, Power, PowerOff, X, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface BatchOperationToolbarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onActivate: () => void
  onDeactivate: () => void
  onDelete: () => void
  isAllSelected: boolean
  hasSelection: boolean
  loading?: boolean
}

export function BatchOperationToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onActivate,
  onDeactivate,
  onDelete,
  isAllSelected,
  hasSelection,
  loading = false,
}: BatchOperationToolbarProps) {
  return (
    <AnimatePresence mode="wait">
      {hasSelection ? (
        <motion.div
          key="toolbar"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl border',
            'bg-primary/5 border-primary/20',
            'shadow-lg shadow-primary/5'
          )}
        >
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isAllSelected ? onDeselectAll : onSelectAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {isAllSelected ? '取消全选' : '全选'}
            </motion.button>
          </div>

          <div className="h-6 w-px bg-primary/20" />

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              已选 <span className="text-primary font-bold">{selectedCount}</span> 个用户
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={onActivate}
                disabled={loading}
                className="border-success/30 text-success hover:bg-success/10"
              >
                <Power className="w-4 h-4 mr-1.5" />
                启用
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={onDeactivate}
                disabled={loading}
                className="border-muted-foreground/30 text-muted-foreground hover:bg-muted/10"
              >
                <PowerOff className="w-4 h-4 mr-1.5" />
                禁用
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                disabled={loading}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                删除
              </Button>
            </motion.div>

            <div className="h-6 w-px bg-primary/20 mx-1" />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDeselectAll}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="取消选择"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
