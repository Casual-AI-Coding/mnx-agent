import { useEffect } from 'react'
import { toast } from 'sonner'
import { WifiOff } from 'lucide-react'

export function OfflineBanner(): null {
  useEffect(() => {
    let offlineToastId: string | number | null = null

    const handleOffline = () => {
      if (!offlineToastId) {
        offlineToastId = toast.error(
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>您已离线</span>
          </div>,
          {
            description: '网络连接已断开，部分功能可能不可用',
            duration: Infinity,
          }
        )
      }
    }

    const handleOnline = () => {
      if (offlineToastId) {
        toast.dismiss(offlineToastId)
        offlineToastId = null
      }
      toast.success('网络已恢复', {
        description: '您已重新连接到网络',
      })
    }

    if (!navigator.onLine) {
      handleOffline()
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      if (offlineToastId) {
        toast.dismiss(offlineToastId)
      }
    }
  }, [])

  return null
}

