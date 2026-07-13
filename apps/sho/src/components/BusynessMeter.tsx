const LEVELS = [
  { max: 0.34, label: 'Not busy', bar: 'bg-pine-mid', chip: 'bg-pine-soft text-pine' },
  { max: 0.7, label: 'Getting busy', bar: 'bg-amber-600', chip: 'bg-amber-100 text-amber-800' },
  { max: Infinity, label: 'Packed', bar: 'bg-rose-600', chip: 'bg-rose-100 text-rose-800' },
]

/** Live occupancy: how busy the Sho is right now, from machines in use. */
export function BusynessMeter({ inUse, total }: { inUse: number; total: number }) {
  const pct = total > 0 ? inUse / total : 0
  const level = LEVELS.find((l) => pct <= l.max)!

  return (
    <section
      className="anim-rise rounded-3xl bg-white p-5 shadow-card ring-1 ring-pine/5"
      aria-label="How busy is the Sho right now"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Right now
          </div>
          <div className="mt-0.5 font-display text-xl font-semibold text-slate-900">
            {inUse} of {total} machines in use
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors duration-300 ${level.chip}`}
        >
          {level.label}
        </span>
      </div>
      <div
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-pine-soft"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={inUse}
        aria-label="Machines in use"
      >
        <div
          className={`h-full rounded-full ${level.bar} transition-all duration-700 ease-out`}
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </div>
    </section>
  )
}
