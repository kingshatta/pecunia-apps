import type { ButtonHTMLAttributes, ReactNode } from 'react'

/* Small shared primitives. Kept in one file so the visual language — radius,
   tap targets, chip states — is defined once. */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  full?: boolean
}

export function Button({
  variant = 'primary',
  full = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const styles: Record<string, string> = {
    primary: 'bg-ink text-paper active:bg-ink/85 disabled:bg-muted/40',
    secondary: 'bg-surface text-ink border border-line active:bg-paper',
    ghost: 'bg-transparent text-muted active:bg-paper',
    danger: 'bg-berry-soft text-berry active:bg-berry/15',
  }
  return (
    <button
      {...rest}
      className={`min-h-[48px] rounded-2xl px-5 text-[15px] font-semibold tracking-tight transition-colors disabled:opacity-60 ${
        full ? 'w-full' : ''
      } ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

interface ChipsProps<T extends string> {
  options: { value: T; label: string }[]
  selected: T[]
  onToggle: (value: T) => void
  ariaLabel: string
}

export function Chips<T extends string>({
  options,
  selected,
  onToggle,
  ariaLabel,
}: ChipsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const on = selected.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.value)}
            className={`min-h-[44px] rounded-full border px-4 text-[15px] font-medium transition-colors ${
              on
                ? 'border-ink bg-ink text-paper'
                : 'border-line bg-surface text-muted active:bg-paper'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

interface EmptyProps {
  icon: ReactNode
  title: string
  body: string
  action?: ReactNode
}

/** Empty states are designed here, not left to chance. */
export function Empty({ icon, title, body, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      <div className="mb-3 text-muted/70">{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-[28ch] text-sm leading-relaxed text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-berry-soft font-semibold text-berry"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {letters || '?'}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-[13px] text-muted">{hint}</span> : null}
    </label>
  )
}

export const inputClass =
  'w-full rounded-2xl border border-line bg-surface px-4 py-3 text-[16px] outline-none placeholder:text-muted/60 focus:border-ink'
