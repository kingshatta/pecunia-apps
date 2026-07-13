import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { DataAdapter, NewEventInput } from './DataAdapter'
import type { CampEvent, EventSide, Load, LoadStatus, LocationId, Machine, MachineKind } from '../lib/types'

// Name of the deployed Supabase Edge Function. Must match the function's name in
// the dashboard AND the cron URL in supabase/schema.sql.
const PUSH_FUNCTION = 'push'

interface LoadRow {
  id: string
  machine_id: string
  location: string
  owner_name: string
  device_id: string
  started_at: string
  ends_at: string
  status: string
  collected_at: string | null
  displaced_at: string | null
  displaced_by_name: string | null
}

interface EventRow {
  id: string
  title: string
  description: string
  place: string
  side: string
  starts_at: string
  creator_name: string
  creator_device_id: string
  created_at: string
  reports: number
}

function toLoad(r: LoadRow): Load {
  return {
    id: r.id,
    machineId: r.machine_id,
    location: r.location as LocationId,
    ownerName: r.owner_name,
    deviceId: r.device_id,
    startedAt: r.started_at,
    endsAt: r.ends_at,
    status: r.status as LoadStatus,
    collectedAt: r.collected_at,
    displacedAt: r.displaced_at,
    displacedByName: r.displaced_by_name,
  }
}

function toEvent(r: EventRow): CampEvent {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    place: r.place,
    side: r.side as EventSide,
    startsAt: r.starts_at,
    creatorName: r.creator_name,
    creatorDeviceId: r.creator_device_id,
    createdAt: r.created_at,
    reports: r.reports,
  }
}

export class SupabaseAdapter implements DataAdapter {
  readonly label = 'Live'
  private client: SupabaseClient

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey)
  }

  async getMachines(location: LocationId): Promise<Machine[]> {
    const { data, error } = await this.client
      .from('machines')
      .select('id, location, kind, number')
      .eq('location', location)
      .order('kind')
      .order('number')
    if (error) throw error
    return (data ?? []).map((m) => ({
      id: m.id as string,
      location: m.location as LocationId,
      kind: m.kind as MachineKind,
      number: m.number as number,
    }))
  }

  async getActiveLoads(location: LocationId): Promise<Load[]> {
    const { data, error } = await this.client
      .from('loads')
      .select('*')
      .eq('location', location)
      .eq('status', 'running')
    if (error) throw error
    return (data as LoadRow[]).map(toLoad)
  }

  async getMyLoads(deviceId: string, limit = 10): Promise<Load[]> {
    const { data, error } = await this.client
      .from('loads')
      .select('*')
      .eq('device_id', deviceId)
      .order('started_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data as LoadRow[]).map(toLoad)
  }

  async startLoad(args: {
    machineId: string
    minutes: number
    ownerName: string
    deviceId: string
  }): Promise<Load> {
    const { data, error } = await this.client.rpc('start_load', {
      p_machine_id: args.machineId,
      p_minutes: args.minutes,
      p_owner_name: args.ownerName,
      p_device_id: args.deviceId,
    })
    if (error) throw error
    return toLoad(data as LoadRow)
  }

  async collectLoad(loadId: string, deviceId: string): Promise<void> {
    const { error } = await this.client.rpc('collect_load', {
      p_load_id: loadId,
      p_device_id: deviceId,
    })
    if (error) throw error
  }

  async adjustLoad(loadId: string, deviceId: string, minutes: number): Promise<void> {
    const { error } = await this.client.rpc('adjust_load', {
      p_load_id: loadId,
      p_device_id: deviceId,
      p_minutes: minutes,
    })
    if (error) throw error
  }

  async getEvents(): Promise<CampEvent[]> {
    const cutoff = new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    const { data, error } = await this.client
      .from('events')
      .select('*')
      .gt('starts_at', cutoff)
      .lt('reports', 3)
      .order('starts_at', { ascending: true })
    if (error) throw error
    return (data as EventRow[]).map(toEvent)
  }

  async createEvent(input: NewEventInput): Promise<CampEvent> {
    const { data, error } = await this.client.rpc('create_event', {
      p_title: input.title,
      p_description: input.description,
      p_place: input.place,
      p_side: input.side,
      p_starts_at: input.startsAt,
      p_creator_name: input.creatorName,
      p_creator_device_id: input.creatorDeviceId,
    })
    if (error) throw error
    return toEvent(data as EventRow)
  }

  async deleteEvent(eventId: string, deviceId: string): Promise<void> {
    const { error } = await this.client.rpc('delete_event', {
      p_event_id: eventId,
      p_device_id: deviceId,
    })
    if (error) throw error
  }

  async reportEvent(eventId: string): Promise<void> {
    const { error } = await this.client.rpc('report_event', { p_event_id: eventId })
    if (error) throw error
  }

  subscribe(cb: () => void): () => void {
    const channel = this.client
      .channel('sho-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loads' }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, cb)
      .subscribe()
    return () => {
      void this.client.removeChannel(channel)
    }
  }

  async savePushSubscription(args: {
    deviceId: string
    subscription: unknown
    side: LocationId
    ownerName: string
  }): Promise<void> {
    const { error } = await this.client.rpc('save_push_subscription', {
      p_device_id: args.deviceId,
      p_subscription: args.subscription,
      p_side: args.side,
      p_owner_name: args.ownerName,
    })
    if (error) throw error
  }

  async notifyEvent(eventId: string): Promise<void> {
    // Fire-and-forget: a push failure should never block creating the event.
    try {
      await this.client.functions.invoke(PUSH_FUNCTION, {
        body: { type: 'event', eventId },
      })
    } catch (e) {
      console.warn('event push failed', e)
    }
  }
}
