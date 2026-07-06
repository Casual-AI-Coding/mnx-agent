import { useEffect, useState, type FormEvent } from 'react'
import { Megaphone, Plus, RefreshCw, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { apiClient } from '@/lib/api/client'
import { toastError, toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'

type AnnouncementSeverity = 'info' | 'success' | 'warning' | 'error'
type AnnouncementStatus = 'draft' | 'published' | 'archived'

interface Announcement {
  id: string
  title: string
  content: string
  severity: AnnouncementSeverity
  status: AnnouncementStatus
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
  created_by_username?: string | null
}

interface AnnouncementListResponse {
  items: Announcement[]
  total: number
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

interface AnnouncementForm {
  title: string
  content: string
  severity: AnnouncementSeverity
  starts_at: string
  ends_at: string
}

const emptyForm: AnnouncementForm = {
  title: '',
  content: '',
  severity: 'info',
  starts_at: '',
  ends_at: '',
}

const severityLabels: Record<AnnouncementSeverity, string> = {
  info: '信息',
  success: '成功',
  warning: '警告',
  error: '紧急',
}

const statusLabels: Record<AnnouncementStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
}

const statusVariant: Record<AnnouncementStatus, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
}

function formatDate(value: string | null): string {
  if (!value) return '不限'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function toPayload(form: AnnouncementForm) {
  return {
    title: form.title.trim(),
    content: form.content.trim(),
    severity: form.severity,
    starts_at: form.starts_at || null,
    ends_at: form.ends_at || null,
  }
}

function parseSeverity(value: string): AnnouncementSeverity {
  if (value === 'success' || value === 'warning' || value === 'error') {
    return value
  }

  return 'info'
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [form, setForm] = useState<AnnouncementForm>(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const loadAnnouncements = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get<ApiResponse<AnnouncementListResponse>>('/admin/announcements')
      setAnnouncements(response.data.items)
    } catch (error) {
      toastError('公告加载失败', error instanceof Error ? error.message : '请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const updateForm = <Key extends keyof AnnouncementForm>(key: Key, value: AnnouncementForm[Key]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      await apiClient.post<ApiResponse<Announcement>>('/admin/announcements', toPayload(form))
      setForm(emptyForm)
      toastSuccess('公告已创建', '默认保存为草稿，可在列表中发布')
      await loadAnnouncements()
    } catch (error) {
      toastError('创建失败', error instanceof Error ? error.message : '请检查公告内容')
    } finally {
      setIsSaving(false)
    }
  }

  const updateStatus = async (announcement: Announcement, status: AnnouncementStatus) => {
    try {
      await apiClient.patch<ApiResponse<Announcement>>(`/admin/announcements/${announcement.id}`, { status })
      toastSuccess('状态已更新', `${announcement.title} 已设为${statusLabels[status]}`)
      await loadAnnouncements()
    } catch (error) {
      toastError('状态更新失败', error instanceof Error ? error.message : '请稍后重试')
    }
  }

  const deleteAnnouncement = async (announcement: Announcement) => {
    try {
      await apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/admin/announcements/${announcement.id}`)
      toastSuccess('公告已删除', announcement.title)
      await loadAnnouncements()
    } catch (error) {
      toastError('删除失败', error instanceof Error ? error.message : '请稍后重试')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Megaphone className="h-5 w-5" />}
        title="公告管理"
        actions={
          <Button variant="outline" onClick={loadAnnouncements} disabled={isLoading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            刷新
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-4 w-4" />
            新建公告
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-[1fr_180px]" onSubmit={handleCreate}>
            <div className="space-y-4">
              <label className="grid gap-2 text-sm font-medium">
                标题
                <Input value={form.title} onChange={event => updateForm('title', event.target.value)} maxLength={120} required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                内容
                <Textarea value={form.content} onChange={event => updateForm('content', event.target.value)} rows={4} required />
              </label>
            </div>
            <div className="space-y-4">
              <label className="grid gap-2 text-sm font-medium">
                等级
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.severity}
                  onChange={event => updateForm('severity', parseSeverity(event.target.value))}
                >
                  <option value="info">信息</option>
                  <option value="success">成功</option>
                  <option value="warning">警告</option>
                  <option value="error">紧急</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                开始时间
                <Input type="datetime-local" value={form.starts_at} onChange={event => updateForm('starts_at', event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                结束时间
                <Input type="datetime-local" value={form.ends_at} onChange={event => updateForm('ends_at', event.target.value)} />
              </label>
              <Button type="submit" className="w-full" disabled={isSaving}>{isSaving ? '保存中...' : '保存草稿'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">公告列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">正在加载公告...</div>
          ) : announcements.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">暂无公告，创建后可发布给全站用户。</div>
          ) : (
            <div className="space-y-3">
              {announcements.map(announcement => (
                <div key={announcement.id} className="rounded-lg border border-border/60 p-4 transition-colors hover:bg-muted/30">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                        <Badge variant={statusVariant[announcement.status]}>{statusLabels[announcement.status]}</Badge>
                        <Badge variant="outline">{severityLabels[announcement.severity]}</Badge>
                      </div>
                      <p className="max-w-3xl whitespace-pre-wrap text-sm text-muted-foreground">{announcement.content}</p>
                      <div className="text-xs text-muted-foreground">
                        有效期：{formatDate(announcement.starts_at)} 至 {formatDate(announcement.ends_at)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => updateStatus(announcement, 'published')}>发布</Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(announcement, 'archived')}>归档</Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteAnnouncement(announcement)}>
                        <Trash2 className="mr-1 h-3 w-3" />删除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
