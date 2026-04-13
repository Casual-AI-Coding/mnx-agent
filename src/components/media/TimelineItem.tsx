import { useState } from 'react'
import { Eye, Download, Trash2, CheckSquare, Square, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { TYPE_VARIANTS, TYPE_LABELS, TYPE_GRADIENTS } from '@/lib/constants/media'
import { formatFileSize, getTypeIcon } from '@/lib/utils/media'
import { MediaCardPreview } from './MediaCardPreview'
import { FavoriteButton } from './FavoriteButton'
import { PublicButton } from './PublicButton'
import type { MediaRecord } from '@/types/media'

interface TimelineItemProps {
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

export function TimelineItem({
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
}: TimelineItemProps) {
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
      className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/10' : ''
      }`}
      onClick={() => onSelect()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        className="flex-shrink-0"
      >
        {isSelected ? (
          <CheckSquare className="w-5 h-5 text-primary" />
        ) : (
          <Square className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {record.type === 'image' && signedUrl ? (
        <img
          src={signedUrl}
          alt={record.original_name || record.filename}
          className="w-14 h-14 object-cover rounded flex-shrink-0 cursor-pointer"
          onMouseEnter={(e) => {
            setShowPreview(true)
            setMousePosition({ x: e.clientX, y: e.clientY })
          }}
          onMouseLeave={() => setShowPreview(false)}
          onMouseMove={(e) => setMousePosition({ x: e.clientX, y: e.clientY })}
        />
      ) : (
        <div className={`w-14 h-14 rounded flex items-center justify-center flex-shrink-0 ${TYPE_GRADIENTS[record.type]}`}>
          {getTypeIcon(record.type)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant={TYPE_VARIANTS[record.type]} className="text-xs">
            {TYPE_LABELS[record.type]}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatFileSize(record.size_bytes)}
          </span>
        </div>
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
            className="h-6 text-sm mt-1"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p
            className="font-medium truncate mt-1 cursor-pointer hover:underline"
            title={record.original_name || record.filename}
            onDoubleClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
          >
            {record.original_name || record.filename}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {new Date(record.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {onTogglePublic && (
          <PublicButton
            isPublic={record.is_public}
            ownerId={record.owner_id}
            currentUserId={currentUserId}
            onToggle={onTogglePublic ? () => onTogglePublic(record.id, !record.is_public) : undefined}
            iconOnly
          />
        )}
        {onToggleFavorite && (
          <FavoriteButton
            mediaId={record.id}
            isFavorite={record.is_favorite ?? false}
            onToggle={onToggleFavorite}
          />
        )}
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}>
          <Pencil className="w-4 h-4" />
        </Button>
        {(record.type === 'image' || record.type === 'audio' || record.type === 'music') && (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onPreview() }}>
            <Eye className="w-4 h-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDownload() }}>
          <Download className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete() }}>
          <Trash2 className="w-4 h-4" />
        </Button>
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
