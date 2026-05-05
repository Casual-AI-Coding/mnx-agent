import { motion } from 'framer-motion'
import { Palette, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'
import type { MUSIC_TEMPLATES } from '@/types'

type MusicTemplate = (typeof MUSIC_TEMPLATES)[number]

interface StylePromptCardProps {
  title: string
  stylePrompt: string
  stylePromptMax: number
  isStylePromptOverLimit: boolean
  showSaveTemplate: boolean
  newTemplateName: string
  templates: readonly MusicTemplate[]
  placeholder: string
  saveTemplateTitle: string
  saveTemplateLabel: string
  saveTemplatePlaceholder: string
  cancelLabel: string
  confirmLabel: string
  templateSelectPlaceholder: string
  onTemplateSelect: (templateId: string) => void
  onToggleSaveTemplate: () => void
  onNewTemplateNameChange: (value: string) => void
  onStylePromptChange: (value: string) => void
  onCancelSaveTemplate: () => void
  onConfirmSaveTemplate: () => void
}

export function StylePromptCard({
  title,
  stylePrompt,
  stylePromptMax,
  isStylePromptOverLimit,
  showSaveTemplate,
  newTemplateName,
  templates,
  placeholder,
  saveTemplateTitle,
  saveTemplateLabel,
  saveTemplatePlaceholder,
  cancelLabel,
  confirmLabel,
  templateSelectPlaceholder,
  onTemplateSelect,
  onToggleSaveTemplate,
  onNewTemplateNameChange,
  onStylePromptChange,
  onCancelSaveTemplate,
  onConfirmSaveTemplate,
}: StylePromptCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Palette className="w-5 h-5" />
          <span className="text-base font-semibold">{title}</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 relative">
            <Select value="" onValueChange={onTemplateSelect}>
              <SelectTrigger className="w-[400px]">
                <SelectValue placeholder={templateSelectPlaceholder} />
              </SelectTrigger>
              <SelectContent side="top">
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <span>{template.name}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">{template.style}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={onToggleSaveTemplate}
              disabled={!stylePrompt.trim()}
              title={saveTemplateTitle}
            >
              <Save className="w-4 h-4" />
            </Button>
            {showSaveTemplate && (
              <div className="absolute top-full mt-2 right-0 w-72 bg-card border border-border rounded-lg shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
                <div className="p-3 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">{saveTemplateLabel}</label>
                    <Input value={newTemplateName} onChange={e => onNewTemplateNameChange(e.target.value)} placeholder={saveTemplatePlaceholder} className="h-8" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-7" onClick={onCancelSaveTemplate}>{cancelLabel}</Button>
                    <Button size="sm" className="h-7" disabled={!newTemplateName.trim()} onClick={onConfirmSaveTemplate}>{confirmLabel}</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <Textarea
              value={stylePrompt}
              onChange={e => onStylePromptChange(e.target.value)}
              placeholder={placeholder}
              className={cn('min-h-[100px] resize-none pb-5', isStylePromptOverLimit && 'border-red-500')}
            />
            <div className={cn('absolute bottom-1.5 right-2 text-xs', isStylePromptOverLimit ? 'text-red-500' : 'text-muted-foreground')}>
              {stylePrompt.length} / {stylePromptMax}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
