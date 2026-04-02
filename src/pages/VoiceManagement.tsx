import { useState, useEffect } from 'react'
import { User, Clock, Play, Pause, Search, History, Star, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { VOICE_OPTIONS, type SpeechModel, type Emotion } from '@/types'
import { createSyncVoice } from '@/lib/api/voice'

const RECENT_VOICES_KEY = 'minimax-recent-voices'
const FAVORITE_VOICES_KEY = 'minimax-favorite-voices'

const SAMPLE_TEXT = '你好，我是 MiniMax 语音助手，很高兴为你服务。'

export default function VoiceManagement() {
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
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                voice.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
              }`}>
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium">{voice.name}</h3>
                <p className="text-xs text-muted-foreground">{voice.id}</p>
              </div>
            </div>
            <Badge variant="outline">
              {voice.gender === 'male' ? '男声' : '女声'}
            </Badge>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button
              variant={isPlaying ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
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
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">音色管理</h1>
          <p className="text-muted-foreground text-sm">
            浏览系统音色、试听和收藏喜爱的声音
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                系统音色
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索音色..."
                    className="pl-10"
                  />
                </div>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as typeof genderFilter)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">全部</option>
                  <option value="male">男声</option>
                  <option value="female">女声</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredVoices.map(voice => (
                  <VoiceCard key={voice.id} voice={voice} />
                ))}
              </div>

              {filteredVoices.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
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

            <TabsContent value="recent" className="space-y-4">
              {recentVoiceData.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无最近使用的音色</p>
                    <p className="text-sm">试听音色后将显示在这里</p>
                  </CardContent>
                </Card>
              ) : (
                recentVoiceData.map(voice => (
                  <VoiceCard key={voice.id} voice={voice} />
                ))
              )}
            </TabsContent>

            <TabsContent value="favorites" className="space-y-4">
              {favoriteVoiceData.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无收藏的音色</p>
                    <p className="text-sm">点击星标收藏喜爱的音色</p>
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
              <CardTitle>音色统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">系统音色总数</span>
                  <Badge>{VOICE_OPTIONS.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">男声</span>
                  <Badge variant="secondary">
                    {VOICE_OPTIONS.filter(v => v.gender === 'male').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">女声</span>
                  <Badge variant="secondary">
                    {VOICE_OPTIONS.filter(v => v.gender === 'female').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">最近使用</span>
                  <Badge variant="outline">{recentVoices.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">收藏</span>
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
