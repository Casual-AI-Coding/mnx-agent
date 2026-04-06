import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  ChevronRight,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { apiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { roles, status } from '@/themes/tokens/index'

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

const ROLE_CONFIG: Record<UserRole, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  super: { label: 'Super', variant: 'destructive', color: roles.super.text },
  admin: { label: 'Admin', variant: 'default', color: roles.admin.text },
  pro: { label: 'Pro', variant: 'secondary', color: roles.pro.text },
  user: { label: 'User', variant: 'outline', color: roles.user.text },
}

const CATEGORY_CONFIG: Record<string, { 
  icon: typeof Shield; 
  gradient: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
}> = {
  'MiniMax API': { 
    icon: Zap, 
    gradient: roles.admin.gradient,
    bgGradient: cn('from-primary/20', 'to-info/20'),
    borderColor: roles.admin.border,
    glowColor: 'shadow-primary/20',
  },
  'Database': { 
    icon: Database, 
    gradient: roles.user.gradient,
    bgGradient: cn('from-success/20', 'to-info/20'),
    borderColor: roles.user.border,
    glowColor: 'shadow-success/20',
  },
  'Capacity': { 
    icon: Shield, 
    gradient: roles.super.gradient,
    bgGradient: cn('from-warning/20', 'to-error/20'),
    borderColor: roles.super.border,
    glowColor: 'shadow-warning/20',
  },
  'Media Storage': { 
    icon: HardDrive, 
    gradient: roles.pro.gradient,
    bgGradient: cn('from-secondary/20', 'to-accent/20'),
    borderColor: roles.pro.border,
    glowColor: 'shadow-secondary/20',
  },
  'Queue Processing': {
    icon: Clock,
    gradient: status.error.gradient,
    bgGradient: cn(status.error.bgSubtle, status.error.bg),
    borderColor: status.error.border,
    glowColor: 'shadow-destructive/20',
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
        toast.error(data.error || '更新失败')
      }
    } catch {
      toast.error('网络错误，请稍后重试')
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
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 w-12 h-12 border-2 border-primary/10 rounded-full animate-ping" />
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
        >
          <AlertCircle className="w-12 h-12 text-destructive" />
        </motion.div>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchNodes}>重试</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div className="flex-1" />
        
        <div className="grid grid-cols-3 gap-2">
          <StatCard title="总节点数" value={nodes.length} icon={Server} color={roles.admin.gradient} compact />
          <StatCard title="已启用" value={enabledCount} icon={CheckCircle2} color={status.success.gradient} compact />
          <StatCard title="已禁用" value={nodes.length - enabledCount} icon={XCircle} color={status.pending.gradient} compact />
        </div>
      </motion.div>

      {}
      <AnimatePresence>
        {sortedCategories.map((category, index) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <CategorySection
              category={category}
              nodes={groupedNodes[category]}
              saving={saving}
              updateNode={updateNode}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              角色权限说明
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                <div key={role} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
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
            <p className="text-sm text-muted-foreground/60 mt-4 leading-relaxed">
              角色权限具有继承关系：Super → Admin → Pro → User。设置最低角色为 Pro 的节点，Admin 和 Super 用户也可以使用。
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function CategorySection({ category, nodes, saving, updateNode }: {
  category: string
  nodes: ServiceNodePermission[]
  saving: string | null
  updateNode: (id: string, updates: { min_role?: UserRole; is_enabled?: boolean }) => void
}) {
  const config = CATEGORY_CONFIG[category] || {
    icon: Server,
    gradient: status.pending.gradient,
    bgGradient: cn(status.pending.bgSubtle, status.pending.bg),
    borderColor: status.pending.border,
    glowColor: 'shadow-muted/20',
  }
  const Icon = config.icon
  const enabledInCategory = nodes.filter(n => n.is_enabled).length
  const enabledPercent = Math.round((enabledInCategory / nodes.length) * 100)

  return (
    <Card className={cn(
      'relative overflow-hidden border-2 transition-all duration-300',
      'hover:shadow-xl hover:shadow-primary/5',
      config.borderColor
    )}>
      {}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-30',
        config.bgGradient
      )} />
      
      {}
      <div className={cn(
        'absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20',
        'bg-gradient-to-br',
        config.gradient
      )} />

      <CardContent className="relative p-6">
        {}
        <div className="flex items-center gap-4 mb-6">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={cn(
              'p-3 rounded-xl bg-gradient-to-br shadow-lg',
              config.gradient,
              config.glowColor
            )}
          >
            <Icon className="w-6 h-6 text-foreground" />
          </motion.div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-foreground">{category}</h3>
              <Badge variant="secondary" className="font-mono">
                {enabledInCategory}/{nodes.length}
              </Badge>
            </div>
            
            {}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${enabledPercent}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className={cn('h-full rounded-full bg-gradient-to-r', config.gradient)}
                />
              </div>
              <span className="text-xs text-muted-foreground/70 font-medium">
                {enabledPercent}% 已启用
              </span>
            </div>
          </div>
        </div>
        
        {}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {nodes.map((node, index) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <NodeCard node={node} saving={saving} updateNode={updateNode} gradient={config.gradient} />
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function NodeCard({ node, saving, updateNode, gradient }: {
  node: ServiceNodePermission
  saving: string | null
  updateNode: (id: string, updates: { min_role?: UserRole; is_enabled?: boolean }) => void
  gradient: string
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
      className={cn(
        'relative rounded-xl border p-4 transition-all duration-200',
        'backdrop-blur-sm',
        node.is_enabled 
          ? 'bg-card/80 border-border/50 shadow-lg shadow-black/5' 
          : 'bg-muted/30 border-border/30 opacity-60'
      )}
    >
      {}
      <div className={cn(
        'absolute top-0 left-4 right-4 h-0.5 rounded-full opacity-50',
        'bg-gradient-to-r',
        gradient
      )} />

      {}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <motion.div
            animate={{ 
              scale: node.is_enabled ? 1 : 0.9,
              opacity: node.is_enabled ? 1 : 0.5 
            }}
          >
            {node.is_enabled ? (
              <CheckCircle2 className={cn('w-4 h-4 flex-shrink-0', status.success.text)} />
            ) : (
              <XCircle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
            )}
          </motion.div>
          <span className={cn(
            'font-semibold text-sm truncate',
            !node.is_enabled && 'text-muted-foreground/70'
          )}>
            {node.display_name}
          </span>
        </div>
        <Switch
          checked={node.is_enabled}
          onCheckedChange={(checked) => updateNode(node.id, { is_enabled: checked })}
          disabled={saving === node.id}
          className="scale-75"
        />
      </div>

      {}
      <code className="text-[10px] px-2 py-1 rounded-md font-mono block truncate bg-muted/50 text-muted-foreground/70 mb-3">
        {node.service_name}.{node.method_name}
      </code>

      {}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wider">
          最低角色
        </span>
        <Select
          value={node.min_role}
          onValueChange={(value) => updateNode(node.id, { min_role: value as UserRole })}
        >
          <SelectTrigger 
            className="w-20 h-7 text-[11px] px-2 border-0 bg-muted/50 hover:bg-muted transition-colors" 
            disabled={saving === node.id}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ROLE_CONFIG).map(([role, config]) => (
              <SelectItem key={role} value={role} className="text-xs">
                <span className={config.color}>{config.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {}
      <AnimatePresence>
        {saving === node.id && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center rounded-xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="w-5 h-5 text-primary" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 0.15 : 0 }}
        className={cn(
          'absolute inset-0 rounded-xl pointer-events-none',
          'bg-gradient-to-br',
          gradient
        )}
        style={{ filter: 'blur(25px)' }}
      />
    </motion.div>
  )
}

function StatCard({ title, value, icon: Icon, color, compact = false }: {
  title: string
  value: string | number
  icon: typeof Shield
  color: string
  compact?: boolean
}) {
  if (compact) {
    return (
      <motion.div 
        whileHover={{ y: -2, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Card className="relative overflow-hidden border-border/50">
          <div className={cn(
            'absolute inset-0 bg-gradient-to-br opacity-10',
            color
          )} />
          <CardContent className="relative p-3">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                'p-1.5 rounded-lg bg-gradient-to-br shadow-md',
                color
              )}>
                <Icon className="w-3.5 h-3.5 text-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">{title}</p>
                <p className="text-lg font-bold text-foreground">{value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Card className="relative overflow-hidden border-border/50">
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-10',
          color
        )} />
        <CardContent className="relative p-5">
          <div className="flex items-center gap-4">
            <div className={cn(
              'p-3 rounded-xl bg-gradient-to-br shadow-lg shadow-black/20',
              color
            )}>
              <Icon className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/70 font-medium uppercase tracking-wider">{title}</p>
              <p className="text-2xl font-bold text-foreground">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
