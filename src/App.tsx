import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import { ErrorBoundary, ErrorFallback } from '@/components/shared'
import Dashboard from '@/pages/Dashboard'
import TextGeneration from '@/pages/TextGeneration'
import VoiceSync from '@/pages/VoiceSync'
import VoiceAsync from '@/pages/VoiceAsync'
import ImageGeneration from '@/pages/ImageGeneration'
import MusicGeneration from '@/pages/MusicGeneration'
import VideoGeneration from '@/pages/VideoGeneration'
import VideoAgent from '@/pages/VideoAgent'
import VoiceManagement from '@/pages/VoiceManagement'
import FileManagement from '@/pages/FileManagement'
import ImageGallery from '@/pages/ImageGallery'
import TokenMonitor from '@/pages/TokenMonitor'
import Settings from '@/pages/Settings'
import CronManagement from '@/pages/CronManagement'
import WorkflowBuilder from '@/pages/WorkflowBuilder'
import CapacityMonitor from '@/pages/CapacityMonitor'
import { useAppStore } from '@/stores/app'
import analytics from '@/lib/analytics'

function AppContent() {
  const location = useLocation()
  const theme = useAppStore((state) => state.theme)

  useEffect(() => {
    analytics.init()
    analytics.trackPageview(location.pathname)
  }, [])

  useEffect(() => {
    analytics.trackPageview(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      analytics.trackError('Global_Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      analytics.trackError('Unhandled_Rejection', {
        reason: event.reason?.message || String(event.reason),
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      if (theme === 'dark') {
        root.classList.add('dark')
      } else if (theme === 'light') {
        root.classList.remove('dark')
      } else {
        if (mediaQuery.matches) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
    }

    applyTheme()

    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        if (e.matches) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
    }

    if (theme === 'system') {
      mediaQuery.addEventListener('change', handleSystemChange)
    }

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange)
    }
  }, [theme])

  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/text" replace />} />
        <Route path="text" element={<TextGeneration />} />
        <Route path="voice" element={<VoiceSync />} />
        <Route path="voice-async" element={<VoiceAsync />} />
        <Route path="image" element={<ImageGeneration />} />
        <Route path="music" element={<MusicGeneration />} />
        <Route path="video" element={<VideoGeneration />} />
        <Route path="video-agent" element={<VideoAgent />} />
        <Route path="voice-mgmt" element={<VoiceManagement />} />
        <Route path="files" element={<FileManagement />} />
        <Route path="gallery" element={<ImageGallery />} />
        <Route path="token" element={<TokenMonitor />} />
        <Route path="settings" element={<Settings />} />
        <Route path="cron" element={<CronManagement />} />
        <Route path="capacity" element={<CapacityMonitor />} />
        <Route path="workflow-builder" element={<WorkflowBuilder />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary
        fallback={<ErrorFallback className="min-h-screen" onRetry={() => window.location.reload()} />}
      >
        <Toaster position="bottom-right" theme="dark" richColors />
        <AppContent />
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App