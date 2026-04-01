/**
 * Convert an array of objects to CSV string
 * @param data Array of objects to convert
 * @param headers Optional explicit header order (defaults to Object.keys of first item)
 * @param formatters Optional field-specific formatters
 */
export function toCSV(
  data: Record<string, unknown>[],
  options?: {
    headers?: string[]
    formatters?: Record<string, (value: unknown) => string>
  }
): string {
  if (data.length === 0) {
    return options?.headers ? options.headers.join(',') + '\n' : ''
  }

  const headers = options?.headers ?? Object.keys(data[0])
  const formatters = options?.formatters ?? {}

  const csvRows = [headers.join(',')]

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]
      if (value === null || value === undefined) return ''

      // Use custom formatter if provided
      if (formatters[header]) {
        return formatters[header](value)
      }

      // Default formatting
      const stringValue = typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)

      // Escape CSV special characters
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

/**
 * Standard CSV headers for execution logs export
 */
export const EXECUTION_LOG_HEADERS = [
  'id',
  'job_id',
  'trigger_type',
  'status',
  'started_at',
  'completed_at',
  'duration_ms',
  'tasks_executed',
  'tasks_succeeded',
  'tasks_failed',
  'error_summary',
]

/**
 * Standard CSV headers for media records export
 */
export const MEDIA_RECORD_HEADERS = [
  'id',
  'filename',
  'original_name',
  'filepath',
  'type',
  'mime_type',
  'size_bytes',
  'source',
  'task_id',
  'metadata',
  'created_at',
  'updated_at',
]