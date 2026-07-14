import type { CampEvent, EventSide, Load, LocationId, Machine } from '../lib/types'

export interface NewEventInput {
  title: string
  description: string
  place: string
  side: EventSide
  startsAt: string // ISO
  creatorName: string
  creatorDeviceId: string
}

/**
 * Every backend the Sho app talks to implements this. LocalDemoAdapter runs
 * the whole app offline; SupabaseAdapter is the live multi-user backend.
 */
export interface DataAdapter {
  readonly label: string

  getMachines(location: LocationId): Promise<Machine[]>

  /**
   * True if someone ELSE (any device but exceptDeviceId) currently has a
   * running load under this name — so we can keep names unambiguous while
   * machines are in use. Case-insensitive, whitespace-trimmed.
   */
  isNameTaken(name: string, exceptDeviceId: string): Promise<boolean>

  /** Uncollected loads (status "running", which includes derived "done"). */
  getActiveLoads(location: LocationId): Promise<Load[]>

  /** This device's loads, newest first, including collected/displaced ones. */
  getMyLoads(deviceId: string, limit?: number): Promise<Load[]>

  /**
   * Start a load. If the machine holds an uncollected load from someone
   * else, that load is marked displaced (and its owner notified).
   */
  startLoad(args: {
    machineId: string
    minutes: number
    ownerName: string
    deviceId: string
  }): Promise<Load>

  /** Owner takes their laundry out (also allowed early, while running). */
  collectLoad(loadId: string, deviceId: string): Promise<void>

  /** Owner corrects the remaining minutes on their running load. */
  adjustLoad(loadId: string, deviceId: string, minutes: number): Promise<void>

  getEvents(): Promise<CampEvent[]>
  createEvent(input: NewEventInput): Promise<CampEvent>
  deleteEvent(eventId: string, deviceId: string): Promise<void>
  reportEvent(eventId: string): Promise<void>

  /** Fires cb whenever machine/load/event data may have changed. */
  subscribe(cb: () => void): () => void

  /** Store a Web Push subscription (no-op in demo mode). */
  savePushSubscription(args: {
    deviceId: string
    subscription: unknown
    side: LocationId
    ownerName: string
  }): Promise<void>

  /** Ask the backend to notify everyone about a new event (no-op in demo). */
  notifyEvent(eventId: string): Promise<void>
}
