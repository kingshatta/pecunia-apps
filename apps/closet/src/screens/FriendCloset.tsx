import { useState } from 'react'
import { getAdapter } from '../adapters'
import type { Session } from '../adapters/DataAdapter'
import { BackIcon, HangerIcon } from '../components/Icons'
import { ItemTile } from '../components/ItemTile'
import { Sheet } from '../components/Sheet'
import { Button, Chips, Empty, Field, inputClass } from '../components/ui'
import { wornLabel } from '../lib/format'
import { CATEGORY_LABEL, type Friend, type Item } from '../lib/types'

interface FriendClosetProps {
  friend: Friend
  items: Item[]
  myItems: Item[]
  session: Session
  onBack: () => void
  onChanged: () => Promise<void>
}

type Mode = 'browse' | 'build'

/**
 * Their wardrobe, from your phone. Browse mode is for borrowing; build mode is
 * for putting an outfit together out of their things (and yours) and sending
 * it over.
 */
export function FriendCloset({
  friend,
  items,
  myItems,
  onBack,
  onChanged,
}: FriendClosetProps) {
  const adapter = getAdapter()
  const [mode, setMode] = useState<Mode>('browse')
  const [detail, setDetail] = useState<Item | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [note, setNote] = useState('')
  const [borrowNote, setBorrowNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const toggle = (item: Item) =>
    setPicked((cur) =>
      cur.includes(item.id) ? cur.filter((id) => id !== item.id) : [...cur, item.id],
    )

  const send = async () => {
    if (picked.length === 0 || busy) return
    setBusy(true)
    try {
      await adapter.saveOutfit({
        title: 'An idea for you',
        itemIds: picked,
        note: note.trim() || null,
        forUserId: friend.userId,
      })
      setSending(false)
      setPicked([])
      setNote('')
      setFlash(`Sent to ${friend.name}`)
      window.setTimeout(() => setFlash(null), 2400)
      await onChanged()
    } finally {
      setBusy(false)
    }
  }

  const askToBorrow = async () => {
    if (!detail || busy) return
    setBusy(true)
    try {
      await adapter.requestBorrow(detail.id, borrowNote.trim())
      setDetail(null)
      setBorrowNote('')
      setFlash(`Asked ${friend.name} for it`)
      window.setTimeout(() => setFlash(null), 2400)
      await onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="safe-top px-4 pb-24">
      <header className="mb-4">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 mb-2 flex min-h-[44px] items-center gap-1 pr-3 text-[14px] font-semibold text-muted"
        >
          <BackIcon className="h-5 w-5" />
          Back
        </button>
        <h1 className="text-[28px] font-semibold tracking-tight">{friend.name}'s closet</h1>
        <p className="text-sm text-muted">
          {items.length} pieces
          {friend.sizeCompatible ? '' : ' · different sizes, so borrowing is off'}
        </p>
      </header>

      <div className="mb-4">
        <Chips
          ariaLabel="Mode"
          options={[
            { value: 'browse' as const, label: 'Browse' },
            { value: 'build' as const, label: `Build for ${friend.name}` },
          ]}
          selected={[mode]}
          onToggle={(m) => {
            setMode(m)
            setPicked([])
          }}
        />
      </div>

      {flash ? (
        <p className="mb-4 rounded-card bg-sage-soft px-4 py-3 text-[14px] font-semibold text-sage">
          {flash}
        </p>
      ) : null}

      {items.length === 0 ? (
        <Empty
          icon={<HangerIcon className="h-10 w-10" />}
          title={`${friend.name} hasn't added anything`}
          body="Once they photograph a few pieces you'll see their closet here."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => (
              <ItemTile
                key={item.id}
                item={item}
                selected={picked.includes(item.id)}
                onClick={mode === 'build' ? toggle : setDetail}
              />
            ))}
          </div>

          {mode === 'build' && myItems.length > 0 ? (
            <section className="mt-7">
              <h2 className="mb-3 text-[15px] font-semibold">Add something of yours</h2>
              <p className="mb-3 text-[13.5px] leading-relaxed text-muted">
                Mixing both closets is the point — lend them a piece as part of the outfit.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {myItems.map((item) => (
                  <ItemTile
                    key={item.id}
                    item={item}
                    badge="Yours"
                    selected={picked.includes(item.id)}
                    onClick={toggle}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      {mode === 'build' && picked.length > 0 ? (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pt-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[560px] items-center gap-3">
            <p className="flex-1 text-[14px] font-semibold">
              {picked.length} {picked.length === 1 ? 'piece' : 'pieces'} picked
            </p>
            <Button variant="ghost" onClick={() => setPicked([])}>
              Clear
            </Button>
            <Button onClick={() => setSending(true)}>Send it</Button>
          </div>
        </div>
      ) : null}

      {/* Browse: item detail + borrow ------------------------------------ */}
      <Sheet
        open={detail !== null}
        title={detail?.name ?? ''}
        onClose={() => setDetail(null)}
        footer={
          detail && friend.sizeCompatible ? (
            <Button full onClick={askToBorrow} disabled={busy}>
              {busy ? 'Asking…' : 'Ask to borrow'}
            </Button>
          ) : undefined
        }
      >
        {detail ? (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="h-40 w-32 shrink-0 overflow-hidden rounded-card border border-line bg-paper">
                <img
                  src={detail.imageUrl}
                  alt={detail.name}
                  className="h-full w-full object-contain p-1.5"
                />
              </div>
              <dl className="min-w-0 flex-1 space-y-2 text-[14px]">
                <div>
                  <dt className="text-muted">Type</dt>
                  <dd className="font-medium">{CATEGORY_LABEL[detail.category]}</dd>
                </div>
                <div>
                  <dt className="text-muted">Colour</dt>
                  <dd className="font-medium">{detail.colorName}</dd>
                </div>
                {detail.size ? (
                  <div>
                    <dt className="text-muted">Size</dt>
                    <dd className="font-medium">{detail.size}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted">Last worn</dt>
                  <dd className="font-medium">
                    {wornLabel(detail.lastWornAt, detail.wearCount)}
                  </dd>
                </div>
              </dl>
            </div>
            {friend.sizeCompatible ? (
              <Field label="Say why (optional)">
                <input
                  className={inputClass}
                  value={borrowNote}
                  onChange={(e) => setBorrowNote(e.target.value)}
                  placeholder="for Friday, back Sunday"
                  aria-label="Borrow note"
                />
              </Field>
            ) : (
              <p className="rounded-xl bg-paper px-3 py-2.5 text-[13.5px] leading-relaxed text-muted">
                You've marked that you two wear different sizes, so borrowing is turned off. You
                can change that on the Friends tab.
              </p>
            )}
          </div>
        ) : null}
      </Sheet>

      {/* Build: send ------------------------------------------------------ */}
      <Sheet
        open={sending}
        title={`Send to ${friend.name}`}
        onClose={() => setSending(false)}
        footer={
          <Button full onClick={send} disabled={busy}>
            {busy ? 'Sending…' : 'Send outfit'}
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-[14px] leading-relaxed text-muted">
            {picked.length} pieces. It'll show up under “Saved &amp; sent to you” on their phone.
          </p>
          <Field label="Add a note">
            <textarea
              className={`${inputClass} min-h-[96px] resize-none`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="wear this Saturday, you can borrow my jacket for it"
              aria-label="Note"
            />
          </Field>
        </div>
      </Sheet>
    </div>
  )
}
