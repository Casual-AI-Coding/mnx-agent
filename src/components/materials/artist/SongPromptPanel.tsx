import { useState, useEffect } from 'react'
import { Plus, Trash2, Star, ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog } from '@/components/ui/Dialog'
import type { PromptRecord } from '@/types/prompt'
import {
  createPrompt,
  updatePrompt,
  setDefaultPrompt,
  deletePrompt,
  reorderPrompts,
} from '@/lib/api/prompts'
import { toastSuccess, toastError } from '@/lib/toast'

interface SongPromptPanelProps {
  prompts: PromptRecord[]
  songId: string | null
  onPromptsChange?: (prompts: PromptRecord[]) => void
}

export function SongPromptPanel({ prompts, songId, onPromptsChange }: SongPromptPanelProps) {
  const [activeTab, setActiveTab] = useState(prompts.find((p) => p.is_default)?.id || prompts[0]?.id || '')
  const [editingContent, setEditingContent] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newPromptName, setNewPromptName] = useState('')
  const [newPromptContent, setNewPromptContent] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<PromptRecord | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const normalizePrompts = (nextPrompts: PromptRecord[]) =>
    nextPrompts.map((prompt, index) => ({
      ...prompt,
      sort_order: index,
    }))

  useEffect(() => {
    const nextActiveTab = prompts.find((p) => p.is_default)?.id || prompts[0]?.id || ''
    setActiveTab(nextActiveTab)
  }, [prompts, songId])

  const handleMovePrompt = async (index: number, direction: 'up' | 'down') => {
    if (!songId) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= prompts.length) return
    const newOrder = [...prompts]
    const [moved] = newOrder.splice(index, 1)
    newOrder.splice(newIndex, 0, moved)
    setIsSaving(true)
    const result = await reorderPrompts({
      target_type: 'material-item',
      target_id: songId,
      slot_type: 'song-style',
      items: newOrder.map((prompt, orderIndex) => ({ id: prompt.id, sort_order: orderIndex })),
    })
    setIsSaving(false)
    if (result.success) {
      onPromptsChange?.(
        normalizePrompts(
          newOrder.map((prompt, orderIndex) => ({
            ...prompt,
            sort_order: orderIndex,
          }))
        )
      )
    } else {
      toastError('排序失败', result.error || '请稍后重试')
    }
  }

  useEffect(() => {
    const prompt = prompts.find((p) => p.id === activeTab)
    if (prompt) {
      setEditingContent(prompt.content)
    } else {
      setEditingContent('')
    }
  }, [activeTab, prompts, songId])

  const currentPrompt = prompts.find((p) => p.id === activeTab)

  const handleTabChange = (promptId: string) => {
    setActiveTab(promptId)
    const prompt = prompts.find((p) => p.id === promptId)
    if (prompt) {
      setEditingContent(prompt.content)
    }
  }

  const handleSetDefault = async (promptId: string) => {
    const result = await setDefaultPrompt(promptId)
    if (result.success) {
      toastSuccess('设置成功', '已设为默认风格')
      onPromptsChange?.(
        prompts.map((prompt) => ({
          ...prompt,
          is_default: prompt.id === promptId,
        }))
      )
    } else {
      toastError('设置失败', result.error || '请稍后重试')
    }
  }

  const handleDeletePrompt = async () => {
    if (!deleteConfirm) return
    const deletedPromptId = deleteConfirm.id
    const result = await deletePrompt(deleteConfirm.id)
    if (result.success) {
      toastSuccess('删除成功', '提示词已删除')
      setDeleteConfirm(null)
      if (activeTab === deletedPromptId) {
        setActiveTab('')
      }
      onPromptsChange?.(normalizePrompts(prompts.filter((prompt) => prompt.id !== deletedPromptId)))
    } else {
      toastError('删除失败', result.error || '请稍后重试')
    }
  }

  const handleCreatePrompt = async () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) {
      toastError('创建失败', '请填写名称和内容')
      return
    }
    if (!songId) {
      toastError('创建失败', '请先选择一首歌曲')
      return
    }
    setIsSaving(true)
    const result = await createPrompt({
      target_type: 'material-item',
      target_id: songId,
      slot_type: 'song-style',
      name: newPromptName.trim(),
      content: newPromptContent.trim(),
      is_default: prompts.length === 0,
    })
    setIsSaving(false)
    if (result.success && result.data) {
      toastSuccess('创建成功', '提示词已创建')
      setIsCreating(false)
      setNewPromptName('')
      setNewPromptContent('')
      onPromptsChange?.(normalizePrompts([...prompts, result.data]))
    } else {
      toastError('创建失败', result.error || '请稍后重试')
    }
  }

  const handleUpdateContent = async () => {
    if (!currentPrompt || !editingContent.trim()) return
    setIsSaving(true)
    const result = await updatePrompt(currentPrompt.id, {
      content: editingContent.trim(),
    })
    setIsSaving(false)
    if (result.success && result.data) {
      const updatedPrompt = result.data
      toastSuccess('保存成功', '提示词已更新')
      onPromptsChange?.(
        prompts.map((prompt) => (prompt.id === currentPrompt.id ? updatedPrompt : prompt))
      )
    } else {
      toastError('保存失败', result.error || '请稍后重试')
    }
  }

  if (!songId) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">歌曲风格 Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="未选择歌曲"
            description="请先在歌曲库中选择或创建一首歌曲"
          />
        </CardContent>
      </Card>
    )
  }

  if (prompts.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">歌曲风格 Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="暂无提示词"
            description="创建第一个歌曲风格提示词"
            action={
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                新建提示词
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
          <CardTitle className="text-base">歌曲风格 Prompt</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-1" />
            新建
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex flex-wrap h-auto">
            {prompts.map((prompt) => (
              <TabsTrigger key={prompt.id} value={prompt.id} className="text-xs">
                {prompt.is_default && <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />}
                {prompt.name}
              </TabsTrigger>
            ))}
          </TabsList>
{prompts.map((prompt, index) => (
              <TabsContent key={prompt.id} value={prompt.id} className="space-y-3">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMovePrompt(index, 'up')}
                    disabled={index === 0 || isSaving}
                    title="向上移动"
                    aria-label={`向上移动 ${prompt.name}`}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMovePrompt(index, 'down')}
                    disabled={index === prompts.length - 1 || isSaving}
                    title="向下移动"
                    aria-label={`向下移动 ${prompt.name}`}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground ml-2">
                    {index + 1} / {prompts.length}
                  </span>
                </div>
                <Textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  placeholder="输入提示词内容..."
                  rows={6}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleUpdateContent}
                    disabled={isSaving || editingContent === prompt.content}
                  >
                    保存
                  </Button>
                  {!prompt.is_default && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(prompt.id)}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      设为默认
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive ml-auto"
                    onClick={() => setDeleteConfirm(prompt)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </TabsContent>
            ))}
        </Tabs>
      </CardContent>
      <Dialog
        open={isCreating}
        onClose={() => setIsCreating(false)}
        title="新建提示词"
        description="创建一个新的歌曲风格提示词候选"
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">名称</label>
            <Input
              placeholder="提示词名称"
              value={newPromptName}
              onChange={(e) => setNewPromptName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">内容</label>
            <Textarea
              placeholder="提示词内容..."
              value={newPromptContent}
              onChange={(e) => setNewPromptContent(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setIsCreating(false)}>
            取消
          </Button>
          <Button onClick={handleCreatePrompt} disabled={isSaving}>
            {isSaving ? '创建中...' : '创建'}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="确认删除"
        description={`确定要删除提示词 "${deleteConfirm?.name}" 吗？此操作无法撤销。`}
      >
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleDeletePrompt}>
            删除
          </Button>
        </div>
      </Dialog>
    </Card>
  )
}
