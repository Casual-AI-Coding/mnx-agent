import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Settings, Eye, EyeOff, Globe, Zap, Palette, Info, Save, User } from 'lucide-react'
import { useAuthStore, type UserRole } from '@/stores/auth'
import { toastSuccess, toastError } from '@/lib/toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { FormError } from '@/components/ui/FormError'
import { settingsSchema, type SettingsFormData } from '@/lib/form-schemas'
import { updateProfile } from '@/lib/api/auth'
import { cn } from '@/lib/utils'

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const THEME_OPTIONS = [
  { value: 'system', label: '跟随系统 (System)' },
  { value: 'light', label: '浅色模式 (Light)' },
  { value: 'dark', label: '深色模式 (Dark)' },
]

const roleLabels: Record<UserRole, string> = {
  super: '超级管理员',
  admin: '管理员',
  pro: '专业用户',
  user: '普通用户',
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { user, accessToken, login } = useAuthStore()

  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const REGION_OPTIONS = [
    { value: 'cn', label: t('settings.regionCn') },
    { value: 'intl', label: t('settings.regionIntl') },
  ]

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      apiKey: user?.minimax_api_key ?? '',
      region: (user?.minimax_region as 'cn' | 'intl') ?? 'cn',
      apiMode: 'direct' as const,
      theme: 'system' as const,
    },
  })

  const formApiKey = watch('apiKey')
  const formRegion = watch('region')

  const hasChanges =
    formApiKey !== (user?.minimax_api_key ?? '') ||
    formRegion !== (user?.minimax_region ?? 'cn')

  const handleSave = async () => {
    const data = {
      apiKey: formApiKey,
      region: formRegion as 'cn' | 'intl',
      apiMode: 'direct' as const,
      theme: 'system' as const,
    }
    
    if (!user || !accessToken) return

    setIsSaving(true)
    try {
      const result = await updateProfile(accessToken, {
        minimax_api_key: data.apiKey || null,
        minimax_region: data.region,
      })

      if (result.success && result.data) {
        login(result.data, accessToken, useAuthStore.getState().refreshToken || '')
        toastSuccess(t('settings.saveSuccess'), t('settings.configUpdated'))
      } else {
        toastError(t('settings.saveError'), result.error || t('settings.checkConfig'))
      }
    } catch {
      toastError(t('settings.saveError'), t('settings.checkConfig'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-dark-800/50 bg-dark-900/50">
          <CardContent className="py-8 text-center text-dark-400">
            {t('settings.pleaseLogin', '请先登录以查看设置')}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      className="p-6 max-w-4xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="mb-8"
        variants={sectionVariants}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('settings.title')}</h1>
            <p className="text-dark-400 text-sm">{t('settings.subtitle')}</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={sectionVariants}>
        <Card className="mb-6 border-dark-800/50 bg-dark-900/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary-500" />
              <CardTitle className="text-white">{t('settings.accountInfo', '账户信息')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-dark-800/30">
              <span className="text-dark-400">{t('settings.username', '用户名')}</span>
              <span className="text-white font-medium">{user.username}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-dark-800/30">
              <span className="text-dark-400">{t('settings.role', '角色')}</span>
              <span className="text-primary-400 font-medium">{roleLabels[user.role]}</span>
            </div>
            {user.email && (
              <div className="flex items-center justify-between py-2 border-b border-dark-800/30">
                <span className="text-dark-400">{t('settings.email', '邮箱')}</span>
                <span className="text-white">{user.email}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={sectionVariants}>
        <Card className="mb-6 border-dark-800/50 bg-dark-900/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-500" />
              <CardTitle className="text-white">{t('settings.apiConfig')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-dark-300">
                {t('settings.apiKey')}
              </label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  {...register('apiKey')}
                  placeholder={t('settings.apiKeyPlaceholder')}
                  className="pr-10 bg-dark-950 border-dark-700 text-white placeholder:text-dark-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <FormError message={errors.apiKey?.message} />
              <p className="text-xs text-dark-500">
                {t('settings.apiKeyHint')}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-dark-300 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                {t('settings.region')}
              </label>
              <Select value={formRegion} onValueChange={(v) => setValue('region', v as 'cn' | 'intl')}>
                <SelectTrigger className="w-full bg-dark-950 border-dark-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-dark-900 border-dark-700">
                  {REGION_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-dark-300 hover:text-white hover:bg-dark-800 focus:bg-dark-800 focus:text-white"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={cn(
                  'flex items-center gap-2',
                  (!hasChanges || isSaving) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Save className="w-4 h-4" />
                {isSaving ? t('settings.saving', '保存中...') : t('settings.saveConfig')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={sectionVariants}>
        <Card className="mb-6 border-dark-800/50 bg-dark-900/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary-500" />
              <CardTitle className="text-white">{t('settings.appearance')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium text-dark-300">{t('settings.themeMode')}</label>
              <Select value="system" onValueChange={() => {}}>
                <SelectTrigger className="w-full bg-dark-950 border-dark-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-dark-900 border-dark-700">
                  {THEME_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-dark-300 hover:text-white hover:bg-dark-800 focus:bg-dark-800 focus:text-white"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={sectionVariants}>
        <Card className="border-dark-800/50 bg-dark-900/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-500" />
              <CardTitle className="text-white">{t('settings.about')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">{t('settings.appName')}</h3>
                <p className="text-dark-400 text-sm">{t('settings.version')}</p>
                <p className="text-dark-500 text-xs mt-1">
                  {t('settings.description')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}