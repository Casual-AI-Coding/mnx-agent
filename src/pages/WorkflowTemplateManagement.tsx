import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  GitBranch,
  Loader2,
  AlertCircle,
  Search,
  Globe,
  Lock,
  Users,
  Eye,
  Trash2,
  Calendar,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { apiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  nodes_json: string
  edges_json: string
  owner_id: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

interface WorkflowPermission {
  workflow_id: string
  user_id: string
  granted_by: string
  granted_at: string
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getNodeCount(nodesJson: string): number {
  try {
    const nodes = JSON.parse(nodesJson)
    return Array.isArray(nodes) ? nodes.length : 0
  } catch {
    return 0
  }
}

export default function WorkflowTemplateManagement() {
  const { t } = useTranslation()
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [permissionsDialog, setPermissionsDialog] = useState<{
    open: boolean
    workflow: WorkflowTemplate | null
    permissions: WorkflowPermission[]
    loading: boolean
  }>({ open: false, workflow: null, permissions: [], loading: false })
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    workflow: WorkflowTemplate | null
    loading: boolean
  }>({ open: false, workflow: null, loading: false })
  const [viewDialog, setViewDialog] = useState<{
    open: boolean
    workflow: WorkflowTemplate | null
  }>({ open: false, workflow: null })

  const fetchWorkflows = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.get<{ success: boolean; data: { workflows: WorkflowTemplate[] }; error?: string }>('/workflows?page=1&limit=100')
      if (data.success) {
        setWorkflows(data.data.workflows)
      } else {
        setError(data.error || '获取流程列表失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchPermissions = async (workflowId: string) => {
    setPermissionsDialog(prev => ({ ...prev, loading: true }))
    try {
      const data = await apiClient.get<{ success: boolean; data: WorkflowPermission[]; error?: string }>(
        `/admin/workflows/${workflowId}/permissions`
      )
      if (data.success) {
        setPermissionsDialog(prev => ({
          ...prev,
          permissions: data.data,
          loading: false,
        }))
      }
    } catch {
      setPermissionsDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const openPermissionsDialog = (workflow: WorkflowTemplate) => {
    setPermissionsDialog({
      open: true,
      workflow,
      permissions: [],
      loading: true,
    })
    fetchPermissions(workflow.id)
  }

  const toggleVisibility = async (workflow: WorkflowTemplate) => {
    try {
      const data = await apiClient.patch<{ success: boolean; error?: string }>(
        `/admin/workflows/${workflow.id}/visibility`,
        { isPublic: !workflow.is_public }
      )
      if (data.success) {
        setWorkflows(prev =>
          prev.map(w =>
            w.id === workflow.id ? { ...w, is_public: !w.is_public } : w
          )
        )
      } else {
        alert(data.error || '更新失败')
      }
    } catch {
      alert('网络错误，请稍后重试')
    }
  }

  const deleteWorkflow = async () => {
    if (!deleteDialog.workflow) return
    setDeleteDialog(prev => ({ ...prev, loading: true }))
    try {
      const data = await apiClient.delete<{ success: boolean; error?: string }>(
        `/workflows/${deleteDialog.workflow.id}`
      )
      if (data.success) {
        setWorkflows(prev => prev.filter(w => w.id !== deleteDialog.workflow?.id))
        setDeleteDialog({ open: false, workflow: null, loading: false })
      } else {
        alert(data.error || '删除失败')
        setDeleteDialog(prev => ({ ...prev, loading: false }))
      }
    } catch {
      alert('网络错误，请稍后重试')
      setDeleteDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  const publicCount = workflows.filter(w => w.is_public).length
  const totalNodes = workflows.reduce((sum, w) => sum + getNodeCount(w.nodes_json), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchWorkflows}>重试</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('workflowTemplates.title', '流程模板管理')}</h1>
          <p className="text-muted-foreground/70 mt-1">{t('workflowTemplates.subtitle', '管理工作流模板的可见性和权限')}</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input
            placeholder="搜索流程..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="流程总数"
          value={workflows.length}
          icon={GitBranch}
          color="text-blue-400"
        />
        <StatCard
          title="公开流程"
          value={publicCount}
          icon={Globe}
          color="text-green-400"
        />
        <StatCard
          title="节点总数"
          value={totalNodes}
          icon={Layers}
          color="text-purple-400"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">流程模板列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredWorkflows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground/70">
                {searchQuery ? '没有找到匹配的流程' : '暂无流程模板'}
              </div>
            ) : (
              filteredWorkflows.map(workflow => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between py-4 px-6 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium truncate">{workflow.name}</h3>
                      {workflow.is_public ? (
                        <Badge variant="default" className="flex items-center gap-1 text-xs">
                          <Globe className="w-3 h-3" />
                          公开
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                          <Lock className="w-3 h-3" />
                          私有
                        </Badge>
                      )}
                    </div>
                    {workflow.description && (
                      <p className="text-sm text-muted-foreground/70 mt-1 truncate">
                        {workflow.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground/50">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {getNodeCount(workflow.nodes_json)} 节点
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(workflow.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleVisibility(workflow)}
                      title={workflow.is_public ? '设为私有' : '设为公开'}
                      className="h-8"
                    >
                      {workflow.is_public ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <Globe className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openPermissionsDialog(workflow)}
                      className="h-8"
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewDialog({ open: true, workflow })}
                      className="h-8"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteDialog({ open: true, workflow, loading: false })}
                      className="h-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={permissionsDialog.open}
        onClose={() => setPermissionsDialog(prev => ({ ...prev, open: false }))}
        title={`流程权限 - ${permissionsDialog.workflow?.name || ''}`}
      >
        <div className="py-4">
          {permissionsDialog.loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : permissionsDialog.permissions.length === 0 ? (
            <p className="text-center text-muted-foreground/70 py-4">
              该流程暂无授权用户
            </p>
          ) : (
            <div className="space-y-2">
              {permissionsDialog.permissions.map((perm) => (
                <div key={perm.user_id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                  <span className="text-sm">用户: {perm.user_id}</span>
                  <span className="text-xs text-muted-foreground/50">
                    {formatDate(perm.granted_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      <Dialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, workflow: null })}
        title={viewDialog.workflow?.name || '流程详情'}
      >
        <div className="py-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground/70 mb-1">描述</h4>
            <p className="text-sm">{viewDialog.workflow?.description || '暂无描述'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground/70 mb-1">节点数量</h4>
              <p className="text-sm font-medium">{getNodeCount(viewDialog.workflow?.nodes_json || '[]')}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground/70 mb-1">可见性</h4>
              <Badge variant={viewDialog.workflow?.is_public ? 'default' : 'secondary'}>
                {viewDialog.workflow?.is_public ? '公开' : '私有'}
              </Badge>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground/70 mb-2">节点列表</h4>
            <div className="bg-muted/30 rounded-lg p-3 max-h-60 overflow-y-auto">
              {(() => {
                try {
                  const nodes = JSON.parse(viewDialog.workflow?.nodes_json || '[]')
                  if (!Array.isArray(nodes) || nodes.length === 0) {
                    return <p className="text-sm text-muted-foreground/50">暂无节点</p>
                  }
                  return (
                    <div className="space-y-2">
                      {nodes.map((node: { id: string; type?: string; data?: { label?: string } }, idx: number) => (
                        <div key={node.id || idx} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">
                            {node.type || 'node'}
                          </Badge>
                          <span className="truncate">
                            {node.data?.label || node.id}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                } catch {
                  return <p className="text-sm text-muted-foreground/50">无法解析节点数据</p>
                }
              })()}
            </div>
          </div>
          <div className="text-xs text-muted-foreground/50">
            创建于: {formatDate(viewDialog.workflow?.created_at || null)}
          </div>
        </div>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, workflow: null, loading: false })}
        title="删除流程"
      >
        <div className="py-4">
          <p className="text-muted-foreground">
            确定要删除流程 "{deleteDialog.workflow?.name}" 吗？此操作不可恢复。
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialog({ open: false, workflow: null, loading: false })}>
            取消
          </Button>
          <Button variant="destructive" onClick={deleteWorkflow} disabled={deleteDialog.loading}>
            {deleteDialog.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '删除'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  icon: typeof GitBranch
  color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-muted/50', color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/70">{title}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}