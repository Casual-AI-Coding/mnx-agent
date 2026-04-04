import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Clock, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { getCronDescription, getNextRuns, formatDateWithTimezone } from '@/lib/cron-utils'

interface CronExpressionBuilderProps {
  value: string
  onChange: (expression: string) => void
  timezone?: string
  className?: string
}

type PresetType = 'daily' | 'weekly' | 'monthly' | 'custom'

interface PresetConfig {
  label: string
  expression: string
  description: string
}

const PRESETS: Record<PresetType, PresetConfig> = {
  daily: { label: '每天', expression: '0 9 * * *', description: '每天 09:00' },
  weekly: { label: '每周', expression: '0 9 * * 1', description: '每周一 09:00' },
  monthly: { label: '每月', expression: '0 9 1 * *', description: '每月1日 09:00' },
  custom: { label: '自定义', expression: '0 9 * * *', description: '自定义配置' },
}

const WEEKDAYS = [
  { value: '0', label: '周日' },
  { value: '1', label: '周一' },
  { value: '2', label: '周二' },
  { value: '3', label: '周三' },
  { value: '4', label: '周四' },
  { value: '5', label: '周五' },
  { value: '6', label: '周六' },
]

const MONTHS = [
  { value: '*', label: '每月' },
  { value: '1', label: '1月' },
  { value: '2', label: '2月' },
  { value: '3', label: '3月' },
  { value: '4', label: '4月' },
  { value: '5', label: '5月' },
  { value: '6', label: '6月' },
  { value: '7', label: '7月' },
  { value: '8', label: '8月' },
  { value: '9', label: '9月' },
  { value: '10', label: '10月' },
  { value: '11', label: '11月' },
  { value: '12', label: '12月' },
]

