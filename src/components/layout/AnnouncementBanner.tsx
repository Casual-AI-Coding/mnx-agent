import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

import { apiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'

type AnnouncementSeverity = 'info' | 'success' | 'warning' | 'error'

interface Announcement {
  readonly id: string
  readonly title: string
  readonly content: string
  readonly severity: AnnouncementSeverity
  readonly status: 'published'
}

interface ApiResponse<T> {
  readonly success: boolean
  readonly data: T
}

const severityStyles = {
  info: {
    icon: Info,
    className: 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100',
  },
  success: {
    icon: CheckCircle2,
    className: 'border-green-200 bg-green-50 text-green-950 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-100',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100',
  },
  error: {
    icon: XCircle,
    className: 'border-red-200 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100',
  },
} satisfies Record<AnnouncementSeverity, { readonly icon: typeof Info; readonly className: string }>

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<readonly Announcement[]>([])

  useEffect(() => {
    let isMounted = true

    const loadAnnouncements = async () => {
      try {
        const response = await apiClient.get<ApiResponse<readonly Announcement[]>>('/admin/announcements/active')
        if (isMounted && response.success) {
          setAnnouncements(response.data)
        }
      } catch (error) {
        if (isMounted) {
          setAnnouncements([])
        }
      }
    }

    void loadAnnouncements()

    return () => {
      isMounted = false
    }
  }, [])

  if (announcements.length === 0) {
    return null
  }

  return (
    <section className="space-y-3 mb-4" aria-live="polite" aria-label="系统公告">
      {announcements.map((announcement) => {
        const style = severityStyles[announcement.severity]
        const Icon = style.icon

        return (
          <article
            key={announcement.id}
            className={cn('rounded-xl border px-4 py-3 shadow-sm', style.className)}
          >
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold leading-6">{announcement.title}</h2>
                <p className="text-sm leading-6 opacity-90 break-words">{announcement.content}</p>
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}
