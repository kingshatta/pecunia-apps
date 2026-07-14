/** "45m" under an hour; "1h 12m" (or "2h") from 60 minutes up. */
export function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * Countdown for a future ISO timestamp: "12:34" (mm:ss) under an hour so the
 * final minutes feel live, "1h 12m" beyond that; "0:00" once past.
 */
export function countdown(endsAt: string, now: number): string {
  const ms = Math.max(0, Date.parse(endsAt) - now)
  const totalSec = Math.round(ms / 1000)
  if (totalSec >= 3600) return formatMinutes(Math.ceil(totalSec / 60))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function minutesLeft(endsAt: string, now: number): number {
  return Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 60000))
}

/** Whole minutes since an ISO timestamp. */
export function minutesSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(iso)) / 60000))
}

/** "Today 7:30 PM", "Tomorrow 2:00 PM", or "Sat, Jul 18 · 7:30 PM". */
export function formatEventTime(iso: string, now: number = Date.now()): string {
  const d = new Date(iso)
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const today = new Date(now)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(d, today)) return `Today ${time}`
  const tomorrow = new Date(now + 86400000)
  if (sameDay(d, tomorrow)) return `Tomorrow ${time}`
  const day = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  return `${day} · ${time}`
}

/** Local datetime-local input value for "in N minutes", used as a form default. */
export function datetimeLocalValue(fromNowMs: number): string {
  const d = new Date(Date.now() + fromNowMs)
  d.setSeconds(0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
