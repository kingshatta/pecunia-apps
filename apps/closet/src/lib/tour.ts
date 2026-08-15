const KEY = 'closet_tour_seen'

/** Whether this browser has already been walked through the demo. */
export function tourSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function markTourSeen(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // Private mode or a sandboxed frame — the tour just runs again next time.
  }
}

export function clearTourSeen(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to do.
  }
}
