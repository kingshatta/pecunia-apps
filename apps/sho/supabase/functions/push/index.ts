// The Sho — push notification sender (Supabase Edge Function, Deno).
//
// Actions (POST JSON body):
//   { "type": "vapid-setup" }          → one-time: generates VAPID keys and prints
//                                        what to put in secrets + config.js.
//                                        Only works while VAPID_KEYS is unset.
//   { "type": "tick" }                 → called by pg_cron every minute: notifies
//                                        owners of finished / overdue / displaced
//                                        loads. Idempotent.
//   { "type": "event", "eventId": "…" }→ notifies everyone (opted in) about a new
//                                        event. Idempotent per event.
//
// Secrets required (Settings → Edge Functions → Secrets):
//   VAPID_KEYS    — the JSON printed by vapid-setup
//   VAPID_CONTACT — e.g. mailto:kandohsheen@gmail.com
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)
//
// Deploy note: turn OFF "Enforce JWT verification" for this function so the
// pg_cron tick can reach it (the anon key is public anyway; every action here
// is idempotent and only sends notifications the data already calls for).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush@0.3'
import { encodeBase64Url, decodeBase64Url } from 'jsr:@std/encoding@1/base64url'

const GRACE_MINUTES = 10

// Camp quiet hours mirror the sho lock-up (11:30 PM – 7:00 AM camp time):
// no pushes overnight. The tick's notified_*_at markers stay unset while
// quiet, so the first tick after 7:00 AM delivers everything pending.
const QUIET_START_MINUTE = 23 * 60 + 30
const QUIET_END_MINUTE = 7 * 60

function isCampQuietHours(): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
    timeZone: 'America/Chicago', // Camp Cho-Yeh is in Texas
  }).formatToParts(new Date())
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  const mins = h * 60 + m
  return mins >= QUIET_START_MINUTE || mins < QUIET_END_MINUTE
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })

function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

/** Browser applicationServerKey = uncompressed EC point 0x04 || x || y. */
function applicationServerKeyFromJwk(jwk: { x: string; y: string }): string {
  const x = decodeBase64Url(jwk.x)
  const y = decodeBase64Url(jwk.y)
  const point = new Uint8Array(1 + x.length + y.length)
  point[0] = 0x04
  point.set(x, 1)
  point.set(y, 1 + x.length)
  return encodeBase64Url(point)
}

async function getAppServer(): Promise<webpush.ApplicationServer> {
  const keysJson = Deno.env.get('VAPID_KEYS')
  if (!keysJson) throw new Error('VAPID_KEYS secret not set — run vapid-setup first')
  const vapidKeys = await webpush.importVapidKeys(JSON.parse(keysJson), {
    extractable: false,
  })
  return await webpush.ApplicationServer.new({
    contactInformation: Deno.env.get('VAPID_CONTACT') ?? 'mailto:admin@example.com',
    vapidKeys,
  })
}

interface SubscriptionRow {
  device_id: string
  subscription: webpush.PushSubscription
  side: string
  wants_events: boolean
}

async function sendTo(
  appServer: webpush.ApplicationServer,
  rows: SubscriptionRow[],
  payload: { title: string; body: string },
): Promise<{ sent: number; deleted: number }> {
  const admin = supabaseAdmin()
  let sent = 0
  let deleted = 0
  for (const row of rows) {
    try {
      const subscriber = appServer.subscribe(row.subscription)
      await subscriber.pushTextMessage(JSON.stringify(payload), {})
      sent++
    } catch (err) {
      // deno-lint-ignore no-explicit-any
      const status = (err as any)?.response?.status
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('device_id', row.device_id)
        deleted++
      } else {
        console.error('push failed for', row.device_id, err)
      }
    }
  }
  return { sent, deleted }
}

async function subsForDevices(deviceIds: string[]): Promise<Map<string, SubscriptionRow>> {
  if (deviceIds.length === 0) return new Map()
  const admin = supabaseAdmin()
  const { data } = await admin
    .from('push_subscriptions')
    .select('*')
    .in('device_id', deviceIds)
  const map = new Map<string, SubscriptionRow>()
  for (const row of (data ?? []) as SubscriptionRow[]) map.set(row.device_id, row)
  return map
}

function machineLabel(machineId: string): string {
  // ids look like "pines-washer-3"
  const [loc, kind, num] = machineId.split('-')
  const side = loc === 'pines' ? 'Pines' : 'Timbers'
  const k = kind === 'washer' ? 'Washer' : 'Dryer'
  return `${side} ${k} ${num}`
}

