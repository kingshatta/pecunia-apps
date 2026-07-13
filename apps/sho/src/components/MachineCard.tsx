import type { ReactNode } from 'react'
import type { Load, Machine } from '../lib/types'
import { GRACE_MINUTES, derivedStatus } from '../lib/types'
import { countdown, minutesSince } from '../lib/time'

export interface MachineCardProps {
  machine: Machine
  load: Load | null // the uncollected load in this machine, if any
  now: number
  myDeviceId: string
  onTap: () => void
}

export function MachineCard({ machine, load, now, myDeviceId, onTap }: MachineCardProps) {
  const kindLabel = machine.kind === 'washer' ? 'Washer' : 'Dryer'
  const icon = machine.kind === 'washer' ? '🫧' : '🌀'
  const mine = load?.deviceId === myDeviceId
  const status = load ? derivedStatus(load, now) : null

  let cardClass = 'border-slate-200 bg-white'
  let pulse = ''
  let statusEl: ReactNode
  if (!load || status === 'collected' || status === 'displaced') {
    cardClass = 'border-pine-mid/40 bg-pine-soft/60'
    statusEl = (
      <>
        <div className="text-base font-bold text-pine">Free</div>
        <div className="text-xs text-pine/60">Tap to start a load</div>
      </>
    )
  } else if (status === 'running') {
    cardClass = 'border-sky-300 bg-white'
    const total = Date.parse(load!.endsAt) - Date.parse(load!.startedAt)
    const elapsed = Math.min(total, now - Date.parse(load!.startedAt))
    const pct = total > 0 ? Math.round((elapsed / total) * 100) : 100
    statusEl = (
      <>
        <div className="font-mono text-xl font-bold tabular-nums text-sky-700">
          {countdown(load!.endsAt, now)}
        </div>
        <div className="truncate text-xs text-slate-500">{load!.ownerName}</div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-sky-500 transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
      </>
    )
  } else {
    // done, awaiting pickup
    const mins = minutesSince(load!.endsAt, now)
    const overdue = mins >= GRACE_MINUTES
    cardClass = overdue ? 'border-rose-300 bg-rose-50' : 'border-amber-300 bg-amber-50'
    pulse = 'anim-pulse-soft'
    statusEl = (
      <>
        <div
          className={`text-base font-bold ${overdue ? 'text-rose-700' : 'text-amber-700'}`}
        >
          Done · {mins}m ago
        </div>
        <div className="truncate text-xs text-slate-500">
          {load!.ownerName}
          {overdue ? ' — please collect!' : ''}
        </div>
      </>
    )
  }

  return (
    <button
      data-testid={machine.id}
      onClick={onTap}
      className={`anim-rise relative min-h-[104px] rounded-2xl border p-3.5 text-left shadow-card transition-all duration-200 active:scale-[0.96] ${cardClass} ${pulse} ${
        mine ? 'ring-2 ring-pine ring-offset-1' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">
          {icon} {kindLabel} {machine.number}
        </span>
        {mine && (
          <span className="rounded-full bg-pine px-2 py-0.5 text-[10px] font-bold text-white">
            YOU
          </span>
        )}
      </div>
      <div className="mt-1.5">{statusEl}</div>
    </button>
  )
}
