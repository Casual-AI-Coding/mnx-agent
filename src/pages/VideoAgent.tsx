import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Video, Download, Loader2, Wand2, Clock, CheckCircle, XCircle, AlertCircle, Film, Trash2, Lightbulb, ChevronRight, Waves, Cpu, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { createVideo, getVideoStatus } from '@/lib/api/video'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { VIDEO_AGENT_TEMPLATES, type VideoAgentTemplate } from '@/types'
import { cn } from '@/lib/utils'
import { status as statusTokens } from '@/themes/tokens'

type TaskStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

interface AgentTask {
  id: string
  taskId: string
  status: TaskStatus
  templateId: string
  inputs: Record<string, string>
  createdAt: number
  videoUrl?: string
  duration?: number
  error?: string
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Waves,
  Cpu,
  Shield,
}

const TEMPLATE_FORMS: Record<string, { label: string; placeholder: string }[]> = {
  diving: [
    { label: '场景描述', placeholder: '描述你想要的水下场景...' },
    { label: '生物类型', placeholder: '例如：热带鱼、海龟、鲨鱼...' },
  ],
  transformers: [
    { label: '机器人名称', placeholder: '给你的机器人起个名字' },
    { label: '变形目标', placeholder: '例如：跑车、飞机、坦克...' },
  ],
  superhero: [
    { label: '英雄名称', placeholder: '超级英雄的名字' },
    { label: '超能力', placeholder: '例如：飞行、隐身、超强力量...' },
    { label: '场景', placeholder: '英雄登场的场景...' },
  ],
}

