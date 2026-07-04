import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { toast } from 'sonner'
import { useSettingsStore } from '@/settings/store'
import { API_HOSTS } from '@/types'

interface UseVoiceAsyncUploadParams {
  readonly onUploaded: (fileId: string) => void
}

export function useVoiceAsyncUpload({ onUploaded }: UseVoiceAsyncUploadParams) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadRetryCount, setUploadRetryCount] = useState(0)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clearUploadError = () => {
    setUploadError(null)
    setPendingFile(null)
    setUploadRetryCount(0)
  }

  const resetUpload = () => {
    setUploadError(null)
    setPendingFile(null)
    setUploadRetryCount(0)
    setIsDragging(false)
  }

  const uploadFile = async (file: File) => {
    setUploadError(null)
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)

    try {
      const { settings } = useSettingsStore.getState()
      const response = await fetch(`${API_HOSTS[settings.api.region]}/v1/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.api.minimaxKey}` },
        body: formDataUpload,
      })

      if (!response.ok) {
        throw new Error('上传失败')
      }

      const data = await response.json()
      onUploaded(data.file_id)
      setPendingFile(null)
      setUploadRetryCount(0)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '文件上传失败')
      setPendingFile(file)
    }
  }

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isSupportedFile(file)) {
      toast.error('仅支持 .txt 和 .zip 文件')
      return
    }

    await uploadFile(file)
  }

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (!file) return

    if (!isSupportedFile(file)) {
      toast.error('仅支持 .txt 和 .zip 文件')
      return
    }

    await uploadFile(file)
  }

  const handleRetryUpload = () => {
    if (!pendingFile) return
    setUploadRetryCount(current => current + 1)
    void uploadFile(pendingFile)
  }

  return {
    clearUploadError,
    fileInputRef,
    handleDragLeave: () => setIsDragging(false),
    handleDragOver: (event: DragEvent) => {
      event.preventDefault()
      setIsDragging(true)
    },
    handleDrop,
    handleFileUpload,
    handleRetryUpload,
    isDragging,
    pendingFile,
    resetUpload,
    uploadError,
    uploadRetryCount,
  }
}

function isSupportedFile(file: File): boolean {
  return file.name.endsWith('.txt') || file.name.endsWith('.zip')
}
