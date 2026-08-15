import { useState } from 'react'
import { getAdapter } from './adapters'
import { EyeIcon, FriendsIcon, HangerIcon, PersonIcon, SparkIcon } from './components/Icons'
import { useClosetData } from './hooks/useClosetData'
import { readInviteCode } from './lib/invite'
import { AddItem } from './screens/AddItem'
import { FitChecks } from './screens/FitChecks'
import { FriendCloset } from './screens/FriendCloset'
import { Friends } from './screens/Friends'
import { Me } from './screens/Me'
import { MyCloset } from './screens/MyCloset'
import { Outfits } from './screens/Outfits'
import { Onboarding } from './screens/Onboarding'

type Tab = 'closet' | 'outfits' | 'fits' | 'friends' | 'me'

const TABS: { id: Tab; label: string; icon: (c: string) => JSX.Element }[] = [
  { id: 'closet', label: 'Closet', icon: (c) => <HangerIcon className={c} /> },
  { id: 'outfits', label: 'Outfits', icon: (c) => <SparkIcon className={c} /> },
  { id: 'fits', label: 'Fit check', icon: (c) => <EyeIcon className={c} /> },
  { id: 'friends', label: 'Friends', icon: (c) => <FriendsIcon className={c} /> },
  { id: 'me', label: 'You', icon: (c) => <PersonIcon className={c} /> },
]

export default function App() {
  const data = useClosetData()
  const adapter = getAdapter()
  // An invite link drops you straight on Friends with the code already filled.
  const [inviteCode] = useState(() => readInviteCode())
  const [tab, setTab] = useState<Tab>(inviteCode ? 'friends' : 'outfits')
  const [addOpen, setAddOpen] = useState(false)
  const [friendViewId, setFriendViewId] = useState<string | null>(null)

  if (data.loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stone">
        <p className="text-[13px] text-graphite">Opening your closet…</p>
      </div>
    )
  }

  if (!data.session) {
    return <Onboarding onSignedIn={data.refresh} />
  }

  const openFitChecks = data.fitChecks.filter(
    (f) => f.toUserId === data.session?.userId && f.status === 'open',
  ).length
  const pendingFriends = data.friends.filter((f) => f.status === 'pending-in').length

  const friendInView = friendViewId
    ? data.friends.find((f) => f.userId === friendViewId) ?? null
    : null

  return (
    <div className="min-h-dvh bg-stone">
      <main className="mx-auto w-full max-w-[560px] pb-28">
        {adapter.demo ? (
          <p className="u-label border-b border-hairline py-2 text-center">Demo wardrobe</p>
        ) : null}
        {friendInView ? (
          <FriendCloset
            friend={friendInView}
            items={data.friendItems[friendInView.userId] ?? []}
            myItems={data.myItems}
            session={data.session}
            onBack={() => setFriendViewId(null)}
            onChanged={data.refresh}
          />
        ) : (
          <>
            {tab === 'closet' && (
              <MyCloset
                items={data.myItems}
                onAdd={() => setAddOpen(true)}
                onChanged={data.refresh}
              />
            )}
            {tab === 'outfits' && (
              <Outfits
                data={data}
                onAdd={() => setAddOpen(true)}
                onOpenFriend={(id) => setFriendViewId(id)}
                onOpenFitChecks={() => setTab('fits')}
              />
            )}
            {tab === 'fits' && (
              <FitChecks data={data} onOpenFriend={(id) => setFriendViewId(id)} />
            )}
            {tab === 'friends' && (
              <Friends
                data={data}
                onOpenFriend={(id) => setFriendViewId(id)}
                initialCode={inviteCode}
              />
            )}
            {tab === 'me' && <Me data={data} />}
          </>
        )}
      </main>

      {!friendInView && (
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-porcelain/95 backdrop-blur">
          <ul className="mx-auto flex w-full max-w-[560px]">
            {TABS.map((t) => {
              const active = tab === t.id
              const badge =
                t.id === 'fits' ? openFitChecks : t.id === 'friends' ? pendingFriends : 0
              return (
                <li key={t.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => setTab(t.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex min-h-[58px] w-full flex-col items-center justify-center gap-1.5 pt-2 transition-colors ${
                      active ? 'text-ink' : 'text-graphite'
                    }`}
                  >
                    {active ? (
                      <span className="absolute inset-x-0 top-0 h-px bg-ink" aria-hidden="true" />
                    ) : null}
                    <span className="relative">
                      {t.icon('w-[22px] h-[22px]')}
                      {badge > 0 ? (
                        <span className="absolute -right-2 -top-1 flex h-[16px] min-w-[16px] items-center justify-center bg-claret px-1 text-[10px] font-medium text-white tnum">
                          {badge}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className="text-[9.5px] font-medium uppercase"
                      style={{ letterSpacing: '0.12em' }}
                    >
                      {t.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      <AddItem
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={async () => {
          setAddOpen(false)
          await data.refresh()
        }}
      />
    </div>
  )
}
