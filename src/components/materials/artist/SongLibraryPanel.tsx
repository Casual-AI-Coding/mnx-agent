import { useState } from 'react'
import { Music, Plus, Trash2, Pencil, GripVertical, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog } from '@/components/ui/Dialog'
import type { MaterialItem } from '@/types/material'
import type { PromptRecord } from '@/types/prompt'
import {
  createMaterialItem,
  updateMaterialItem,
  deleteMaterialItem,
  reorderMaterialItems,
} from '@/lib/api/materials'
import { toastSuccess, toastError } from '@/lib/toast'

export type SongWithPrompts = MaterialItem & { prompts: PromptRecord[] }

interface SongLibraryPanelProps {
  songs: SongWithPrompts[]
  selectedSongId: string | null
  onSelectSong: (songId: string | null) => void
  onSongsChange?: (songs: SongWithPrompts[], nextSelectedSongId?: string | null) => void
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

  const normalizeSongs = (nextSongs: SongWithPrompts[]) =>
    nextSongs.map((song, index) => ({
      ...song,
      sort_order: index,
      prompts: song.prompts || [],
    }))

  const handleMoveSong = async (index: number, direction: 'up' | 'down') => {
    if (!materialId) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= songs.length) return
    const newOrder = [...songs]
    const [moved] = newOrder.splice(index, 1)
    newOrder.splice(newIndex, 0, moved)
    setIsSaving(true)
    const result = await reorderMaterialItems(
      materialId,
      newOrder.map((song, orderIndex) => ({ id: song.id, sort_order: orderIndex }))
    )
    setIsSaving(false)
    if (result.success) {
      onSongsChange?.(
        normalizeSongs(
          newOrder.map((song, orderIndex) => ({
            ...song,
            sort_order: orderIndex,
            prompts: song.prompts || [],
          }))
        )
      )
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
      const nextSongs = normalizeSongs([...songs, { ...result.data, prompts: [] }])
      onSongsChange?.(nextSongs, result.data.id)
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
    if (result.success && result.data) {
      toastSuccess('更新成功', '歌曲已更新')
      setEditingSong(null)
      onSongsChange?.(
        songs.map((song) =>
          song.id === editingSong.id
            ? {
                ...song,
                ...result.data,
                prompts: song.prompts || [],
              }
            : song
        )
      )
    } else {
      toastError('更新失败', result.error || '请稍后重试')
    }
  }

  const handleDeleteSong = async () => {
    if (!deleteConfirm) return
    const deletedSongId = deleteConfirm.id
    const result = await deleteMaterialItem(deleteConfirm.id)
    if (result.success) {
      toastSuccess('删除成功', '歌曲已删除')
      setDeleteConfirm(null)
      const nextSongs = normalizeSongs(songs.filter((song) => song.id !== deletedSongId))
      const nextSelectedSongId =
        selectedSongId === deletedSongId
          ? (nextSongs[0]?.id ?? null)
          : selectedSongId

      if (selectedSongId === deletedSongId) {
        onSelectSong(nextSelectedSongId)
      }

      onSongsChange?.(nextSongs, nextSelectedSongId)
    } else {
      toastError('删除失败', result.error || '请稍后重试')
    }
  }

  const createSongDialog = (
    <Dialog
      open={isCreating}
      onClose={() => setIsCreating(false)}
      title="新建歌曲"
      description="创建一首新歌曲，可以添加歌词和风格提示词"
    >
      <div className="space-y-4 py-2">
        <div>
          <label htmlFor="create-song-name" className="text-sm font-medium mb-2 block text-foreground">歌曲名称</label>
          <Input
            id="create-song-name"
            placeholder="例如：夜空中最亮的星"
            value={newSongName}
            onChange={(e) => setNewSongName(e.target.value)}
            className="h-10 border-border/50 focus:border-primary/70 focus:ring-1 focus:ring-primary/30 transition-all duration-200"
          />
        </div>
        <div>
          <label htmlFor="create-song-lyrics" className="text-sm font-medium mb-2 block text-foreground">歌词（可选）</label>
          <Textarea
            id="create-song-lyrics"
            placeholder="粘贴歌词内容..."
            value={newSongLyrics}
            onChange={(e) => setNewSongLyrics(e.target.value)}
            rows={4}
            className="font-mono text-sm border-border/50 focus:border-primary/70 focus:ring-1 focus:ring-primary/30 transition-all duration-200"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/50">
        <Button variant="outline" onClick={() => setIsCreating(false)} className="px-5 transition-all duration-200">
          取消
        </Button>
        <Button onClick={handleCreateSong} disabled={isSaving} className="px-5 gap-1.5 bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          创建歌曲
        </Button>
      </div>
    </Dialog>
  )

