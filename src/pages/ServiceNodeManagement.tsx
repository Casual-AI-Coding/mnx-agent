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
  Zap,
  Database,
  HardDrive,
  Clock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
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

const CATEGORY_CONFIG: Record<string, { icon: typeof Shield; color: string; bgClass: string }> = {
  'MiniMax API': { 
    icon: Zap, 
    color: 'text-blue-500',
    bgClass: 'bg-blue-500/10' 
  },
  'Database': { 
    icon: Database, 
    color: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10' 
  },
  'Capacity': { 
    icon: Shield, 
    color: 'text-amber-500',
    bgClass: 'bg-amber-500/10' 
  },
  'Media Storage': { 
    icon: HardDrive, 
    color: 'text-purple-500',
    bgClass: 'bg-purple-500/10' 
  },
  'Queue Processing': { 
    icon: Clock, 
    color: 'text-orange-500',
    bgClass: 'bg-orange-500/10' 
  },
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
        <StatCard title="总节点数" value={nodes.length} icon={Server} color="text-blue-400" />
        <StatCard title="已启用" value={enabledCount} icon={CheckCircle2} color="text-green-400" />
        <StatCard title="已禁用" value={nodes.length - enabledCount} icon={XCircle} color="text-muted-foreground" />
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
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">角色权限说明</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(ROLE_CONFIG).map(([role, config]) => (
              <div key={role} className="flex items-center gap-3">
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
            角色权限具有继承关系：Super → Admin → Pro → User。设置最低角色为 Pro 的节点，Admin 和 Super 用户也可以使用。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function CategorySection({ category, nodes, saving, updateNode }: {
  category: string
  nodes: ServiceNodePermission[]
  saving: string | null
  updateNode: (id: string, updates: { min_role?: UserRole; is_enabled?: boolean }) => void
}) {
  const config = CATEGORY_CONFIG[category] || { icon: Server, color: 'text-muted-foreground', bgClass: 'bg-muted/10' }
  const Icon = config.icon
  const enabledInCategory = nodes.filter(n => n.is_enabled).length

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn('p-2 rounded-lg', config.bgClass)}>
            <Icon className={cn('w-5 h-5', config.color)} />
          </div>
          <div>
            <h3 className="font-semibold">{category}</h3>
            <p className="text-sm text-muted-foreground/70">{enabledInCategory}/{nodes.length} 已启用</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {nodes.map(node => (
            <NodeCard key={node.id} node={node} saving={saving} updateNode={updateNode} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function NodeCard({ node, saving, updateNode }: {
  node: ServiceNodePermission
  saving: string | null
  updateNode: (id: string, updates: { min_role?: UserRole; is_enabled?: boolean }) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'relative rounded-lg border transition-all duration-200 p-3',
        node.is_enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-70'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {node.is_enabled ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
          )}
          <span className={cn('font-medium text-sm truncate', !node.is_enabled && 'text-muted-foreground/70')}>
            {node.display_name}
          </span>
        </div>
        <Switch
          checked={node.is_enabled}
          onCheckedChange={(checked) => updateNode(node.id, { is_enabled: checked })}
          disabled={saving === node.id}
        />
      </div>

      <code className="text-[10px] px-1.5 py-0.5 rounded font-mono block truncate bg-muted/50 text-muted-foreground/70 mb-2">
        {node.service_name}.{node.method_name}
      </code>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/50">最低角色</span>
        <Select
          value={node.min_role}
          onValueChange={(value) => updateNode(node.id, { min_role: value as UserRole })}
        >
          <SelectTrigger className="w-20 h-6 text-[10px] px-2" disabled={saving === node.id}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ROLE_CONFIG).map(([role, config]) => (
              <SelectItem key={role} value={role} className="text-xs">{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {saving === node.id && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
      )}
    </motion.div>
  )
}

function StatCard({ title, value, icon: Icon, color }: {
  title: string
  value: string | number
  icon: typeof Shield
  color: string
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
