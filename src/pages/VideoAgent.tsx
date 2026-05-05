import { useEffect, useRef, useState, type ComponentType } from 'react'
import { AlertCircle, CheckCircle, Clock, Cpu, Loader2, Shield, Video, Waves, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { createVideo, getVideoStatus } from '@/lib/api/video'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { VIDEO_AGENT_TEMPLATES, type VideoAgentTemplate } from '@/types'
import { cn } from '@/lib/utils'
import { status as statusTokens } from '@/themes/tokens'
import { useFormPersistence, DEBUG_FORM_KEYS } from '@/hooks/useFormPersistence'
import { VideoHistoryList, type AgentTask, type TaskStatus } from './video-agent/VideoHistoryList.js'
import { VideoInputForm, type VideoFormField } from './video-agent/VideoInputForm.js'

interface VideoAgentFormData {
  selectedTemplateId: string | null
  inputs: Record<string, string>
}

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Waves,
  Cpu,
  Shield,
}

const TEMPLATE_FORMS: Record<string, VideoFormField[]> = {
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
  const [formData, setFormData] = useFormPersistence<VideoAgentFormData>({
    storageKey: DEBUG_FORM_KEYS.VIDEO_AGENT,
    defaultValue: {
      selectedTemplateId: null,
      inputs: {},
    },
  })
  const { selectedTemplateId, inputs } = formData

  const selectedTemplate = selectedTemplateId
    ? VIDEO_AGENT_TEMPLATES.find(t => t.id === selectedTemplateId) ?? null
    : null

  const updateForm = (updates: Partial<VideoAgentFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const [isGenerating, setIsGenerating] = useState(false)
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [error, setError] = useState<string | null>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

  const handleTemplateSelect = (template: VideoAgentTemplate) => {
    updateForm({ selectedTemplateId: template.id, inputs: {} })
    setError(null)
  }

  const handleInputChange = (key: string, value: string) => {
    updateForm({ inputs: { ...inputs, [key]: value } })
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
      updateForm({ inputs: {} })

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

  const downloadTaskVideo = (task: AgentTask) => {
    if (!task.videoUrl) return
    const anchor = document.createElement('a')
    anchor.href = task.videoUrl
    anchor.download = `video-${task.taskId}.mp4`
    anchor.click()
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
          <VideoInputForm
            error={error}
            iconMap={ICON_MAP}
            inputs={inputs}
            isFormValid={isFormValid()}
            isGenerating={isGenerating}
            promptPreview={generatePrompt()}
            selectedTemplate={selectedTemplate}
            templateForms={TEMPLATE_FORMS}
            templates={VIDEO_AGENT_TEMPLATES}
            onBack={() => updateForm({ selectedTemplateId: null })}
            onGenerate={handleGenerate}
            onInputChange={handleInputChange}
            onSelectTemplate={handleTemplateSelect}
          />
        </div>

        <div className="space-y-4">
          <VideoHistoryList
            formatDuration={formatDuration}
            getStatusBadge={getStatusBadge}
            getStatusIcon={getStatusIcon}
            tasks={tasks}
            onDownload={downloadTaskVideo}
            onRemoveTask={removeTask}
          />
        </div>
      </div>
    </div>
  )
}
