import { toast } from 'sonner'
import { useNotificationStore } from '@/stores/notification'

/**
 * Toast 包装层（R-016 Toast 治理）
 *
 * toastError 同时镜像进全局通知中心（source: 'api'），
 * 使页面上的 API 错误无需改造调用点即可聚合归档；
 * 即时提醒（Toast）与通知中心各司其职，不互相替代。
 */

export function toastSuccess(message: string, description?: string) {
  toast.success(message, {
    description,
  })
}

export function toastError(message: string, description?: string) {
  toast.error(message, {
    description,
  })

  // 镜像进通知中心（store 内部有去重窗口，高频同错误会合并计数）
  try {
    useNotificationStore.getState().addNotification({
      level: 'error',
      source: 'api',
      title: message,
      message: description,
      dedupKey: `api:${message}:${description ?? ''}`,
    })
  } catch {
    // 通知中心不可用时静默降级，不影响原有 toast 行为
  }
}

export function toastInfo(message: string, description?: string) {
  toast.info(message, {
    description,
  })
}

export function toastLoading<T>(
  message: string,
  promise: Promise<T>
): Promise<T> {
  const result = toast.promise(promise, {
    loading: message,
    success: (data) => (data as { message?: string })?.message || '操作成功',
    error: (err: Error) => err?.message || '操作失败',
  })
  return result.unwrap()
}
