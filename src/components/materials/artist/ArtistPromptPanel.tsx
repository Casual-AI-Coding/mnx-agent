import { useEffect, useState } from 'react'
import { Plus, Trash2, Star, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
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

interface ArtistPromptPanelProps {
  prompts: PromptRecord[]
  targetId: string
  onPromptsChange?: (prompts: PromptRecord[]) => void
}

export function ArtistPromptPanel({ prompts, targetId, onPromptsChange }: ArtistPromptPanelProps) {
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
  }, [prompts, targetId])

  const handleMovePrompt = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= prompts.length) return
    const newOrder = [...prompts]
    const [moved] = newOrder.splice(index, 1)
    newOrder.splice(newIndex, 0, moved)
    setIsSaving(true)
    const result = await reorderPrompts({
      target_type: 'material-main',
      target_id: targetId,
      slot_type: 'artist-style',
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

  const currentPrompt = prompts.find((p) => p.id === activeTab)

  useEffect(() => {
    const prompt = prompts.find((p) => p.id === activeTab)
    if (prompt) {
      setEditingContent(prompt.content)
    } else {
      setEditingContent('')
    }
  }, [activeTab, prompts, targetId])

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
    setIsSaving(true)
    const result = await createPrompt({
      target_type: 'material-main',
      target_id: targetId,
      slot_type: 'artist-style',
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

  const createPromptDialog = (
    <Dialog
      open={isCreating}
      onClose={() => setIsCreating(false)}
      title="新建提示词"
      description="创建一个新的音乐人风格提示词候选"
    >
      <div className="space-y-4 py-2">
        <div>
          <label htmlFor="artist-prompt-name" className="text-sm font-medium mb-2 block text-foreground">名称</label>
          <Input
            id="artist-prompt-name"
            placeholder="例如：流行风格"
            value={newPromptName}
            onChange={(e) => setNewPromptName(e.target.value)}
            className="h-10"
          />
        </div>
        <div>
          <label htmlFor="artist-prompt-content" className="text-sm font-medium mb-2 block text-foreground">内容</label>
          <Textarea
            id="artist-prompt-content"
            placeholder="输入提示词内容..."
            value={newPromptContent}
            onChange={(e) => setNewPromptContent(e.target.value)}
            rows={4}
            className="font-mono text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/50">
        <Button variant="outline" onClick={() => setIsCreating(false)} className="px-5">
          取消
        </Button>
        <Button onClick={handleCreatePrompt} disabled={isSaving} className="px-5 gap-1.5">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          创建提示词
        </Button>
      </div>
    </Dialog>
  )

  if (prompts.length === 0) {
    return (
      <>
        <Card className="h-full overflow-hidden border border-dashed border-fuchsia-500/30 bg-gradient-to-br from-card via-card to-fuchsia-500/10 shadow-xl shadow-black/10">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-fuchsia-200/90">
                <Star className="h-3.5 w-3.5" />
                Artist Prompt Board
              </div>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-fuchsia-300" />
                音乐人风格 Prompt
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                先定义人物全局风格，再让歌曲候选围绕这一组创作母板持续扩张。
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="rounded-[24px] border border-dashed border-fuchsia-500/20 bg-background/50 p-3">
              <EmptyState
                title="暂无提示词"
                description="先建立第一条人物风格母板，后续歌曲风格和歌词表达才会更稳定。"
                action={
                  <Button
                    onClick={() => setIsCreating(true)}
                    className="gap-1.5 rounded-xl px-5 shadow-lg shadow-fuchsia-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-fuchsia-500/25"
                  >
                    <Plus className="w-4 h-4" />
                    新建提示词
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
        {createPromptDialog}
      </>
    )
  }

  return (
    <>
      <Card className="h-full overflow-hidden border-fuchsia-500/15 bg-gradient-to-br from-card via-card to-fuchsia-500/5 shadow-xl shadow-black/10">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-fuchsia-200/90">
                <Star className="h-3.5 w-3.5" />
                Artist Prompt Board
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-fuchsia-300" />
                  音乐人风格 Prompt
                </CardTitle>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  这里保存人物级的全局风格候选。默认项应该像创作母板一样，能统领后续歌曲表达。
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setIsCreating(true)}
              className="gap-1.5 rounded-xl px-4 shadow-lg shadow-fuchsia-500/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-fuchsia-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              音乐人风格 Prompt
              新建提示词
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="flex h-auto flex-wrap gap-1 rounded-2xl border border-border/40 bg-background/60 p-1 shadow-inner shadow-black/5">
              {prompts.map((prompt) => (
                <TabsTrigger
                  key={prompt.id}
                  value={prompt.id}
                  className="gap-1.5 text-xs transition-all duration-200 data-[state=active]:bg-fuchsia-500/90 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  {prompt.is_default && <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />}
                  {prompt.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {prompts.map((prompt, index) => (
              <TabsContent key={prompt.id} value={prompt.id} className="space-y-4 mt-4">
                <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-background/50 p-3 shadow-sm">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMovePrompt(index, 'up')}
                    disabled={index === 0 || isSaving}
                    title="向上移动"
                    aria-label={`向上移动 ${prompt.name}`}
                    className="h-8 w-8 rounded-xl p-0 transition-all duration-200 hover:bg-fuchsia-500/10 hover:text-fuchsia-300"
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
                    className="h-8 w-8 rounded-xl p-0 transition-all duration-200 hover:bg-fuchsia-500/10 hover:text-fuchsia-300"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground ml-2 font-medium">
                    {index + 1} / {prompts.length}
                  </span>
                  {prompt.is_default && (
                    <span className="ml-auto rounded-full bg-fuchsia-500/10 px-2.5 py-1 text-xs font-medium text-fuchsia-200">
                      默认
                    </span>
                  )}
                </div>
                <Textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  placeholder="输入提示词内容..."
                  rows={6}
                  className="min-h-[160px] rounded-2xl border-border/50 bg-background/80 font-mono text-sm shadow-sm transition-all duration-200 focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/15"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleUpdateContent}
                    disabled={isSaving || editingContent === prompt.content}
                    className="rounded-xl shadow-lg shadow-fuchsia-500/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-fuchsia-500/20"
                  >
                    保存
                  </Button>
                  {!prompt.is_default && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(prompt.id)}
                      className="gap-1 rounded-xl border-fuchsia-500/20 bg-background/70 transition-all duration-200 hover:border-fuchsia-400/40 hover:text-fuchsia-200"
                    >
                      <Star className="w-3 h-3" />
                      设为默认
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto rounded-xl text-destructive transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteConfirm(prompt)}
                    aria-label={`删除 ${prompt.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      {createPromptDialog}
      <Dialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="确认删除"
        description={`确定要删除提示词 "${deleteConfirm?.name}" 吗？此操作无法撤销。`}
      >
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="px-5">
            取消
          </Button>
          <Button variant="destructive" onClick={handleDeletePrompt} className="px-5 gap-1.5">
            <Trash2 className="w-4 h-4" />
            删除
          </Button>
        </div>
      </Dialog>
    </>
  )
}
