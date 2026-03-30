import { useState, useMemo } from 'react'
import { BarChart3, Coins, Trash2, TrendingUp, Calendar, MessageSquare, Mic, Image, Music, Video, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useUsageStore } from '@/stores/usage'

interface UsageBarProps {
  label: string
  value: number
  max: number
  color: string
  icon: React.ReactNode
}

function UsageBar({ label, value, max, color, icon }: UsageBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm text-muted-foreground">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}

export default function TokenMonitor() {
  const { usage, history, setManualBalance, resetUsage } = useUsageStore()
  const [manualInput, setManualInput] = useState('')
  const [showBalanceInput, setShowBalanceInput] = useState(false)

  const totalRequests = usage.textTokens + usage.voiceCharacters + usage.imageRequests + usage.musicRequests + usage.videoRequests

  const maxValue = useMemo(() => {
    const allValues = [
      ...history.map(h => h.textTokens),
      ...history.map(h => h.voiceCharacters),
      ...history.map(h => h.imageRequests),
      ...history.map(h => h.musicRequests),
      ...history.map(h => h.videoRequests),
      usage.textTokens,
      usage.voiceCharacters,
      usage.imageRequests,
      usage.musicRequests,
      usage.videoRequests,
    ]
    return Math.max(...allValues, 1)
  }, [history, usage])

  const handleSetBalance = () => {
    const balance = parseFloat(manualInput)
    if (!isNaN(balance) && balance >= 0) {
      setManualBalance(balance)
      setManualInput('')
      setShowBalanceInput(false)
    }
  }

  const handleClearHistory = () => {
    if (confirm('确定要清空所有用量历史吗？此操作不可撤销。')) {
      resetUsage()
    }
  }

  const chartData = useMemo(() => {
    const last7Days = history.slice(0, 7).reverse()
    if (last7Days.length === 0) return []
    return last7Days.map(h => ({
      date: h.date,
      textTokens: h.textTokens,
      voiceCharacters: h.voiceCharacters,
      imageRequests: h.imageRequests,
      musicRequests: h.musicRequests,
      videoRequests: h.videoRequests,
    }))
  }, [history])

  const maxChartValue = useMemo(() => {
    if (chartData.length === 0) return 1
    const allValues = chartData.flatMap(d => [
      d.textTokens,
      d.voiceCharacters,
      d.imageRequests,
      d.musicRequests,
      d.videoRequests,
    ])
    return Math.max(...allValues, 1)
  }, [chartData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">用量监控</h1>
          <p className="text-muted-foreground text-sm">
            实时监控 MiniMax API 使用量
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowBalanceInput(!showBalanceInput)}>
            <DollarSign className="w-4 h-4 mr-2" />
            {usage.manualBalance !== undefined ? '修改余额' : '设置余额'}
          </Button>
          <Button variant="outline" onClick={handleClearHistory}>
            <Trash2 className="w-4 h-4 mr-2" />
            清空历史
          </Button>
        </div>
      </div>

      {showBalanceInput && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">余额:</span>
              <Input
                type="number"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="输入余额"
                className="w-48"
              />
              <Button onClick={handleSetBalance}>保存</Button>
              <Button variant="ghost" onClick={() => setShowBalanceInput(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">文本 Token</p>
                <p className="text-2xl font-bold">{usage.textTokens.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">语音字符</p>
                <p className="text-2xl font-bold">{usage.voiceCharacters.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">图片请求</p>
                <p className="text-2xl font-bold">{usage.imageRequests.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <Image className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总请求数</p>
                <p className="text-2xl font-bold">{totalRequests.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {usage.manualBalance !== undefined && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">账户余额</p>
                <p className="text-3xl font-bold">¥{usage.manualBalance.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <Coins className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              用量分布
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <UsageBar
              label="文本 Token"
              value={usage.textTokens}
              max={maxValue}
              color="bg-blue-500"
              icon={<MessageSquare className="w-4 h-4 text-blue-500" />}
            />
            <UsageBar
              label="语音字符"
              value={usage.voiceCharacters}
              max={maxValue}
              color="bg-green-500"
              icon={<Mic className="w-4 h-4 text-green-500" />}
            />
            <UsageBar
              label="图片请求"
              value={usage.imageRequests}
              max={maxValue}
              color="bg-purple-500"
              icon={<Image className="w-4 h-4 text-purple-500" />}
            />
            <UsageBar
              label="音乐请求"
              value={usage.musicRequests}
              max={maxValue}
              color="bg-pink-500"
              icon={<Music className="w-4 h-4 text-pink-500" />}
            />
            <UsageBar
              label="视频请求"
              value={usage.videoRequests}
              max={maxValue}
              color="bg-orange-500"
              icon={<Video className="w-4 h-4 text-orange-500" />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              近7天用量
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无历史数据</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chartData.map((day) => {
                  const total = day.textTokens + day.voiceCharacters + day.imageRequests + day.musicRequests + day.videoRequests
                  return (
                    <div key={day.date} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{day.date}</span>
                        <span className="text-muted-foreground">{total.toLocaleString()} 请求</span>
                      </div>
                      <div className="h-8 flex rounded-md overflow-hidden">
                        {day.textTokens > 0 && (
                          <div
                            className="bg-blue-500"
                            style={{ width: `${(day.textTokens / maxChartValue) * 100}%` }}
                            title={`文本: ${day.textTokens}`}
                          />
                        )}
                        {day.voiceCharacters > 0 && (
                          <div
                            className="bg-green-500"
                            style={{ width: `${(day.voiceCharacters / maxChartValue) * 100}%` }}
                            title={`语音: ${day.voiceCharacters}`}
                          />
                        )}
                        {day.imageRequests > 0 && (
                          <div
                            className="bg-purple-500"
                            style={{ width: `${(day.imageRequests / maxChartValue) * 100}%` }}
                            title={`图片: ${day.imageRequests}`}
                          />
                        )}
                        {day.musicRequests > 0 && (
                          <div
                            className="bg-pink-500"
                            style={{ width: `${(day.musicRequests / maxChartValue) * 100}%` }}
                            title={`音乐: ${day.musicRequests}`}
                          />
                        )}
                        {day.videoRequests > 0 && (
                          <div
                            className="bg-orange-500"
                            style={{ width: `${(day.videoRequests / maxChartValue) * 100}%` }}
                            title={`视频: ${day.videoRequests}`}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}

                <div className="flex items-center gap-4 pt-4 border-t text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded" />
                    <span>文本</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span>语音</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-purple-500 rounded" />
                    <span>图片</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-pink-500 rounded" />
                    <span>音乐</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-500 rounded" />
                    <span>视频</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• 用量数据会自动记录到本地存储</li>
            <li>• 可以手动设置账户余额以估算消耗</li>
            <li>• 清空历史将删除所有本地记录的用量数据</li>
            <li>• 实际 API 用量可能因网络等因素略有差异</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