export default function VideoAgent() {
  const [selectedTemplate, setSelectedTemplate] = useState<VideoAgentTemplate | null>(null)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [error, setError] = useState<string | null>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

  const handleTemplateSelect = (template: VideoAgentTemplate) => {
    setSelectedTemplate(template)
    setInputs({})
    setError(null)
  }

  const handleInputChange = (key: string, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }))
  }

  const generatePrompt = () => {
    if (!selectedTemplate) return ''

    let prompt = ''

    switch (selectedTemplate.id) {
      case 'diving':
        prompt = `水下世界：${inputs['场景描述'] || '美丽的海底'}，${inputs['生物类型'] || '五彩斑斓的鱼群'}在身边游过，阳光透过海水形成光束，高清画质，电影级画面`
        break
      case 'transformers':
        prompt = `${inputs['机器人名称'] || '机甲战士'}变形为${inputs['变形目标'] || '超级跑车'}，机械结构精密，金属光泽，科幻风格，4K画质`
        break
      case 'superhero':
        prompt = `超级英雄${inputs['英雄名称'] || '无名英雄'}在${inputs['场景'] || '城市上空'}登场，拥有${inputs['超能力'] || '超凡能力'}，动感十足，电影级特效`
        break
      default:
        prompt = Object.entries(inputs).map(([_, value]) => value).join('，')
    }

    return prompt
  }

  const handleGenerate = async () => {
    const prompt = generatePrompt()
    if (!prompt) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await createVideo({
        model: 'video-01',
        prompt,
      })

      const newTask: AgentTask = {
        id: response.task_id,
        taskId: response.task_id,
        status: 'pending',
        templateId: selectedTemplate!.id,
        inputs: { ...inputs },
        createdAt: Date.now(),
      }

      setTasks(prev => [newTask, ...prev])
      setInputs({})

      addUsage('videoRequests', 1)

      const intervalId = await pollTaskStatus(newTask.taskId)
      activeIntervals.current.set(newTask.taskId, intervalId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建任务失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const pollTaskStatus = async (taskId: string) => {
    let attempts = 0
    const maxAttempts = 120

    const interval = setInterval(async () => {
      attempts++
      try {
        const status = await getVideoStatus(taskId)

        setTasks(prev => prev.map(task => {
          if (task.taskId !== taskId) return task

          const updatedTask: AgentTask = {
            ...task,
            status: status.status as TaskStatus,
          }

          if (status.status === 'completed' && status.results) {
            updatedTask.videoUrl = status.results.video_url
            updatedTask.duration = status.results.duration

            addItem({
              type: 'video',
              input: `模板: ${VIDEO_AGENT_TEMPLATES.find(t => t.id === task.templateId)?.name}`,
              outputUrl: status.results.video_url,
              metadata: {
                taskId,
                templateId: task.templateId,
                inputs: task.inputs,
                duration: status.results.duration,
              },
            })
          } else if (status.status === 'failed') {
            updatedTask.error = status.error || '生成失败'
          }

          return updatedTask
        }))

        if (status.status === 'completed' || status.status === 'failed' || attempts >= maxAttempts) {
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
      }
    }, 5000)

    return interval
  }

  // Store active intervals for cleanup on unmount
  const activeIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      activeIntervals.current.forEach((intervalId) => {
        clearInterval(intervalId)
      })
      activeIntervals.current.clear()
    }
  }, [])

  const removeTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.taskId !== taskId))
  }

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-muted-foreground" />
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />
      case 'completed':
        return <CheckCircle className={cn('w-5 h-5', statusTokens.success.icon)} />
      case 'failed':
        return <XCircle className="w-5 h-5 text-destructive" />
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">等待中</Badge>
      case 'processing':
        return <Badge variant="default">处理中</Badge>
      case 'completed':
        return <Badge variant="secondary" className={cn(statusTokens.success.bgSubtle, statusTokens.success.text)}>已完成</Badge>
      case 'failed':
        return <Badge variant="destructive">失败</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isFormValid = () => {
    if (!selectedTemplate) return false
    const formFields = TEMPLATE_FORMS[selectedTemplate.id] || []
    return formFields.every(field => inputs[field.label]?.trim())
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Video className="w-5 h-5" />}
        title="视频 Agent"
        description="智能视频处理代理"
        gradient="orange-amber"
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {!selectedTemplate ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
              <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      选择模板
                    </CardTitle>
                    <CardDescription>
                      选择一个模板开始创建视频
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {VIDEO_AGENT_TEMPLATES.map((template) => {
                    const IconComponent = ICON_MAP[template.icon]
                    return (
                      <div
                        key={template.id}
                        className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-accent/50 transition-all hover:shadow-lg hover:shadow-primary/25 group"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className={`aspect-video bg-gradient-to-br ${template.gradient} rounded-lg mb-3 flex items-center justify-center group-hover:opacity-90 transition-opacity`}>
                          {IconComponent ? (
                            <IconComponent className="w-16 h-16 text-foreground drop-shadow-lg" />
                          ) : (
                            <Film className="w-12 h-12 text-foreground/80" />
                          )}
                        </div>
                        <h3 className="font-medium mb-1">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        <div className="flex items-center gap-1 mt-2 text-primary text-sm">
                          <span>开始使用</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
              <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
                          ← 返回
                        </Button>
                        <CardTitle>{selectedTemplate.name}</CardTitle>
                      </div>
                      <Badge>{selectedTemplate.description}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {TEMPLATE_FORMS[selectedTemplate.id]?.map((field) => (
                      <div key={field.label} className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{field.label}</label>
                        <Input
                          value={inputs[field.label] || ''}
                          onChange={(e) => handleInputChange(field.label, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}

                    <div className="p-4 bg-muted rounded-lg">
                      <label className="text-sm font-medium mb-2 block">预览提示词</label>
                      <p className="text-sm text-muted-foreground">{generatePrompt() || '填写上方表单生成提示词'}</p>
                    </div>

                    {error && (
                      <div className="p-4 border border-destructive rounded-lg text-destructive">
                        {error}
                      </div>
                    )}

                    <Button
                      onClick={handleGenerate}
                      disabled={!isFormValid() || isGenerating}
                      className="w-full"
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          创建任务...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          生成视频
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Film className="w-5 h-5" />
                    任务列表
                  </CardTitle>
                </CardHeader>
                <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无任务</p>
                  <p className="text-sm">创建任务后将显示在这里</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.taskId}
                      className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className="font-medium text-sm">{task.taskId.slice(0, 8)}...</span>
                          {getStatusBadge(task.status)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTask(task.taskId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="text-sm">
                        <Badge variant="outline" className="mb-1">
                          {VIDEO_AGENT_TEMPLATES.find(t => t.id === task.templateId)?.name}
                        </Badge>
                        <p className="text-muted-foreground">
                          {Object.entries(task.inputs).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </p>
                      </div>

                      {task.status === 'completed' && task.videoUrl && (
                        <div className="space-y-3">
                          <video
                            src={task.videoUrl}
                            controls
                            className="w-full rounded-lg border"
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              时长: {formatDuration(task.duration)}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const a = document.createElement('a')
                                a.href = task.videoUrl!
                                a.download = `video-${task.taskId}.mp4`
                                a.click()
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              下载
                            </Button>
                          </div>
                        </div>
                      )}

                      {task.error && (
                        <p className="text-sm text-destructive">{task.error}</p>
                      )}

                      <div className="text-xs text-muted-foreground">
                        创建时间: {new Date(task.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </CardContent>
            </Card>
            </div>
          </motion.div>
        </div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Film className="w-5 h-5" />
                    任务列表
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>暂无任务</p>
                      <p className="text-sm">创建任务后将显示在这里</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tasks.map((task) => (
                        <div
                          key={task.taskId}
                          className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              <span className="font-medium text-sm">{task.taskId.slice(0, 8)}...</span>
                              {getStatusBadge(task.status)}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTask(task.taskId)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="text-sm">
                            <Badge variant="outline" className="mb-1">
                              {VIDEO_AGENT_TEMPLATES.find(t => t.id === task.templateId)?.name}
                            </Badge>
                            <p className="text-muted-foreground">
                              {Object.entries(task.inputs).map(([k, v]) => `${k}: ${v}`).join(', ')}
                            </p>
                          </div>

                          {task.status === 'completed' && task.videoUrl && (
                            <div className="space-y-3">
                              <video
                                src={task.videoUrl}
                                controls
                                className="w-full rounded-lg border"
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                  时长: {formatDuration(task.duration)}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const a = document.createElement('a')
                                    a.href = task.videoUrl!
                                    a.download = `video-${task.taskId}.mp4`
                                    a.click()
                                  }}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  下载
                                </Button>
                              </div>
                            </div>
                          )}

                          {task.error && (
                            <p className="text-sm text-destructive">{task.error}</p>
                          )}

                          <div className="text-xs text-muted-foreground">
                            创建时间: {new Date(task.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
