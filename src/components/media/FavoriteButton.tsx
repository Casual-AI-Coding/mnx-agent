import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  mediaId: string
  isFavorite: boolean
  onToggle: (mediaId: string) => void
  disabled?: boolean
}

export function FavoriteButton({ mediaId, isFavorite, onToggle, disabled }: FavoriteButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation()
        onToggle(mediaId)
      }}
      disabled={disabled}
      className={cn(
        'hover:text-yellow-500 transition-colors',
        isFavorite && 'text-yellow-500'
      )}
      title={isFavorite ? '取消收藏' : '收藏'}
    >
      {isFavorite ? (
        <Star className="w-4 h-4 fill-current" />
      ) : (
        <Star className="w-4 h-4" />
      )}
    </Button>
  )
}