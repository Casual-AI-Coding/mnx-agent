import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { FormError } from '@/components/ui/FormError'
import { useTemplatesStore } from '@/stores/templates'
import { toastSuccess, toastError } from '@/lib/toast'
import type { TemplateCategory, TemplateVariable } from '@/lib/api/templates'
import { 
  X, Plus, FileText, Image, Music, Video, Package,
  Sparkles, ChevronDown, Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { services, status } from '@/themes/tokens'

export const templateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  category: z.enum(['text', 'image', 'music', 'video', 'general']),
  content: z.string().min(1, 'Content is required'),
  variables: z.array(z.string()).optional(),
})

export type TemplateFormData = z.infer<typeof templateSchema>

interface CreateTemplateModalProps {
  open: boolean
  onClose: () => void
}

const CATEGORY_CONFIG: { value: TemplateCategory; label: string; icon: typeof FileText; color: string }[] = [
  { value: 'text', label: '文本', icon: FileText, color: cn(services.text.icon, services.text.bg, 'border-primary/30') },
  { value: 'image', label: '图像', icon: Image, color: cn(services.image.icon, services.image.bg, 'border-accent/30') },
  { value: 'music', label: '音乐', icon: Music, color: cn(services.music.icon, services.music.bg, 'border-primary-400/30') },
  { value: 'video', label: '视频', icon: Video, color: cn(services.video.icon, services.video.bg, 'border-destructive/30') },
  { value: 'general', label: '通用', icon: Package, color: 'text-muted-foreground bg-muted/10 border-muted/30' },
]

