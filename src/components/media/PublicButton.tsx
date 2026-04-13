import { Globe, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface PublicButtonProps {
  isPublic?: boolean
  ownerId?: string | null
  currentUserId?: string
  onToggle?: (isPublic: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'default'
}

export function PublicButton({
  isPublic,
  ownerId,
  currentUserId,
  onToggle,
  disabled = false,
  size = 'sm'
}: PublicButtonProps) {
  const isOwner = ownerId === currentUserId
  const canToggle = isOwner && onToggle

  if (!canToggle) {
    return (
      <Badge
        variant={isPublic ? 'default' : 'secondary'}
        className={cn(
          'gap-1',
          size === 'sm' && 'text-xs px-2 py-0.5'
        )}
      >
        {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
        {isPublic ? '公开' : '私有'}
      </Badge>
    )
  }

  return (
    <Button
      variant={isPublic ? 'default' : 'outline'}
      size={size === 'sm' ? 'sm' : 'default'}
      className="gap-1"
      onClick={() => onToggle(!isPublic)}
      disabled={disabled}
    >
      {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
      {isPublic ? '公开' : '私有'}
    </Button>
  )
}