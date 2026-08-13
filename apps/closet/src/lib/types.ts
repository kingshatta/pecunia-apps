/** Every garment slot the outfit engine knows how to fill. */
export type Category =
  | 'top'
  | 'bottom'
  | 'dress'
  | 'outer'
  | 'shoes'
  | 'bag'
  | 'jewelry'
  | 'accessory'

export const CATEGORIES: Category[] = [
  'top',
  'bottom',
  'dress',
  'outer',
  'shoes',
  'bag',
  'jewelry',
  'accessory',
]

export const CATEGORY_LABEL: Record<Category, string> = {
  top: 'Top',
  bottom: 'Bottom',
  dress: 'Dress',
  outer: 'Jacket / coat',
  shoes: 'Shoes',
  bag: 'Bag',
  jewelry: 'Jewelry',
  accessory: 'Accessory',
}

/**
 * Warmth, not season. "Summer" means different things in Texas and Vermont;
 * how warm a piece is doesn't move. Seasons are derived for display only.
 */
export type Warmth = 'hot' | 'mild' | 'cold'

export const WARMTHS: Warmth[] = ['hot', 'mild', 'cold']

export const WARMTH_LABEL: Record<Warmth, string> = {
  hot: 'Hot out',
  mild: 'Mild',
  cold: 'Cold out',
}

export const WARMTH_SEASON: Record<Warmth, string> = {
  hot: 'Summer',
  mild: 'Spring / fall',
  cold: 'Winter',
}

export type Vibe = 'casual' | 'sporty' | 'dressy' | 'going-out'

export const VIBES: Vibe[] = ['casual', 'sporty', 'dressy', 'going-out']

export const VIBE_LABEL: Record<Vibe, string> = {
  casual: 'Everyday',
  sporty: 'Sporty',
  dressy: 'Dressy',
  'going-out': 'Going out',
}

export interface Hsl {
  /** 0–360 */
  h: number
  /** 0–1 */
  s: number
  /** 0–1 */
  l: number
}

export interface Item {
  id: string
  ownerId: string
  name: string
  category: Category
  /** Which temperatures this piece works in. Empty = works in all. */
  warmth: Warmth[]
  /** Which vibes this piece reads as. Empty = works with all. */
  vibes: Vibe[]
  color: Hsl
  colorName: string
  /** Neutrals pair with anything — the engine leans on this heavily. */
  neutral: boolean
  /** data: URL in demo mode, Supabase Storage URL when live. */
  imageUrl: string
  size: string | null
  brand: string | null
  createdAt: string
  lastWornAt: string | null
  wearCount: number
}

export type OutfitSource = 'saved' | 'from-friend'

export interface Outfit {
  id: string
  /** Whose wardrobe this outfit is filed under (the person who'd wear it). */
  ownerId: string
  /** Who actually put it together — the friend, for a suggestion. */
  authorId: string
  authorName: string
  title: string
  itemIds: string[]
  note: string | null
  createdAt: string
  source: OutfitSource
}

export type FriendStatus = 'pending-out' | 'pending-in' | 'accepted'

export interface Friend {
  /** Friendship row id, not the person's user id. */
  id: string
  userId: string
  name: string
  code: string
  status: FriendStatus
  /**
   * Whether you two can actually wear each other's clothes. Drives whether
   * collab outfits and borrowing are offered at all.
   */
  sizeCompatible: boolean
  createdAt: string
}

export type FitCheckStatus = 'open' | 'answered'

export interface FitCheckReply {
  id: string
  authorId: string
  authorName: string
  itemIds: string[]
  note: string
  createdAt: string
}

/** "I have nothing to wear — you look at my closet." */
export interface FitCheck {
  id: string
  fromUserId: string
  fromName: string
  toUserId: string
  toName: string
  note: string
  status: FitCheckStatus
  createdAt: string
  replies: FitCheckReply[]
}

export type BorrowStatus = 'requested' | 'declined' | 'lent' | 'returned'

export interface BorrowRequest {
  id: string
  itemId: string
  itemName: string
  ownerId: string
  ownerName: string
  borrowerId: string
  borrowerName: string
  status: BorrowStatus
  note: string
  createdAt: string
}

export interface Profile {
  id: string
  name: string
  /** Six-character invite code. How friends are added — never contacts. */
  code: string
  sizes: string | null
}
