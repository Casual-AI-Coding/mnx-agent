/**
 * Export utilities for CSV and JSON file downloads
 */

/**
 * Flattens a nested object into a single-level object with dot-notation keys
 */
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (value === null || value === undefined) {
      result[newKey] = ''
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey))
    } else {
      result[newKey] = value
    }
  }

  return result
}

/**
 * Escapes a CSV cell value - wraps in quotes if contains comma, newline, or quote
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Converts an array of objects to CSV string
 */
function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''

  // Flatten all objects to get all possible keys
  const flattened = data.map(item => flattenObject(item))
  const allKeys = new Set<string>()
  flattened.forEach(item => {
    Object.keys(item).forEach(key => allKeys.add(key))
  })
  const headers = Array.from(allKeys)

  // Build CSV string
  const headerRow = headers.map(escapeCSV).join(',')
  const dataRows = flattened.map(item =>
    headers.map(header => escapeCSV(item[header])).join(',')
  )

  return [headerRow, ...dataRows].join('\r\n')
}

/**
 * Triggers a file download in the browser
 */
function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exports an array of objects to a CSV file and triggers download
 */
export function exportToCSV(data: object[], filename: string): void {
  const csv = toCSV(data as Record<string, unknown>[])
  const timestamp = new Date().toISOString().slice(0, 10)
  triggerDownload(csv, `${filename}_${timestamp}.csv`, 'text/csv;charset=utf-8')
}

/**
 * Exports data to a formatted JSON file and triggers download
 */
export function exportToJSON(data: object, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const timestamp = new Date().toISOString().slice(0, 10)
  triggerDownload(json, `${filename}_${timestamp}.json`, 'application/json')
}