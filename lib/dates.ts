// Calendar math on YYYY-MM-DD strings, always in UTC so results don't drift
// with the server's timezone.

const DAY = 86_400_000

export function toDay(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY)
}

export function fromDay(day: number): string {
  return new Date(day * DAY).toISOString().slice(0, 10)
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addDays(date: string, n: number): string {
  return fromDay(toDay(date) + n)
}

export function addMonths(date: string, n: number, anchorDay?: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const day = anchorDay ?? d
  const target = new Date(Date.UTC(y, m - 1 + n, 1))
  const lastOfMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastOfMonth))
  return isoDate(target)
}

export function daysBetween(a: string, b: string): number {
  return toDay(b) - toDay(a)
}

export function formatShortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function formatMonth(date: string): string {
  const [y, m] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}
