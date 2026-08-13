import type {
  BorrowRequest,
  BorrowStatus,
  Category,
  FitCheck,
  Friend,
  Hsl,
  Item,
  Outfit,
  Profile,
  Vibe,
  Warmth,
} from '../lib/types'

export interface Session {
  userId: string
  profile: Profile
}

export interface NewItemInput {
  name: string
  category: Category
  warmth: Warmth[]
  vibes: Vibe[]
  color: Hsl
  /** data: URL produced by lib/image.ts; uploaded to Storage when live. */
  imageDataUrl: string
  size: string | null
  brand: string | null
}

export interface ItemPatch {
  name?: string
  category?: Category
  warmth?: Warmth[]
  vibes?: Vibe[]
  size?: string | null
  brand?: string | null
}

export interface NewOutfitInput {
  title: string
  itemIds: string[]
  note: string | null
  /** Whose wardrobe to file it under — a friend's id when suggesting to them. */
  forUserId?: string
}

/**
 * Every backend Closet talks to implements this. LocalDemoAdapter runs the
 * whole app — including the two-person collab loop — with no network and no
 * account; SupabaseAdapter is the live multi-user backend.
 */
export interface DataAdapter {
  readonly label: string
  readonly demo: boolean

  /** Current signed-in user, or null. */
  getSession(): Promise<Session | null>
  /**
   * Demo: just claims a display name. Live: sends a magic link, and the
   * caller shows "check your email" when needsEmailLink is true.
   */
  signIn(identifier: string): Promise<{ needsEmailLink: boolean }>
  signOut(): Promise<void>
  updateProfile(patch: { name?: string; sizes?: string | null }): Promise<Profile>

  getMyItems(): Promise<Item[]>
  /** Only returns anything if the friendship is accepted (enforced by RLS). */
  getFriendItems(friendUserId: string): Promise<Item[]>
  addItem(input: NewItemInput): Promise<Item>
  updateItem(id: string, patch: ItemPatch): Promise<Item>
  deleteItem(id: string): Promise<void>
  /** Bump wear counts — this is what keeps outfit suggestions from repeating. */
  markWorn(itemIds: string[]): Promise<void>

  getFriends(): Promise<Friend[]>
  /** Add by six-character invite code. There is no contacts import, by design. */
  requestFriend(code: string): Promise<Friend>
  acceptFriend(friendshipId: string): Promise<void>
  removeFriend(friendshipId: string): Promise<void>
  setSizeCompatible(friendshipId: string, value: boolean): Promise<void>

  /** Outfits filed under me: mine, plus ones friends built for me. */
  getOutfits(): Promise<Outfit[]>
  saveOutfit(input: NewOutfitInput): Promise<Outfit>
  deleteOutfit(id: string): Promise<void>

  getFitChecks(): Promise<FitCheck[]>
  createFitCheck(toUserId: string, note: string): Promise<FitCheck>
  replyFitCheck(id: string, reply: { itemIds: string[]; note: string }): Promise<void>

  getBorrows(): Promise<BorrowRequest[]>
  requestBorrow(itemId: string, note: string): Promise<BorrowRequest>
  setBorrowStatus(id: string, status: BorrowStatus): Promise<void>

  /** Fires whenever anything above may have changed. */
  subscribe(cb: () => void): () => void
}
