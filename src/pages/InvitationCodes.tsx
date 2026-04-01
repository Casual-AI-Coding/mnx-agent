import { useState, useEffect } from 'react'
import {
  Key,
  Plus,
  Copy,
  Ban,
  Search,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { apiClient } from '@/lib/api/client'

interface InvitationCode {
  id: string
  code: string
  created_by: string
  created_by_username: string | null
  max_uses: number
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '永久有效'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export default function InvitationCodes() {
  const [codes, setCodes] = useState<InvitationCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [generateForm, setGenerateForm] = useState({
    count: 10,
    max_uses: 1,
    expires_at: '',
  })

  const fetchCodes = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.get<{ success: boolean; data: InvitationCode[]; error?: string }>('/api/invitation-codes')
      if (data.success) {
        setCodes(data.data)
      } else {
        setError(data.error || '获取邀请码列表失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCodes()
  }, [])

  const filteredCodes = codes.filter(code =>
    code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (code.created_by_username?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      alert('复制失败')
    }
  }

  const handleGenerate = async () => {
    setActionLoading(true)
    try {
      const data = await apiClient.post<{ success: boolean; error?: string }>('/api/invitation-codes/batch', {
        count: generateForm.count,
        max_uses: generateForm.max_uses,
        expires_at: generateForm.expires_at || null,
      })
      if (data.success) {
        setGenerateDialogOpen(false)
        setGenerateForm({ count: 10, max_uses: 1, expires_at: '' })
        fetchCodes()
      } else {
        alert(data.error || '生成邀请码失败')
      }
    } catch {
      alert('网络错误，请稍后重试')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      const data = await apiClient.delete<{ success: boolean; error?: string }>(`/api/invitation-codes/${id}`)
      if (data.success) {
        fetchCodes()
      } else {
        alert(data.error || '操作失败')
      }
    } catch {
      alert('网络错误')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            邀请码管理
          </CardTitle>
          <Button onClick={() => setGenerateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            批量生成
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索邀请码或创建者..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left font-medium">邀请码</th>
                    <th className="py-3 px-4 text-left font-medium">创建者</th>
                    <th className="py-3 px-4 text-left font-medium">最大使用次数</th>
                    <th className="py-3 px-4 text-left font-medium">已使用次数</th>
                    <th className="py-3 px-4 text-left font-medium">过期时间</th>
                    <th className="py-3 px-4 text-left font-medium">状态</th>
                    <th className="py-3 px-4 text-left font-medium">创建时间</th>
                    <th className="py-3 px-4 text-left font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map(code => {
                    const expired = isExpired(code.expires_at)
                    const usable = code.is_active && !expired && code.used_count < code.max_uses
                    
                    return (
                      <tr key={code.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-muted rounded font-mono text-sm">{code.code}</code>
                            <Button variant="ghost" size="sm" onClick={() => handleCopy(code.code)}>
                              {copiedCode === code.code ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 px-4">{code.created_by_username || '-'}</td>
                        <td className="py-3 px-4">{code.max_uses}</td>
                        <td className="py-3 px-4">{code.used_count}</td>
                        <td className="py-3 px-4 text-sm">
                          {formatDate(code.expires_at)}
                          {expired && <span className="text-destructive ml-2">(已过期)</span>}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={usable ? 'default' : 'outline'}>{usable ? '可用' : '不可用'}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(code.created_at)}</td>
                        <td className="py-3 px-4">
                          {code.is_active && !expired && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeactivate(code.id)}>
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredCodes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">暂无邀请码数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={generateDialogOpen} onClose={() => setGenerateDialogOpen(false)} title="批量生成邀请码">
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">生成数量 *</label>
            <Input
              type="number"
              min={1}
              max={100}
              value={generateForm.count}
              onChange={e => setGenerateForm({ ...generateForm, count: parseInt(e.target.value) || 1 })}
            />
            <p className="text-xs text-muted-foreground mt-1">1-100 个</p>
          </div>
          <div>
            <label className="text-sm font-medium">最大使用次数 *</label>
            <Input
              type="number"
              min={1}
              value={generateForm.max_uses}
              onChange={e => setGenerateForm({ ...generateForm, max_uses: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">过期时间</label>
            <Input
              type="datetime-local"
              value={generateForm.expires_at}
              onChange={e => setGenerateForm({ ...generateForm, expires_at: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">不填则永久有效</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>取消</Button>
          <Button onClick={handleGenerate} disabled={actionLoading}>
            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}生成
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}