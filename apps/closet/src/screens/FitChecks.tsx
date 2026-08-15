import { useState } from 'react'
import { getAdapter } from '../adapters'
import { EyeIcon } from '../components/Icons'
import { ItemTile, OutfitStrip } from '../components/ItemTile'
import { Sheet } from '../components/Sheet'
import { Avatar, Button, Empty, Field, inputClass } from '../components/ui'
import type { ClosetData } from '../hooks/useClosetData'
import { ago } from '../lib/format'
import type { FitCheck, Item } from '../lib/types'

interface FitChecksProps {
  data: ClosetData
  onOpenFriend: (userId: string) => void
}

/**
 * "I have nothing to wear — you look at my closet."
 *
 * The one screen that does the thing no other closet app does: your friend
 * answers out of YOUR wardrobe, not out of a catalogue.
 */
export function FitChecks({ data, onOpenFriend }: FitChecksProps) {
  const adapter = getAdapter()
  const me = data.session?.userId ?? ''
  const friends = data.friends.filter((f) => f.status === 'accepted')

  const [asking, setAsking] = useState(false)
  const [askFriend, setAskFriend] = useState<string | null>(null)
  const [askNote, setAskNote] = useState('')
  const [answering, setAnswering] = useState<FitCheck | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [replyNote, setReplyNote] = useState('')
  const [busy, setBusy] = useState(false)

  const incoming = data.fitChecks.filter((f) => f.toUserId === me)
  const outgoing = data.fitChecks.filter((f) => f.fromUserId === me)

  const itemsFor = (userId: string): Item[] =>
    userId === me ? data.myItems : data.friendItems[userId] ?? []

  const lookup = (ids: string[]): Item[] =>
    ids.map((id) => data.allVisibleItems.find((i) => i.id === id)).filter((i): i is Item => !!i)

  const send = async () => {
    if (!askFriend || busy) return
    setBusy(true)
    try {
      await adapter.createFitCheck(askFriend, askNote.trim() || 'Help me pick something')
      setAsking(false)
      setAskNote('')
      setAskFriend(null)
      await data.refresh()
    } finally {
      setBusy(false)
    }
  }

  const reply = async () => {
    if (!answering || picked.length === 0 || busy) return
    setBusy(true)
    try {
      await adapter.replyFitCheck(answering.id, { itemIds: picked, note: replyNote.trim() })
      // File it in their wardrobe too, so it shows up under "sent to you".
      await adapter.saveOutfit({
        title: 'Fit check',
        itemIds: picked,
        note: replyNote.trim() || null,
        forUserId: answering.fromUserId,
      })
      setAnswering(null)
      setPicked([])
      setReplyNote('')
      await data.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="safe-top px-4">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="display text-[34px] leading-[1.05]">Fit check</h1>
          <p className="text-[13px] text-graphite">A second pair of eyes on your closet</p>
        </div>
        <Button onClick={() => setAsking(true)} disabled={friends.length === 0}>
          Ask
        </Button>
      </header>

      {friends.length === 0 ? (
        <Empty
          icon={<EyeIcon className="h-10 w-10" />}
          title="Add a friend first"
          body="Share your invite code from the Friends tab. Once you're connected you can ask each other what to wear."
        />
      ) : null}

      {incoming.length > 0 ? (
        <section className="mb-7">
          <h2 className="u-label mb-3 block">Asked of you</h2>
          <div className="space-y-3">
            {incoming.map((f) => (
              <article key={f.id} className="rounded-card border border-hairline bg-porcelain p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={f.fromName} />
                  <div className="min-w-0 flex-1">
                    <p className="display text-[19px] leading-tight">{f.fromName}</p>
                    <p className="text-[13px] text-graphite">{ago(f.createdAt)}</p>
                  </div>
                  {f.status === 'answered' ? (
                    <span className="rounded-full bg-stone px-2.5 py-1 text-[12px] font-semibold text-bronze">
                      Answered
                    </span>
                  ) : null}
                </div>
                <p className="mt-2.5 text-[14.5px] leading-relaxed">“{f.note}”</p>
                {f.replies.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {f.replies.map((r) => (
                      <div key={r.id} className="bg-stone p-3">
                        <OutfitStrip items={lookup(r.itemIds)} max={5} />
                        {r.note ? (
                          <p className="mt-2 text-[13.5px] leading-relaxed">{r.note}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => onOpenFriend(f.fromUserId)}
                  >
                    Their closet
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setAnswering(f)
                      setPicked([])
                      setReplyNote('')
                    }}
                  >
                    {f.status === 'answered' ? 'Send another' : 'Pick for them'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {outgoing.length > 0 ? (
        <section>
          <h2 className="u-label mb-3 block">You asked</h2>
          <div className="space-y-3">
            {outgoing.map((f) => (
              <article key={f.id} className="rounded-card border border-hairline bg-porcelain p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={f.toName} size={32} />
                  <p className="min-w-0 flex-1 truncate text-[14px]">
                    <span className="font-semibold">{f.toName}</span>
                    <span className="text-graphite"> · {ago(f.createdAt)}</span>
                  </p>
                  {f.status === 'open' ? (
                    <span className="rounded-full bg-stone px-2.5 py-1 text-[12px] font-semibold text-graphite">
                      Waiting
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-graphite">“{f.note}”</p>
                {f.replies.map((r) => (
                  <div key={r.id} className="mt-3 bg-claret-wash/60 p-3">
                    <p className="u-label mb-2 block">{r.authorName} picked:</p>
                    <OutfitStrip items={lookup(r.itemIds)} max={5} />
                    {r.note ? (
                      <p className="mt-2 text-[13.5px] leading-relaxed">{r.note}</p>
                    ) : null}
                  </div>
                ))}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {friends.length > 0 && incoming.length === 0 && outgoing.length === 0 ? (
        <Empty
          icon={<EyeIcon className="h-10 w-10" />}
          title="Nothing to look at yet"
          body="Stuck in front of your closet? Ask a friend — they'll pick from what you actually own."
          action={<Button onClick={() => setAsking(true)}>Ask a friend</Button>}
        />
      ) : null}

      {/* Ask ------------------------------------------------------------- */}
      <Sheet
        open={asking}
        title="Ask for a fit check"
        onClose={() => setAsking(false)}
        footer={
          <Button full onClick={send} disabled={!askFriend || busy}>
            {busy ? 'Sending…' : 'Send'}
          </Button>
        }
      >
        <div className="space-y-5">
          <div>
            <p className="u-label mb-2 block">
              Who
            </p>
            <div className="space-y-2">
              {friends.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAskFriend(f.userId)}
                  className={`flex min-h-[56px] w-full items-center gap-3 border px-4 text-left ${
                    askFriend === f.userId
                      ? 'border-ink bg-claret-wash/50'
                      : 'border-hairline bg-porcelain'
                  }`}
                >
                  <Avatar name={f.name} size={36} />
                  <span className="font-semibold">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
          <Field label="What's the occasion?">
            <textarea
              className={`${inputClass} min-h-[96px] resize-none`}
              value={askNote}
              onChange={(e) => setAskNote(e.target.value)}
              placeholder="dinner at 7 and I've got nothing"
              aria-label="What's the occasion?"
            />
          </Field>
        </div>
      </Sheet>

      {/* Answer ---------------------------------------------------------- */}
      <Sheet
        open={answering !== null}
        title={answering ? `Pick for ${answering.fromName}` : ''}
        onClose={() => setAnswering(null)}
        footer={
          <Button full onClick={reply} disabled={picked.length === 0 || busy}>
            {busy
              ? 'Sending…'
              : picked.length === 0
                ? 'Pick some pieces'
                : `Send ${picked.length} ${picked.length === 1 ? 'piece' : 'pieces'}`}
          </Button>
        }
      >
        {answering ? (
          <div className="space-y-4">
            <p className="bg-stone px-3 py-2.5 text-[14px] leading-relaxed">
              “{answering.note}”
            </p>
            <p className="text-[13px] text-graphite">
              Everything below is from {answering.fromName}'s closet — tap what they should wear.
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {itemsFor(answering.fromUserId).map((item) => (
                <ItemTile
                  key={item.id}
                  item={item}
                  showWorn={false}
                  selected={picked.includes(item.id)}
                  onClick={() =>
                    setPicked((cur) =>
                      cur.includes(item.id)
                        ? cur.filter((id) => id !== item.id)
                        : [...cur, item.id],
                    )
                  }
                />
              ))}
            </div>
            <Field label="Say something">
              <textarea
                className={`${inputClass} min-h-[80px] resize-none`}
                value={replyNote}
                onChange={(e) => setReplyNote(e.target.value)}
                placeholder="this with the gold hoops, trust me"
                aria-label="Say something"
              />
            </Field>
          </div>
        ) : null}
      </Sheet>
    </div>
  )
}
