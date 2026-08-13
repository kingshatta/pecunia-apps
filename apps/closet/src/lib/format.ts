const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

/** "just now", "12m ago", "3h ago", "yesterday", "6 Aug". */
export function ago(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime()
  const d = now - t
  if (d < MIN) return 'just now'
  if (d < HOUR) return `${Math.floor(d / MIN)}m ago`
  if (d < DAY) return `${Math.floor(d / HOUR)}h ago`
  if (d < DAY * 2) return 'yesterday'
  if (d < DAY * 7) return `${Math.floor(d / DAY)} days ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** "never worn" / "worn 3 days ago" — the line under every item. */
export function wornLabel(lastWornAt: string | null, wearCount: number): string {
  if (!lastWornAt || wearCount === 0) return 'never worn'
  return `worn ${ago(lastWornAt)}`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Six characters, no vowels or lookalikes, so codes can be read aloud. */
export function makeInviteCode(): string {
  const alphabet = '23456789BCDFGHJKMNPQRSTVWXYZ'
  let out = ''
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}
