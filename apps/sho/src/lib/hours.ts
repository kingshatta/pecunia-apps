/**
 * Sho building hours: locked overnight from 11:30 PM until 7:00 AM.
 * Uses device local time — phones at camp are on camp time.
 */
export const OPEN_MINUTE_OF_DAY = 7 * 60 // 7:00 AM
export const LOCK_MINUTE_OF_DAY = 23 * 60 + 30 // 11:30 PM
export const OPEN_LABEL = '7:00 AM'
export const LOCK_LABEL = '11:30 PM'

function minuteOfDay(now: number): number {
  const d = new Date(now)
  return d.getHours() * 60 + d.getMinutes()
}

export function isShoLocked(now: number): boolean {
  const m = minuteOfDay(now)
  return m >= LOCK_MINUTE_OF_DAY || m < OPEN_MINUTE_OF_DAY
}

/** Whole minutes until tonight's lock-up; Infinity while already locked. */
export function minutesUntilLock(now: number): number {
  if (isShoLocked(now)) return Infinity
  return LOCK_MINUTE_OF_DAY - minuteOfDay(now)
}
