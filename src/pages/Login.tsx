import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, UserPlus, Eye, EyeOff, Shield } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { login as loginApi, register as registerApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { toastSuccess, toastError } from '@/lib/toast'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'register'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  })

  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    invitationCode: '',
    email: '',
  })

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginForm.username || !loginForm.password) {
      toastError('请填写用户名和密码')
      return
    }

    setLoading(true)
    try {
      const result = await loginApi(loginForm.username, loginForm.password)
      if (result.success && result.data) {
        login(result.data.user, result.data.accessToken)
        toastSuccess('登录成功')
        navigate(from, { replace: true })
      } else {
        toastError(result.error || '登录失败')
      }
    } catch (error) {
      toastError('登录失败，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerForm.username || !registerForm.password || !registerForm.invitationCode) {
      toastError('请填写所有必填项')
      return
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      toastError('两次密码输入不一致')
      return
    }
    if (registerForm.password.length < 6) {
      toastError('密码至少6位')
      return
    }

    setLoading(true)
    try {
      const result = await registerApi(
        registerForm.username,
        registerForm.password,
        registerForm.invitationCode,
        registerForm.email || null
      )
      if (result.success && result.data) {
        login(result.data.user, result.data.accessToken)
        toastSuccess('注册成功')
        navigate(from, { replace: true })
      } else {
        toastError(result.error || '注册失败')
      }
    } catch (error) {
      toastError('注册失败，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4"
          >
            <Shield className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">MiniMax AI Workbench</h1>
          <p className="text-muted-foreground mt-2">智能创作工作台</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all',
                  mode === 'login'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LogIn className="w-4 h-4" />
                登录
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all',
                  mode === 'register'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <UserPlus className="w-4 h-4" />
                注册
              </button>
            </div>
          </CardHeader>

          <CardContent>
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">用户名</label>
                  <Input
                    type="text"
                    placeholder="请输入用户名"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">密码</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '登录中...' : '登录'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">用户名</label>
                  <Input
                    type="text"
                    placeholder="请输入用户名"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">邮箱 (可选)</label>
                  <Input
                    type="email"
                    placeholder="请输入邮箱"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">邀请码</label>
                  <Input
                    type="text"
                    placeholder="请输入邀请码"
                    value={registerForm.invitationCode}
                    onChange={(e) => setRegisterForm({ ...registerForm, invitationCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">密码</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码 (至少6位)"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">确认密码</label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请再次输入密码"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '注册中...' : '注册'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </motion.div>
    </div>
  )
}