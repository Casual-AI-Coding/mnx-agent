import { Trash2, Zap, ZapOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { SYSTEM_PROMPT_TEMPLATES, TEXT_MODELS } from '@/types'

interface PromptInputProps {
  clearLabel: string
  promptCaching: boolean
  selectedModel: string
  selectedTemplate: string
  onClear: () => void
  onPromptCachingChange: (value: boolean) => void
  onSelectedModelChange: (value: string) => void
  onSelectedTemplateChange: (value: string) => void
}

export function PromptInput({
  clearLabel,
  promptCaching,
  selectedModel,
  selectedTemplate,
  onClear,
  onPromptCachingChange,
  onSelectedModelChange,
  onSelectedTemplateChange,
}: PromptInputProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedModel} onValueChange={onSelectedModelChange}>
          <SelectTrigger className="w-48 bg-card/50 border-border text-foreground hover:border-primary/50 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {TEXT_MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id} className="text-foreground focus:bg-secondary">
                <div className="flex flex-col">
                  <span>{model.name}</span>
                  <span className="text-xs text-muted-foreground">{model.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTemplate} onValueChange={onSelectedTemplateChange}>
          <SelectTrigger className="w-36 bg-card/50 border-border text-foreground hover:border-primary/50 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {SYSTEM_PROMPT_TEMPLATES.map((template) => (
              <SelectItem key={template.id} value={template.id} className="text-foreground focus:bg-secondary">
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 px-3 py-2 bg-card/50 border border-border rounded-lg">
          {promptCaching ? <Zap className="w-4 h-4 text-warning" /> : <ZapOff className="w-4 h-4 text-muted-foreground" />}
          <Switch checked={promptCaching} onCheckedChange={onPromptCachingChange} className="data-[state=checked]:bg-warning" />
          <Label className="text-sm text-muted-foreground cursor-pointer" onClick={() => onPromptCachingChange(!promptCaching)}>
            缓存
          </Label>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {clearLabel}
        </Button>
      </div>
    </div>
  )
}
