import type { Load, Machine } from '../lib/types'
import { derivedStatus } from '../lib/types'
import { countdown, minutesSince } from '../lib/time'
import { isIosSafariNotInstalled, type PushResult } from '../lib/push'

export interface MyLaundryProps {
  myLoads: Load[]
  machines: Machine[] // machines for BOTH sides so labels always resolve
  now: number
  notifState: PushResult | 'unknown'
  onEnableNotifications: () => void
}

function machineLabel(machines: Machine[], machineId: string): string {
  const m = machines.find((x) => x.id === machineId)
  if (!m) return machineId
  const side = m.location === 'pines' ? 'Pines' : 'Timbers'
  return `${side} ${m.kind === 'washer' ? 'Washer' : 'Dryer'} ${m.number}`
}

export function MyLaundry(props: MyLaundryProps) {
  const { myLoads, machines, now, notifState, onEnableNotifications } = props

  const statusLine = (l: Load): { text: string; cls: string } => {
    switch (derivedStatus(l, now)) {
      case 'running':
        return { text: `Running — ${countdown(l.endsAt, now)} left`, cls: 'text-sky-700' }
      case 'done':
        return {
          text: `Done ${minutesSince(l.endsAt, now)}m ago — go get it!`,
          cls: 'text-amber-700',
        }
      case 'collected':
        return { text: 'Collected ✅', cls: 'text-slate-400' }
      case 'displaced':
        return {
          text: `Taken out${l.displacedByName ? ` by ${l.displacedByName}` : ''} — no longer in this machine. Check the table/baskets.`,
          cls: 'text-rose-600',
        }
    }
  }

  return (
    <div className="px-4 pb-6">
      {notifState !== 'granted' && notifState !== 'local-only' && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="font-bold text-slate-900">🔔 Get pinged when your load is done</div>
          <div className="mt-1 text-sm text-slate-500">
            No more guessing — we'll notify you the minute your laundry finishes, and warn you
            if someone takes it out.
          </div>
          <button
            onClick={onEnableNotifications}
            className="mt-3 w-full rounded-xl bg-pine py-3 font-bold text-white transition-colors active:bg-pine-deep"
          >
            Turn on notifications
          </button>
          {isIosSafariNotInstalled() && (
            <div className="mt-2 text-xs text-slate-400">
              iPhone: add the app to your Home Screen first (Share → Add to Home Screen) or
              notifications can't work when Safari is closed.
            </div>
          )}
        </div>
      )}

      <h2 className="mt-5 font-display text-xl font-semibold text-slate-900">My laundry</h2>
      {myLoads.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm">
          <div className="text-3xl">🧺</div>
          <div className="mt-2 text-sm">
            No loads yet. Tap a free machine on the Machines tab to start one.
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {myLoads.map((l) => {
            const s = statusLine(l)
            return (
              <div key={l.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="font-bold text-slate-900">
                  {machineLabel(machines, l.machineId)}
                </div>
                <div className={`mt-0.5 text-sm font-semibold ${s.cls}`}>{s.text}</div>
                <div className="mt-1 text-xs text-slate-400">
                  Started{' '}
                  {new Date(l.startedAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
