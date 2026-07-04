import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Cpu, Shield, Video, Waves } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { createVideo, getVideoStatus } from '@/lib/api/video'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { ResourceReferenceCard } from '@/components/resources/ResourceReferenceCard'
import {
  mergeResourceUsageMetadata,
  upsertResourceReference,
  type ResourceReference,
} from '@/lib/resource-references'
import { VIDEO_AGENT_TEMPLATES, type VideoAgentTemplate } from '@/types'
import { useFormPersistence, FORM_PERSISTENCE_KEYS } from '@/hooks/useFormPersistence'
import { VideoHistoryList, type AgentTask, type TaskStatus } from './VideoAgent/VideoHistoryList.js'
import { VideoInputForm, type VideoFormField } from './VideoAgent/VideoInputForm.js'
import { formatDuration, getStatusBadge, getStatusIcon } from './VideoAgent/videoAgentStatus.js'

interface VideoAgentFormData {
  selectedTemplateId: string | null
  inputs: Record<string, string>
  resourcePrompt: string
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
    storageKey: FORM_PERSISTENCE_KEYS.VIDEO_AGENT,
    defaultValue: {
      selectedTemplateId: null,
      inputs: {},
      resourcePrompt: '',
    },
  })
  const { selectedTemplateId, inputs, resourcePrompt } = formData

  const selectedTemplate = selectedTemplateId
    ? VIDEO_AGENT_TEMPLATES.find(t => t.id === selectedTemplateId) ?? null
    : null

  const updateForm = (updates: Partial<VideoAgentFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const [isGenerating, setIsGenerating] = useState(false)
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [error, setError] = useState<string | null>(null)
  const [resourceReferences, setResourceReferences] = useState<readonly ResourceReference[]>([])
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

  const handleTemplateSelect = (template: VideoAgentTemplate) => {
    updateForm({ selectedTemplateId: template.id, inputs: {}, resourcePrompt: '' })
    setError(null)
  }

  const trackResourceReference = (reference: ResourceReference) => {
    setResourceReferences(current => upsertResourceReference(current, reference))
  }

  const handleInputChange = (key: string, value: string) => {
    updateForm({ inputs: { ...inputs, [key]: value } })
  }

  const generatePrompt = () => {
    if (resourcePrompt.trim()) return resourcePrompt.trim()
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
        templateId: selectedTemplate?.id ?? 'resource-prompt',
        templateName: selectedTemplate?.name ?? '资源 Prompt',
        inputs: { ...inputs },
        prompt,
        createdAt: Date.now(),
        resourceReferences,
      }

      setTasks(prev => [newTask, ...prev])
      updateForm({ inputs: {}, resourcePrompt: '' })

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
              input: task.templateId === 'resource-prompt' ? task.prompt : `模板: ${task.templateName}`,
              outputUrl: status.results.video_url,
              metadata: mergeResourceUsageMetadata({
                taskId,
                templateId: task.templateId,
                inputs: task.inputs,
                duration: status.results.duration,
              }, task.resourceReferences),
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

  const isFormValid = () => {
    if (resourcePrompt.trim()) return true
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
          <ResourceReferenceCard
            generationType="video-agent"
            onApplyTemplate={({ content, reference }) => {
              updateForm({ selectedTemplateId: null, inputs: {}, resourcePrompt: content })
              trackResourceReference(reference)
            }}
            onApplyWorkflow={({ reference }) => trackResourceReference(reference)}
          />
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
