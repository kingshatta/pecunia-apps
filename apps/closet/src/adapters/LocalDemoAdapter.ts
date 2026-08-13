import { colorName, isNeutral } from '../lib/color'
import { makeInviteCode } from '../lib/format'
import {
  DEMO_FRIEND,
  DEMO_ME,
  seedFitChecks,
  seedFriends,
  seedItems,
  seedOutfits,
  seedProfiles,
} from '../lib/seed'
import type {
  BorrowRequest,
  BorrowStatus,
  FitCheck,
  Friend,
  Item,
  Outfit,
  Profile,
} from '../lib/types'
import type {
  DataAdapter,
  ItemPatch,
  NewItemInput,
  NewOutfitInput,
  Session,
} from './DataAdapter'

const KEY = 'closet_demo_v1'

interface Store {
  signedIn: boolean
  items: Item[]
  friends: Friend[]
  outfits: Outfit[]
  fitChecks: FitCheck[]
  borrows: BorrowRequest[]
  profiles: Record<string, Profile>
}

function fresh(): Store {
  return {
    signedIn: false,
    items: seedItems(),
    friends: seedFriends(),
    outfits: seedOutfits(),
    fitChecks: seedFitChecks(),
    borrows: [],
    profiles: seedProfiles(),
  }
}

/**
 * The whole app, in localStorage. Ships with a seeded wardrobe and a seeded
 * friend so the collab features — which need two people — can be used and
 * tested by one person with no backend.
 */
export class LocalDemoAdapter implements DataAdapter {
  readonly label = 'Demo'
  readonly demo = true

  private store: Store
  private listeners = new Set<() => void>()

  constructor() {
    this.store = this.load()
  }

