import { useMemo, useState } from 'react'
import { getAdapter } from '../adapters'
import { EyeIcon, ShuffleIcon, SparkIcon } from '../components/Icons'
import { OutfitStrip } from '../components/ItemTile'
import { Button, Chips, Empty } from '../components/ui'
import type { ClosetData } from '../hooks/useClosetData'
import { ago } from '../lib/format'
import { suggestOutfits } from '../lib/outfit'
import {
  VIBES,
  VIBE_LABEL,
  WARMTHS,
  WARMTH_LABEL,
  type Item,
  type Vibe,
  type Warmth,
} from '../lib/types'

interface OutfitsProps {
  data: ClosetData
  onAdd: () => void
  onOpenFriend: (userId: string) => void
  onOpenFitChecks: () => void
}

const PAGE = 4

export function Outfits({ data, onAdd, onOpenFriend, onOpenFitChecks }: OutfitsProps) {
  const adapter = getAdapter()
  const [warmth, setWarmth] = useState<Warmth | 'any'>('any')
  const [vibe, setVibe] = useState<Vibe | 'any'>('any')
  const [collabWith, setCollabWith] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const me = data.session?.userId ?? ''
  const collabFriends = data.friends.filter((f) => f.status === 'accepted' && f.sizeCompatible)
  const activeFriend = collabWith ? data.friends.find((f) => f.userId === collabWith) : null

  const pool = useMemo(() => {
    if (!collabWith) return data.myItems
    return [...data.myItems, ...(data.friendItems[collabWith] ?? [])]
  }, [collabWith, data.myItems, data.friendItems])

  const suggestions = useMemo(
    () =>
      suggestOutfits({
        pool,
        wearerId: me,
        warmth: warmth === 'any' ? null : warmth,
        vibe: vibe === 'any' ? null : vibe,
        limit: 20,
        friendName: activeFriend?.name ?? null,
      }),
    [pool, me, warmth, vibe, activeFriend],
  )

  const visible = useMemo(() => {
    if (suggestions.length === 0) return []
    const start = (page * PAGE) % suggestions.length
    const out = []
    for (let i = 0; i < Math.min(PAGE, suggestions.length); i++) {
      out.push(suggestions[(start + i) % suggestions.length])
    }
    return out
  }, [suggestions, page])

  const itemsById = useMemo(() => {
    const m = new Map<string, Item>()
    for (const i of data.allVisibleItems) m.set(i.id, i)
    return m
  }, [data.allVisibleItems])

  const incoming = data.fitChecks.filter((f) => f.toUserId === me && f.status === 'open')

  return (
    <div className="safe-top px-4">
      <header className="mb-4">
        <h1 className="display text-[34px] leading-[1.05]">What to wear</h1>
        <p className="text-[13px] text-graphite">
          {data.myItems.length} pieces
          {activeFriend ? ` + ${activeFriend.name}'s closet` : ''}
        </p>
      </header>

      {incoming.length > 0 ? (
        <button
          type="button"
          onClick={onOpenFitChecks}
          className="mb-4 flex w-full items-center gap-3 rounded-card border border-claret/25 bg-claret-wash px-4 py-3.5 text-left active:bg-claret/15"
        >
          <EyeIcon className="h-6 w-6 shrink-0 text-claret" />
          <span className="min-w-0 flex-1">
            <span className="display block text-[19px] leading-tight">
              {incoming[0].fromName} needs a fit check
            </span>
            <span className="block truncate text-[13px] text-graphite">{incoming[0].note}</span>
          </span>
        </button>
      ) : null}

      {data.myItems.length < 4 ? (
        <Empty
          icon={<SparkIcon className="h-10 w-10" />}
          title="Add a few more pieces"
          body="The engine needs a top, a bottom and a pair of shoes before it can build you anything."
          action={<Button onClick={onAdd}>Add a piece</Button>}
        />
      ) : (
        <>
          <div className="mb-3 space-y-3">
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
              <div className="w-max">
                <Chips
                  ariaLabel="Weather"
                  options={[
                    { value: 'any' as const, label: 'Any' },
                    ...WARMTHS.map((w) => ({ value: w, label: WARMTH_LABEL[w] })),
                  ]}
                  selected={[warmth]}
                  onToggle={(v) => {
                    setWarmth(v)
                    setPage(0)
                  }}
                />
              </div>
            </div>
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
              <div className="w-max">
                <Chips
                  ariaLabel="Vibe"
                  options={[
                    { value: 'any' as const, label: 'Any vibe' },
                    ...VIBES.map((v) => ({ value: v, label: VIBE_LABEL[v] })),
                  ]}
                  selected={[vibe]}
                  onToggle={(v) => {
                    setVibe(v)
                    setPage(0)
                  }}
                />
              </div>
            </div>
            {collabFriends.length > 0 ? (
              <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
                <div className="w-max">
                  <Chips
                    ariaLabel="Shared closets"
                    options={[
                      { value: 'mine', label: 'Just my closet' },
                      ...collabFriends.map((f) => ({
                        value: f.userId,
                        label: `+ ${f.name}'s`,
                      })),
                    ]}
                    selected={[collabWith ?? 'mine']}
                    onToggle={(v) => {
                      setCollabWith(v === 'mine' ? null : v)
                      setPage(0)
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="mb-3 flex items-center justify-between">
            <h2 className="u-label">
              {suggestions.length > 0 ? 'Put together for you' : 'Nothing fits those filters'}
            </h2>
            {suggestions.length > PAGE ? (
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="flex min-h-[44px] items-center gap-1.5 text-[14px] font-semibold text-claret"
              >
                <ShuffleIcon className="h-4 w-4" />
                Show me others
              </button>
            ) : null}
          </div>

          {suggestions.length === 0 ? (
            <Empty
              icon={<SparkIcon className="h-10 w-10" />}
              title="No outfits for that combination"
              body="Try 'Any weather' or 'Any vibe' — or tag a few more pieces so there's more to work with."
            />
          ) : (
            <div className="space-y-3">
              {visible.map((s) => (
                <article key={s.key} className="rounded-card border border-hairline bg-porcelain p-4">
                  <OutfitStrip items={s.items} />
                  <ul className="mt-3 space-y-1">
                    {s.reasons.map((r) => (
                      <li key={r} className="text-[13.5px] leading-relaxed text-graphite">
                        {r}
                      </li>
                    ))}
                  </ul>
                  {s.borrowedIds.length > 0 && activeFriend ? (
                    <p className="mt-2 inline-block rounded-full bg-stone px-2.5 py-1 text-[12px] font-semibold text-bronze">
                      Uses {s.borrowedIds.length} of {activeFriend.name}'s
                    </p>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      disabled={saved.has(s.key)}
                      onClick={async () => {
                        await adapter.saveOutfit({
                          title: 'Saved outfit',
                          itemIds: s.items.map((i) => i.id),
                          note: null,
                        })
                        setSaved((cur) => new Set(cur).add(s.key))
                        await data.refresh()
                      }}
                    >
                      {saved.has(s.key) ? 'Saved' : 'Save'}
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={async () => {
                        await adapter.markWorn(
                          s.items.filter((i) => i.ownerId === me).map((i) => i.id),
                        )
                        await data.refresh()
                      }}
                    >
                      Wearing it
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <section className="mt-8">
        <h2 className="u-label mb-3 block">Saved &amp; sent to you</h2>
        {data.outfits.length === 0 ? (
          <p className="rounded-card border border-dashed border-hairline bg-porcelain/60 px-4 py-6 text-center text-[13px] text-graphite">
            Outfits you save — and ones your friends put together for you — land here.
          </p>
        ) : (
          <div className="space-y-3">
            {data.outfits.map((o) => {
              const items = o.itemIds
                .map((id) => itemsById.get(id))
                .filter((i): i is Item => !!i)
              return (
                <article key={o.id} className="rounded-card border border-hairline bg-porcelain p-4">
                  <div className="mb-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px]">{o.title}</h3>
                      <p className="text-[13px] text-graphite">
                        {o.source === 'from-friend' ? `from ${o.authorName} · ` : ''}
                        {ago(o.createdAt)}
                      </p>
                    </div>
                    {o.source === 'from-friend' ? (
                      <button
                        type="button"
                        onClick={() => onOpenFriend(o.authorId)}
                        className="shrink-0 text-[13px] font-semibold text-claret"
                      >
                        Their closet
                      </button>
                    ) : null}
                  </div>
                  {items.length > 0 ? <OutfitStrip items={items} /> : null}
                  {o.note ? (
                    <p className="mt-2.5 bg-stone px-3 py-2 text-[13.5px] leading-relaxed">
                      “{o.note}”
                    </p>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={async () => {
                        await adapter.deleteOutfit(o.id)
                        await data.refresh()
                      }}
                    >
                      Remove
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={async () => {
                        await adapter.markWorn(
                          items.filter((i) => i.ownerId === me).map((i) => i.id),
                        )
                        await data.refresh()
                      }}
                    >
                      Wore it
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
