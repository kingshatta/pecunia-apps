import { colorName, isNeutral } from './color'
import { silhouette } from './silhouette'
import type {
  Category,
  FitCheck,
  Friend,
  Hsl,
  Item,
  Outfit,
  Profile,
  Vibe,
  Warmth,
} from './types'

/**
 * Demo wardrobe. This exists so the entire app — including the collab loop
 * that needs two people — can be driven and verified before any account,
 * credential or second phone exists. It is a hard rule in CLAUDE.md, and it's
 * also how this gets shown to anyone without asking them to sign up.
 */

export const DEMO_ME = 'demo-me'
export const DEMO_FRIEND = 'demo-nicole'

const DAY = 86_400_000

function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY).toISOString()
}

interface Spec {
  name: string
  category: Category
  color: Hsl
  warmth: Warmth[]
  vibes: Vibe[]
  worn?: number | null
  count?: number
  size?: string
  brand?: string
}

function build(ownerId: string, prefix: string, specs: Spec[]): Item[] {
  return specs.map((s, i) => ({
    id: `${prefix}-${i + 1}`,
    ownerId,
    name: s.name,
    category: s.category,
    warmth: s.warmth,
    vibes: s.vibes,
    color: s.color,
    colorName: colorName(s.color),
    neutral: isNeutral(s.color),
    imageUrl: silhouette(s.category, s.color, s.name),
    size: s.size ?? null,
    brand: s.brand ?? null,
    createdAt: daysAgo(40 - i),
    lastWornAt: s.worn === null || s.worn === undefined ? null : daysAgo(s.worn),
    wearCount: s.count ?? (s.worn === null || s.worn === undefined ? 0 : 3),
  }))
}

const WHITE: Hsl = { h: 42, s: 0.1, l: 0.95 }
const BLACK: Hsl = { h: 0, s: 0, l: 0.09 }
const CREAM: Hsl = { h: 44, s: 0.36, l: 0.88 }
const GREY: Hsl = { h: 220, s: 0.05, l: 0.62 }
const CHARCOAL: Hsl = { h: 220, s: 0.06, l: 0.26 }
const NAVY: Hsl = { h: 222, s: 0.5, l: 0.24 }
const DENIM_LIGHT: Hsl = { h: 210, s: 0.34, l: 0.62 }
const DENIM_MID: Hsl = { h: 212, s: 0.42, l: 0.48 }
const OLIVE: Hsl = { h: 78, s: 0.34, l: 0.34 }
const KHAKI: Hsl = { h: 42, s: 0.3, l: 0.66 }
const CAMEL: Hsl = { h: 32, s: 0.46, l: 0.55 }
const TAN: Hsl = { h: 30, s: 0.4, l: 0.6 }
const BLUSH: Hsl = { h: 340, s: 0.55, l: 0.74 }
const ROSE: Hsl = { h: 342, s: 0.6, l: 0.64 }
const BURGUNDY: Hsl = { h: 352, s: 0.55, l: 0.26 }
const GOLD: Hsl = { h: 45, s: 0.65, l: 0.55 }
const SILVER: Hsl = { h: 210, s: 0.08, l: 0.76 }
const BURNT_ORANGE: Hsl = { h: 22, s: 0.74, l: 0.48 }
const SAGE: Hsl = { h: 112, s: 0.22, l: 0.62 }
const EMERALD: Hsl = { h: 155, s: 0.58, l: 0.32 }
const RED: Hsl = { h: 5, s: 0.72, l: 0.46 }

