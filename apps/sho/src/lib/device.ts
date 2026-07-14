import type { LocationId } from './types'

const DEVICE_KEY = 'sho_device_id'
const SECRET_KEY = 'sho_device_secret'
const NAME_KEY = 'sho_name'
const SIDE_KEY = 'sho_side'

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

/**
 * Private capability token for this device. Sent ONLY as an RPC argument to
 * prove ownership of a load/event — never rendered and never stored in a
 * readable table column (the backend keeps only its salted hash). This is
 * what stops someone from acting on another person's load using a device_id
 * they scraped from the public board.
 */
export function getDeviceSecret(): string {
  let s = localStorage.getItem(SECRET_KEY)
  if (!s) {
    s = crypto.randomUUID() + crypto.randomUUID()
    localStorage.setItem(SECRET_KEY, s)
  }
  return s
}

export function getName(): string {
  return localStorage.getItem(NAME_KEY) ?? ''
}

export function setName(name: string) {
  localStorage.setItem(NAME_KEY, name.trim())
}

export function getSide(): LocationId | null {
  const s = localStorage.getItem(SIDE_KEY)
  return s === 'pines' || s === 'timbers' ? s : null
}

export function setSide(side: LocationId) {
  localStorage.setItem(SIDE_KEY, side)
}
