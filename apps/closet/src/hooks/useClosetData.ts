import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAdapter } from '../adapters'
import type { Session } from '../adapters/DataAdapter'
import type { BorrowRequest, FitCheck, Friend, Item, Outfit } from '../lib/types'

export interface ClosetData {
  loading: boolean
  error: string | null
  session: Session | null
  myItems: Item[]
  friends: Friend[]
  /** Accepted friends' wardrobes, keyed by their user id. */
  friendItems: Record<string, Item[]>
  outfits: Outfit[]
  fitChecks: FitCheck[]
  borrows: BorrowRequest[]
  /** Every item this user can see, mine first — the pool the engine works over. */
  allVisibleItems: Item[]
  refresh: () => Promise<void>
  setSession: (s: Session | null) => void
}

const EMPTY: Omit<ClosetData, 'refresh' | 'setSession'> = {
  loading: true,
  error: null,
  session: null,
  myItems: [],
  friends: [],
  friendItems: {},
  outfits: [],
  fitChecks: [],
  borrows: [],
  allVisibleItems: [],
}

export function useClosetData(): ClosetData {
  const adapter = useMemo(() => getAdapter(), [])
  const [state, setState] = useState(EMPTY)

  const load = useCallback(async () => {
    try {
      const session = await adapter.getSession()
      if (!session) {
        setState({ ...EMPTY, loading: false })
        return
      }

      const [myItems, friends, outfits, fitChecks, borrows] = await Promise.all([
        adapter.getMyItems(),
        adapter.getFriends(),
        adapter.getOutfits(),
        adapter.getFitChecks(),
        adapter.getBorrows(),
      ])

      const accepted = friends.filter((f) => f.status === 'accepted')
      const wardrobes = await Promise.all(
        accepted.map(async (f) => [f.userId, await adapter.getFriendItems(f.userId)] as const),
      )
      const friendItems: Record<string, Item[]> = {}
      for (const [id, items] of wardrobes) friendItems[id] = items

      setState({
        loading: false,
        error: null,
        session,
        myItems,
        friends,
        friendItems,
        outfits,
        fitChecks,
        borrows,
        allVisibleItems: [...myItems, ...wardrobes.flatMap(([, items]) => items)],
      })
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Something went wrong',
      }))
    }
  }, [adapter])

  useEffect(() => {
    void load()
    return adapter.subscribe(() => {
      void load()
    })
  }, [adapter, load])

  const setSession = useCallback((session: Session | null) => {
    setState((s) => ({ ...s, session }))
  }, [])

  return { ...state, refresh: load, setSession }
}