  private load(): Store {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return fresh()
      const parsed = JSON.parse(raw) as Partial<Store>
      const base = fresh()
      return {
        signedIn: parsed.signedIn ?? false,
        items: parsed.items ?? base.items,
        friends: parsed.friends ?? base.friends,
        outfits: parsed.outfits ?? base.outfits,
        fitChecks: parsed.fitChecks ?? base.fitChecks,
        borrows: parsed.borrows ?? base.borrows,
        profiles: parsed.profiles ?? base.profiles,
      }
    } catch {
      return fresh()
    }
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.store))
    } catch {
      // Storage full (lots of photos) — the session still works in memory.
    }
    for (const l of this.listeners) l()
  }

  /** Wipe demo state — used by the "reset demo" control and by tests. */
  reset(): void {
    this.store = fresh()
    this.save()
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  async getSession(): Promise<Session | null> {
    if (!this.store.signedIn) return null
    return { userId: DEMO_ME, profile: this.store.profiles[DEMO_ME] }
  }

  async signIn(identifier: string): Promise<{ needsEmailLink: boolean }> {
    const name = identifier.trim() || 'You'
    this.store.signedIn = true
    this.store.profiles[DEMO_ME] = { ...this.store.profiles[DEMO_ME], name }
    this.save()
    return { needsEmailLink: false }
  }

  async signOut(): Promise<void> {
    this.store.signedIn = false
    this.save()
  }

  async updateProfile(patch: { name?: string; sizes?: string | null }): Promise<Profile> {
    const cur = this.store.profiles[DEMO_ME]
    const next: Profile = {
      ...cur,
      name: patch.name ?? cur.name,
      sizes: patch.sizes === undefined ? cur.sizes : patch.sizes,
    }
    this.store.profiles[DEMO_ME] = next
    this.save()
    return next
  }

  async getMyItems(): Promise<Item[]> {
    return this.store.items.filter((i) => i.ownerId === DEMO_ME)
  }

  async getFriendItems(friendUserId: string): Promise<Item[]> {
    const friend = this.store.friends.find(
      (f) => f.userId === friendUserId && f.status === 'accepted',
    )
    if (!friend) return [] // mirrors the RLS rule on the live backend
    return this.store.items.filter((i) => i.ownerId === friendUserId)
  }

  async addItem(input: NewItemInput): Promise<Item> {
    const item: Item = {
      id: crypto.randomUUID(),
      ownerId: DEMO_ME,
      name: input.name,
      category: input.category,
      warmth: input.warmth,
      vibes: input.vibes,
      color: input.color,
      colorName: colorName(input.color),
      neutral: isNeutral(input.color),
      imageUrl: input.imageDataUrl,
      size: input.size,
      brand: input.brand,
      createdAt: new Date().toISOString(),
      lastWornAt: null,
      wearCount: 0,
    }
    this.store.items.unshift(item)
    this.save()
    return item
  }

  async updateItem(id: string, patch: ItemPatch): Promise<Item> {
    const item = this.store.items.find((i) => i.id === id && i.ownerId === DEMO_ME)
    if (!item) throw new Error('Item not found')
    Object.assign(item, patch)
    this.save()
    return item
  }

  async deleteItem(id: string): Promise<void> {
    this.store.items = this.store.items.filter(
      (i) => !(i.id === id && i.ownerId === DEMO_ME),
    )
    this.store.outfits = this.store.outfits.filter((o) => !o.itemIds.includes(id))
    this.save()
  }

  async markWorn(itemIds: string[]): Promise<void> {
    const now = new Date().toISOString()
    for (const item of this.store.items) {
      if (itemIds.includes(item.id) && item.ownerId === DEMO_ME) {
        item.lastWornAt = now
        item.wearCount += 1
      }
    }
    this.save()
  }

  async getFriends(): Promise<Friend[]> {
    return [...this.store.friends]
  }

  async requestFriend(code: string): Promise<Friend> {
    const wanted = code.trim().toUpperCase()
    const match = Object.values(this.store.profiles).find(
      (p) => p.code === wanted && p.id !== DEMO_ME,
    )
    if (!match) throw new Error("No one's using that code")
    const existing = this.store.friends.find((f) => f.userId === match.id)
    if (existing) return existing
    const friend: Friend = {
      id: crypto.randomUUID(),
      userId: match.id,
      name: match.name,
      code: match.code,
      status: 'accepted', // demo has nobody on the other end to tap accept
      sizeCompatible: true,
      createdAt: new Date().toISOString(),
    }
    this.store.friends.push(friend)
    this.save()
    return friend
  }

  async acceptFriend(friendshipId: string): Promise<void> {
    const f = this.store.friends.find((x) => x.id === friendshipId)
    if (f) f.status = 'accepted'
    this.save()
  }

  async removeFriend(friendshipId: string): Promise<void> {
    this.store.friends = this.store.friends.filter((f) => f.id !== friendshipId)
    this.save()
  }

  async setSizeCompatible(friendshipId: string, value: boolean): Promise<void> {
    const f = this.store.friends.find((x) => x.id === friendshipId)
    if (f) f.sizeCompatible = value
    this.save()
  }

  async getOutfits(): Promise<Outfit[]> {
    return this.store.outfits
      .filter((o) => o.ownerId === DEMO_ME)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async saveOutfit(input: NewOutfitInput): Promise<Outfit> {
    const me = this.store.profiles[DEMO_ME]
    const forUser = input.forUserId ?? DEMO_ME
    const outfit: Outfit = {
      id: crypto.randomUUID(),
      ownerId: forUser,
      authorId: DEMO_ME,
      authorName: me.name,
      title: input.title,
      itemIds: input.itemIds,
      note: input.note,
      createdAt: new Date().toISOString(),
      source: forUser === DEMO_ME ? 'saved' : 'from-friend',
    }
    this.store.outfits.unshift(outfit)
    this.save()
    return outfit
  }

  async deleteOutfit(id: string): Promise<void> {
    this.store.outfits = this.store.outfits.filter((o) => o.id !== id)
    this.save()
  }

  async getFitChecks(): Promise<FitCheck[]> {
    return [...this.store.fitChecks].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async createFitCheck(toUserId: string, note: string): Promise<FitCheck> {
    const me = this.store.profiles[DEMO_ME]
    const them = this.store.profiles[toUserId]
    const fc: FitCheck = {
      id: crypto.randomUUID(),
      fromUserId: DEMO_ME,
      fromName: me.name,
      toUserId,
      toName: them?.name ?? 'Friend',
      note,
      status: 'open',
      createdAt: new Date().toISOString(),
      replies: [],
    }
    this.store.fitChecks.unshift(fc)
    this.save()
    return fc
  }

  async replyFitCheck(
    id: string,
    reply: { itemIds: string[]; note: string },
  ): Promise<void> {
    const fc = this.store.fitChecks.find((f) => f.id === id)
    if (!fc) throw new Error('That fit check is gone')
    const me = this.store.profiles[DEMO_ME]
    fc.replies.push({
      id: crypto.randomUUID(),
      authorId: DEMO_ME,
      authorName: me.name,
      itemIds: reply.itemIds,
      note: reply.note,
      createdAt: new Date().toISOString(),
    })
    fc.status = 'answered'
    this.save()
  }

  async getBorrows(): Promise<BorrowRequest[]> {
    return [...this.store.borrows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async requestBorrow(itemId: string, note: string): Promise<BorrowRequest> {
    const item = this.store.items.find((i) => i.id === itemId)
    if (!item) throw new Error('Item not found')
    const me = this.store.profiles[DEMO_ME]
    const owner = this.store.profiles[item.ownerId]
    const req: BorrowRequest = {
      id: crypto.randomUUID(),
      itemId,
      itemName: item.name,
      ownerId: item.ownerId,
      ownerName: owner?.name ?? 'Friend',
      borrowerId: DEMO_ME,
      borrowerName: me.name,
      status: 'requested',
      note,
      createdAt: new Date().toISOString(),
    }
    this.store.borrows.unshift(req)
    this.save()
    return req
  }

  async setBorrowStatus(id: string, status: BorrowStatus): Promise<void> {
    const b = this.store.borrows.find((x) => x.id === id)
    if (b) b.status = status
    this.save()
  }

  /** Only used by the profile screen when a demo user wants a fresh code. */
  async regenerateCode(): Promise<string> {
    const code = makeInviteCode()
    this.store.profiles[DEMO_ME] = { ...this.store.profiles[DEMO_ME], code }
    this.save()
    return code
  }

  /** Exposed so screens can label a friend's pieces without another round trip. */
  friendIdForDemo(): string {
    return DEMO_FRIEND
  }
}
