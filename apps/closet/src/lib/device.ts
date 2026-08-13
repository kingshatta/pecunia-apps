const KEY_ID = 'closet_device_id'

/** Stable per-device id. In demo mode this doubles as the user id. */
export function deviceId(): string {
  let id = localStorage.getItem(KEY_ID)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY_ID, id)
  }
  return id
}
