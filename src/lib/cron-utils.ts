import cronstrue from 'cronstrue'
import { CronExpressionParser, type CronDate } from 'cron-parser'

const parseExpression = CronExpressionParser.parse

export function getCronDescription(expression: string): string {
  try {
    return cronstrue.toString(expression)
  } catch {
    return 'Invalid expression'
  }
}

export function getNextRuns(expression: string, timezone: string, count: number = 5): Date[] {
  try {
    const interval = parseExpression(expression, {
      currentDate: new Date(),
    })

    const dates: Date[] = []
    for (let i = 0; i < count; i++) {
      const next: CronDate = interval.next()
      dates.push(next.toDate())
    }
    return dates
  } catch {
    return []
  }
}

export function getNextRun(expression: string, timezone: string): Date | null {
  try {
    const interval = parseExpression(expression, {
      currentDate: new Date(),
    })
    return interval.next().toDate()
  } catch {
    return null
  }
}

export function formatDateWithTimezone(date: Date, timezone: string): string {
  return date.toLocaleString('zh-CN', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export const COMMON_TIMEZONES: Array<{ value: string; label: string; offset: string }> = [
  { value: 'Asia/Shanghai', label: '中国标准时间', offset: 'UTC+8' },
  { value: 'Asia/Tokyo', label: '日本标准时间', offset: 'UTC+9' },
  { value: 'Asia/Seoul', label: '韩国标准时间', offset: 'UTC+9' },
  { value: 'Asia/Singapore', label: '新加坡时间', offset: 'UTC+8' },
  { value: 'Asia/Hong_Kong', label: '香港时间', offset: 'UTC+8' },
  { value: 'Asia/Taipei', label: '台北时间', offset: 'UTC+8' },
  { value: 'Asia/Bangkok', label: '曼谷时间', offset: 'UTC+7' },
  { value: 'Asia/Dubai', label: '迪拜时间', offset: 'UTC+4' },
  { value: 'Asia/Kolkata', label: '印度标准时间', offset: 'UTC+5:30' },
  { value: 'America/New_York', label: '美国东部时间', offset: 'UTC-5/UTC-4' },
  { value: 'America/Chicago', label: '美国中部时间', offset: 'UTC-6/UTC-5' },
  { value: 'America/Denver', label: '美国山地时间', offset: 'UTC-7/UTC-6' },
  { value: 'America/Los_Angeles', label: '美国太平洋时间', offset: 'UTC-8/UTC-7' },
  { value: 'America/Toronto', label: '多伦多时间', offset: 'UTC-5/UTC-4' },
  { value: 'America/Vancouver', label: '温哥华时间', offset: 'UTC-8/UTC-7' },
  { value: 'America/Sao_Paulo', label: '圣保罗时间', offset: 'UTC-3' },
  { value: 'Europe/London', label: '伦敦时间', offset: 'UTC+0/UTC+1' },
  { value: 'Europe/Paris', label: '巴黎时间', offset: 'UTC+1/UTC+2' },
  { value: 'Europe/Berlin', label: '柏林时间', offset: 'UTC+1/UTC+2' },
  { value: 'Europe/Moscow', label: '莫斯科时间', offset: 'UTC+3' },
  { value: 'Australia/Sydney', label: '悉尼时间', offset: 'UTC+10/UTC+11' },
  { value: 'Australia/Melbourne', label: '墨尔本时间', offset: 'UTC+10/UTC+11' },
  { value: 'Pacific/Auckland', label: '奥克兰时间', offset: 'UTC+12/UTC+13' },
  { value: 'UTC', label: '协调世界时', offset: 'UTC+0' },
]

export function getTimezoneOption(value: string) {
  return COMMON_TIMEZONES.find((tz) => tz.value === value) || {
    value,
    label: value,
    offset: '',
  }
}

export function isValidCronExpression(expression: string): boolean {
  try {
    parseExpression(expression, { currentDate: new Date() })
    return true
  } catch {
    return false
  }
}
