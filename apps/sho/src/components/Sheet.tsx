import { useLayoutEffect, useState, type ReactNode } from 'react'

/**
 * Modal panel with a scrim; tap the scrim to dismiss.
 * position "bottom" (default): classic bottom sheet, slides up.
 * position "top": drops down from the top and starts right below the sticky
 * header + hours notice (measured via #sho-top-anchor), so the controls land
 * at the top of the screen where thumbs already are after tapping a card.
 */
export function Sheet({
  title,
  onClose,
  children,
  position = 'bottom',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  position?: 'bottom' | 'top'
}) {
  const [topOffset, setTopOffset] = useState(0)

  useLayoutEffect(() => {
    if (position !== 'top') return
    const measure = () => {
      const header = document.getElementById('sho-header')
      const anchor = document.getElementById('sho-top-anchor')
      const headerBottom = header?.getBoundingClientRect().bottom ?? 0
      const anchorTop = anchor?.getBoundingClientRect().top ?? 0
      // Below the notice when it's on screen, but never above the sticky header.
      setTopOffset(Math.max(headerBottom, anchorTop, 0))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [position])

  if (position === 'top') {
    return (
      <div className="fixed inset-0 z-50">
        <button
          aria-label="Close"
          className="anim-fade absolute inset-0 bg-pine-deep/50 backdrop-blur-[2px]"
          onClick={onClose}
        />
        <div
          className="anim-sheet-down absolute inset-x-0 mx-auto max-w-md overflow-y-auto rounded-b-3xl bg-white p-5 shadow-xl"
          style={{ top: topOffset, maxHeight: `calc(100vh - ${topOffset}px - 3rem)` }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
            <button
              aria-label="Close"
              onClick={onClose}
              className="-mr-1 rounded-full px-2.5 py-1 text-xl leading-none text-slate-400 active:bg-slate-100"
            >
              ×
            </button>
          </div>
          {children}
          <div className="mx-auto mt-4 h-1 w-10 rounded-full bg-slate-200" />
        </div>
      </div>
    )
  }

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
