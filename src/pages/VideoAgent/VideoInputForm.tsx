import { motion } from 'framer-motion'
import { ChevronRight, Film, Lightbulb, Loader2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { VideoAgentTemplate } from '@/types'

export interface VideoFormField {
  label: string
  placeholder: string
}

interface VideoInputFormProps {
  error: string | null
  iconMap: Record<string, React.ComponentType<{ className?: string }>>
  inputs: Record<string, string>
  isFormValid: boolean
  isGenerating: boolean
  promptPreview: string
  selectedTemplate: VideoAgentTemplate | null
  templateForms: Record<string, VideoFormField[]>
  templates: VideoAgentTemplate[]
  onBack: () => void
  onGenerate: () => void
  onInputChange: (key: string, value: string) => void
  onSelectTemplate: (template: VideoAgentTemplate) => void
}

export function VideoInputForm({
  error,
  iconMap,
  inputs,
  isFormValid,
  isGenerating,
  promptPreview,
  selectedTemplate,
  templateForms,
  templates,
  onBack,
  onGenerate,
  onInputChange,
  onSelectTemplate,
}: VideoInputFormProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
        {!selectedTemplate ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                选择模板
              </CardTitle>
              <CardDescription>选择一个模板开始创建视频</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((template) => {
                  const IconComponent = iconMap[template.icon]

                  return (
                    <div
                      key={template.id}
                      className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-accent/50 transition-all hover:shadow-lg hover:shadow-primary/25 group"
                      onClick={() => onSelectTemplate(template)}
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Button variant="ghost" size="sm" onClick={onBack}>
                    ← 返回
                  </Button>
                  <CardTitle className="truncate">{selectedTemplate.name}</CardTitle>
                </div>
                <Badge>{selectedTemplate.description}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {templateForms[selectedTemplate.id]?.map((field) => (
                <div key={field.label} className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{field.label}</label>
                  <Input
                    value={inputs[field.label] || ''}
                    onChange={(e) => onInputChange(field.label, e.target.value)}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}

              <div className="p-4 bg-muted rounded-lg">
                <label className="text-sm font-medium mb-2 block">预览提示词</label>
                <p className="text-sm text-muted-foreground">{promptPreview || '填写上方表单生成提示词'}</p>
              </div>

              {error && <div className="p-4 border border-destructive rounded-lg text-destructive">{error}</div>}

              <Button onClick={onGenerate} disabled={!isFormValid || isGenerating} className="w-full" size="lg">
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
        )}
      </div>
    </motion.div>
  )
}