  if (songs.length === 0) {
    return (
      <>
        <Card className="h-full overflow-hidden border border-dashed border-cyan-500/30 bg-gradient-to-br from-card via-card to-cyan-500/10 shadow-xl shadow-black/10">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-200/90">
                <Music className="h-3.5 w-3.5" />
                Song Catalog
              </div>
              <CardTitle className="text-base flex items-center gap-2">
                <Music className="w-4 h-4 text-cyan-300" />
                歌曲库
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                这里是人物素材下的歌曲编目区。先落下一首歌，后面的歌词和风格工作区才会真正开始运转。
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="rounded-[24px] border border-dashed border-cyan-500/20 bg-background/50 p-3">
              <EmptyState
                icon={Music}
                title="暂无歌曲"
                description="从第一首歌开始建立编目区，后续歌词、风格候选和排序都会围绕它继续展开。"
                action={
                  <Button
                    onClick={() => setIsCreating(true)}
                    className="gap-1.5 rounded-xl px-5 shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/25"
                  >
                    <Plus className="w-4 h-4" />
                    新建歌曲
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
        {createSongDialog}
      </>
    )
  }

  return (
    <>
      <Card className="h-full overflow-hidden border-cyan-500/15 bg-gradient-to-br from-card via-card to-cyan-500/5 shadow-xl shadow-black/10">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-200/90">
                <Music className="h-3.5 w-3.5" />
                Song Catalog
              </div>
              <CardTitle className="text-base flex items-center gap-2">
                <Music className="w-4 h-4 text-cyan-300" />
                歌曲库
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({songs.length})
                </span>
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                让歌曲以可浏览、可重排、可继续编辑的方式排成一列，像真正的创作目录，而不是一组普通列表项。
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setIsCreating(true)}
              className="gap-1.5 rounded-xl px-4 shadow-lg shadow-cyan-500/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              歌曲库
              新建歌曲
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          <div className="space-y-3">
            {songs.map((song) => (
              <div
                key={song.id}
                className={`group flex cursor-pointer items-center gap-3 rounded-[22px] border p-4 transition-all duration-300 ${
                  selectedSongId === song.id
                    ? 'border-cyan-400/40 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                    : 'border-border/60 bg-background/60 hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-background/80 hover:shadow-lg hover:shadow-black/10'
                }`}
              >
                <div className="rounded-xl border border-border/40 bg-background/60 p-2 text-muted-foreground/60 shadow-sm">
                  <GripVertical className="h-4 w-4 cursor-grab" />
                </div>
                <button
                  onClick={() => onSelectSong(song.id)}
                  className="flex-1 text-left"
                >
                  <span className="block truncate text-sm font-semibold tracking-[0.01em] text-foreground">
                    {song.name}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {selectedSongId === song.id ? '当前正在编辑这首歌的风格工作区' : '点击切换到这首歌的风格候选与歌词上下文'}
                  </span>
                </button>
                <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-300"
                    onClick={() => handleMoveSong(songs.indexOf(song), 'up')}
                    disabled={songs.indexOf(song) === 0 || isSaving}
                    title="向上移动"
                    aria-label={`向上移动 ${song.name}`}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-300"
                    onClick={() => handleMoveSong(songs.indexOf(song), 'down')}
                    disabled={songs.indexOf(song) === songs.length - 1 || isSaving}
                    title="向下移动"
                    aria-label={`向下移动 ${song.name}`}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-300"
                    onClick={() => setEditingSong(song)}
                    aria-label={`编辑 ${song.name}`}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteConfirm(song)}
                    aria-label={`删除 ${song.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {createSongDialog}
      <Dialog
        open={editingSong !== null}
        onClose={() => setEditingSong(null)}
        title="编辑歌曲"
        description="修改歌曲信息"
      >
        {editingSong && (
          <div className="space-y-4 py-2">
            <div>
              <label htmlFor="edit-song-name" className="text-sm font-medium mb-2 block text-foreground">歌曲名称</label>
              <Input
                id="edit-song-name"
                value={editingSong.name}
                onChange={(e) =>
                  setEditingSong({ ...editingSong, name: e.target.value })
                }
                className="h-10 border-border/50 focus:border-primary/70 focus:ring-1 focus:ring-primary/30 transition-all duration-200"
              />
            </div>
            <div>
              <label htmlFor="edit-song-lyrics" className="text-sm font-medium mb-2 block text-foreground">歌词（可选）</label>
              <Textarea
                id="edit-song-lyrics"
                value={editingSong.lyrics || ''}
                onChange={(e) =>
                  setEditingSong({ ...editingSong, lyrics: e.target.value })
                }
                rows={4}
                className="font-mono text-sm border-border/50 focus:border-primary/70 focus:ring-1 focus:ring-primary/30 transition-all duration-200"
              />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={() => setEditingSong(null)} className="px-5 transition-all duration-200">
            取消
          </Button>
          <Button onClick={handleUpdateSong} disabled={isSaving} className="px-5 gap-1.5 bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            保存
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="确认删除"
        description={`确定要删除歌曲 "${deleteConfirm?.name}" 吗？关联的提示词也会被删除。此操作无法撤销。`}
      >
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="px-5 transition-all duration-200">
            取消
          </Button>
          <Button variant="destructive" onClick={handleDeleteSong} className="px-5 gap-1.5 transition-all duration-200">
            <Trash2 className="w-4 h-4" />
            删除
          </Button>
        </div>
      </Dialog>
    </>
  )
}
