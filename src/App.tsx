import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useEffect, Suspense, lazy } from 'react'
import { Toaster } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import { ErrorBoundary, ErrorFallback } from '@/components/shared'
import { AuthGuard } from '@/components/auth'
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
const LyricsGeneration = lazy(() => import('@/pages/LyricsGeneration'))
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
const ExternalApiLogs = lazy(() => import('@/pages/ExternalApiLogs'))
const Login = lazy(() => import('@/pages/Login'))
const UserManagement = lazy(() => import('@/pages/UserManagement'))
const InvitationCodes = lazy(() => import('@/pages/InvitationCodes'))
const ServiceNodeManagement = lazy(() => import('@/pages/ServiceNodeManagement'))
const WorkflowTemplateManagement = lazy(() => import('@/pages/WorkflowTemplateManagement'))
const DeadLetterQueue = lazy(() => import('@/pages/DeadLetterQueue'))
const WebhookManagement = lazy(() => import('@/pages/CronManagement/WebhookManagement'))
const WorkflowMarketplace = lazy(() => import('@/pages/WorkflowMarketplace'))
const SystemConfig = lazy(() => import('@/pages/SystemConfig'))
const MaterialManagement = lazy(() => import('@/pages/MaterialManagement'))
const ArtistMaterialEditor = lazy(() => import('@/pages/ArtistMaterialEditor'))
const OpenAIImage2 = lazy(() => import('@/pages/OpenAIImage2'))

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
        <Route index element={<RouteWithErrorBoundary pageName="仪表盘"><Dashboard /></RouteWithErrorBoundary>} />
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
          path="lyrics"
          element={
            <RouteWithErrorBoundary pageName="歌词生成">
              <LyricsGeneration />
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
          path="external-api-logs"
          element={
            <RouteWithErrorBoundary pageName="外部调用日志">
              <ExternalApiLogs />
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
        <Route
          path="materials"
          element={
            <RouteWithErrorBoundary pageName="素材管理">
              <MaterialManagement />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="materials/:id/edit"
          element={
            <RouteWithErrorBoundary pageName="素材编辑器">
              <ArtistMaterialEditor />
            </RouteWithErrorBoundary>
          }
        />
        <Route
          path="external-debug/openai-image-2"
          element={
            <RouteWithErrorBoundary pageName="OpenAI Image-2 外部调试">
              <OpenAIImage2 />
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
        <Toaster 
          position="top-right" 
          theme="dark" 
          richColors 
          offset={64} 
          closeButton
          toastOptions={{
            classNames: {
              toast: 'group relative pr-8 pl-4 py-3 rounded-xl bg-card/95 backdrop-blur-sm shadow-lg shadow-black/20',
              title: 'text-sm font-medium text-foreground',
              description: 'text-xs text-muted-foreground mt-0.5',
              closeButton: '!right-2 !top-1/2 !-translate-y-1/2 !left-auto bg-transparent border-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity',
              success: 'border-l-4 border-l-success bg-gradient-to-r from-success/10',
              error: 'border-l-4 border-l-error bg-gradient-to-r from-error/10',
              warning: 'border-l-4 border-l-warning bg-gradient-to-r from-warning/10',
              info: 'border-l-4 border-l-info bg-gradient-to-r from-info/10',
            },
          }}
        />
        <AppContent />
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
