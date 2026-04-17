import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, RefreshCw, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import {
  getAllSystemConfigs,
  updateSystemConfig,
  type SystemConfig,
} from '@/lib/api/system-config'
import { useAuthStore } from '@/stores/auth'

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

interface EditableConfig extends SystemConfig {
  isEditing: boolean
  editValue: string
  isSaving: boolean
}

export default function SystemConfigPage() {
  const { isHydrated } = useAuthStore()
  const hasInitializedRef = useRef(false)
  const [configs, setConfigs] = useState<EditableConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadConfigs = async () => {
    try {
      const data = await getAllSystemConfigs()
      setConfigs(data.map(c => ({
        ...c,
        isEditing: false,
        editValue: c.value,
        isSaving: false,
      })))
    } catch (err) {
      toastError('加载失败', err instanceof Error ? err.message : '未知错误')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!isHydrated || hasInitializedRef.current) return
    hasInitializedRef.current = true
    loadConfigs()
  }, [isHydrated])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadConfigs()
  }

  const startEditing = (key: string) => {
    setConfigs(prev => prev.map(c =>
      c.key === key ? { ...c, isEditing: true, editValue: c.value } : c
    ))
  }

  const cancelEditing = (key: string) => {
    setConfigs(prev => prev.map(c =>
      c.key === key ? { ...c, isEditing: false, editValue: c.value } : c
    ))
  }

  const handleValueChange = (key: string, value: string) => {
    setConfigs(prev => prev.map(c =>
      c.key === key ? { ...c, editValue: value } : c
    ))
  }

  const handleSave = async (key: string) => {
    const config = configs.find(c => c.key === key)
    if (!config) return

    setConfigs(prev => prev.map(c =>
      c.key === key ? { ...c, isSaving: true } : c
    ))

    try {
      await updateSystemConfig(key, { value: config.editValue })
      setConfigs(prev => prev.map(c =>
        c.key === key
          ? { ...c, isEditing: false, value: config.editValue, isSaving: false }
          : c
      ))
      toastSuccess('保存成功', `配置项 ${key} 已更新`)
    } catch (err) {
      toastError('保存失败', err instanceof Error ? err.message : '未知错误')
      setConfigs(prev => prev.map(c =>
        c.key === key ? { ...c, isSaving: false } : c
      ))
    }
  }

  const renderValue = (config: SystemConfig) => {
    if (config.value_type === 'boolean') {
      return config.value === 'true' ? (
        <Badge variant="default" className="gap-1">
          <ToggleRight className="w-3 h-3" />
          启用
        </Badge>
      ) : (
        <Badge variant="secondary" className="gap-1">
          <ToggleLeft className="w-3 h-3" />
          禁用
        </Badge>
      )
    }
    return <span className="font-mono text-sm">{config.value}</span>
  }

  const renderEditInput = (config: EditableConfig) => {
    if (config.value_type === 'boolean') {
      return (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={config.editValue === 'true' ? 'default' : 'outline'}
            onClick={() => handleValueChange(config.key, 'true')}
          >
            启用
          </Button>
          <Button
            size="sm"
            variant={config.editValue === 'false' ? 'default' : 'outline'}
            onClick={() => handleValueChange(config.key, 'false')}
          >
            禁用
          </Button>
        </div>
      )
    }

    return (
      <Input
        value={config.editValue}
        onChange={(e) => handleValueChange(config.key, e.target.value)}
        className="font-mono text-sm max-w-md"
        disabled={config.isSaving}
      />
    )
  }

  const groupedConfigs = configs.reduce((acc, config) => {
    const group = config.key.split('.')[0]
    if (!acc[group]) acc[group] = []
    acc[group].push(config)
    return acc
  }, {} as Record<string, EditableConfig[]>)

  const groupLabels: Record<string, string> = {
    api: 'API 设置',
    features: '功能开关',
    system: '系统设置',
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="p-6 max-w-5xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="mb-8" variants={sectionVariants}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">系统配置</h1>
              <p className="text-muted-foreground/70 text-sm">管理系统全局配置</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
            刷新
          </Button>
        </div>
      </motion.div>

      {Object.entries(groupedConfigs).map(([group, groupConfigs]) => (
        <motion.div key={group} variants={sectionVariants}>
          <Card className="mb-6 border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500" />
                {groupLabels[group] || group}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groupConfigs.map((config) => (
                  <div
                    key={config.key}
                    className="flex items-start justify-between py-3 border-b border-border/30 last:border-0"
                  >
                    <div className="flex-1 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                          {config.key}
                        </code>
                      </div>
                      {config.description && (
                        <p className="text-xs text-muted-foreground/70 mb-2">
                          {config.description}
                        </p>
                      )}
                      <div className="mt-2">
                        {config.isEditing ? (
                          renderEditInput(config)
                        ) : (
                          renderValue(config)
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelEditing(config.key)}
                            disabled={config.isSaving}
                          >
                            取消
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSave(config.key)}
                            disabled={config.isSaving}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            {config.isSaving ? '保存中...' : '保存'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(config.key)}
                        >
                          编辑
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {configs.length === 0 && !isLoading && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">暂无配置项</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
