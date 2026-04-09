import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Server,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { apiClient } from '@/lib/api/client'
import { roles, status } from '@/themes/tokens/index'
import { CategorySection } from './CategorySection'
import { StatCard } from './StatCard'
import type { ServiceNodePermission, UserRole, RoleConfig } from './types'

const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  super: { label: 'Super', variant: 'destructive', color: roles.super.text },
  admin: { label: 'Admin', variant: 'default', color: roles.admin.text },
  pro: { label: 'Pro', variant: 'secondary', color: roles.pro.text },
  user: { label: 'User', variant: 'outline', color: roles.user.text },
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
      <PageHeader
        icon={<Settings className="w-5 h-5" />}
        title={t('serviceNodes.title', '节点权限管理')}
        description={t('serviceNodes.subtitle', '管理工作流中可用服务节点的访问权限')}
        gradient="orange-amber"
        actions={
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-3 gap-2">
              <StatCard title="总节点数" value={nodes.length} icon={Server} color={roles.admin.gradient} compact />
              <StatCard title="已启用" value={enabledCount} icon={CheckCircle2} color={status.success.gradient} compact />
              <StatCard title="已禁用" value={nodes.length - enabledCount} icon={XCircle} color={status.pending.gradient} compact />
            </div>
            <Button>
              {t('serviceNodes.createRule', '创建权限规则')}
            </Button>
          </div>
        }
      />

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