async function handleTick(): Promise<Response> {
  if (isCampQuietHours()) return json({ ok: true, sent: 0, quiet: true })
  const admin = supabaseAdmin()
  const appServer = await getAppServer()
  const nowIso = new Date().toISOString()
  const reminderCutoff = new Date(Date.now() - GRACE_MINUTES * 60000).toISOString()
  let sent = 0

  // 1. Loads that just finished
  const { data: doneLoads } = await admin
    .from('loads')
    .select('id, machine_id, device_id')
    .eq('status', 'running')
    .lte('ends_at', nowIso)
    .is('notified_done_at', null)
  if (doneLoads && doneLoads.length > 0) {
    const subs = await subsForDevices(doneLoads.map((l) => l.device_id))
    for (const load of doneLoads) {
      const sub = subs.get(load.device_id)
      if (sub) {
        const r = await sendTo(appServer, [sub], {
          title: `${machineLabel(load.machine_id)} is done! 🧺`,
          body: 'Go grab your clothes before someone else needs the machine.',
        })
        sent += r.sent
      }
      await admin.from('loads').update({ notified_done_at: nowIso }).eq('id', load.id)
    }
  }

  // 2. Overdue reminders (done for GRACE_MINUTES, still not collected)
  const { data: overdueLoads } = await admin
    .from('loads')
    .select('id, machine_id, device_id')
    .eq('status', 'running')
    .lte('ends_at', reminderCutoff)
    .not('notified_done_at', 'is', null)
    .is('notified_reminder_at', null)
  if (overdueLoads && overdueLoads.length > 0) {
    const subs = await subsForDevices(overdueLoads.map((l) => l.device_id))
    for (const load of overdueLoads) {
      const sub = subs.get(load.device_id)
      if (sub) {
        const r = await sendTo(appServer, [sub], {
          title: `Your laundry is still in ${machineLabel(load.machine_id)} ⏰`,
          body: `It finished ${GRACE_MINUTES}+ minutes ago — please clear the machine for the next person.`,
        })
        sent += r.sent
      }
      await admin.from('loads').update({ notified_reminder_at: nowIso }).eq('id', load.id)
    }
  }

  // 3. Displaced loads (someone took over the machine)
  const { data: displacedLoads } = await admin
    .from('loads')
    .select('id, machine_id, device_id, displaced_by_name')
    .eq('status', 'displaced')
    .is('notified_displaced_at', null)
  if (displacedLoads && displacedLoads.length > 0) {
    const subs = await subsForDevices(displacedLoads.map((l) => l.device_id))
    for (const load of displacedLoads) {
      const sub = subs.get(load.device_id)
      if (sub) {
        const r = await sendTo(appServer, [sub], {
          title: `Your load was taken out of ${machineLabel(load.machine_id)}`,
          body: `${load.displaced_by_name ?? 'Someone'} needed the machine — your laundry should be on the table or in a basket.`,
        })
        sent += r.sent
      }
      await admin.from('loads').update({ notified_displaced_at: nowIso }).eq('id', load.id)
    }
  }

  // 4. Events posted during quiet hours — announce them now instead
  const { data: pendingEvents } = await admin
    .from('events')
    .select('id')
    .is('notified_at', null)
    .lt('reports', 3)
    .gt('starts_at', nowIso)
  for (const ev of pendingEvents ?? []) {
    await handleEvent(ev.id)
  }

  return json({ ok: true, sent })
}

async function handleEvent(eventId: string): Promise<Response> {
  const admin = supabaseAdmin()
  const appServer = await getAppServer()

  const { data: event } = await admin.from('events').select('*').eq('id', eventId).single()
  if (!event) return json({ error: 'event not found' }, 404)
  if (event.notified_at) return json({ ok: true, skipped: 'already notified' })
  // During quiet hours, leave notified_at unset — the first morning tick announces it.
  if (isCampQuietHours()) return json({ ok: true, deferred: 'quiet hours' })

  // claim it first so double calls can't double-send
  await admin.from('events').update({ notified_at: new Date().toISOString() }).eq('id', eventId)

  let query = admin.from('push_subscriptions').select('*').eq('wants_events', true)
  if (event.side !== 'both') query = query.eq('side', event.side)
  const { data: subs } = await query

  const when = new Date(event.starts_at).toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago', // Camp Cho-Yeh is in Texas
  })
  const r = await sendTo(appServer, (subs ?? []) as SubscriptionRow[], {
    title: `📅 ${event.title}`,
    body: `${when} · ${event.place} — posted by ${event.creator_name}`,
  })
  return json({ ok: true, ...r })
}

async function handleVapidSetup(): Promise<Response> {
  if (Deno.env.get('VAPID_KEYS')) {
    return json({ error: 'VAPID_KEYS already set — setup is done.' }, 400)
  }
  const keys = await webpush.generateVapidKeys({ extractable: true })
  const exported = await webpush.exportVapidKeys(keys)
  const publicJwk = exported.publicKey as { x: string; y: string }
  return json({
    step1_save_this_as_the_VAPID_KEYS_secret: JSON.stringify(exported),
    step2_put_this_in_config_js_as_vapidPublicKey: applicationServerKeyFromJwk(publicJwk),
    note: 'Run this once. After saving the secret, this action refuses to run again.',
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
      },
    })
  }
  try {
    const body = await req.json().catch(() => ({}))
    switch (body.type) {
      case 'vapid-setup':
        return await handleVapidSetup()
      case 'tick':
        return await handleTick()
      case 'event':
        if (typeof body.eventId !== 'string') return json({ error: 'eventId required' }, 400)
        return await handleEvent(body.eventId)
      default:
        return json({ error: 'unknown type' }, 400)
    }
  } catch (err) {
    console.error(err)
    return json({ error: String(err) }, 500)
  }
})
