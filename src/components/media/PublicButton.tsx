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
  iconOnly?: boolean
}

export function PublicButton({
  isPublic,
  ownerId,
  currentUserId,
  onToggle,
  disabled = false,
  size = 'sm',
  iconOnly = false
}: PublicButtonProps) {
  const isOwner = ownerId === currentUserId
  const canToggle = isOwner && onToggle

  // 图标模式 - 适用于卡片、时间线、操作栏
  if (iconOnly) {
    const Icon = isPublic ? Globe : Lock
    const title = isPublic ? '公开' : '私有'
    
    if (!canToggle) {
      // 非owner：静态图标显示
      return (
        <div
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center',
            isPublic
              ? 'bg-blue-500/20 text-blue-500'
              : 'bg-muted/50 text-muted-foreground'
          )}
          title={title}
        >
          <Icon className="w-4 h-4" />
        </div>
      )
    }
    
    // Owner：可点击图标按钮
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'w-7 h-7 p-0',
          isPublic && 'text-blue-500 hover:text-blue-600'
        )}
        onClick={() => onToggle(!isPublic)}
        disabled={disabled}
        title={title}
      >
        <Icon className="w-4 h-4" />
      </Button>
    )
  }

  // 文字模式（默认）- 用于状态列显示
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