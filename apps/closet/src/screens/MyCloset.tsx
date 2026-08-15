import { useMemo, useState } from 'react'
import { getAdapter } from '../adapters'
import { HangerIcon, PlusIcon } from '../components/Icons'
import { ItemTile } from '../components/ItemTile'
import { Sheet } from '../components/Sheet'
import { Button, Chips, Empty } from '../components/ui'
import { wornLabel } from '../lib/format'
import {
  CATEGORIES,
  CATEGORY_LABEL,
  VIBES,
  VIBE_LABEL,
  WARMTHS,
  WARMTH_LABEL,
  WARMTH_SEASON,
  type Category,
  type Item,
  type Vibe,
  type Warmth,
} from '../lib/types'

interface MyClosetProps {
  items: Item[]
  onAdd: () => void
  onChanged: () => Promise<void>
}

export function MyCloset({ items, onAdd, onChanged }: MyClosetProps) {
  const adapter = getAdapter()
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [open, setOpen] = useState<Item | null>(null)
  const [busy, setBusy] = useState(false)

  const present = useMemo(() => {
    const set = new Set(items.map((i) => i.category))
    return CATEGORIES.filter((c) => set.has(c))
  }, [items])

  const shown = filter === 'all' ? items : items.filter((i) => i.category === filter)

  const patch = async (item: Item, next: Partial<Pick<Item, 'warmth' | 'vibes'>>) => {
    setBusy(true)
    try {
      const updated = await adapter.updateItem(item.id, next)
      setOpen(updated)
      await onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="safe-top px-4">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="display text-[34px] leading-[1.05]">My closet</h1>
          <p className="text-[13px] text-graphite">
            {items.length} {items.length === 1 ? 'piece' : 'pieces'}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-[48px] items-center gap-1.5 bg-ink px-4 font-semibold text-stone active:bg-ink/85"
        >
          <PlusIcon className="h-5 w-5" />
          Add
        </button>
      </header>

      {items.length === 0 ? (
        <Empty
          icon={<HangerIcon className="h-10 w-10" />}
          title="Nothing in here yet"
          body="Add a few pieces and the outfit suggestions start working. Ten is enough to see it click."
          action={<Button onClick={onAdd}>Add your first piece</Button>}
        />
      ) : (
        <>
          <div className="no-scrollbar -mx-4 mb-4 overflow-x-auto px-4">
            <div className="w-max">
              <Chips
                ariaLabel="Filter by type"
                options={[
                  { value: 'all' as const, label: `All ${items.length}` },
                  ...present.map((c) => ({ value: c, label: CATEGORY_LABEL[c] })),
                ]}
                selected={[filter]}
                onToggle={(v) => setFilter(v)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map((item) => (
              <ItemTile key={item.id} item={item} onClick={setOpen} />
            ))}
          </div>
        </>
      )}

      <Sheet
        open={open !== null}
        title={open?.name ?? ''}
        onClose={() => setOpen(null)}
        footer={
          open ? (
            <Button
              full
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await adapter.markWorn([open.id])
                  setOpen(null)
                  await onChanged()
                } finally {
                  setBusy(false)
                }
              }}
            >
              I wore this today
            </Button>
          ) : undefined
        }
      >
        {open ? (
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="h-40 w-32 shrink-0 overflow-hidden rounded-card border border-hairline bg-stone">
                <img
                  src={open.imageUrl}
                  alt={open.name}
                  className="h-full w-full object-contain p-1.5"
                />
              </div>
              <dl className="min-w-0 flex-1 space-y-2 text-[14px]">
                <div>
                  <dt className="text-graphite">Type</dt>
                  <dd className="font-medium">{CATEGORY_LABEL[open.category]}</dd>
                </div>
                <div>
                  <dt className="text-graphite">Colour</dt>
                  <dd className="font-medium">
                    {open.colorName}
                    {open.neutral ? ' · goes with everything' : ''}
                  </dd>
                </div>
                {open.size ? (
                  <div>
                    <dt className="text-graphite">Size</dt>
                    <dd className="font-medium">{open.size}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-graphite">Last worn</dt>
                  <dd className="font-medium">{wornLabel(open.lastWornAt, open.wearCount)}</dd>
                </div>
              </dl>
            </div>

            <div>
              <p className="u-label mb-2 block">
                Warm enough for
              </p>
              <Chips
                ariaLabel="Warmth"
                options={WARMTHS.map((w) => ({
                  value: w,
                  label: `${WARMTH_LABEL[w]} · ${WARMTH_SEASON[w]}`,
                }))}
                selected={open.warmth}
                onToggle={(w: Warmth) =>
                  void patch(open, {
                    warmth: open.warmth.includes(w)
                      ? open.warmth.filter((x) => x !== w)
                      : [...open.warmth, w],
                  })
                }
              />
            </div>

            <div>
              <p className="u-label mb-2 block">
                Vibe
              </p>
              <Chips
                ariaLabel="Vibe"
                options={VIBES.map((v) => ({ value: v, label: VIBE_LABEL[v] }))}
                selected={open.vibes}
                onToggle={(v: Vibe) =>
                  void patch(open, {
                    vibes: open.vibes.includes(v)
                      ? open.vibes.filter((x) => x !== v)
                      : [...open.vibes, v],
                  })
                }
              />
            </div>

            <Button
              variant="danger"
              full
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await adapter.deleteItem(open.id)
                  setOpen(null)
                  await onChanged()
                } finally {
                  setBusy(false)
                }
              }}
            >
              Remove from closet
            </Button>
          </div>
        ) : null}
      </Sheet>
    </div>
  )
}
