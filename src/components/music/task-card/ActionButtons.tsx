import { motion } from 'framer-motion'
import { Download, Globe, Heart, Lock, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionButtonsProps {
  canPerformMediaActions: boolean
  isDeleting: boolean
  isFavorite?: boolean
  isFavoriting: boolean
  isPublic?: boolean
  isTogglingPublic: boolean
  onDelete?: () => void
  onDownload?: () => void
  onFavorite?: () => void
  onTogglePublic?: () => void
}

export function ActionButtons({
  canPerformMediaActions,
  isDeleting,
  isFavorite,
  isFavoriting,
  isPublic,
  isTogglingPublic,
  onDelete,
  onDownload,
  onFavorite,
  onTogglePublic,
}: ActionButtonsProps) {
  if (!canPerformMediaActions && !onDownload) return null

  if (!canPerformMediaActions) {
    return (
      <motion.button
        onClick={onDownload}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          'bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40',
          'text-muted-foreground hover:text-primary transition-all duration-200'
        )}
        title="下载音乐"
      >
        <Download className="w-4 h-4" />
      </motion.button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {onFavorite && (
        <motion.button
          onClick={onFavorite}
          disabled={isFavoriting}
          whileHover={{ scale: isFavoriting ? 1 : 1.1 }}
          whileTap={{ scale: isFavoriting ? 1 : 0.9 }}
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200',
            isFavorite ? 'bg-yellow-500 text-white' : 'bg-card/50 text-foreground/70 hover:text-yellow-500 hover:bg-card/70',
            isFavoriting && 'opacity-50 cursor-wait'
          )}
          title={isFavorite ? '取消收藏' : '收藏'}
        >
          <Heart className={cn('w-4 h-4', isFavorite && 'fill-current')} />
        </motion.button>
      )}

      {onTogglePublic && (
        <motion.button
          onClick={onTogglePublic}
          disabled={isTogglingPublic}
          whileHover={{ scale: isTogglingPublic ? 1 : 1.1 }}
          whileTap={{ scale: isTogglingPublic ? 1 : 0.9 }}
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 bg-card/50 hover:bg-card/70',
            isPublic ? 'text-green-500' : 'text-orange-500',
            isTogglingPublic && 'opacity-50 cursor-wait'
          )}
          title={isPublic ? '取消公开' : '公开'}
        >
          {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        </motion.button>
      )}

      {onDelete && (
        <motion.button
          onClick={onDelete}
          disabled={isDeleting}
          whileHover={{ scale: isDeleting ? 1 : 1.1 }}
          whileTap={{ scale: isDeleting ? 1 : 0.9 }}
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200',
            'bg-card/50 hover:bg-card/70 text-error hover:text-error/80',
            isDeleting && 'opacity-50 cursor-wait'
          )}
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      )}

      {onDownload && (
        <motion.button
          onClick={onDownload}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200',
            'bg-card/50 hover:bg-card/70 text-primary hover:text-primary/80'
          )}
          title="下载"
        >
          <Download className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  )
}
