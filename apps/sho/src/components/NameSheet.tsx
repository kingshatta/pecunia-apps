import { useState } from 'react'
import { Sheet } from './Sheet'
import { useNameCheck } from '../hooks/useNameCheck'

export function NameSheet({
  currentName,
  checkNameTaken,
  onSave,
  onClose,
}: {
  currentName: string
  checkNameTaken: (name: string) => Promise<boolean>
  onSave: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(currentName)
  const { taken, checking } = useNameCheck(name, checkNameTaken)
  const trimmed = name.trim()
  const ready = trimmed.length >= 2 && !taken && !checking

  return (
    <Sheet title="Change your name" onClose={onClose}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Maddie A"
        className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-900 focus:border-pine-mid focus:shadow-[0_0_0_4px_rgba(56,124,43,0.15)] focus:outline-none"
      />
      {taken ? (
        <div className="mt-1.5 text-xs font-semibold text-rose-600">
          Someone using a machine is already “{trimmed}”. Add your last initial (e.g. “{trimmed} A”)
          so people can tell you apart.
        </div>
      ) : (
        <div className="mt-1.5 text-xs text-slate-400">
          This is the name shown on the machines you're using.
        </div>
      )}
      <button
        disabled={!ready}
        onClick={() => onSave(trimmed)}
        className="mt-4 w-full rounded-xl bg-pine py-3.5 font-bold text-white transition-colors active:bg-pine-deep disabled:opacity-40"
      >
        {checking ? 'Checking…' : 'Save name'}
      </button>
    </Sheet>
  )
}