export function CreateTemplateModal({ open, onClose }: CreateTemplateModalProps) {
  const { t } = useTranslation()
  const { addTemplate } = useTemplatesStore()
  
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    category: 'text',
    content: '',
    variables: [],
  })
  
  const [errors, setErrors] = useState<Partial<Record<keyof TemplateFormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newVariable, setNewVariable] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  const selectedCategory = CATEGORY_CONFIG.find(c => c.value === formData.category) || CATEGORY_CONFIG[0]

  const validateField = (field: keyof TemplateFormData, value: unknown) => {
    const result = templateSchema.safeParse({ ...formData, [field]: value })
    if (!result.success) {
      const fieldError = result.error.issues.find((issue: z.ZodIssue) => issue.path[0] === field)
      return fieldError?.message || ''
    }
    return ''
  }

  const handleChange = (field: keyof TemplateFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    const error = validateField(field, value)
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const handleAddVariable = () => {
    if (!newVariable.trim()) return
    if (formData.variables?.includes(newVariable.trim())) {
      toastError('Variable already exists')
      return
    }
    setFormData(prev => ({
      ...prev,
      variables: [...(prev.variables || []), newVariable.trim()],
    }))
    setNewVariable('')
  }

  const handleRemoveVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables?.filter(v => v !== variable) || [],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const result = templateSchema.safeParse(formData)
    if (!result.success) {
      const newErrors: Partial<Record<keyof TemplateFormData, string>> = {}
      result.error.issues.forEach((issue: z.ZodIssue) => {
        const field = issue.path[0] as keyof TemplateFormData
        newErrors[field] = issue.message
      })
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    
    const templateData = {
      name: formData.name,
      description: formData.description,
      content: formData.content,
      category: formData.category,
      variables: formData.variables?.map(name => ({ name })) as TemplateVariable[] | undefined,
    }
    
    const success = await addTemplate(templateData)
    
    if (success) {
      toastSuccess(t('templates.createSuccess', '模板创建成功'))
      resetForm()
      onClose()
    } else {
      toastError(t('templates.createError', '创建模板失败'))
    }
    
    setIsSubmitting(false)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'text',
      content: '',
      variables: [],
    })
    setErrors({})
    setNewVariable('')
    setShowCategoryDropdown(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      size="lg"
      className="sm:max-w-2xl"
    >
      
      <div className="relative mb-6">
        <div className="absolute -top-4 -left-4 w-32 h-32 bg-gradient-to-br from-primary-500/20 via-purple-500/10 to-transparent rounded-full blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/20">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary-foreground">
                {t('templates.createTitle', '创建模板')}
              </h2>
              <p className="text-sm text-dark-400">
                {t('templates.createDescription', '创建可复用的提示词模板')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        <div className="space-y-2">
          <Label htmlFor="name" className="text-dark-200">
            {t('templates.name', '名称')}
            <span className={cn(status.error.icon, "ml-1")}>*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder={t('templates.namePlaceholder', '输入模板名称')}
            variant={errors.name ? 'error' : 'default'}
            className="bg-dark-900/50 border-dark-700 focus:border-primary-500"
          />
          <FormError message={errors.name} />
        </div>

        
        <div className="space-y-2">
          <Label htmlFor="description" className="text-dark-200">
            {t('templates.description', '描述')}
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder={t('templates.descriptionPlaceholder', '简短描述模板用途（可选）')}
            rows={2}
            variant={errors.description ? 'error' : 'default'}
            className="bg-dark-900/50 border-dark-700 focus:border-primary-500 resize-none"
          />
          <FormError message={errors.description} />
        </div>

        
        <div className="space-y-2">
          <Label className="text-dark-200">
            {t('templates.category', '类别')}
            <span className={cn(status.error.icon, "ml-1")}>*</span>
          </Label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 rounded-lg",
                "bg-dark-900/50 border border-dark-700",
                "hover:border-dark-600 focus:border-primary-500 focus:outline-none",
                "transition-colors text-left"
              )}
            >
              <div className="flex items-center gap-2">
                <selectedCategory.icon className={cn("w-4 h-4", selectedCategory.color.split(' ')[0])} />
                <span className="text-foreground">{selectedCategory.label}</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-dark-400 transition-transform", showCategoryDropdown && "rotate-180")} />
            </button>
            
            {showCategoryDropdown && (
              <div className="absolute z-50 w-full mt-2 py-1 rounded-lg bg-dark-900 border border-dark-700 shadow-xl">
                {CATEGORY_CONFIG.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      handleChange('category', cat.value)
                      setShowCategoryDropdown(false)
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left",
                      "hover:bg-dark-800 transition-colors",
                      formData.category === cat.value && "bg-dark-800/50"
                    )}
                  >
                    <cat.icon className={cn("w-4 h-4", cat.color.split(' ')[0])} />
                    <span className="text-foreground flex-1">{cat.label}</span>
                    {formData.category === cat.value && (
                      <Check className="w-4 h-4 text-primary-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <FormError message={errors.category} />
        </div>

        
        <div className="space-y-2">
          <Label htmlFor="content" className="text-dark-200">
            {t('templates.content', '内容')}
            <span className={cn(status.error.icon, "ml-1")}>*</span>
          </Label>
          <Textarea
            id="content"
            value={formData.content}
            onChange={(e) => handleChange('content', e.target.value)}
            placeholder={t('templates.contentPlaceholder', '输入提示词模板内容，使用 {{变量名}} 定义动态值')}
            rows={6}
            variant={errors.content ? 'error' : 'default'}
            className="bg-dark-900/50 border-dark-700 focus:border-primary-500 resize-none font-mono text-sm"
          />
          <FormError message={errors.content} />
          <p className="text-xs text-dark-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {t('templates.contentHint', '使用 {{变量名}} 语法定义模板变量')}
          </p>
        </div>

        
        <div className="space-y-2">
          <Label className="text-dark-200">{t('templates.variables', '变量')}</Label>
          <div className="flex gap-2">
            <Input
              value={newVariable}
              onChange={(e) => setNewVariable(e.target.value)}
              placeholder={t('templates.variablePlaceholder', '添加变量名')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddVariable()
                }
              }}
              className="bg-dark-900/50 border-dark-700 focus:border-primary-500"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddVariable}
              disabled={!newVariable.trim()}
              className="shrink-0 border-dark-700 hover:bg-dark-800"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {formData.variables && formData.variables.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.variables.map((variable) => (
                <div
                  key={variable}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg",
                    "bg-primary-500/10 border border-primary-500/30",
                    "text-sm text-primary-300"
                  )}
                >
                  <span className="font-mono">{`{{${variable}}}`}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariable(variable)}
                    className="text-dark-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        
        <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-dark-800">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-dark-400 hover:text-foreground hover:bg-dark-800"
          >
            {t('common.cancel', '取消')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 border-0"
          >
            {isSubmitting ? t('common.creating', '创建中...') : t('common.create', '创建')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}