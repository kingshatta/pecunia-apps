import { useState } from 'react'
import { getAdapter } from './adapters'
import { EyeIcon, FriendsIcon, HangerIcon, PersonIcon, SparkIcon } from './components/Icons'
import { useClosetData } from './hooks/useClosetData'
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
  const [tab, setTab] = useState<Tab>('outfits')
  const [addOpen, setAddOpen] = useState(false)
  const [friendViewId, setFriendViewId] = useState<string | null>(null)

  if (data.loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <p className="text-sm text-muted">Opening your closet…</p>
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
    <div className="min-h-dvh bg-paper">
      <main className="mx-auto w-full max-w-[560px] pb-28">
        {adapter.demo ? (
          <p className="mx-auto mt-2 w-max rounded-full bg-ink/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-paper">
            Demo
          </p>
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
              <Friends data={data} onOpenFriend={(id) => setFriendViewId(id)} />
            )}
            {tab === 'me' && <Me data={data} />}
          </>
        )}
      </main>

      {!friendInView && (
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
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
                    className={`relative flex min-h-[56px] w-full flex-col items-center justify-center gap-1 pt-1.5 ${
                      active ? 'text-ink' : 'text-muted'
                    }`}
                  >
                    <span className="relative">
                      {t.icon('w-6 h-6')}
                      {badge > 0 ? (
                        <span className="absolute -right-2 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-berry px-1 text-[11px] font-bold text-white">
                          {badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[11px] font-semibold tracking-tight">{t.label}</span>
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
