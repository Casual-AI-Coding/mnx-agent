import { useState } from 'react'
import { Eye, Download, Trash2, CheckSquare, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TYPE_GRADIENTS, TYPE_LABELS } from '@/lib/constants/media'
import { formatFileSize, getTypeIcon } from '@/lib/utils/media'
import type { MediaRecord } from '@/types/media'

interface MediaCardProps {
  record: MediaRecord
  signedUrl?: string
  isSelected: boolean
  onSelect: () => void
  onPreview: () => void
  onDownload: () => void
  onDelete: () => void
}

export function MediaCard({
  record,
  signedUrl,
  isSelected,
  onSelect,
  onPreview,
  onDownload,
  onDelete,
}: MediaCardProps) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={`relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      } hover:scale-[1.02] hover:shadow-xl`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
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
        className={`absolute top-2 left-2 z-10 transition-opacity duration-200 ${
          showActions || isSelected ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
          isSelected ? 'bg-primary' : 'bg-black/50 hover:bg-black/70'
        }`}>
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-foreground" />
          ) : (
            <Square className="w-4 h-4 text-foreground/70" />
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-12 pb-3 px-3">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Badge variant="secondary" className="text-xs mb-1.5">
              {TYPE_LABELS[record.type]}
            </Badge>
            <p className="text-foreground text-sm font-medium truncate" title={record.original_name || record.filename}>
              {record.original_name || record.filename}
            </p>
            <p className="text-foreground/60 text-xs mt-0.5">
              {formatFileSize(record.size_bytes)}
            </p>
          </div>

          <div
            className={`flex items-center gap-1 transition-all duration-200 flex-shrink-0 ${
              showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            {record.type === 'image' && (
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 bg-white/20 hover:bg-white/30 text-foreground border-0"
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
              className="h-7 px-2 bg-white/20 hover:bg-white/30 text-foreground border-0"
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
              className="h-7 px-2 bg-white/20 hover:bg-white/30 text-red-300 hover:text-red-200 border-0"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
