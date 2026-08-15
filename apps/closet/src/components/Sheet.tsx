import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from './Icons'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Optional sticky footer, e.g. a save button. */
  footer?: ReactNode
}

/** Bottom sheet. Everything modal in this app uses it, so it's the one place
 *  that handles the backdrop, escape key and scroll-locking. */
export function Sheet({ open, title, onClose, children, footer }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-ink/30"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet-up relative mx-auto flex max-h-[88vh] w-full max-w-[560px] flex-col border-t border-hairline bg-porcelain"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-hairline px-5 py-4">
          <h2 className="display text-[21px] leading-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex h-11 w-11 items-center justify-center text-graphite"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="safe-bottom shrink-0 border-t border-hairline px-5 pt-4">{footer}</div>
        ) : (
          <div className="safe-bottom" />
        )}
      </div>
    </div>
  )
}
