import { LOCK_LABEL, OPEN_LABEL, isShoLocked, minutesUntilLock } from '../lib/hours'

/** Overnight lock-up strip: solid card while locked, amber warning in the last hour. */
export function HoursNotice({ now }: { now: number }) {
  if (isShoLocked(now)) {
    return (
      <div className="anim-rise relative z-10 mx-4 mt-4 rounded-2xl bg-slate-800 p-4 text-white shadow-lux">
        <div className="font-bold">🔒 The Sho is locked for the night</div>
        <div className="mt-0.5 text-sm text-slate-300">
          Doors open at {OPEN_LABEL}. Timers keep counting — collect your load after opening.
        </div>
      </div>
    )
  }
  const mins = minutesUntilLock(now)
  if (mins <= 60) {
    return (
      <div className="anim-rise relative z-10 mx-4 mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-900">
        <div className="font-bold">🌙 Locking soon</div>
        <div className="mt-0.5 text-sm">
          The Sho locks at {LOCK_LABEL} — {mins} min from now. Only start a load that will
          finish in time.
        </div>
      </div>
    )
  }
  return null
}
