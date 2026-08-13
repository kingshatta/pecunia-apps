import { useState } from 'react'
import { getAdapter } from '../adapters'
import { ChevronIcon, FriendsIcon } from '../components/Icons'
import { Avatar, Button, Empty, Field, inputClass } from '../components/ui'
import type { ClosetData } from '../hooks/useClosetData'
import { ago } from '../lib/format'
import type { BorrowStatus } from '../lib/types'

interface FriendsProps {
  data: ClosetData
  onOpenFriend: (userId: string) => void
}

const BORROW_LABEL: Record<BorrowStatus, string> = {
  requested: 'Asked',
  declined: 'Not this time',
  lent: 'With them',
  returned: 'Back home',
}

export function Friends({ data, onOpenFriend }: FriendsProps) {
  const adapter = getAdapter()
  const me = data.session?.userId ?? ''
  const myCode = data.session?.profile.code ?? ''

  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const accepted = data.friends.filter((f) => f.status === 'accepted')
  const incoming = data.friends.filter((f) => f.status === 'pending-in')
  const outgoing = data.friends.filter((f) => f.status === 'pending-out')

  const borrowsToMe = data.borrows.filter((b) => b.ownerId === me && b.status === 'requested')
  const myBorrows = data.borrows.filter((b) => b.borrowerId === me)

  const add = async () => {
    if (!code.trim() || busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const friend = await adapter.requestFriend(code)
      setMessage(
        friend.status === 'accepted'
          ? `You and ${friend.name} are connected.`
          : `Request sent to ${friend.name}.`,
      )
      setCode('')
      await data.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code did not work')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(myCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="safe-top px-4">
      <header className="mb-4">
        <h1 className="text-[28px] font-semibold tracking-tight">Friends</h1>
        <p className="text-sm text-muted">Swap codes, share closets</p>
      </header>

      <section className="mb-6 rounded-card border border-line bg-surface p-4">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          Your invite code
        </p>
        <div className="mt-2 flex items-center gap-3">
          <p className="font-mono text-[30px] font-bold tracking-[0.18em]">{myCode}</p>
          <Button variant="secondary" onClick={copy} className="ml-auto">
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Text this to someone you'd actually swap clothes with. Closet never reads your
          contacts.
        </p>
      </section>

      <section className="mb-7">
        <Field label="Add someone by code">
          <div className="flex gap-2">
            <input
              className={`${inputClass} font-mono uppercase tracking-[0.18em]`}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="AALIYA"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Friend's invite code"
            />
            <Button onClick={add} disabled={code.trim().length < 6 || busy}>
              Add
            </Button>
          </div>
        </Field>
        {message ? <p className="mt-2 text-sm font-medium text-sage">{message}</p> : null}
        {error ? <p className="mt-2 text-sm font-medium text-berry">{error}</p> : null}
      </section>

      {incoming.length > 0 ? (
        <section className="mb-7">
          <h2 className="mb-3 text-[15px] font-semibold">Wants to share closets</h2>
          <div className="space-y-2">
            {incoming.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-card border border-line bg-surface p-3"
              >
                <Avatar name={f.name} />
                <p className="min-w-0 flex-1 truncate font-semibold">{f.name}</p>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await adapter.removeFriend(f.id)
                    await data.refresh()
                  }}
                >
                  Ignore
                </Button>
                <Button
                  onClick={async () => {
                    await adapter.acceptFriend(f.id)
                    await data.refresh()
                  }}
                >
                  Accept
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-7">
        <h2 className="mb-3 text-[15px] font-semibold">Your people</h2>
        {accepted.length === 0 && outgoing.length === 0 ? (
          <Empty
            icon={<FriendsIcon className="h-10 w-10" />}
            title="Nobody yet"
            body="Send your code to your best friend. Once you're connected you can see each other's closets and build outfits across both."
          />
        ) : (
          <div className="space-y-2">
            {accepted.map((f) => {
              const count = data.friendItems[f.userId]?.length ?? 0
              return (
                <div key={f.id} className="rounded-card border border-line bg-surface">
                  <button
                    type="button"
                    onClick={() => onOpenFriend(f.userId)}
                    className="flex w-full items-center gap-3 p-3 text-left active:bg-paper"
                  >
                    <Avatar name={f.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{f.name}</span>
                      <span className="block text-[13px] text-muted">{count} pieces</span>
                    </span>
                    <ChevronIcon className="h-5 w-5 shrink-0 text-muted" />
                  </button>
                  <div className="flex items-center justify-between border-t border-line px-3 py-2.5">
                    <label className="flex items-center gap-2.5 text-[13.5px]">
                      <input
                        type="checkbox"
                        checked={f.sizeCompatible}
                        onChange={async (e) => {
                          await adapter.setSizeCompatible(f.id, e.target.checked)
                          await data.refresh()
                        }}
                        className="h-5 w-5 accent-[#1b1420]"
                      />
                      <span>We can wear each other's clothes</span>
                    </label>
                  </div>
                </div>
              )
            })}
            {outgoing.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-card border border-dashed border-line bg-surface/60 p-3"
              >
                <Avatar name={f.name} />
                <p className="min-w-0 flex-1 truncate font-semibold text-muted">{f.name}</p>
                <span className="text-[13px] text-muted">Waiting on them</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {borrowsToMe.length > 0 ? (
        <section className="mb-7">
          <h2 className="mb-3 text-[15px] font-semibold">Asking to borrow</h2>
          <div className="space-y-2">
            {borrowsToMe.map((b) => (
              <div key={b.id} className="rounded-card border border-line bg-surface p-3">
                <p className="text-[14.5px]">
                  <span className="font-semibold">{b.borrowerName}</span> wants your{' '}
                  <span className="font-semibold">{b.itemName}</span>
                </p>
                {b.note ? <p className="mt-1 text-[13.5px] text-muted">“{b.note}”</p> : null}
                <div className="mt-2.5 flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={async () => {
                      await adapter.setBorrowStatus(b.id, 'declined')
                      await data.refresh()
                    }}
                  >
                    Not this time
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      await adapter.setBorrowStatus(b.id, 'lent')
                      await data.refresh()
                    }}
                  >
                    It's yours
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {myBorrows.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[15px] font-semibold">Things you asked for</h2>
          <div className="space-y-2">
            {myBorrows.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-card border border-line bg-surface p-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold">{b.itemName}</span>
                  <span className="block text-[13px] text-muted">
                    {b.ownerName} · {ago(b.createdAt)}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-paper px-2.5 py-1 text-[12px] font-semibold text-muted">
                  {BORROW_LABEL[b.status]}
                </span>
                {b.status === 'lent' ? (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await adapter.setBorrowStatus(b.id, 'returned')
                      await data.refresh()
                    }}
                  >
                    Gave back
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