const DAYS_OF_MONTH = [
  { value: '*', label: '每天' },
  ...Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}日`,
  })),
]

export function CronExpressionBuilder({
  value,
  onChange,
  timezone = 'Asia/Shanghai',
  className,
}: CronExpressionBuilderProps) {
  const [preset, setPreset] = useState<PresetType>('daily')
  const [minutes, setMinutes] = useState(0)
  const [hours, setHours] = useState(9)
  const [date, setDate] = useState('*')
  const [month, setMonth] = useState('*')
  const [weekday, setWeekday] = useState('*')
  const [nextExecutions, setNextExecutions] = useState<Date[]>([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  useEffect(() => {
    if (!value) return
    
    const parts = value.trim().split(/\s+/)
    if (parts.length === 5) {
      const [min, hr, day, mon, wday] = parts
      
      const isSimpleExpression = parts.every(part => 
        /^\d+$/.test(part) || part === '*'
      )
      
      if (isSimpleExpression) {
        setMinutes(parseInt(min) || 0)
        setHours(parseInt(hr) || 0)
        setDate(day || '*')
        setMonth(mon || '*')
        setWeekday(wday || '*')
        
        if (min === '0' && hr === '9' && day === '*' && mon === '*' && wday === '*') {
          setPreset('daily')
        } else if (min === '0' && hr === '9' && day === '*' && mon === '*' && /^[1-6]$/.test(wday || '')) {
          setPreset('weekly')
        } else if (min === '0' && hr === '9' && day === '1' && mon === '*' && wday === '*') {
          setPreset('monthly')
        } else {
          setPreset('custom')
        }
      } else {
        setPreset('custom')
        setMinutes(parseInt(min) || 0)
        setHours(parseInt(hr) || 0)
        setDate(day || '*')
        setMonth(mon || '*')
        setWeekday(wday || '*')
      }
    }
  }, [])

  useEffect(() => {
    const expression = `${minutes} ${hours} ${date} ${month} ${weekday}`
    onChange(expression)
    
    const nextRuns = getNextRuns(expression, timezone, 5)
    setNextExecutions(nextRuns)
  }, [minutes, hours, date, month, weekday, timezone, onChange])

  const handlePresetChange = useCallback((newPreset: PresetType) => {
    setPreset(newPreset)
    
    if (newPreset !== 'custom') {
      const config = PRESETS[newPreset]
      const parts = config.expression.split(' ')
      setMinutes(parseInt(parts[0]))
      setHours(parseInt(parts[1]))
      setDate(parts[2])
      setMonth(parts[3])
      setWeekday(parts[4])
    }
  }, [])

  const handleTimeChange = useCallback((type: 'hours' | 'minutes', val: number) => {
    if (type === 'hours') {
      setHours(val)
    } else {
      setMinutes(val)
    }
    setPreset('custom')
  }, [])

  const handleDateChange = useCallback((type: 'date' | 'month' | 'weekday', val: string) => {
    if (type === 'date') {
      setDate(val)
    } else if (type === 'month') {
      setMonth(val)
    } else {
      setWeekday(val)
    }
    setPreset('custom')
  }, [])

  const currentExpression = useMemo(
    () => `${minutes} ${hours} ${date} ${month} ${weekday}`,
    [minutes, hours, date, month, weekday]
  )

  const naturalDescription = useMemo(
    () => getCronDescription(currentExpression),
    [currentExpression]
  )

  const formatWeekdayDisplay = useCallback((day: string) => {
    if (day === '*') return '每天'
    const dayNum = parseInt(day)
    if (isNaN(dayNum)) return day
    return WEEKDAYS[dayNum % 7]?.label || day
  }, [])

  const formatTimeDisplay = useCallback(() => {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }, [hours, minutes])

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          调度频率
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRESETS) as PresetType[]).map((p) => (
            <Button
              key={p}
              type="button"
              variant={preset === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetChange(p)}
              className={cn(
                'flex-1 min-w-[80px]',
                preset === p && 'ring-2 ring-primary/50'
              )}
            >
              {PRESETS[p].label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          执行时间
        </label>
        <div className="flex items-center gap-2">
          <Select
            value={hours.toString()}
            onValueChange={(v) => handleTimeChange('hours', parseInt(v))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {i.toString().padStart(2, '0')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <span className="text-lg text-muted-foreground font-medium">:</span>
          
          <Select
            value={minutes.toString()}
            onValueChange={(v) => handleTimeChange('minutes', parseInt(v))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 60 }, (_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {i.toString().padStart(2, '0')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {preset === 'weekly' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            星期选择
          </label>
          <Select
            value={weekday}
            onValueChange={(v) => handleDateChange('weekday', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.slice(1).map((day) => (
                <SelectItem key={day.value} value={day.value}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {preset === 'custom' && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            高级选项
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">日期</label>
              <Select
                value={date}
                onValueChange={(v) => handleDateChange('date', v)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_MONTH.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">月份</label>
              <Select
                value={month}
                onValueChange={(v) => handleDateChange('month', v)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">星期</label>
              <Select
                value={weekday}
                onValueChange={(v) => handleDateChange('weekday', v)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((w) => (
                    <SelectItem key={w.value} value={w.value}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 bg-muted rounded-lg border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Cron 表达式
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTimeDisplay()} · {formatWeekdayDisplay(weekday)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-background rounded border border-border font-mono text-sm text-foreground">
            {currentExpression}
          </code>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {naturalDescription}
        </p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setIsPreviewOpen(!isPreviewOpen)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Clock className="w-4 h-4" />
          <span>接下来5次执行时间</span>
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform',
              isPreviewOpen && 'rotate-180'
            )}
          />
        </button>
        
        {isPreviewOpen && (
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            {nextExecutions.length > 0 ? (
              <ul className="space-y-2">
                {nextExecutions.map((date, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm text-foreground"
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {i + 1}
                    </span>
                    <span>
                      {formatDateWithTimezone(date, timezone)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                无法计算下次执行时间，请检查表达式格式
              </p>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-border">
        <label className="text-xs text-muted-foreground mb-1 block">
          手动编辑表达式
        </label>
        <Input
          value={currentExpression}
          onChange={(e) => {
            const parts = e.target.value.trim().split(/\s+/)
            if (parts.length === 5) {
              const [min, hr, day, mon, wday] = parts
              if (/^\d+$/.test(min)) setMinutes(parseInt(min))
              if (/^\d+$/.test(hr)) setHours(parseInt(hr))
              setDate(day)
              setMonth(mon)
              setWeekday(wday)
              setPreset('custom')
            }
          }}
          placeholder="0 9 * * *"
          className="font-mono text-sm"
        />
      </div>
    </div>
  )
}

export default CronExpressionBuilder
