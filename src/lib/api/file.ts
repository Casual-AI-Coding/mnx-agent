import { getBaseUrl, getHeaders, getApiMode } from './config'

interface FileItem {
  file_id: string
  file_name: string
  file_size: number
  created_at: string
  purpose?: string
}

interface FileListResponse {
  files: FileItem[]
  total?: number
}

interface FileUploadResponse {
  file_id: string
  file_name: string
  file_size: number
  created_at: string
}

export async function listFiles(purpose?: string): Promise<FileListResponse> {
  const apiMode = getApiMode()
  
  let endpoint: string
  let url: string
  
  if (apiMode === 'proxy') {
    endpoint = '/files/list'
    url = `${getBaseUrl()}${endpoint}`
  } else {
    endpoint = '/v1/files/list'
    const params = new URLSearchParams()
    if (purpose) params.append('purpose', purpose)
    url = `${getBaseUrl()}${endpoint}${params.toString() ? '?' + params.toString() : ''}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || error.error || 'Failed to list files')
  }

  const result = await response.json()
  
  if (apiMode === 'proxy' && result.success && result.data) {
    return result.data
  }
  
  return result
}

export async function uploadFile(file: File): Promise<FileUploadResponse> {
  const apiMode = getApiMode()
  const endpoint = apiMode === 'proxy' ? '/files/upload' : '/v1/files'
  
  const formData = new FormData()
  formData.append('file', file)

  const headers = getHeaders()
  const headersRecord: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (key !== 'Content-Type') {
      headersRecord[key] = value as string
    }
  }

  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers: headersRecord,
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || error.error || 'Failed to upload file')
  }

  const result = await response.json()
  
  if (apiMode === 'proxy' && result.success && result.data) {
    return result.data
  }
  
  return result
}

export async function deleteFile(fileId: string): Promise<void> {
  const apiMode = getApiMode()
  const endpoint = apiMode === 'proxy' ? `/files/delete?file_id=${fileId}` : `/v1/files/${fileId}`
  
  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || error.error || 'Failed to delete file')
  }
}

export async function retrieveFile(fileId: string): Promise<FileItem> {
  const apiMode = getApiMode()
  const endpoint = apiMode === 'proxy' ? `/files/retrieve?file_id=${fileId}` : `/v1/files/${fileId}`
  
  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || error.error || 'Failed to retrieve file')
  }

  return response.json()
}

export async function downloadFile(fileId: string): Promise<Blob> {
  const apiMode = getApiMode()
  const endpoint = apiMode === 'proxy' ? `/files/retrieve?file_id=${fileId}` : `/v1/files/${fileId}/content`
  
  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || error.error || 'Failed to download file')
  }

  return response.blob()
}