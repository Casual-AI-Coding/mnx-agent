import { useState } from 'react'
import { Eye, Download, Trash2, CheckSquare, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TYPE_VARIANTS, TYPE_LABELS, SOURCE_LABELS } from '@/lib/constants/media'
import { formatFileSize, formatDate, getTypeIcon } from '@/lib/utils/media'
import { MediaCardPreview } from './MediaCardPreview'
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
}: MediaTableViewProps) {
  const isAllSelected = selectedIds.size === records.length && records.length > 0
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < records.length
  const [previewRecord, setPreviewRecord] = useState<MediaRecord | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-3 text-left">
              <button
                onClick={onSelectAll}
                className="flex items-center justify-center w-5 h-5 rounded border border-muted-foreground/30 hover:border-primary/50 transition-colors"
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
        <tbody className="divide-y">
          {records.map((record) => (
            <tr
              key={record.id}
              className={`hover:bg-muted/50 ${selectedIds.has(record.id) ? 'bg-primary/5' : ''}`}
            >
              <td className="px-4 py-3 text-foreground">
                <button
                  onClick={() => onSelect(record.id)}
                  className="flex items-center justify-center w-5 h-5 rounded border border-muted-foreground/30 hover:border-primary/50 transition-colors"
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
                      className="w-10 h-10 object-cover rounded border border-border cursor-pointer"
                      onMouseEnter={(e) => {
                        setPreviewRecord(record)
                        setMousePosition({ x: e.clientX, y: e.clientY })
                      }}
                      onMouseLeave={() => setPreviewRecord(null)}
                      onMouseMove={(e) => setMousePosition({ x: e.clientX, y: e.clientY })}
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center rounded border border-border bg-muted/50">
                      {getTypeIcon(record.type)}
                    </div>
                  )}
                  <span className="font-medium truncate max-w-[200px]" title={record.original_name || record.filename}>
                    {record.original_name || record.filename}
                  </span>
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
                  {record.type === 'image' && (
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