const MY_SPECS: Spec[] = [
  // Tops
  { name: 'White cotton tee', category: 'top', color: WHITE, warmth: ['hot', 'mild'], vibes: ['casual', 'sporty'], worn: 2, count: 22, size: 'S' },
  { name: 'Black ribbed tank', category: 'top', color: BLACK, warmth: ['hot'], vibes: ['casual', 'going-out'], worn: 9, count: 11, size: 'S' },
  { name: 'Striped long sleeve', category: 'top', color: NAVY, warmth: ['mild', 'cold'], vibes: ['casual'], worn: 21, count: 8, size: 'S' },
  { name: 'Olive button-down', category: 'top', color: OLIVE, warmth: ['mild'], vibes: ['casual', 'dressy'], worn: 74, count: 4, size: 'S' },
  { name: 'Blush satin blouse', category: 'top', color: BLUSH, warmth: ['mild', 'hot'], vibes: ['dressy', 'going-out'], worn: null, size: 'S', brand: 'thrifted' },
  { name: 'Grey sweatshirt', category: 'top', color: GREY, warmth: ['cold', 'mild'], vibes: ['casual', 'sporty'], worn: 4, count: 30, size: 'M' },
  { name: 'Navy silk cami', category: 'top', color: NAVY, warmth: ['hot', 'mild'], vibes: ['going-out', 'dressy'], worn: 58, count: 3, size: 'S' },
  { name: 'Cream knit sweater', category: 'top', color: CREAM, warmth: ['cold'], vibes: ['casual', 'dressy'], worn: 130, count: 6, size: 'S' },
  // Bottoms
  { name: 'Light-wash jeans', category: 'bottom', color: DENIM_LIGHT, warmth: ['mild', 'cold'], vibes: ['casual'], worn: 3, count: 26, size: '26' },
  { name: 'Black jeans', category: 'bottom', color: BLACK, warmth: ['mild', 'cold'], vibes: ['casual', 'going-out'], worn: 6, count: 19, size: '26' },
  { name: 'Denim mini skirt', category: 'bottom', color: DENIM_MID, warmth: ['hot'], vibes: ['casual', 'going-out'], worn: 31, count: 5, size: '26' },
  { name: 'Olive cargo pants', category: 'bottom', color: OLIVE, warmth: ['mild', 'cold'], vibes: ['casual', 'sporty'], worn: 12, count: 9, size: '26' },
  { name: 'Black tailored trousers', category: 'bottom', color: CHARCOAL, warmth: ['mild', 'cold'], vibes: ['dressy'], worn: 88, count: 4, size: '26' },
  { name: 'Khaki shorts', category: 'bottom', color: KHAKI, warmth: ['hot'], vibes: ['casual'], worn: 15, count: 12, size: '26' },
  { name: 'Burgundy pleated midi', category: 'bottom', color: BURGUNDY, warmth: ['mild', 'cold'], vibes: ['dressy'], worn: null, size: '26' },
  // Dresses
  { name: 'Little black dress', category: 'dress', color: BLACK, warmth: ['mild', 'hot'], vibes: ['going-out', 'dressy'], worn: 47, count: 5, size: 'S' },
  { name: 'Rose floral midi', category: 'dress', color: ROSE, warmth: ['hot', 'mild'], vibes: ['dressy'], worn: 96, count: 2, size: 'S' },
  { name: 'White linen sundress', category: 'dress', color: WHITE, warmth: ['hot'], vibes: ['casual', 'dressy'], worn: 19, count: 7, size: 'S' },
  // Outer
  { name: 'Denim jacket', category: 'outer', color: DENIM_MID, warmth: ['mild'], vibes: ['casual'], worn: 8, count: 17, size: 'S' },
  { name: 'Black leather jacket', category: 'outer', color: BLACK, warmth: ['cold', 'mild'], vibes: ['going-out', 'casual'], worn: 41, count: 6, size: 'S' },
  { name: 'Camel wool coat', category: 'outer', color: CAMEL, warmth: ['cold'], vibes: ['dressy', 'casual'], worn: 150, count: 9, size: 'S' },
  { name: 'Cream cardigan', category: 'outer', color: CREAM, warmth: ['mild', 'cold'], vibes: ['casual', 'dressy'], worn: 26, count: 10, size: 'S' },
  // Shoes
  { name: 'White sneakers', category: 'shoes', color: WHITE, warmth: ['hot', 'mild', 'cold'], vibes: ['casual', 'sporty'], worn: 1, count: 60, size: '7' },
  { name: 'Black ankle boots', category: 'shoes', color: BLACK, warmth: ['cold', 'mild'], vibes: ['casual', 'going-out'], worn: 34, count: 14, size: '7' },
  { name: 'Tan strappy sandals', category: 'shoes', color: TAN, warmth: ['hot'], vibes: ['casual', 'dressy'], worn: 23, count: 8, size: '7' },
  { name: 'Black heels', category: 'shoes', color: BLACK, warmth: ['mild', 'hot', 'cold'], vibes: ['dressy', 'going-out'], worn: 110, count: 3, size: '7' },
  // Jewelry & accessories
  { name: 'Gold hoops', category: 'jewelry', color: GOLD, warmth: [], vibes: ['going-out', 'dressy', 'casual'], worn: 2, count: 40 },
  { name: 'Silver chain necklace', category: 'jewelry', color: SILVER, warmth: [], vibes: ['casual', 'going-out'], worn: 17, count: 12 },
  { name: 'Pearl studs', category: 'jewelry', color: WHITE, warmth: [], vibes: ['dressy'], worn: 64, count: 4 },
  { name: 'Black crossbody', category: 'bag', color: BLACK, warmth: [], vibes: ['casual', 'going-out'], worn: 5, count: 25 },
  { name: 'Tan canvas tote', category: 'bag', color: TAN, warmth: [], vibes: ['casual'], worn: 11, count: 18 },
  { name: 'Black cap', category: 'accessory', color: BLACK, warmth: ['hot', 'mild'], vibes: ['sporty', 'casual'], worn: 29, count: 7 },
  { name: 'Cream wool scarf', category: 'accessory', color: CREAM, warmth: ['cold'], vibes: ['casual', 'dressy'], worn: 160, count: 5 },
]

