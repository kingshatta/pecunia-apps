import type { DataAdapter, NewEventInput } from './DataAdapter'
import type { CampEvent, Load, LocationId, Machine, MachineKind } from '../lib/types'

const STATE_KEY = 'sho_demo_state'

/** Per-sho machine counts — mirror of supabase/schema.sql seeds. */
const MACHINE_COUNTS: Record<LocationId, Record<MachineKind, number>> = {
  pines: { washer: 6, dryer: 6 },
  timbers: { washer: 2, dryer: 2 },
}

interface DemoState {
  seededAt: string
  loads: Load[]
  events: CampEvent[]
}

function machineList(location: LocationId): Machine[] {
  const out: Machine[] = []
  for (const kind of ['washer', 'dryer'] as MachineKind[]) {
    for (let n = 1; n <= MACHINE_COUNTS[location][kind]; n++) {
      out.push({ id: `${location}-${kind}-${n}`, location, kind, number: n })
    }
  }
  return out
}

function iso(offsetMinutes: number): string {
  return new Date(Date.now() + offsetMinutes * 60000).toISOString()
}

function seedState(): DemoState {
  const demoLoad = (
    machineId: string,
    location: LocationId,
    ownerName: string,
    startedMin: number,
    endsMin: number,
  ): Load => ({
    id: crypto.randomUUID(),
    machineId,
    location,
    ownerName,
    deviceId: `demo-${ownerName.toLowerCase()}`,
    startedAt: iso(startedMin),
    endsAt: iso(endsMin),
    status: 'running',
  })
  return {
    seededAt: new Date().toISOString(),
    loads: [
      // Pines: one washer mid-cycle, one washer long-done (overdue), one dryer running
      demoLoad('pines-washer-2', 'pines', 'Maddie', -18, 14),
      demoLoad('pines-washer-3', 'pines', 'Jake', -55, -22),
      demoLoad('pines-washer-5', 'pines', 'Noah', -8, 24),
      demoLoad('pines-dryer-1', 'pines', 'Carlos', -20, 35),
      // Timbers (2 washers + 2 dryers): a washer about to finish, a dryer just done
      demoLoad('timbers-washer-1', 'timbers', 'Priya', -28, 3),
      demoLoad('timbers-dryer-2', 'timbers', 'Sam', -62, -4),
    ],
    events: [
      {
        id: crypto.randomUUID(),
        title: 'Movie night: The Sandlot',
        description: 'Bring a blanket! Popcorn provided.',
        place: 'Timbers Sho porch',
        side: 'timbers',
        startsAt: iso(60 * 5),
        creatorName: 'Sam',
        creatorDeviceId: 'demo-sam',
        createdAt: iso(-120),
        reports: 0,
      },
    ],
  }
}

export class LocalDemoAdapter implements DataAdapter {
  readonly label = 'Demo mode'
  private listeners = new Set<() => void>()

  constructor() {
    // Cross-tab sync (also how the Playwright two-user test works).
    window.addEventListener('storage', (e) => {
      if (e.key === STATE_KEY) this.emit()
    })
  }

  private load(): DemoState {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) {
      try {
        return JSON.parse(raw) as DemoState
      } catch {
        /* reseed below */
      }
    }
    const state = seedState()
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
    return state
  }

  private save(state: DemoState) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
    this.emit()
  }

  private emit() {
    for (const cb of this.listeners) cb()
  }

  async getMachines(location: LocationId): Promise<Machine[]> {
    return machineList(location)
  }

  async getActiveLoads(location: LocationId): Promise<Load[]> {
    return this.load().loads.filter((l) => l.location === location && l.status === 'running')
  }

  async getMyLoads(deviceId: string, limit = 10): Promise<Load[]> {
    return this.load()
      .loads.filter((l) => l.deviceId === deviceId)
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
      .slice(0, limit)
  }

  async startLoad(args: {
    machineId: string
    minutes: number
    ownerName: string
    deviceId: string
  }): Promise<Load> {
    const state = this.load()
    const machine = [...machineList('pines'), ...machineList('timbers')].find(
      (m) => m.id === args.machineId,
    )
    if (!machine) throw new Error('Unknown machine')
    const now = new Date().toISOString()
    for (const l of state.loads) {
      if (l.machineId === args.machineId && l.status === 'running') {
        l.status = 'displaced'
        l.displacedAt = now
        l.displacedByName = args.ownerName
      }
    }
    const load: Load = {
      id: crypto.randomUUID(),
      machineId: args.machineId,
      location: machine.location,
      ownerName: args.ownerName,
      deviceId: args.deviceId,
      startedAt: now,
      endsAt: new Date(Date.now() + args.minutes * 60000).toISOString(),
      status: 'running',
    }
    state.loads.push(load)
    this.save(state)
    return load
  }

  async collectLoad(loadId: string, deviceId: string): Promise<void> {
    const state = this.load()
    const l = state.loads.find((x) => x.id === loadId && x.deviceId === deviceId)
    if (l && l.status === 'running') {
      l.status = 'collected'
      l.collectedAt = new Date().toISOString()
      this.save(state)
    }
  }

  async adjustLoad(loadId: string, deviceId: string, minutes: number): Promise<void> {
    const state = this.load()
    const l = state.loads.find((x) => x.id === loadId && x.deviceId === deviceId)
    if (l && l.status === 'running') {
      l.endsAt = new Date(Date.now() + minutes * 60000).toISOString()
      this.save(state)
    }
  }

  async getEvents(): Promise<CampEvent[]> {
    const cutoff = Date.now() - 3 * 3600 * 1000 // keep events visible 3h after start
    return this.load()
      .events.filter((e) => Date.parse(e.startsAt) > cutoff && e.reports < 3)
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  }

  async createEvent(input: NewEventInput): Promise<CampEvent> {
    const state = this.load()
    const event: CampEvent = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
      reports: 0,
    }
    state.events.push(event)
    this.save(state)
    return event
  }

  async deleteEvent(eventId: string, deviceId: string): Promise<void> {
    const state = this.load()
    state.events = state.events.filter(
      (e) => !(e.id === eventId && e.creatorDeviceId === deviceId),
    )
    this.save(state)
  }

  async reportEvent(eventId: string): Promise<void> {
    const state = this.load()
    const e = state.events.find((x) => x.id === eventId)
    if (e) {
      e.reports += 1
      this.save(state)
    }
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  async savePushSubscription(): Promise<void> {
    // Demo mode: no server, so no push. In-app banners still work.
  }

  async notifyEvent(): Promise<void> {
    // Demo mode: the in-app banner covers it.
  }
}
