/**
 * Inviting someone by phone number.
 *
 * IMPORTANT BOUNDARY: this composes a text message on the device and hands it
 * to the phone's own Messages app. It does NOT upload a number, look anyone up
 * by number, or ask the backend whether a number has an account. A
 * number → account lookup would be an enumeration oracle — anyone could probe
 * numbers to discover who uses the app — which is exactly the class of feature
 * this app avoids. The number never leaves the device.
 */

const PARAM = 'invite'

/** The app's own URL with an invite code attached. */
export function inviteLink(code: string): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set(PARAM, code)
  return url.toString()
}

export function inviteMessage(fromName: string, code: string): string {
  return `${fromName} shared their closet with you on Closet. Open ${inviteLink(
    code,
  )} or add the code ${code}.`
}

/** Digits, and a leading + if they typed one. Good enough for an sms: link. */
export function normalizePhone(input: string): string {
  const trimmed = input.trim()
  const plus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  return plus ? `+${digits}` : digits
}

export function isPlausiblePhone(input: string): boolean {
  const digits = input.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}

/**
 * `sms:NUMBER?&body=TEXT` is the form both iOS and Android accept — iOS wants
 * `&body`, Android wants `?body`, and this shape satisfies both.
 */
export function smsHref(phone: string, body: string): string {
  const to = normalizePhone(phone)
  return `sms:${to}?&body=${encodeURIComponent(body)}`
}

export function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/** Native share sheet, when the device has one. Resolves false if it didn't send. */
export async function shareInvite(fromName: string, code: string): Promise<boolean> {
  if (!canShare()) return false
  try {
    await navigator.share({
      title: 'Closet',
      text: inviteMessage(fromName, code),
      url: inviteLink(code),
    })
    return true
  } catch {
    // The user dismissed the sheet, or the browser refused. Not an error.
    return false
  }
}

/** An invite code carried in the URL, if someone arrived by tapping a link. */
export function readInviteCode(): string | null {
  const code = new URLSearchParams(window.location.search).get(PARAM)
  if (!code) return null
  const clean = code.trim().toUpperCase()
  return /^[A-Z0-9]{6}$/.test(clean) ? clean : null
}

/** Drop the invite param once it's been used, so a refresh doesn't re-apply it. */
export function clearInviteCode(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(PARAM)) return
  url.searchParams.delete(PARAM)
  window.history.replaceState({}, '', url.toString())
}
