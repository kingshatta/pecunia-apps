import { useState } from 'react'
import type { LocationId } from '../lib/types'
import { LOCATIONS } from '../lib/types'
import { isIosSafariNotInstalled } from '../lib/push'
import { useNameCheck } from '../hooks/useNameCheck'

export function Onboarding({
  onDone,
  checkNameTaken,
}: {
  onDone: (name: string, side: LocationId) => void
  checkNameTaken: (name: string) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [side, setSide] = useState<LocationId | null>(null)
  const { taken, checking } = useNameCheck(name, checkNameTaken)
  const ready = name.trim().length >= 2 && side !== null && !taken && !checking

  return (
    <div className="relative flex min-h-dvh flex-col bg-gradient-to-b from-white to-pine-faint p-6 pt-[max(3rem,env(safe-area-inset-top))] text-slate-900">
      <img
        src="brand/cho-yeh-logo.svg"
        alt="Camp Cho-Yeh"
        className="anim-scale h-20 w-auto self-start object-contain"
      />
      <h1 className="anim-rise stagger-1 mt-5 font-display text-4xl font-extrabold tracking-tight text-pine">
        The Sho
      </h1>
      <p className="anim-rise stagger-2 mt-1.5 text-lg font-semibold text-slate-700">
        Camp Cho-Yeh laundry, minus the chaos.
      </p>
      <p className="anim-rise stagger-2 mt-1 text-sm text-slate-500">
        See what's free, get notified when your load is done.
      </p>

      <div className="anim-rise stagger-3">
        <label className="mt-8 block text-sm font-semibold text-slate-700" htmlFor="name">
          What's your name?
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sheen K"
          autoComplete="off"
          className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-pine-mid focus:shadow-[0_0_0_4px_rgba(56,124,43,0.15)] focus:outline-none"
        />
        {taken ? (
          <div className="mt-1 text-xs font-semibold text-rose-600">
            Someone using a machine is already “{name.trim()}”. Add your last initial (e.g. “
            {name.trim()} A”) so people can tell you apart.
          </div>
        ) : (
          <div className="mt-1 text-xs text-slate-400">
            Shown on machines you're using, so people know whose load it is.
          </div>
        )}
      </div>

      <div className="anim-rise stagger-4">
        <div className="mt-6 text-sm font-semibold text-slate-700">Which side are you on?</div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSide(loc.id)}
              className={`rounded-2xl border-2 p-4 text-left font-bold transition-all duration-200 active:scale-[0.97] ${
                side === loc.id
                  ? 'border-pine bg-pine text-white shadow-lg shadow-pine/20'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {loc.id === 'pines' ? '🌲' : '🪵'} {loc.name}
            </button>
          ))}
        </div>
        <div className="mt-1 text-xs text-slate-400">You can switch sides anytime.</div>
      </div>

      {isIosSafariNotInstalled() && (
        <div className="anim-rise stagger-5 mt-6 rounded-2xl bg-pine-soft p-3 text-sm text-pine">
          📲 iPhone tip: tap <span className="font-bold">Share → Add to Home Screen</span> so
          notifications work when the app is closed.
        </div>
      )}

      <div className="flex-1" />
      <button
        disabled={!ready}
        onClick={() => side && onDone(name.trim(), side)}
        className="anim-rise stagger-5 mt-6 w-full rounded-2xl bg-pine py-4 text-lg font-extrabold text-white shadow-lux transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
      >
        Let's go
      </button>
      <p className="anim-rise stagger-5 mt-4 text-center text-[11px] leading-relaxed text-slate-400">
        Camp Cho-Yeh · a place where Jesus Christ transforms lives through meaningful
        relationships and outdoor adventures
      </p>
    </div>
  )
}
