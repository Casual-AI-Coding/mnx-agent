import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Server,
  Layers,
  List,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { apiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'

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

const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  pro: 1,
  admin: 2,
  super: 3,
}

const CATEGORY_ICONS: Record<string, typeof Shield> = {
  'MiniMax API': Server,
  'Database': Layers,
  'Capacity': Shield,
  'Media Storage': Server,
  'Queue Processing': List,
}

const CATEGORY_COLORS: Record<string, string> = {
  'MiniMax API': 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  'Database': 'from-green-500/20 to-green-600/20 border-green-500/30',
  'Capacity': 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
  'Media Storage': 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  'Queue Processing': 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
}

export default function ServiceNodeManagement() {
  const { t } = useTranslation()
  const [nodes, setNodes] = useState<ServiceNodePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

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
  const enabledCount = nodes.filter(n => n.is_enabled).length

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
        <Button onClick={fetchNodes}>重试</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('serviceNodes.title', '节点权限管理')}</h1>
        <p className="text-muted-foreground/70 mt-1">{t('serviceNodes.subtitle', '管理工作流中可用服务节点的访问权限')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="总节点数"
          value={nodes.length}
          icon={Server}
          color="text-blue-400"
        />
        <StatCard
          title="已启用"
          value={enabledCount}
          icon={CheckCircle2}
          color="text-green-400"
        />
        <StatCard
          title="已禁用"
          value={nodes.length - enabledCount}
          icon={XCircle}
          color="text-muted-foreground"
        />
      </div>

      {sortedCategories.map(category => (
        <CategorySection
          key={category}
          category={category}
          nodes={groupedNodes[category]}
          saving={saving}
          updateNode={updateNode}
        />
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">角色权限说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(ROLE_CONFIG).map(([role, config]) => (
              <div key={role} className="flex items-center gap-2">
                <Badge variant={config.variant}>{config.label}</Badge>
                <span className="text-sm text-muted-foreground/70">
                  {role === 'super' && '全部权限'}
                  {role === 'admin' && '管理权限'}
                  {role === 'pro' && '高级权限'}
                  {role === 'user' && '基础权限'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground/60 mt-4">
            角色权限具有继承关系：Super → Admin → Pro → User。
            设置最低角色为 Pro 的节点，Admin 和 Super 用户也可以使用。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function CategorySection({
  category,
  nodes,
  saving,
  updateNode,
}: {
  category: string
  nodes: ServiceNodePermission[]
  saving: string | null
  updateNode: (id: string, updates: { min_role?: UserRole; is_enabled?: boolean }) => void
}) {
  const Icon = CATEGORY_ICONS[category] || Server
  const gradientClass = CATEGORY_COLORS[category] || 'from-muted/20 to-muted/30 border-border'

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-muted-foreground/70" />
        <h2 className="text-lg font-semibold">{category}</h2>
        <Badge variant="outline" className="text-xs">{nodes.length}</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nodes.map(node => (
          <NodeCard
            key={node.id}
            node={node}
            saving={saving}
            updateNode={updateNode}
            gradientClass={gradientClass}
          />
        ))}
      </div>
    </div>
  )
}

function NodeCard({
  node,
  saving,
  updateNode,
  gradientClass,
}: {
  node: ServiceNodePermission
  saving: string | null
  updateNode: (id: string, updates: { min_role?: UserRole; is_enabled?: boolean }) => void
  gradientClass: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn(
        'relative overflow-hidden border bg-gradient-to-br',
        gradientClass,
        !node.is_enabled && 'opacity-60'
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {node.is_enabled ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground/50" />
              )}
              <h3 className={cn('font-medium', !node.is_enabled && 'text-muted-foreground/70')}>
                {node.display_name}
              </h3>
            </div>
            <Switch
              checked={node.is_enabled}
              onCheckedChange={(checked) => updateNode(node.id, { is_enabled: checked })}
              disabled={saving === node.id}
            />
          </div>

          <code className="text-xs text-muted-foreground/50 bg-background/50 px-2 py-1 rounded font-mono block mb-3 truncate">
            {node.service_name}.{node.method_name}
          </code>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground/70">最低角色</span>
            <Select
              value={node.min_role}
              onValueChange={(value) => updateNode(node.id, { min_role: value as UserRole })}
            >
              <SelectTrigger className="w-24 h-7 text-xs" disabled={saving === node.id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                  <SelectItem key={role} value={role} className="text-xs">
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {saving === node.id && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
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
  icon: typeof Shield
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