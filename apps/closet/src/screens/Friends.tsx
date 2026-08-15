import { useEffect, useState } from 'react'
import { getAdapter } from '../adapters'
import { ChevronIcon, FriendsIcon } from '../components/Icons'
import { Avatar, Button, Empty, Field, SectionHead, inputClass } from '../components/ui'
import type { ClosetData } from '../hooks/useClosetData'
import { ago } from '../lib/format'
import {
  canShare,
  clearInviteCode,
  inviteLink,
  inviteMessage,
  isPlausiblePhone,
  shareInvite,
  smsHref,
} from '../lib/invite'
import type { BorrowStatus } from '../lib/types'

interface FriendsProps {
  data: ClosetData
  onOpenFriend: (userId: string) => void
  /** Code lifted out of an invite link, if they arrived by tapping one. */
  initialCode?: string | null
}

const BORROW_LABEL: Record<BorrowStatus, string> = {
  requested: 'Asked',
  declined: 'Not this time',
  lent: 'With them',
  returned: 'Back home',
}

export function Friends({ data, onOpenFriend, initialCode }: FriendsProps) {
  const adapter = getAdapter()
  const me = data.session?.userId ?? ''
  const myName = data.session?.profile.name ?? 'A friend'
  const myCode = data.session?.profile.code ?? ''

  const [code, setCode] = useState(initialCode ?? '')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  useEffect(() => {
    if (initialCode) setCode(initialCode)
  }, [initialCode])

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
      clearInviteCode()
      await data.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code did not work')
    } finally {
      setBusy(false)
    }
  }

  const copy = async (what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(what === 'code' ? myCode : inviteLink(myCode))
      setCopied(what)
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      setCopied(null)
    }
  }

  const phoneReady = isPlausiblePhone(phone)

  return (
    <div className="safe-top px-4">
      <header className="mb-7">
        <h1 className="display text-[34px] leading-[1.05]">Friends</h1>
        <p className="mt-1 text-[13px] text-graphite">Share a closet with someone you trust</p>
      </header>

      {/* Invite ---------------------------------------------------------- */}
      <section className="mb-8 border border-hairline bg-porcelain">
        <div className="border-b border-hairline px-4 py-5 text-center">
          <p className="u-label">Your invite code</p>
          <p className="display tnum mt-2 text-[40px] leading-none tracking-[0.2em]">{myCode}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => copy('code')}>
              {copied === 'code' ? 'Copied' : 'Copy code'}
            </Button>
            <Button variant="secondary" onClick={() => copy('link')}>
              {copied === 'link' ? 'Copied' : 'Copy link'}
            </Button>
          </div>
        </div>

        <div className="px-4 py-5">
          <p className="u-label mb-2 block">Invite by text</p>
          <div className="flex items-end gap-2">
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 555-5555"
              aria-label="Their phone number"
            />
            {phoneReady ? (
              <a
                href={smsHref(phone, inviteMessage(myName, myCode))}
                className="btn btn-ink shrink-0"
              >
                Text it
              </a>
            ) : (
              <Button disabled className="shrink-0">
                Text it
              </Button>
            )}
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-graphite">
            Opens Messages with the invite already written. The number stays on your phone —
            Closet never uploads it, never reads your contacts, and can't look anyone up by
            number.
          </p>
          {canShare() ? (
            <Button
              variant="secondary"
              full
              className="mt-4"
              onClick={() => void shareInvite(myName, myCode)}
            >
              Share another way
            </Button>
          ) : null}
        </div>
      </section>

      {/* Add by code ------------------------------------------------------ */}
      <section className="mb-8">
        {initialCode ? (
          <p className="mb-4 border border-bronze/40 bg-porcelain px-3 py-2.5 text-[13px] leading-relaxed">
            You opened an invite link. Tap <strong>Add</strong> to connect.
          </p>
        ) : null}
        <Field label="Add someone by code">
          <div className="flex items-end gap-2">
            <input
              className={`${inputClass} tnum uppercase tracking-[0.2em]`}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="DNC742"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Friend's invite code"
            />
            <Button onClick={add} disabled={code.trim().length < 6 || busy} className="shrink-0">
              Add
            </Button>
          </div>
        </Field>
        {message ? <p className="mt-3 text-[13px] text-bronze">{message}</p> : null}
        {error ? <p className="mt-3 text-[13px] text-claret">{error}</p> : null}
      </section>

      {incoming.length > 0 ? (
        <section className="mb-8">
          <SectionHead title="Wants to share closets" />
          <div className="space-y-2">
            {incoming.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 border border-hairline bg-porcelain p-3"
              >
                <Avatar name={f.name} />
                <p className="min-w-0 flex-1 truncate text-[15px]">{f.name}</p>
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

      <section className="mb-8">
        <SectionHead title="Your people" />
        {accepted.length === 0 && outgoing.length === 0 ? (
          <Empty
            icon={<FriendsIcon className="h-10 w-10" />}
            title="Nobody yet"
            body="Text your code to your best friend. Once you're connected you can see each other's closets and build outfits across both."
          />
        ) : (
          <div className="space-y-2">
            {accepted.map((f) => {
              const count = data.friendItems[f.userId]?.length ?? 0
              return (
                <div key={f.id} className="border border-hairline bg-porcelain">
                  <button
                    type="button"
                    onClick={() => onOpenFriend(f.userId)}
                    className="flex w-full items-center gap-3 p-3 text-left active:bg-stone"
                  >
                    <Avatar name={f.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px]">{f.name}</span>
                      <span className="block text-[12.5px] text-graphite">{count} pieces</span>
                    </span>
                    <ChevronIcon className="h-5 w-5 shrink-0 text-graphite" />
                  </button>
                  <label className="flex items-center gap-2.5 border-t border-hairline px-3 py-3 text-[13px]">
                    <input
                      type="checkbox"
                      checked={f.sizeCompatible}
                      onChange={async (e) => {
                        await adapter.setSizeCompatible(f.id, e.target.checked)
                        await data.refresh()
                      }}
                      className="h-5 w-5 accent-[#14110f]"
                    />
                    <span>We can wear each other's clothes</span>
                  </label>
                </div>
              )
            })}
            {outgoing.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 border border-dashed border-hairline p-3"
              >
                <Avatar name={f.name} />
                <p className="min-w-0 flex-1 truncate text-[15px] text-graphite">{f.name}</p>
                <span className="u-label">Waiting on them</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {borrowsToMe.length > 0 ? (
        <section className="mb-8">
          <SectionHead title="Asking to borrow" />
          <div className="space-y-2">
            {borrowsToMe.map((b) => (
              <div key={b.id} className="border border-hairline bg-porcelain p-3">
                <p className="text-[14.5px] leading-relaxed">
                  <span className="font-medium">{b.borrowerName}</span> wants your{' '}
                  <span className="font-medium">{b.itemName}</span>
                </p>
                {b.note ? <p className="mt-1 text-[13px] text-graphite">“{b.note}”</p> : null}
                <div className="mt-3 flex gap-2">
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
          <SectionHead title="Things you asked for" />
          <div className="space-y-2">
            {myBorrows.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 border border-hairline bg-porcelain p-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px]">{b.itemName}</span>
                  <span className="block text-[12.5px] text-graphite">
                    {b.ownerName} · {ago(b.createdAt)}
                  </span>
                </span>
                <span className="u-label shrink-0">{BORROW_LABEL[b.status]}</span>
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
