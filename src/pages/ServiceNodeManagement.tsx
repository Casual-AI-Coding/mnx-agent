import { useState, useEffect } from 'react'
import {
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Server,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { apiClient } from '@/lib/api/client'

type UserRole = 'super' | 'admin' | 'pro' | 'user'

interface ServiceNodePermission {
  id: string
  service_name: string
  method_name: string
  display_name: string
  category: string
  min_role: UserRole
  is_enabled: boolean
}

const ROLE_CONFIG: Record<UserRole, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  super: { label: 'Super', variant: 'destructive' },
  admin: { label: 'Admin', variant: 'default' },
  pro: { label: 'Pro', variant: 'secondary' },
  user: { label: 'User', variant: 'outline' },
}

function RoleBadge({ role }: { role: UserRole }) {
  const config = ROLE_CONFIG[role]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  pro: 1,
  admin: 2,
  super: 3,
}

export default function ServiceNodeManagement() {
  const [nodes, setNodes] = useState<ServiceNodePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [groupByCategory, setGroupByCategory] = useState(true)

  const fetchNodes = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.get<{ success: boolean; data: ServiceNodePermission[]; error?: string }>('/admin/service-nodes')
      if (data.success) {
        setNodes(data.data)
      } else {
        setError(data.error || '获取节点列表失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNodes()
  }, [])

  const updateNode = async (id: string, updates: { min_role?: UserRole; is_enabled?: boolean }) => {
    setSaving(id)
    try {
      const data = await apiClient.patch<{ success: boolean; data: ServiceNodePermission; error?: string }>(`/admin/service-nodes/${id}`, updates)
      if (data.success) {
        setNodes(prev => prev.map(n => n.id === id ? data.data : n))
      } else {
        alert(data.error || '更新失败')
      }
    } catch {
      alert('网络错误，请稍后重试')
    } finally {
      setSaving(null)
    }
  }

  const groupedNodes = nodes.reduce((acc, node) => {
    const category = node.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(node)
    return acc
  }, {} as Record<string, ServiceNodePermission[]>)

  const sortedCategories = Object.keys(groupedNodes).sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchNodes}>重试</Button>
      </div>
    )
  }

  const renderNodeRow = (node: ServiceNodePermission) => (
    <div
      key={node.id}
      className="flex items-center justify-between py-3 px-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {node.is_enabled ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="font-medium">{node.display_name}</span>
        </div>
        <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {node.service_name}.{node.method_name}
        </code>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">最低角色:</span>
          <Select
            value={node.min_role}
            onValueChange={(value) => updateNode(node.id, { min_role: value as UserRole })}
          >
            <SelectTrigger className="w-28 h-8" disabled={saving === node.id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                <SelectItem key={role} value={role}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">启用:</span>
          <Switch
            checked={node.is_enabled}
            onCheckedChange={(checked) => updateNode(node.id, { is_enabled: checked })}
            disabled={saving === node.id}
          />
        </div>

        {saving === node.id && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">节点权限管理</h1>
          <p className="text-muted-foreground mt-2">
            管理工作流中可用服务节点的访问权限
          </p>
        </div>
        <Button variant="outline" onClick={() => setGroupByCategory(!groupByCategory)}>
          <Server className="w-4 h-4 mr-2" />
          {groupByCategory ? '按列表显示' : '按分类显示'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            服务节点列表
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {groupByCategory ? (
              sortedCategories.map(category => (
                <div key={category}>
                  <div className="bg-muted/50 px-4 py-2 font-medium text-sm text-muted-foreground">
                    {category} ({groupedNodes[category].length})
                  </div>
                  {groupedNodes[category].map(renderNodeRow)}
                </div>
              ))
            ) : (
              nodes.map(renderNodeRow)
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>角色说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(ROLE_CONFIG).map(([role, config]) => (
              <div key={role} className="flex items-center gap-2">
                <Badge variant={config.variant}>{config.label}</Badge>
                <span className="text-sm text-muted-foreground">
                  {role === 'super' && '全部权限'}
                  {role === 'admin' && '管理权限'}
                  {role === 'pro' && '高级权限'}
                  {role === 'user' && '基础权限'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            角色权限具有继承关系：Super &gt; Admin &gt; Pro &gt; User。
            设置最低角色为 Pro 的节点，Admin 和 Super 用户也可以使用。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}