import { useState } from 'react'
import type { Load, Machine } from '../lib/types'
import { GRACE_MINUTES, MINUTE_PRESETS, derivedStatus } from '../lib/types'
import { formatMinutes, minutesLeft, minutesSince } from '../lib/time'
import { LOCK_LABEL, OPEN_LABEL } from '../lib/hours'
import { Sheet } from './Sheet'

export interface StartLoadSheetProps {
  machine: Machine
  load: Load | null
  now: number
  myDeviceId: string
  locked: boolean
  minutesToLock: number
  onStart: (minutes: number) => void
  onCollect: (load: Load) => void
  onAdjust: (load: Load, minutes: number) => void
  onClose: () => void
}

function MinutePicker({
  machineKind,
  onPick,
  confirmLabel,
}: {
  machineKind: Machine['kind']
  onPick: (minutes: number) => void
  confirmLabel: string
}) {
  const presets = MINUTE_PRESETS[machineKind]
  const [minutes, setMinutes] = useState(presets[1])
  return (
    <div>
      <div className="mb-2 text-sm text-slate-600">
        How many minutes is the {machineKind} set for?
      </div>
      <div className="mb-3 grid grid-cols-4 gap-2">
        {presets.map((m) => (
          <button
            key={m}
            onClick={() => setMinutes(m)}
            className={`rounded-xl border-2 py-3 text-center font-bold ${
              minutes === m
                ? 'border-pine bg-pine-soft text-pine'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-slate-600" htmlFor="custom-minutes">
          Custom:
        </label>
        <input
          id="custom-minutes"
          type="number"
          min={1}
          max={180}
          value={minutes}
          onChange={(e) => setMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
          className="w-24 rounded-xl border-2 border-slate-200 px-3 py-2 text-center font-bold"
        />
        <span className="text-sm text-slate-500">minutes</span>
      </div>
      <button
        onClick={() => onPick(minutes)}
        className="w-full rounded-xl bg-pine py-3.5 font-bold text-white transition-colors active:bg-pine-deep"
      >
        {confirmLabel}
      </button>
    </div>
  )
}

export function StartLoadSheet(props: StartLoadSheetProps) {
  const { machine, load, now, myDeviceId, locked, minutesToLock, onStart, onCollect, onAdjust, onClose } =
    props
  const kindLabel = machine.kind === 'washer' ? 'Washer' : 'Dryer'
  const title = `${kindLabel} ${machine.number}`
  const status = load ? derivedStatus(load, now) : null
  const mine = load?.deviceId === myDeviceId
  const [takingOver, setTakingOver] = useState(false)
  const [adjusting, setAdjusting] = useState(false)

  // Free machine (or takeover confirmed) → minute picker
  if (!load || status === 'collected' || status === 'displaced' || takingOver) {
    if (locked) {
      return (
        <Sheet title={title} onClose={onClose}>
          <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
            🔒 The Sho is locked for the night ({LOCK_LABEL} – {OPEN_LABEL}). New loads can't be
            started until it opens.
          </div>
        </Sheet>
      )
    }
    return (
      <Sheet title={takingOver ? `Take over ${title}` : `Start a load — ${title}`} onClose={onClose}>
        {takingOver && load && (
          <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            {load.ownerName}'s load will be marked as taken out, and they'll be told their
            laundry is no longer in this machine.
          </div>
        )}
        {minutesToLock <= 90 && (
          <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            🌙 The Sho locks at {LOCK_LABEL} — {formatMinutes(minutesToLock)} from now. Make sure
            your load finishes (and is collected) before then.
          </div>
        )}
        <MinutePicker
          machineKind={machine.kind}
          onPick={onStart}
          confirmLabel="Start load"
        />
      </Sheet>
    )
  }

  // My load
  if (mine) {
    if (adjusting) {
      return (
        <Sheet title={`Fix the timer — ${title}`} onClose={onClose}>
          <MinutePicker
            machineKind={machine.kind}
            onPick={(m) => onAdjust(load, m)}
            confirmLabel="Update time"
          />
        </Sheet>
      )
    }
    return (
      <Sheet title={title} onClose={onClose}>
        <div className="mb-4 text-sm text-slate-600">
          {status === 'running'
            ? `Your load has about ${formatMinutes(minutesLeft(load.endsAt, now))} left.`
            : `Your load finished ${formatMinutes(minutesSince(load.endsAt, now))} ago.`}
        </div>
        <button
          onClick={() => onCollect(load)}
          className="mb-2 w-full rounded-xl bg-pine py-3.5 font-bold text-white transition-colors active:bg-pine-deep"
        >
          I took my laundry out ✅
        </button>
        {status === 'running' && (
          <button
            onClick={() => setAdjusting(true)}
            className="w-full rounded-xl border-2 border-slate-200 py-3 font-semibold text-slate-700"
          >
            Fix the remaining time
          </button>
        )}
      </Sheet>
    )
  }

  // Someone else's load — keep it compact so "Take over" is visible without scrolling.
  const doneMins = status === 'done' ? minutesSince(load.endsAt, now) : 0
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-600">
        {status === 'running' ? (
          <>
            <span className="font-semibold">{load.ownerName}</span> has a load running — about{' '}
            {formatMinutes(minutesLeft(load.endsAt, now))} left.
          </>
        ) : (
          <>
            <span className="font-semibold">{load.ownerName}</span>'s load finished{' '}
            {formatMinutes(doneMins)} ago{doneMins >= GRACE_MINUTES ? " and hasn't been collected." : '.'}
          </>
        )}
      </p>
      <button
        onClick={() => setTakingOver(true)}
        className="w-full rounded-xl border-2 border-amber-400 bg-amber-100 py-3.5 font-bold text-amber-900 active:bg-amber-200"
      >
        Take over this machine
      </button>
      <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
        {status === 'running'
          ? 'Machine busy — try another if you can. Only take over if it’s actually empty.'
          : 'Moving someone’s laundry? Put it somewhere kind — the table or a basket, not the floor 🙂'}
      </p>
    </Sheet>
  )
}
