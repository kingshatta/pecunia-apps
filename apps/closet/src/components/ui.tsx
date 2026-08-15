import type { ButtonHTMLAttributes, ReactNode } from 'react'

/* Shared primitives. The visual language — squared geometry, hairline rules,
   wide-tracked caps — is defined once in index.css and applied here. */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  full?: boolean
}

const VARIANT: Record<string, string> = {
  primary: 'btn-ink',
  secondary: 'btn-quiet',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

export function Button({
  variant = 'primary',
  full = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={`btn ${VARIANT[variant]} ${full ? 'w-full' : ''} ${className}`}
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
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={selected.includes(o.value)}
          onClick={() => onToggle(o.value)}
          className="chip"
        >
          {o.label}
        </button>
      ))}
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
    <div className="flex flex-col items-center border border-hairline px-6 py-14 text-center">
      <div className="mb-4 text-graphite/50">{icon}</div>
      <h3 className="display text-[22px] leading-tight">{title}</h3>
      <p className="mt-2 max-w-[30ch] text-[13.5px] leading-relaxed text-graphite">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
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
      className="display flex shrink-0 items-center justify-center rounded-full border border-hairline bg-stone text-ink"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
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
      <span className="u-label mb-1 block">{label}</span>
      {children}
      {hint ? (
        <span className="mt-2 block text-[12.5px] leading-relaxed text-graphite">{hint}</span>
      ) : null}
    </label>
  )
}

/** A caps label sitting on a hairline rule. The section marker of the app. */
export function SectionHead({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="section-head mb-4">
      <h2 className="u-label">{title}</h2>
      {action}
    </div>
  )
}

export const inputClass = 'input'
