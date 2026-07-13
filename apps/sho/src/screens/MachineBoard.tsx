import { useState } from 'react'
import type { Load, Machine } from '../lib/types'
import { isActive } from '../lib/types'
import { BusynessMeter } from '../components/BusynessMeter'
import { MachineCard } from '../components/MachineCard'
import { StartLoadSheet } from '../components/StartLoadSheet'

export interface MachineBoardProps {
  machines: Machine[]
  loads: Load[]
  now: number
  myDeviceId: string
  locked: boolean
  minutesToLock: number
  onStart: (machine: Machine, minutes: number) => void
  onCollect: (load: Load) => void
  onAdjust: (load: Load, minutes: number) => void
}

export function MachineBoard(props: MachineBoardProps) {
  const { machines, loads, now, myDeviceId, locked, minutesToLock, onStart, onCollect, onAdjust } =
    props
  const [openMachine, setOpenMachine] = useState<Machine | null>(null)

  const loadFor = (m: Machine): Load | null =>
    loads.find((l) => l.machineId === m.id && isActive(l)) ?? null

  const inUse = machines.filter((m) => loadFor(m) !== null).length
  const washers = machines.filter((m) => m.kind === 'washer')
  const dryers = machines.filter((m) => m.kind === 'dryer')
  const freeCount = (list: Machine[]) => list.filter((m) => loadFor(m) === null).length

  const section = (title: string, list: Machine[]) => (
    <section className="mt-5">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-pine/70">
          {title}
        </h2>
        <span className="text-sm font-medium text-slate-400">{freeCount(list)} free</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {list.map((m) => (
          <MachineCard
            key={m.id}
            machine={m}
            load={loadFor(m)}
            now={now}
            myDeviceId={myDeviceId}
            onTap={() => setOpenMachine(m)}
          />
        ))}
      </div>
    </section>
  )

  return (
    <div className="px-4 pb-6">
      <BusynessMeter inUse={inUse} total={machines.length} />
      {section('Washers', washers)}
      {section('Dryers', dryers)}
      {openMachine && (
        <StartLoadSheet
          machine={openMachine}
          load={loadFor(openMachine)}
          now={now}
          myDeviceId={myDeviceId}
          locked={locked}
          minutesToLock={minutesToLock}
          onStart={(minutes) => {
            onStart(openMachine, minutes)
            setOpenMachine(null)
          }}
          onCollect={(load) => {
            onCollect(load)
            setOpenMachine(null)
          }}
          onAdjust={(load, minutes) => {
            onAdjust(load, minutes)
            setOpenMachine(null)
          }}
          onClose={() => setOpenMachine(null)}
        />
      )}
    </div>
  )
}
