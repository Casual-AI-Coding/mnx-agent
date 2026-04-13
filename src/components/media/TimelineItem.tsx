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
  userRole?: string
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
  userRole,
}: TimelineItemProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(record.original_name || record.filename)
  const [isSaving, setIsSaving] = useState(false)

  const handleStartEdit = () => {
    setEditName(record.original_name || record.filename)
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!editName.trim() || editName === (record.original_name || record.filename)) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      onRename?.(record.id, editName.trim())
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditName(record.original_name || record.filename)
    setIsEditing(false)
  }
  const isOwn = record.owner_id === currentUserId
  const isAdminOrSuper = userRole === 'admin' || userRole === 'super'
  const canManage = isOwn || (!record.owner_id && isAdminOrSuper)
  const isOthersPublic = record.is_public && !canManage
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group ${
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
          <div className="flex items-center gap-2 mt-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit()
                if (e.key === 'Escape') handleCancelEdit()
              }}
              className="h-7 text-sm"
              autoFocus
              disabled={isSaving}
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="h-7 px-2"
            >
              {isSaving ? '...' : '✓'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              className="h-7 px-2"
            >
              ✕
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <p
              className="font-medium truncate flex-1"
              title={record.original_name || record.filename}
              onDoubleClick={(e) => {
                e.stopPropagation()
                handleStartEdit()
              }}
            >
              {record.original_name || record.filename}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleStartEdit() }}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              title={isOthersPublic ? '他人公开的记录无法编辑' : '编辑'}
              disabled={isOthersPublic}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {new Date(record.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {(record.type === 'image' || record.type === 'audio' || record.type === 'music') && (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onPreview() }} title="预览">
            <Eye className="w-4 h-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDownload() }} title="下载">
          <Download className="w-4 h-4" />
        </Button>
        {onToggleFavorite && (
          <FavoriteButton
            mediaId={record.id}
            isFavorite={record.is_favorite ?? false}
            onToggle={onToggleFavorite}
          />
        )}
{onTogglePublic && (
            <PublicButton
              isPublic={record.is_public}
              ownerId={record.owner_id}
              currentUserId={currentUserId}
              userRole={userRole}
              onToggle={isOthersPublic ? undefined : (onTogglePublic ? () => onTogglePublic(record.id, !record.is_public) : undefined)}
              iconOnly
            />
          )}
          <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete() }} title={!canManage ? '无权限删除此记录' : '删除'} disabled={!canManage}>
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
