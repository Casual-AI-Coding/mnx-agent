import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Settings, Eye, EyeOff, Globe, Zap, Palette, Info, Save } from 'lucide-react'
import { useAppStore, type ApiMode } from '@/stores/app'
import { toastSuccess, toastError } from '@/lib/toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { FormError } from '@/components/ui/FormError'
import { settingsSchema, type SettingsFormData } from '@/lib/form-schemas'
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

const REGION_OPTIONS = [
  { value: 'cn', label: '中国大陆 (CN)' },
  { value: 'intl', label: '国际版 (International)' },
]

const API_MODE_OPTIONS = [
  { value: 'direct', label: '直接模式 (Direct)' },
  { value: 'proxy', label: '代理模式 (Proxy)' },
]

const THEME_OPTIONS = [
  { value: 'system', label: '跟随系统 (System)' },
  { value: 'light', label: '浅色模式 (Light)' },
  { value: 'dark', label: '深色模式 (Dark)' },
]

export default function SettingsPage() {
  const { t } = useTranslation()
  const {
    apiKey,
    region,
    apiMode,
    theme,
    setApiKey,
    setRegion,
    setApiMode,
    setTheme,
  } = useAppStore()

  const [showApiKey, setShowApiKey] = useState(false)

  const REGION_OPTIONS = [
    { value: 'cn', label: t('settings.regionCn') },
    { value: 'intl', label: t('settings.regionIntl') },
  ]

  const API_MODE_OPTIONS = [
    { value: 'direct', label: t('settings.modeDirect') },
    { value: 'proxy', label: t('settings.modeProxy') },
  ]

  const THEME_OPTIONS = [
    { value: 'system', label: t('settings.themeSystem') },
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
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
      apiKey,
      region,
      apiMode,
      theme,
    },
  })

  const formApiKey = watch('apiKey')
  const formRegion = watch('region')
  const formApiMode = watch('apiMode')
  const formTheme = watch('theme')

  const hasChanges =
    formApiKey !== apiKey ||
    formRegion !== region ||
    formApiMode !== apiMode ||
    formTheme !== theme

  const onSubmit = (data: SettingsFormData) => {
    try {
      setApiKey(data.apiKey)
      setRegion(data.region)
      setApiMode(data.apiMode)
      toastSuccess(t('settings.saveSuccess'), t('settings.configUpdated'))
    } catch {
      toastError(t('settings.saveError'), t('settings.checkConfig'))
    }
  }

  const handleThemeChange = (value: string) => {
    const newTheme = value as 'light' | 'dark' | 'system'
    setValue('theme', newTheme)
    setTheme(newTheme)
    toastSuccess(t('settings.themeUpdated'), `${t('settings.themeSwitched')}${THEME_OPTIONS.find(t => t.value === newTheme)?.label}`)
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-dark-300 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                {t('settings.apiMode')}
              </label>
              <Select value={formApiMode} onValueChange={(v) => setValue('apiMode', v as ApiMode)}>
                <SelectTrigger className="w-full bg-dark-950 border-dark-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-dark-900 border-dark-700">
                  {API_MODE_OPTIONS.map((option) => (
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
              <p className="text-xs text-dark-500">
                {t('settings.proxyHint')}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={!hasChanges}
                className={cn(
                  'flex items-center gap-2',
                  !hasChanges && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Save className="w-4 h-4" />
                {t('settings.saveConfig')}
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
              <Select value={formTheme} onValueChange={handleThemeChange}>
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
