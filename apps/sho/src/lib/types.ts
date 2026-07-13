export type LocationId = 'pines' | 'timbers'
export type MachineKind = 'washer' | 'dryer'

export interface ShoLocation {
  id: LocationId
  name: string
}

export const LOCATIONS: ShoLocation[] = [
  { id: 'pines', name: 'Pines Sho' },
  { id: 'timbers', name: 'Timbers Sho' },
]

export interface Machine {
  id: string // e.g. "pines-washer-1"
  location: LocationId
  kind: MachineKind
  number: number // the physical label on the machine
}

/**
 * Stored statuses. "done" is DERIVED: a load is done when status is
 * still "running" but now >= endsAt (nobody has pressed anything yet).
 */
export type LoadStatus = 'running' | 'collected' | 'displaced'
export type DerivedLoadStatus = LoadStatus | 'done'

export interface Load {
  id: string
  machineId: string
  location: LocationId
  ownerName: string
  deviceId: string
  startedAt: string // ISO
  endsAt: string // ISO
  status: LoadStatus
  collectedAt?: string | null
  displacedAt?: string | null
  displacedByName?: string | null
}

export type EventSide = LocationId | 'both'

export interface CampEvent {
  id: string
  title: string
  description: string
  place: string
  side: EventSide
  startsAt: string // ISO
  creatorName: string
  creatorDeviceId: string
  createdAt: string
  reports: number
}

/** Minutes after a load finishes before it counts as "overdue". */
export const GRACE_MINUTES = 10

export const MINUTE_PRESETS: Record<MachineKind, number[]> = {
  washer: [25, 30, 35, 45],
  dryer: [40, 50, 60, 75],
}

export function derivedStatus(load: Load, now: number): DerivedLoadStatus {
  if (load.status === 'running' && now >= Date.parse(load.endsAt)) return 'done'
  return load.status
}

export function isActive(load: Load): boolean {
  return load.status === 'running'
}
