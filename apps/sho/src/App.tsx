import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAdapter } from './adapters'
import type { CampEvent, Load, LocationId, Machine } from './lib/types'
import { LOCATIONS, derivedStatus } from './lib/types'
import { getDeviceId, getName, getSide, setName, setSide } from './lib/device'
import { isDemo } from './lib/config'
import { pushBanner, notifyLocal } from './lib/banners'
import { playChime, unlockAudio } from './lib/chime'
import { enableNotifications, type PushResult } from './lib/push'
import { useNow } from './hooks/useNow'
import { Onboarding } from './screens/Onboarding'
import { MachineBoard } from './screens/MachineBoard'
import { Events } from './screens/Events'
import { MyLaundry } from './screens/MyLaundry'
import { Banners } from './components/Banners'
import { NameSheet } from './components/NameSheet'
import { HoursNotice } from './components/HoursNotice'
import { LOCK_LABEL, OPEN_LABEL, isShoLocked, minutesUntilLock } from './lib/hours'

type Tab = 'machines' | 'events' | 'laundry'

const NOTIFIED_KEY = 'sho_notified'

function getNotified(): { done: string[]; displaced: string[] } {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '{}')
    return { done: raw.done ?? [], displaced: raw.displaced ?? [] }
  } catch {
    return { done: [], displaced: [] }
  }
}

function markNotified(kind: 'done' | 'displaced', id: string) {
  const n = getNotified()
  n[kind] = [...n[kind], id].slice(-50)
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(n))
}

