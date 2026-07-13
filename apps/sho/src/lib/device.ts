import type { LocationId } from './types'

const DEVICE_KEY = 'sho_device_id'
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
