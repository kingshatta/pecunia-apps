import { useMemo, useState } from 'react'
import { getAdapter } from '../adapters'
import { LocalDemoAdapter } from '../adapters/LocalDemoAdapter'
import { ItemTile } from '../components/ItemTile'
import { Avatar, Button, Field, inputClass } from '../components/ui'
import type { ClosetData } from '../hooks/useClosetData'
import { freshness } from '../lib/outfit'

export function Me({ data }: { data: ClosetData }) {
  const adapter = getAdapter()
  const profile = data.session?.profile
  const [name, setName] = useState(profile?.name ?? '')
  const [sizes, setSizes] = useState(profile?.sizes ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  /** The retention hook: what you own and never reach for. */
  const dusty = useMemo(() => {
    const now = Date.now()
    return [...data.myItems]
      .filter((i) => i.category !== 'jewelry' && i.category !== 'accessory')
      .sort((a, b) => freshness(b, now) - freshness(a, now))
      .slice(0, 6)
  }, [data.myItems])

  const save = async () => {
    setBusy(true)
    try {
      await adapter.updateProfile({ name: name.trim(), sizes: sizes.trim() || null })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
      await data.refresh()
    } finally {
      setBusy(false)
    }
  }

  const wornThisMonth = data.myItems.filter(
    (i) => i.lastWornAt && Date.now() - new Date(i.lastWornAt).getTime() < 30 * 86_400_000,
  ).length

  return (
    <div className="safe-top px-4">
      <header className="mb-6 flex items-center gap-4">
        <Avatar name={profile?.name ?? 'You'} size={56} />
        <div className="min-w-0">
          <h1 className="truncate display text-[32px] leading-[1.05]">
            {profile?.name ?? 'You'}
          </h1>
          <p className="font-mono text-[14px] tracking-[0.14em] text-graphite">{profile?.code}</p>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Pieces', value: data.myItems.length },
          { label: 'Worn this month', value: wornThisMonth },
          { label: 'Friends', value: data.friends.filter((f) => f.status === 'accepted').length },
        ].map((s) => (
          <div key={s.label} className="rounded-card border border-hairline bg-porcelain p-3 text-center">
            <p className="text-[24px] font-semibold leading-tight">{s.value}</p>
            <p className="mt-0.5 text-[12px] leading-tight text-graphite">{s.label}</p>
          </div>
        ))}
      </section>

      {dusty.length > 0 ? (
        <section className="mb-7">
          <h2 className="u-label">Gathering dust</h2>
          <p className="mb-3 text-[13.5px] leading-relaxed text-graphite">
            Yours, and hardly worn. The outfit engine pushes these up on purpose.
          </p>
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
            <div className="flex w-max gap-3">
              {dusty.map((item) => (
                <div key={item.id} className="w-32 shrink-0">
                  <ItemTile item={item} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mb-7 space-y-4">
        <h2 className="u-label">Your details</h2>
        <Field label="Name">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Your name"
          />
        </Field>
        <Field
          label="Sizes"
          hint="Shown to friends so they know what of yours actually fits them."
        >
          <input
            className={inputClass}
            value={sizes}
            onChange={(e) => setSizes(e.target.value)}
            placeholder="S · 26 · 7"
            aria-label="Your sizes"
          />
        </Field>
        <Button onClick={save} disabled={busy || !name.trim()}>
          {saved ? 'Saved' : busy ? 'Saving…' : 'Save'}
        </Button>
      </section>

      <section className="space-y-3 border-t border-hairline pt-6">
        {adapter.demo ? (
          <>
            <p className="text-[13.5px] leading-relaxed text-graphite">
              You're in demo mode: everything lives on this device, and the closet you're looking
              at is seeded sample data.
            </p>
            <Button
              variant="secondary"
              full
              onClick={async () => {
                if (adapter instanceof LocalDemoAdapter) adapter.reset()
                await data.refresh()
              }}
            >
              Reset the demo
            </Button>
          </>
        ) : null}
        <Button
          variant="danger"
          full
          onClick={async () => {
            await adapter.signOut()
            await data.refresh()
          }}
        >
          Sign out
        </Button>
      </section>
    </div>
  )
}