export default function App() {
  const adapter = useMemo(() => getAdapter(), [])
  const deviceId = useMemo(() => getDeviceId(), [])
  const now = useNow(1000)

  const [name, setNameState] = useState(getName())
  const [side, setSideState] = useState<LocationId | null>(getSide())
  const [renaming, setRenaming] = useState(false)
  const [tab, setTab] = useState<Tab>('machines')
  const [machines, setMachines] = useState<Machine[]>([])
  const [allMachines, setAllMachines] = useState<Machine[]>([])
  const [loads, setLoads] = useState<Load[]>([])
  const [myLoads, setMyLoads] = useState<Load[]>([])
  const [events, setEvents] = useState<CampEvent[]>([])
  const [notifState, setNotifState] = useState<PushResult | 'unknown'>(
    'Notification' in window && Notification.permission === 'granted' ? 'granted' : 'unknown',
  )

  const refresh = useCallback(async () => {
    if (!side) return
    try {
      const [ms, pines, timbers, ls, mine, evs] = await Promise.all([
        adapter.getMachines(side),
        adapter.getMachines('pines'),
        adapter.getMachines('timbers'),
        adapter.getActiveLoads(side),
        adapter.getMyLoads(deviceId),
        adapter.getEvents(),
      ])
      setMachines(ms)
      setAllMachines([...pines, ...timbers])
      setLoads(ls)
      setMyLoads(mine)
      setEvents(evs)
    } catch (e) {
      console.warn('refresh failed', e)
    }
  }, [adapter, deviceId, side])

  useEffect(() => {
    void refresh()
    const unsub = adapter.subscribe(() => void refresh())
    const poll = setInterval(() => void refresh(), 30000)
    return () => {
      unsub()
      clearInterval(poll)
    }
  }, [adapter, refresh])

  // In-app alerts for MY loads finishing or being displaced. Exactly one alert
  // per event: if the app is visible, an in-app banner + chime; if it's hidden
  // and we don't have server push, a local system notification. When server
  // push IS on and the app is hidden/closed, the edge function handles it (and
  // the service worker stays quiet while a tab is visible), so nothing doubles.
  useEffect(() => {
    const notified = getNotified()
    const visible = document.visibilityState === 'visible'
    const alertMine = (title: string, body: string, tone: 'success' | 'warning') => {
      if (visible) {
        pushBanner(title, body, tone)
        playChime()
      } else if (notifState !== 'granted') {
        notifyLocal(title, body)
      }
    }
    for (const l of myLoads) {
      const label = machineLabel(allMachines, l.machineId)
      const status = derivedStatus(l, now)
      if (status === 'done' && !notified.done.includes(l.id)) {
        markNotified('done', l.id)
        alertMine(`${label} is done! 🧺`, 'Come grab your laundry before someone moves it.', 'success')
      }
      if (status === 'displaced' && !notified.displaced.includes(l.id)) {
        markNotified('displaced', l.id)
        alertMine(
          `Your load was taken out of ${label}`,
          `${l.displacedByName ?? 'Someone'} needed the machine — check the table or baskets.`,
          'warning',
        )
      }
    }
  }, [myLoads, now, allMachines, notifState])

  const handleOnboard = (newName: string, newSide: LocationId) => {
    setName(newName)
    setSide(newSide)
    setNameState(newName)
    setSideState(newSide)
    // The "Let's go" tap is a genuine user gesture, so we can unlock audio and
    // ask for notification permission right here — no need to send people into
    // a settings screen. requestPermission() must run in the gesture's call
    // stack (iOS requirement), so call it synchronously, not after an await.
    unlockAudio()
    void enableNotifications(adapter, deviceId, newSide, newName).then(setNotifState)
  }

  const switchSide = (s: LocationId) => {
    setSide(s)
    setSideState(s)
  }

  const checkNameTaken = useCallback(
    (candidate: string) => adapter.isNameTaken(candidate, deviceId),
    [adapter, deviceId],
  )

  const handleChangeName = (newName: string) => {
    setName(newName)
    setNameState(newName)
    setRenaming(false)
    pushBanner('Name updated ✓', `You'll show as “${newName}” on machines you use.`, 'success')
  }

  const handleEnableNotifications = async () => {
    if (!side) return
    const result = await enableNotifications(adapter, deviceId, side, name)
    setNotifState(result)
    if (result === 'granted') {
      pushBanner('Notifications on 🔔', "We'll ping you when your laundry is done.", 'success')
    } else if (result === 'local-only') {
      pushBanner(
        'Notifications on (while app is open)',
        isDemo()
          ? 'Demo mode has no server push — alerts show while the app is open.'
          : 'Push setup incomplete — alerts show while the app is open.',
        'info',
      )
    } else if (result === 'denied') {
      pushBanner('Notifications blocked', 'Enable them in your phone settings for this app.', 'warning')
    }
  }

  if (!name || !side) {
    return <Onboarding onDone={handleOnboard} checkNameTaken={checkNameTaken} />
  }

  const sideName = LOCATIONS.find((l) => l.id === side)!.name

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-pine-faint pb-24">
      {/* Cho-Yeh watermark behind everything */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-1/2 z-0 flex -translate-y-1/2 justify-center"
      >
        <img src="brand/cho-yeh-emblem.svg" alt="" className="w-[88%] max-w-sm opacity-[0.06]" />
      </div>
      <Banners />
      <header className="sticky top-0 z-40 bg-gradient-to-b from-[#0a5c22] to-pine px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow-lux">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="brand/cho-yeh-logo-white.png"
              alt="Camp Cho-Yeh"
              className="h-9 w-auto object-contain drop-shadow"
            />
            <div>
              <h1 className="font-display text-xl font-semibold leading-tight tracking-tight">
                The Sho
              </h1>
              <div className="text-[9px] font-medium uppercase tracking-[0.25em] text-lime-200/80">
                Nature That Nurtures
              </div>
            </div>
          </div>
          {isDemo() && (
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">
              DEMO
            </span>
          )}
        </div>
        <div className="relative mt-2.5 grid grid-cols-2 rounded-xl bg-pine-deep/70 p-1">
          <div
            className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white shadow transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              side === 'timbers' ? 'translate-x-[calc(100%+4px)]' : ''
            }`}
          />
          {LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              onClick={() => switchSide(loc.id)}
              className={`relative z-10 rounded-lg py-1.5 text-sm font-bold transition-colors duration-300 ${
                side === loc.id ? 'text-pine' : 'text-lime-100/80'
              }`}
            >
              {loc.id === 'pines' ? '🌲' : '🪵'} {loc.name}
            </button>
          ))}
        </div>
      </header>

      <HoursNotice now={now} />

      <main key={`${tab}-${side}`} className="anim-rise relative z-10 pt-4">
        {tab === 'machines' && (
          <MachineBoard
            machines={machines}
            loads={loads}
            now={now}
            myDeviceId={deviceId}
            locked={isShoLocked(now)}
            minutesToLock={minutesUntilLock(now)}
            onStart={async (machine, minutes) => {
              if (isShoLocked(Date.now())) {
                pushBanner('The Sho is locked 🔒', `Doors open at ${OPEN_LABEL}.`, 'warning')
                return
              }
              try {
                await adapter.startLoad({ machineId: machine.id, minutes, ownerName: name, deviceId })
                pushBanner(
                  `${machine.kind === 'washer' ? 'Washer' : 'Dryer'} ${machine.number} started`,
                  `We'll ping you in ${minutes} min when it's done.`,
                  'success',
                )
                await refresh()
              } catch (e) {
                pushBanner('Could not start the load', String(e), 'warning')
              }
            }}
            onCollect={async (load) => {
              await adapter.collectLoad(load.id, deviceId)
              pushBanner('Thanks for clearing the machine! 🙌', '', 'success')
              await refresh()
            }}
            onAdjust={async (load, minutes) => {
              await adapter.adjustLoad(load.id, deviceId, minutes)
              await refresh()
            }}
          />
        )}
        {tab === 'events' && (
          <Events
            events={events}
            side={side}
            now={now}
            myDeviceId={deviceId}
            onCreate={async (input) => {
              try {
                const event = await adapter.createEvent({
                  ...input,
                  creatorName: name,
                  creatorDeviceId: deviceId,
                })
                await adapter.notifyEvent(event.id)
                pushBanner('Event posted 🎉', 'Camp has been notified.', 'success')
                await refresh()
              } catch (e) {
                pushBanner('Could not post the event', String(e), 'warning')
              }
            }}
            onDelete={async (event) => {
              await adapter.deleteEvent(event.id, deviceId)
              await refresh()
            }}
            onReport={async (event) => {
              await adapter.reportEvent(event.id)
              pushBanner('Reported', 'Thanks — repeated reports hide an event.', 'info')
              await refresh()
            }}
          />
        )}
        {tab === 'laundry' && (
          <MyLaundry
            myLoads={myLoads}
            machines={allMachines}
            now={now}
            name={name}
            notifState={notifState}
            onEnableNotifications={() => void handleEnableNotifications()}
            onChangeName={() => setRenaming(true)}
          />
        )}
      </main>

      {renaming && (
        <NameSheet
          currentName={name}
          checkNameTaken={checkNameTaken}
          onSave={handleChangeName}
          onClose={() => setRenaming(false)}
        />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-slate-200 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-3">
          {(
            [
              ['machines', '🫧', 'Machines'],
              ['events', '📅', 'Events'],
              ['laundry', '🧺', 'My Laundry'],
            ] as [Tab, string, string][]
          ).map(([t, icon, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex flex-col items-center gap-0.5 py-2 text-xs font-semibold transition-all duration-200 ${
                tab === t ? 'text-pine' : 'text-slate-400'
              }`}
            >
              <span
                className={`text-xl transition-transform duration-300 ${tab === t ? 'scale-110' : 'scale-100'}`}
              >
                {icon}
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      <div className="px-4 pt-6 text-center text-[10px] leading-relaxed text-slate-400">
        {sideName} · Camp Cho-Yeh — a place where Jesus Christ transforms lives through
        meaningful relationships and outdoor adventures
        <br />
        Sho hours: {OPEN_LABEL} – {LOCK_LABEL} · Machine timers are camper-entered estimates
      </div>
    </div>
  )
}

function machineLabel(machines: Machine[], machineId: string): string {
  const m = machines.find((x) => x.id === machineId)
  if (!m) return 'your machine'
  const side = m.location === 'pines' ? 'Pines' : 'Timbers'
  return `${side} ${m.kind === 'washer' ? 'Washer' : 'Dryer'} ${m.number}`
}
