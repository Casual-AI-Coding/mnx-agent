import { useState } from 'react'
import { Music, Plus, Trash2, Pencil, GripVertical, ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog } from '@/components/ui/Dialog'
import type { MaterialItem } from '@/types/material'
import {
  createMaterialItem,
  updateMaterialItem,
  deleteMaterialItem,
  reorderMaterialItems,
} from '@/lib/api/materials'
import { toastSuccess, toastError } from '@/lib/toast'

interface SongLibraryPanelProps {
  songs: MaterialItem[]
  selectedSongId: string | null
  onSelectSong: (songId: string) => void
  onSongsChange?: () => void
  materialId?: string
}

export function SongLibraryPanel({
  songs,
  selectedSongId,
  onSelectSong,
  onSongsChange,
  materialId,
}: SongLibraryPanelProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingSong, setEditingSong] = useState<MaterialItem | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<MaterialItem | null>(null)
  const [newSongName, setNewSongName] = useState('')
  const [newSongLyrics, setNewSongLyrics] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleMoveSong = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= songs.length) return
    const newOrder = [...songs]
    const [moved] = newOrder.splice(index, 1)
    newOrder.splice(newIndex, 0, moved)
    const itemIds = newOrder.map((s) => s.id)
    setIsSaving(true)
    const result = await reorderMaterialItems(materialId, itemIds)
    setIsSaving(false)
    if (result.success) {
      onSongsChange?.()
    } else {
      toastError('排序失败', result.error || '请稍后重试')
    }
  }

  const handleCreateSong = async () => {
    if (!newSongName.trim()) {
      toastError('创建失败', '请输入歌曲名称')
      return
    }
    if (!materialId) {
      toastError('创建失败', '无法获取素材ID')
      return
    }
    setIsSaving(true)
    const result = await createMaterialItem(materialId, {
      material_id: materialId,
      item_type: 'song',
      name: newSongName.trim(),
      lyrics: newSongLyrics.trim() || undefined,
    })
    setIsSaving(false)
    if (result.success && result.data) {
      toastSuccess('创建成功', '歌曲已创建')
      setIsCreating(false)
      setNewSongName('')
      setNewSongLyrics('')
      onSongsChange?.()
    } else {
      toastError('创建失败', result.error || '请稍后重试')
    }
  }

  const handleUpdateSong = async () => {
    if (!editingSong || !editingSong.name.trim()) return
    setIsSaving(true)
    const result = await updateMaterialItem(editingSong.id, {
      name: editingSong.name.trim(),
      lyrics: editingSong.lyrics?.trim() || undefined,
    })
    setIsSaving(false)
    if (result.success) {
      toastSuccess('更新成功', '歌曲已更新')
      setEditingSong(null)
      onSongsChange?.()
    } else {
      toastError('更新失败', result.error || '请稍后重试')
    }
  }

  const handleDeleteSong = async () => {
    if (!deleteConfirm) return
    const result = await deleteMaterialItem(deleteConfirm.id)
    if (result.success) {
      toastSuccess('删除成功', '歌曲已删除')
      setDeleteConfirm(null)
      if (selectedSongId === deleteConfirm.id) {
        onSelectSong('')
      }
      onSongsChange?.()
    } else {
      toastError('删除失败', result.error || '请稍后重试')
    }
  }

  if (songs.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">歌曲库</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Music}
            title="暂无歌曲"
            description="创建第一首歌曲"
            action={
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                新建歌曲
              </Button>
            }
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">歌曲库</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-1" />
            新建
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {songs.map((song) => (
            <div
              key={song.id}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                selectedSongId === song.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-border/80'
              }`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              <button
                onClick={() => onSelectSong(song.id)}
                className="flex-1 text-left font-medium"
              >
                {song.name}
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => handleMoveSong(songs.indexOf(song), 'up')}
                disabled={songs.indexOf(song) === 0 || isSaving}
                title="向上移动"
              >
                <ArrowUp className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => handleMoveSong(songs.indexOf(song), 'down')}
                disabled={songs.indexOf(song) === songs.length - 1 || isSaving}
                title="向下移动"
              >
                <ArrowDown className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setEditingSong(song)}
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteConfirm(song)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
      <Dialog
        open={isCreating}
        onClose={() => setIsCreating(false)}
        title="新建歌曲"
        description="创建一首新歌曲"
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">歌曲名称</label>
            <Input
              placeholder="歌曲名称"
              value={newSongName}
              onChange={(e) => setNewSongName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">歌词（可选）</label>
            <Textarea
              placeholder="歌词内容..."
              value={newSongLyrics}
              onChange={(e) => setNewSongLyrics(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setIsCreating(false)}>
            取消
          </Button>
          <Button onClick={handleCreateSong} disabled={isSaving}>
            {isSaving ? '创建中...' : '创建'}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={editingSong !== null}
        onClose={() => setEditingSong(null)}
        title="编辑歌曲"
        description="修改歌曲信息"
      >
        {editingSong && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">歌曲名称</label>
              <Input
                value={editingSong.name}
                onChange={(e) =>
                  setEditingSong({ ...editingSong, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">歌词（可选）</label>
              <Textarea
                value={editingSong.lyrics || ''}
                onChange={(e) =>
                  setEditingSong({ ...editingSong, lyrics: e.target.value })
                }
                rows={4}
              />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setEditingSong(null)}>
            取消
          </Button>
          <Button onClick={handleUpdateSong} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="确认删除"
        description={`确定要删除歌曲 "${deleteConfirm?.name}" 吗？关联的提示词也会被删除。此操作无法撤销。`}
      >
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleDeleteSong}>
            删除
          </Button>
        </div>
      </Dialog>
    </Card>
  )
}
