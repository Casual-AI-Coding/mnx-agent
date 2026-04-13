import { useState } from 'react'
import { Eye, Download, Trash2, CheckSquare, Square, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { TYPE_VARIANTS, TYPE_LABELS, SOURCE_LABELS } from '@/lib/constants/media'
import { formatFileSize, formatDate, getTypeIcon } from '@/lib/utils/media'
import { MediaCardPreview } from './MediaCardPreview'
import { FavoriteButton } from './FavoriteButton'
import { PublicButton } from './PublicButton'
import { updateMedia } from '@/lib/api/media'
import type { MediaRecord } from '@/types/media'

interface MediaTableViewProps {
  records: MediaRecord[]
  signedUrls: Record<string, string>
  selectedIds: Set<string>
  onSelectAll: () => void
  onSelect: (id: string) => void
  onPreview: (record: MediaRecord) => void
  onDownload: (record: MediaRecord) => void
  onDelete: (record: MediaRecord) => void
  onRename?: (id: string, newName: string) => void
  onToggleFavorite?: (mediaId: string) => void
  onTogglePublic?: (mediaId: string) => void
  currentUserId?: string
  userRole?: string
}

export function MediaTableView({
  records,
  signedUrls,
  selectedIds,
  onSelectAll,
  onSelect,
  onPreview,
  onDownload,
  onDelete,
  onRename,
  onToggleFavorite,
  onTogglePublic,
  currentUserId,
  userRole,
}: MediaTableViewProps) {
  const isAllSelected = selectedIds.size === records.length && records.length > 0
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < records.length
  const [previewRecord, setPreviewRecord] = useState<MediaRecord | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleStartEdit = (record: MediaRecord) => {
    setEditingId(record.id)
    setEditingName(record.original_name || record.filename)
  }

  const handleSaveEdit = async (record: MediaRecord) => {
    const trimmedName = editingName.trim()
    if (!trimmedName) return
    
    const originalName = record.original_name || record.filename
    if (trimmedName === originalName) {
      setEditingId(null)
      return
    }

    setIsSaving(true)
    try {
      if (onRename) {
        onRename(record.id, trimmedName)
      } else {
        await updateMedia(record.id, { original_name: trimmedName })
      }
      setEditingId(null)
    } catch (error) {
      setEditingName(originalName)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  return (
    <div className="rounded-lg overflow-hidden bg-muted/30">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left">
              <button
                onClick={onSelectAll}
                className="flex items-center justify-center w-5 h-5 rounded hover:bg-muted transition-colors"
                disabled={records.length === 0}
                aria-label={isAllSelected ? '取消全选' : '全选'}
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : isIndeterminate ? (
                  <div className="w-3 h-3 bg-primary rounded-sm" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">文件名</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">类型</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">来源</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">大小</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">创建时间</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">操作</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              key={record.id}
              className={`group hover:bg-muted/50 ${selectedIds.has(record.id) ? 'bg-primary/5' : ''}`}
            >
              <td className="px-4 py-3 text-foreground">
                <button
                  onClick={() => onSelect(record.id)}
                  className="flex items-center justify-center w-5 h-5 rounded hover:bg-muted transition-colors"
                  aria-label={selectedIds.has(record.id) ? '取消选择' : '选择'}
                >
                  {selectedIds.has(record.id) ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </td>
              <td className="px-4 py-3 text-foreground">
                <div className="flex items-center gap-3">
                  {record.type === 'image' ? (
                    <img
                      src={signedUrls[record.id] || ''}
                      alt={record.original_name || record.filename}
                      className="w-10 h-10 object-cover rounded cursor-pointer"
                      onMouseEnter={(e) => {
                        setPreviewRecord(record)
                        setMousePosition({ x: e.clientX, y: e.clientY })
                      }}
                      onMouseLeave={() => setPreviewRecord(null)}
                      onMouseMove={(e) => setMousePosition({ x: e.clientX, y: e.clientY })}
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center rounded bg-muted/50">
                      {getTypeIcon(record.type)}
                    </div>
                  )}
                  {editingId === record.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(record)
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        className="h-7 text-sm"
                        autoFocus
                        disabled={isSaving}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveEdit(record)}
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
                    <div className="flex items-center gap-2 flex-1">
                      <span 
                        className="font-medium truncate max-w-[400px]" 
                        title={record.original_name || record.filename}
                        onDoubleClick={() => handleStartEdit(record)}
                      >
                        {record.original_name || record.filename}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(record)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-foreground">
                <Badge variant={TYPE_VARIANTS[record.type]}>
                  {TYPE_LABELS[record.type]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {record.source ? SOURCE_LABELS[record.source] || record.source : '-'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatFileSize(record.size_bytes)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(record.created_at)}
              </td>
              <td className="px-4 py-3 text-foreground">
                <div className="flex items-center justify-end gap-2">
                  {(record.type === 'image' || record.type === 'audio' || record.type === 'music') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPreview(record)}
                      title="预览"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownload(record)}
                    title="下载"
                  >
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
                      onToggle={onTogglePublic ? () => onTogglePublic(record.id) : undefined}
                      iconOnly
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(record)}
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {previewRecord && (
        <MediaCardPreview
          record={previewRecord}
          signedUrl={signedUrls[previewRecord.id] || ''}
          mousePosition={mousePosition}
          visible={!!previewRecord}
        />
      )}
    </div>
  )
}
