import { useState } from 'react'
import { Video, Download, Sparkles, Loader2, Wand2, Clock, CheckCircle, XCircle, AlertCircle, Film, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { createVideo, getVideoStatus } from '@/lib/api/video'
import { uploadMediaFromUrl } from '@/lib/api/media'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { VIDEO_MODELS, type VideoModel } from '@/types'

type TaskStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

interface VideoTask {
  id: string
  taskId: string
  status: TaskStatus
  prompt: string
  createdAt: number
  videoUrl?: string
  duration?: number
  error?: string
}

export default function VideoGeneration() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState<VideoModel>('video-01')
  const [isGenerating, setIsGenerating] = useState(false)
  const [tasks, setTasks] = useState<VideoTask[]>([])
  const [error, setError] = useState<string | null>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await createVideo({
        model,
        prompt: prompt.trim(),
      })

      const newTask: VideoTask = {
        id: response.task_id,
        taskId: response.task_id,
        status: 'pending',
        prompt: prompt.trim(),
        createdAt: Date.now(),
      }

      setTasks(prev => [newTask, ...prev])
      setPrompt('')

      addUsage('videoRequests', 1)

      pollTaskStatus(newTask.taskId)
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

          const updatedTask: VideoTask = {
            ...task,
            status: status.status as TaskStatus,
          }

          if (status.status === 'completed' && status.results) {
            updatedTask.videoUrl = status.results.video_url
            updatedTask.duration = status.results.duration

            addItem({
              type: 'video',
              input: task.prompt,
              outputUrl: status.results.video_url,
              metadata: {
                taskId,
                model,
                duration: status.results.duration,
              },
            })

            saveVideoToMedia(status.results.video_url)
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
  }

  const saveVideoToMedia = async (videoUrl: string): Promise<void> => {
    try {
      await uploadMediaFromUrl(
        videoUrl,
        `video_${Date.now()}.mp4`,
        'video',
        'video_generation'
      )
    } catch (error) {
      console.error('Failed to save video:', error)
    }
  }

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
        return <CheckCircle className="w-5 h-5 text-green-500" />
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
        return <Badge variant="secondary" className="bg-green-100 text-green-800">已完成</Badge>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">视频生成</h1>
          <p className="text-muted-foreground text-sm">
            根据文本描述生成视频内容，支持异步任务处理
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                提示词
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你想要生成的视频场景...\n例如：一只可爱的猫咪在草地上玩耍，阳光明媚，微风轻拂"
                className="min-h-[200px] resize-none"
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">模型</label>
                <Select value={model} onValueChange={(v) => setModel(v as VideoModel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_MODELS.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex flex-col">
                          <span>{m.name}</span>
                          <span className="text-xs text-muted-foreground">{m.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="p-4 border border-destructive rounded-lg text-destructive">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
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

          <Card>
            <CardHeader>
              <CardTitle>使用提示</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• 详细描述场景、动作、光线等</li>
                <li>• 视频生成需要较长时间，请耐心等待</li>
                <li>• 任务状态会自动更新</li>
                <li>• 完成后可在任务列表中预览和下载</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
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
                      className="border rounded-lg p-4 space-y-3"
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

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.prompt}
                      </p>

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
      </div>
    </div>
  )
}
