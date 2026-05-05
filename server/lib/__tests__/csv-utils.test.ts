import { describe, it, expect } from 'vitest'
import { toCSV, EXECUTION_LOG_HEADERS, MEDIA_RECORD_HEADERS } from '../csv-utils.js'

describe('toCSV', () => {
  it('returns empty string for empty data without headers', () => {
    expect(toCSV([])).toBe('')
  })

  it('returns header-only CSV for empty data with explicit headers', () => {
    expect(toCSV([], { headers: ['id', 'name'] })).toBe('id,name\n')
  })

  it('converts flat objects to CSV with default headers', () => {
    const data = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]
    expect(toCSV(data)).toBe('id,name\n1,Alice\n2,Bob')
  })

  it('uses explicit header order when provided', () => {
    const data = [
      { id: 1, name: 'Alice', email: 'a@test.com' },
    ]
    expect(toCSV(data, { headers: ['name', 'email'] })).toBe(
      'name,email\nAlice,a@test.com'
    )
  })

  it('handles null and undefined values as empty string', () => {
    const data = [{ a: null, b: undefined, c: 'value' }]
    expect(toCSV(data)).toBe('a,b,c\n,,value')
  })

  it('applies custom formatters', () => {
    const data = [{ id: 1, status: 'active' }]
    const result = toCSV(data, {
      formatters: {
        status: (v) => String(v).toUpperCase(),
      },
    })
    expect(result).toBe('id,status\n1,ACTIVE')
  })

  it('escapes commas by quoting the field', () => {
    const data = [{ name: 'Smith, John' }]
    expect(toCSV(data)).toBe('name\n"Smith, John"')
  })

  it('escapes double quotes by doubling them', () => {
    const data = [{ quote: 'He said "hello"' }]
    expect(toCSV(data)).toBe('quote\n"He said ""hello"""')
  })

  it('escapes newlines by quoting the field', () => {
    const data = [{ text: 'line1\nline2' }]
    expect(toCSV(data)).toBe('text\n"line1\nline2"')
  })

  it('JSON-stringifies object values with proper quote escaping', () => {
    const data = [{ config: { key: 'value' } }]
    const result = toCSV(data)
    expect(result).toBe(`config
"{""key"":""value""}"`)
  })

  it('handles multiple rows with mixed values', () => {
    const data = [
      { id: 1, name: 'Alice', note: null },
      { id: 2, name: 'Bob, Jr.', note: 'MVP' },
    ]
    expect(toCSV(data)).toBe(
      'id,name,note\n1,Alice,\n2,"Bob, Jr.",MVP'
    )
  })
})

describe('export headers', () => {
  it('EXECUTION_LOG_HEADERS has expected fields', () => {
    expect(EXECUTION_LOG_HEADERS).toContain('id')
    expect(EXECUTION_LOG_HEADERS).toContain('status')
    expect(EXECUTION_LOG_HEADERS).toContain('duration_ms')
  })

  it('MEDIA_RECORD_HEADERS has expected fields', () => {
    expect(MEDIA_RECORD_HEADERS).toContain('id')
    expect(MEDIA_RECORD_HEADERS).toContain('filename')
    expect(MEDIA_RECORD_HEADERS).toContain('size_bytes')
  })
})
