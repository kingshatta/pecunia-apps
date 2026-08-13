import { useState, type FormEvent } from 'react'
import { getAdapter } from '../adapters'
import { HangerIcon } from '../components/Icons'
import { Button, Field, inputClass } from '../components/ui'

export function Onboarding({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const adapter = getAdapter()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!value.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const { needsEmailLink } = await adapter.signIn(value)
      if (needsEmailLink) setSent(true)
      else await onSignedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-[560px] flex-col justify-center px-6 pb-10">
      <div className="mb-8">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-paper">
          <HangerIcon className="h-7 w-7" />
        </div>
        <h1 className="text-[32px] font-semibold leading-tight tracking-tight">
          Your closet,
          <br />
          with your people in it.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Photograph what you own, get outfits that actually go together, and let your best
          friend pick your fit when you're staring at a full closet with nothing to wear.
        </p>
      </div>

      {sent ? (
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-base font-semibold">Check your email</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            We sent a sign-in link to {value}. Open it on this phone and you'll land right back
            here.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field
            label={adapter.demo ? 'What should we call you?' : 'Your email'}
            hint={
              adapter.demo
                ? 'Demo mode — everything stays on this device, and a wardrobe is already loaded so you can try it properly.'
                : "We'll email you a sign-in link. No password to remember."
            }
          >
            <input
              className={inputClass}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              type={adapter.demo ? 'text' : 'email'}
              inputMode={adapter.demo ? 'text' : 'email'}
              autoComplete={adapter.demo ? 'nickname' : 'email'}
              placeholder={adapter.demo ? 'Sheen' : 'you@example.com'}
              aria-label={adapter.demo ? 'Your name' : 'Your email'}
            />
          </Field>

          {error ? <p className="text-sm font-medium text-berry">{error}</p> : null}

          <Button type="submit" full disabled={!value.trim() || busy}>
            {busy ? 'One moment…' : adapter.demo ? "Let's go" : 'Send me a link'}
          </Button>
        </form>
      )}

      <p className="mt-8 text-[13px] leading-relaxed text-muted">
        Friends are added with a six-character code you share yourself. Closet never reads your
        contacts.
      </p>
    </div>
  )
}