const FRIEND_SPECS: Spec[] = [
  { name: 'Burnt orange sweater', category: 'top', color: BURNT_ORANGE, warmth: ['cold', 'mild'], vibes: ['casual'], worn: 7, count: 9, size: 'S' },
  { name: 'White cropped tee', category: 'top', color: WHITE, warmth: ['hot'], vibes: ['casual', 'sporty'], worn: 3, count: 20, size: 'S' },
  { name: 'Black mesh top', category: 'top', color: BLACK, warmth: ['hot', 'mild'], vibes: ['going-out'], worn: 25, count: 6, size: 'S' },
  { name: 'Sage green tank', category: 'top', color: SAGE, warmth: ['hot'], vibes: ['casual', 'sporty'], worn: 14, count: 8, size: 'S' },
  { name: 'Grey oversized blazer', category: 'outer', color: GREY, warmth: ['mild'], vibes: ['dressy', 'going-out'], worn: 10, count: 11, size: 'M' },
  { name: 'Navy varsity jacket', category: 'outer', color: NAVY, warmth: ['cold', 'mild'], vibes: ['casual', 'sporty'], worn: 20, count: 13, size: 'M' },
  { name: 'Black cargo pants', category: 'bottom', color: BLACK, warmth: ['mild', 'cold'], vibes: ['casual', 'sporty'], worn: 4, count: 22, size: '26' },
  { name: 'Light jeans', category: 'bottom', color: DENIM_LIGHT, warmth: ['mild'], vibes: ['casual'], worn: 9, count: 16, size: '26' },
  { name: 'Red mini skirt', category: 'bottom', color: RED, warmth: ['hot', 'mild'], vibes: ['going-out'], worn: 38, count: 4, size: '26' },
  { name: 'Emerald slip dress', category: 'dress', color: EMERALD, warmth: ['hot', 'mild'], vibes: ['going-out', 'dressy'], worn: null, size: 'S' },
  { name: 'Chunky white sneakers', category: 'shoes', color: WHITE, warmth: ['hot', 'mild', 'cold'], vibes: ['casual', 'sporty'], worn: 2, count: 45, size: '7' },
  { name: 'Black platform boots', category: 'shoes', color: BLACK, warmth: ['cold', 'mild'], vibes: ['going-out'], worn: 16, count: 10, size: '7' },
  { name: 'Gold strappy heels', category: 'shoes', color: GOLD, warmth: ['hot', 'mild'], vibes: ['dressy', 'going-out'], worn: 52, count: 3, size: '7' },
  { name: 'Chunky gold chain', category: 'jewelry', color: GOLD, warmth: [], vibes: ['going-out', 'casual'], worn: 6, count: 18 },
  { name: 'Silver hoops', category: 'jewelry', color: SILVER, warmth: [], vibes: ['casual', 'going-out'], worn: 12, count: 15 },
  { name: 'Red shoulder bag', category: 'bag', color: RED, warmth: [], vibes: ['going-out', 'dressy'], worn: 33, count: 5 },
  { name: 'Beige beanie', category: 'accessory', color: KHAKI, warmth: ['cold'], vibes: ['casual'], worn: 120, count: 6 },
]

export function seedItems(): Item[] {
  return [...build(DEMO_ME, 'mine', MY_SPECS), ...build(DEMO_FRIEND, 'hers', FRIEND_SPECS)]
}

export function seedProfiles(): Record<string, Profile> {
  return {
    [DEMO_ME]: { id: DEMO_ME, name: 'You', code: 'SHN482', sizes: 'S · 26 · 7' },
    [DEMO_FRIEND]: { id: DEMO_FRIEND, name: 'Dolce Nicole', code: 'DNC742', sizes: 'S · 26 · 7' },
  }
}

export function seedFriends(): Friend[] {
  return [
    {
      id: 'friendship-1',
      userId: DEMO_FRIEND,
      name: 'Dolce Nicole',
      code: 'DNC742',
      status: 'accepted',
      sizeCompatible: true,
      createdAt: daysAgo(30),
    },
  ]
}

export function seedOutfits(): Outfit[] {
  return [
    {
      id: 'outfit-1',
      ownerId: DEMO_ME,
      authorId: DEMO_FRIEND,
      authorName: 'Dolce Nicole',
      title: 'For Friday',
      // Navy silk cami + black jeans + black heels + my gold hoops + her gold chain.
      itemIds: ['mine-7', 'mine-10', 'mine-26', 'mine-27', 'hers-14'],
      note: "wear my gold chain with this, it'll finish it",
      createdAt: daysAgo(1),
      source: 'from-friend',
    },
    {
      id: 'outfit-2',
      ownerId: DEMO_ME,
      authorId: DEMO_ME,
      authorName: 'You',
      title: 'Coffee run',
      itemIds: ['mine-6', 'mine-9', 'mine-23'],
      note: null,
      createdAt: daysAgo(5),
      source: 'saved',
    },
  ]
}

export function seedFitChecks(): FitCheck[] {
  return [
    {
      id: 'fitcheck-1',
      fromUserId: DEMO_FRIEND,
      fromName: 'Dolce Nicole',
      toUserId: DEMO_ME,
      toName: 'You',
      note: "dinner thing at 7 and I've stared at this closet for 20 minutes. help",
      status: 'open',
      createdAt: daysAgo(0.02),
      replies: [],
    },
  ]
}
