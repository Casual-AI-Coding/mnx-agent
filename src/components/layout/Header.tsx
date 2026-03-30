import { Key, Globe } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '@/stores/app'

export default function Header() {
  const { apiKey, region, setApiKey, setRegion } = useAppStore()
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [tempKey, setTempKey] = useState(apiKey)

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">调试台</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Region Toggle */}
        <button
          onClick={() => setRegion(region === 'cn' ? 'intl' : 'cn')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-accent text-sm"
        >
          <Globe className="w-4 h-4" />
          <span>{region === 'cn' ? '🇨🇳 国内' : '🌍 国际'}</span>
        </button>

        {/* API Key */}
        <button
          onClick={() => setShowKeyModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-accent text-sm"
        >
          <Key className="w-4 h-4" />
          <span>{apiKey ? 'API Key 已配置' : '配置 API Key'}</span>
        </button>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-96 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">配置 API Key</h2>
            <input
              type="password"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="输入您的 MiniMax API Key"
              className="w-full px-3 py-2 border rounded-md mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-accent"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setApiKey(tempKey)
                  setShowKeyModal(false)
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}