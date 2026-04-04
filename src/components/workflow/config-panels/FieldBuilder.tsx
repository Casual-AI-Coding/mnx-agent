import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

export interface FieldOption {
  value: string
  label: string
}

export interface FieldDefinition {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'json' | 'template'
  required?: boolean
  options?: FieldOption[]
  placeholder?: string
  description?: string
  helpText?: string
  min?: number
  max?: number
  step?: number
}

export interface FieldBuilderProps {
  fields: FieldDefinition[]
  values: Record<string, unknown>
  onChange: (name: string, value: unknown) => void
  errors?: Record<string, string>
}

export function FieldBuilder({ fields, values, onChange, errors }: FieldBuilderProps) {
  const renderField = (field: FieldDefinition) => {
    const value = values[field.name]
    const error = errors?.[field.name]

    const handleChange = (newValue: unknown) => {
      onChange(field.name, newValue)
    }

    switch (field.type) {
      case 'select':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={handleChange}
          >
            <SelectTrigger className={cn(error && 'border-destructive focus:ring-destructive')}>
              <SelectValue placeholder={field.placeholder || '请选择...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'textarea':
        return (
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={cn('resize-y min-h-[80px]', error && 'border-destructive')}
          />
        )

      case 'json':
        return (
          <div className="relative">
            <Textarea
              value={value !== undefined ? JSON.stringify(value, null, 2) : ''}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  handleChange(parsed)
                } catch {
                  // Allow invalid JSON while typing, don't update
                }
              }}
              placeholder={field.placeholder || '{"key": "value"}'}
              rows={6}
              className={cn('font-mono text-xs resize-y', error && 'border-destructive')}
            />
            <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground bg-background/80 px-1 rounded">
              JSON
            </div>
          </div>
        )

      case 'template':
        return (
          <div className="relative">
            <Textarea
              value={(value as string) || ''}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder || '{{input.field}}'}
              rows={3}
              className={cn('resize-y min-h-[80px]', error && 'border-destructive')}
            />
            <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/70">
              支持模板变量: {'{{'}variable{'}'}
            </div>
          </div>
        )

      case 'number':
        return (
          <Input
            type="number"
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => {
              const num = e.target.value === '' ? undefined : parseFloat(e.target.value)
              handleChange(num)
            }}
            min={field.min}
            max={field.max}
            step={field.step}
            placeholder={field.placeholder}
            className={cn(error && 'border-destructive')}
          />
        )

      case 'text':
      default:
        return (
          <Input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            className={cn(error && 'border-destructive')}
          />
        )
    }
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="space-y-1.5">
          <Label className="flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          {renderField(field)}
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
          {errors?.[field.name] && (
            <p className="text-xs text-destructive">{errors[field.name]}</p>
          )}
        </div>
      ))}
    </div>
  )
}
