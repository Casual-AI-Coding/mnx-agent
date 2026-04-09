import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useEffect, Suspense, lazy } from 'react'
import { Toaster } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import { ErrorBoundary, ErrorFallback } from '@/components/shared'
import AuthGuard from '@/components/AuthGuard'
import analytics from '@/lib/analytics'
import { useThemeEffect } from '@/hooks/useThemeEffect'
import { useTokenRefresh } from '@/hooks/useTokenRefresh'

// Lazy load page components for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const TextGeneration = lazy(() => import('@/pages/TextGeneration'))
const VoiceSync = lazy(() => import('@/pages/VoiceSync'))
const VoiceAsync = lazy(() => import('@/pages/VoiceAsync'))
const ImageGeneration = lazy(() => import('@/pages/ImageGeneration'))
const MusicGeneration = lazy(() => import('@/pages/MusicGeneration'))
const VideoGeneration = lazy(() => import('@/pages/VideoGeneration'))
const VideoAgent = lazy(() => import('@/pages/VideoAgent'))
const VoiceManagement = lazy(() => import('@/pages/VoiceManagement'))
const FileManagement = lazy(() => import('@/pages/FileManagement'))
const MediaManagement = lazy(() => import('@/pages/MediaManagement'))
const ImageGallery = lazy(() => import('@/pages/ImageGallery'))
const TokenMonitor = lazy(() => import('@/pages/TokenMonitor'))
const Settings = lazy(() => import('@/pages/Settings'))
const CronManagement = lazy(() => import('@/pages/CronManagement'))
const WorkflowBuilder = lazy(() => import('@/pages/WorkflowBuilder'))
const CapacityMonitor = lazy(() => import('@/pages/CapacityMonitor'))
const TemplateLibrary = lazy(() => import('@/pages/TemplateLibrary'))
const StatsDashboard = lazy(() => import('@/pages/StatsDashboard'))
const AuditLogs = lazy(() => import('@/pages/AuditLogs'))
const Login = lazy(() => import('@/pages/Login'))
const UserManagement = lazy(() => import('@/pages/UserManagement'))
const InvitationCodes = lazy(() => import('@/pages/InvitationCodes'))
const ServiceNodeManagement = lazy(() => import('@/pages/ServiceNodeManagement'))
const WorkflowTemplateManagement = lazy(() => import('@/pages/WorkflowTemplateManagement'))
const DeadLetterQueue = lazy(() => import('@/pages/DeadLetterQueue'))
const WebhookManagement = lazy(() => import('@/pages/WebhookManagement'))
const WorkflowMarketplace = lazy(() => import('@/pages/WorkflowMarketplace'))
const SystemConfig = lazy(() => import('@/pages/SystemConfig'))

// Route wrapper with ErrorBoundary for each page
function RouteWithErrorBoundary({ children, pageName }: { children: React.ReactNode; pageName: string }) {
  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          title={`${pageName} 加载失败`}
          message="页面渲染时遇到错误，请尝试刷新或返回上一页。"
          onRetry={() => window.location.reload()}
          className="min-h-[50vh]"
        />
      }
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>加载中...</span>
            </div>
          </div>
        }
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  useTokenRefresh()
  return <>{children}</>
}

function AppContent() {
  const location = useLocation()

  useThemeEffect()

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

  return (
    <TokenRefreshProvider>
      <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>加载中...</span>
              </div>
            </div>
          }>
            <Login />
          </Suspense>
        }
      />
      <Route path="/" element={<AuthGuard><AppLayout /></AuthGuard>}>
        <Route index element={<Navigate to="/text" replace />} />
        <Route
          path="text"
          element={
            <RouteWithErrorBoundary pageName="文本生成">
              <TextGeneration />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="voice"
          element={
            <RouteWithErrorBoundary pageName="语音同步">
              <VoiceSync />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="voice-async"
          element={
            <RouteWithErrorBoundary pageName="语音异步">
              <VoiceAsync />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="image"
          element={
            <RouteWithErrorBoundary pageName="图像生成">
              <ImageGeneration />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="music"
          element={
            <RouteWithErrorBoundary pageName="音乐生成">
              <MusicGeneration />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="video"
          element={
            <RouteWithErrorBoundary pageName="视频生成">
              <VideoGeneration />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="video-agent"
          element={
            <RouteWithErrorBoundary pageName="视频智能体">
              <VideoAgent />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="voice-mgmt"
          element={
            <RouteWithErrorBoundary pageName="音色管理">
              <VoiceManagement />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="files"
          element={
            <RouteWithErrorBoundary pageName="文件管理">
              <FileManagement />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="media"
          element={
            <RouteWithErrorBoundary pageName="媒体管理">
              <MediaManagement />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="gallery"
          element={
            <RouteWithErrorBoundary pageName="图库">
              <ImageGallery />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="token"
          element={
            <RouteWithErrorBoundary pageName="Token监控">
              <TokenMonitor />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="settings/:category?"
          element={
            <RouteWithErrorBoundary pageName="设置">
              <Settings />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="cron"
          element={
            <RouteWithErrorBoundary pageName="定时任务">
              <CronManagement />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="capacity"
          element={
            <RouteWithErrorBoundary pageName="容量监控">
              <CapacityMonitor />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="workflow-builder"
          element={
            <RouteWithErrorBoundary pageName="工作流构建器">
              <WorkflowBuilder />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="templates"
          element={
            <RouteWithErrorBoundary pageName="模板库">
              <TemplateLibrary />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="stats"
          element={
            <RouteWithErrorBoundary pageName="执行统计">
              <StatsDashboard />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="audit"
          element={
            <RouteWithErrorBoundary pageName="审计日志">
              <AuditLogs />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="user-management"
          element={
            <RouteWithErrorBoundary pageName="用户管理">
              <UserManagement />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="invitation-codes"
          element={
            <RouteWithErrorBoundary pageName="邀请码管理">
              <InvitationCodes />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="service-nodes"
          element={
            <RouteWithErrorBoundary pageName="节点权限管理">
              <ServiceNodeManagement />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="workflow-templates"
          element={
            <RouteWithErrorBoundary pageName="流程模板管理">
              <WorkflowTemplateManagement />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="dead-letter-queue"
          element={
            <RouteWithErrorBoundary pageName="死信队列">
              <DeadLetterQueue />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="webhooks"
          element={
            <RouteWithErrorBoundary pageName="Webhook管理">
              <WebhookManagement />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="workflow-marketplace"
          element={
            <RouteWithErrorBoundary pageName="模板市场">
              <WorkflowMarketplace />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="system-config"
          element={
            <RouteWithErrorBoundary pageName="系统配置">
              <SystemConfig />
            </RouteWithErrorBoundary>
          }
        />
      </Route>
    </Routes>
    </TokenRefreshProvider>
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
