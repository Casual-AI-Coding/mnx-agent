import { Pin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface PinButtonProps {
  mediaId: string
  isPinned?: boolean
  onToggle: (mediaId: string) => void
  disabled?: boolean
}

export function PinButton({ mediaId, isPinned, onToggle, disabled }: PinButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onToggle(mediaId)}
      disabled={disabled}
      className={cn(
        'transition-colors',
        isPinned ? 'text-primary hover:text-primary/80' : 'text-muted-foreground hover:text-primary'
      )}
      title={isPinned ? '取消置顶' : '置顶'}
    >
      <Pin className={cn('w-4 h-4', isPinned && 'fill-current')} />
    </Button>
  )
}
