import { toast } from 'sonner'

export function toastSuccess(message: string, description?: string) {
  toast.success(message, {
    description,
  })
}

export function toastError(message: string, description?: string) {
  toast.error(message, {
    description,
  })
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
