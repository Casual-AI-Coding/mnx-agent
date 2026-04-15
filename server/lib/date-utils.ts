/**
 * Convert Date to local ISO date string (without 'Z' suffix)
 * @param date - Optional Date object. If not provided, uses current time.
 * @returns Local time string in ISO format, e.g. "2026-04-15T17:00:00.000"
 */
export function toLocalISODateString(date?: Date): string {
  const d = date ?? new Date()
  const localTime = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return localTime.toISOString().slice(0, -1)
}