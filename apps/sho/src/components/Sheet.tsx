import type { ReactNode } from 'react'

/** Bottom sheet with a scrim; tap the scrim to dismiss. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="Close"
        className="anim-fade absolute inset-0 bg-pine-deep/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="anim-sheet relative max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
        <h2 className="mb-3 font-display text-lg font-bold text-slate-900">{title}</h2>
        {children}
      </div>
    </div>
  )
}
