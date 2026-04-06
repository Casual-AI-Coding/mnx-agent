import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { User, Clock, Play, Pause, Search, History, Star, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { VOICE_OPTIONS } from '@/types'
import { createSyncVoice } from '@/lib/api/voice'
import { cn } from '@/lib/utils'
import { services } from '@/themes/tokens'

// Helper for gender tokens (not in standard token set)
const genderTokens = {
  male: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  female: { bg: 'bg-secondary/10', text: 'text-secondary-foreground', border: 'border-secondary/20' },
}

const RECENT_VOICES_KEY = 'minimax-recent-voices'
const FAVORITE_VOICES_KEY = 'minimax-favorite-voices'

const SAMPLE_TEXT = '你好，我是 MiniMax 语音助手，很高兴为你服务。'

export default function VoiceManagement() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')
  const [recentVoices, setRecentVoices] = useState<string[]>([])
  const [favoriteVoices, setFavoriteVoices] = useState<string[]>([])
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [, setAudioUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const recent = localStorage.getItem(RECENT_VOICES_KEY)
    const favorites = localStorage.getItem(FAVORITE_VOICES_KEY)
    if (recent) setRecentVoices(JSON.parse(recent))
    if (favorites) setFavoriteVoices(JSON.parse(favorites))
  }, [])

  useEffect(() => {
    localStorage.setItem(RECENT_VOICES_KEY, JSON.stringify(recentVoices))
  }, [recentVoices])

  useEffect(() => {
    localStorage.setItem(FAVORITE_VOICES_KEY, JSON.stringify(favoriteVoices))
  }, [favoriteVoices])

  const addToRecent = (voiceId: string) => {
    setRecentVoices(prev => {
      const filtered = prev.filter(id => id !== voiceId)
      return [voiceId, ...filtered].slice(0, 10)
    })
  }

  const toggleFavorite = (voiceId: string) => {
    setFavoriteVoices(prev => {
      if (prev.includes(voiceId)) {
        return prev.filter(id => id !== voiceId)
      }
      return [...prev, voiceId]
    })
  }

  const playVoiceSample = async (voice: typeof VOICE_OPTIONS[0]) => {
    if (playingVoice === voice.id) {
      setPlayingVoice(null)
      return
    }

    setIsLoading(true)
    setPlayingVoice(voice.id)

    try {
      const response = await createSyncVoice({
        model: 'speech-2.6-hd',
        text: SAMPLE_TEXT,
        voice_setting: {
          voice_id: voice.id,
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
          emotion: 'auto',
        },
        audio_setting: {
          sample_rate: 24000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
      })

      const hexData = response.data
      const byteArray = new Uint8Array(hexData.length / 2)
      for (let i = 0; i < hexData.length; i += 2) {
        byteArray[i / 2] = parseInt(hexData.substring(i, i + 2), 16)
      }
      const blob = new Blob([byteArray], { type: 'audio/mp3' })
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)

      addToRecent(voice.id)

      const audio = new Audio(url)
      audio.onended = () => {
        setPlayingVoice(null)
      }
      audio.play()
    } catch {
      setPlayingVoice(null)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredVoices = VOICE_OPTIONS.filter(voice => {
    const matchesSearch = voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         voice.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGender = genderFilter === 'all' || voice.gender === genderFilter
    return matchesSearch && matchesGender
  })

  const VoiceCard = ({ voice }: { voice: typeof VOICE_OPTIONS[0] }) => {
    const isPlaying = playingVoice === voice.id
    const isFavorite = favoriteVoices.includes(voice.id)

    return (
      <Card className="group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                voice.gender === 'male' ? genderTokens.male.bg : genderTokens.female.bg,
                voice.gender === 'male' ? genderTokens.male.text : genderTokens.female.text
              )}>
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium">{voice.name}</h3>
                <p className="text-xs text-muted-foreground/70">{voice.id}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {voice.gender === 'male' ? '男声' : '女声'}
            </Badge>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button
              variant={isPlaying ? 'default' : 'outline'}
              size="sm"
              className="flex-1 h-8"
              onClick={() => playVoiceSample(voice)}
              disabled={isLoading && playingVoice !== voice.id}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  停止
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  试听
                </>
              )}
            </Button>
            <Button
              variant={isFavorite ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFavorite(voice.id)}
              className="h-8"
            >
              <Star className={cn('w-4 h-4', isFavorite && 'fill-current')} />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const recentVoiceData = recentVoices
    .map(id => VOICE_OPTIONS.find(v => v.id === id))
    .filter(Boolean) as typeof VOICE_OPTIONS

  const favoriteVoiceData = favoriteVoices
    .map(id => VOICE_OPTIONS.find(v => v.id === id))
    .filter(Boolean) as typeof VOICE_OPTIONS

  const maleCount = VOICE_OPTIONS.filter(v => v.gender === 'male').length
  const femaleCount = VOICE_OPTIONS.filter(v => v.gender === 'female').length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<User className="w-5 h-5" />}
        title={t('voiceManagement.title', '音色管理')}
        description={t('voiceManagement.subtitle', '浏览系统音色、试听和收藏喜爱的声音')}
        gradient="green-emerald"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="系统音色"
          value={VOICE_OPTIONS.length}
          icon={Sparkles}
          color={services.image.icon}
        />
        <StatCard
          title="男声"
          value={maleCount}
          icon={User}
          color="text-primary"
        />
        <StatCard
          title="女声"
          value={femaleCount}
          icon={User}
          color="text-secondary-foreground"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">系统音色</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索音色..."
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center bg-muted/50 rounded-lg p-1">
                  <button
                    onClick={() => setGenderFilter('all')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                      genderFilter === 'all'
                        ? 'bg-primary text-foreground'
                        : 'text-muted-foreground/70 hover:text-foreground/80'
                    )}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setGenderFilter('male')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                      genderFilter === 'male'
                        ? 'bg-primary text-foreground'
                        : 'text-muted-foreground/70 hover:text-foreground/80'
                    )}
                  >
                    男声
                  </button>
                  <button
                    onClick={() => setGenderFilter('female')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                      genderFilter === 'female'
                        ? 'bg-primary text-foreground'
                        : 'text-muted-foreground/70 hover:text-foreground/80'
                    )}
                  >
                    女声
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredVoices.map(voice => (
                  <VoiceCard key={voice.id} voice={voice} />
                ))}
              </div>

              {filteredVoices.length === 0 && (
                <div className="text-center py-8 text-muted-foreground/70">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>没有找到匹配的音色</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Tabs defaultValue="recent">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recent">
                <Clock className="w-4 h-4 mr-2" />
                最近使用
              </TabsTrigger>
              <TabsTrigger value="favorites">
                <Star className="w-4 h-4 mr-2" />
                收藏
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recent" className="space-y-4 mt-4">
              {recentVoiceData.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground/70">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无最近使用的音色</p>
                    <p className="text-sm mt-2">试听音色后将显示在这里</p>
                  </CardContent>
                </Card>
              ) : (
                recentVoiceData.map(voice => (
                  <VoiceCard key={voice.id} voice={voice} />
                ))
              )}
            </TabsContent>

            <TabsContent value="favorites" className="space-y-4 mt-4">
              {favoriteVoiceData.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground/70">
                    <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无收藏的音色</p>
                    <p className="text-sm mt-2">点击星标收藏喜爱的音色</p>
                  </CardContent>
                </Card>
              ) : (
                favoriteVoiceData.map(voice => (
                  <VoiceCard key={voice.id} voice={voice} />
                ))
              )}
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">使用统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground/70">最近使用</span>
                  <Badge variant="outline">{recentVoices.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground/70">收藏数量</span>
                  <Badge variant="outline">{favoriteVoices.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  icon: typeof Sparkles
  color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-muted/50', color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/70">{title}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}