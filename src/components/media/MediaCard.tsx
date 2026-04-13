import { useState } from 'react'
import { Eye, Download, Trash2, CheckSquare, Square, Pencil, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { TYPE_GRADIENTS, TYPE_LABELS } from '@/lib/constants/media'
import { formatFileSize, getTypeIcon } from '@/lib/utils/media'
import { cn } from '@/lib/utils'
import type { MediaRecord } from '@/types/media'
import { MediaCardPreview } from './MediaCardPreview'
import { PublicButton } from './PublicButton'

interface MediaCardProps {
  record: MediaRecord
  signedUrl?: string
  isSelected: boolean
  onSelect: () => void
  onPreview: () => void
  onDownload: () => void
  onDelete: () => void
  onRename?: (id: string, newName: string) => void
  onToggleFavorite?: (mediaId: string) => void
  onTogglePublic?: (id: string, isPublic: boolean) => void
  currentUserId?: string
}

export function MediaCard({
  record,
  signedUrl,
  isSelected,
  onSelect,
  onPreview,
  onDownload,
  onDelete,
  onRename,
  onToggleFavorite,
  onTogglePublic,
  currentUserId,
}: MediaCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(record.original_name || record.filename)

  const handleRename = () => {
    if (editName.trim() && editName !== (record.original_name || record.filename)) {
      onRename?.(record.id, editName.trim())
    }
    setIsEditing(false)
  }

  return (
    <div
      className={`relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      } hover:scale-[1.02] hover:shadow-xl`}
      onMouseEnter={() => {
        setShowActions(true)
        if (record.type === 'image' && signedUrl) {
          setShowPreview(true)
        }
      }}
      onMouseLeave={() => {
        setShowActions(false)
        setShowPreview(false)
      }}
      onMouseMove={(e) => {
        setMousePosition({ x: e.clientX, y: e.clientY })
      }}
      onClick={() => onSelect()}
    >
      {record.type === 'image' && signedUrl ? (
        <img
          src={signedUrl}
          alt={record.original_name || record.filename}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className={`absolute inset-0 ${TYPE_GRADIENTS[record.type]} flex items-center justify-center`}>
          <div className="text-foreground/30 scale-150">{getTypeIcon(record.type)}</div>
        </div>
      )}

<div
        className={`absolute top-2 left-2 right-10 z-10 flex items-center justify-between transition-opacity duration-200 ${
          showActions || isSelected ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
            isSelected ? 'bg-primary' : 'bg-muted/50 hover:bg-muted/70'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-foreground" />
          ) : (
            <Square className="w-4 h-4 text-foreground/70" />
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="h-7 px-2 bg-card/50 hover:bg-card/70 text-foreground border-0"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          {(record.type === 'image' || record.type === 'audio' || record.type === 'music') && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 bg-card/50 hover:bg-card/70 text-foreground border-0"
              onClick={(e) => {
                e.stopPropagation()
                onPreview()
              }}
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="h-7 px-2 bg-card/50 hover:bg-card/70 text-foreground border-0"
            onClick={(e) => {
              e.stopPropagation()
              onDownload()
            }}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 px-2 bg-card/50 hover:bg-card/70 text-error hover:text-error/80 border-0"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {onToggleFavorite && (
        <div
          className={`absolute top-2 right-2 z-20 transition-opacity duration-200 ${
            record.is_favorite ? 'opacity-100' : showActions ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(record.id)
          }}
        >
          <div
            className={cn(
              'w-7 h-7 rounded-md flex items-center justify-center cursor-pointer',
              record.is_favorite
                ? 'bg-yellow-500 text-white'
                : 'bg-card/50 text-foreground/70 hover:text-yellow-500 hover:bg-card/70'
            )}
            title={record.is_favorite ? '取消收藏' : '收藏'}
          >
            <Star className={cn('w-4 h-4', record.is_favorite && 'fill-current')} />
          </div>
        </div>
      )}

      {onTogglePublic && (
        <div className="absolute top-2 right-12 z-20">
          <PublicButton
            isPublic={record.is_public}
            ownerId={record.owner_id}
            currentUserId={currentUserId}
            onToggle={onTogglePublic ? (isPublic) => onTogglePublic(record.id, isPublic) : undefined}
            size="sm"
          />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 via-foreground/50 to-transparent pt-12 pb-3 px-3">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Badge variant="secondary" className="text-xs mb-1.5">
              {TYPE_LABELS[record.type]}
            </Badge>
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                  if (e.key === 'Escape') {
                    setEditName(record.original_name || record.filename)
                    setIsEditing(false)
                  }
                }}
                className="h-6 text-sm bg-card/80"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p
                className="text-foreground text-sm font-medium truncate cursor-pointer hover:underline"
                title={record.original_name || record.filename}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                }}
              >
                {record.original_name || record.filename}
              </p>
            )}
            <p className="text-foreground/60 text-xs mt-0.5">
              {formatFileSize(record.size_bytes)}
            </p>
          </div>
        </div>
      </div>
      {record.type === 'image' && signedUrl && (
        <MediaCardPreview
          record={record}
          signedUrl={signedUrl}
          mousePosition={mousePosition}
          visible={showPreview}
        />
      )}
    </div>
  )
}
