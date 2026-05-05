import { Zap } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { PROMPT_TEMPLATES } from '@/types'

interface ImagePromptCardProps {
  activeTemplate: string | null
  imageTitle: string
  prompt: string
  promptLabel: string
  promptPlaceholder: string
  titleLabel: string
  titlePlaceholder: string
  onImageTitleChange: (value: string) => void
  onPromptChange: (value: string) => void
  onTemplateSelect: (templateId: string) => void
}

export function ImagePromptCard({
  activeTemplate,
  imageTitle,
  prompt,
  promptLabel,
  promptPlaceholder,
  titleLabel,
  titlePlaceholder,
  onImageTitleChange,
  onPromptChange,
  onTemplateSelect,
}: ImagePromptCardProps) {
  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Zap className="w-4 h-4 text-accent-foreground" />
          <span className="text-sm font-medium text-foreground">{promptLabel}</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground shrink-0">{titleLabel}</label>
            <Input
              value={imageTitle}
              onChange={e => onImageTitleChange(e.target.value)}
              placeholder={titlePlaceholder}
              className="bg-background/50 border-border"
            />
          </div>

          <Textarea
            value={prompt}
            onChange={e => onPromptChange(e.target.value)}
            placeholder={promptPlaceholder}
            className="min-h-[120px] resize-none bg-background/50 border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20"
          />

          <div className="flex flex-wrap gap-2">
            {PROMPT_TEMPLATES.slice(0, 6).map(template => (
              <button
                key={template.id}
                onClick={() => onTemplateSelect(template.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeTemplate === template.id
                    ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25'
                    : 'bg-secondary/50 text-muted-foreground/70 hover:bg-secondary hover:text-foreground'
                }`}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
