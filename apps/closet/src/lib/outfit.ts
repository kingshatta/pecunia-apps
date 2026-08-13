import { colorName, harmony, hueDistance, isNeutral, paletteScore } from './color'
import type { Hsl, Item, Vibe, Warmth } from './types'

/**
 * The outfit engine.
 *
 * Rules and colour maths — deliberately not a model. It has to run instantly,
 * offline, in demo mode, with no credentials and no per-request cost, and it
 * has to explain itself. A vision model can't do the last part, and taste is
 * personal enough that a guessed "cocktail vibe" is worse than a tapped one.
 */

export interface OutfitSuggestion {
  key: string
  /** Core pieces (dress or top+bottom, plus shoes) followed by extras. */
  items: Item[]
  score: number
  reasons: string[]
  /** Ids of pieces that come out of someone else's closet. */
  borrowedIds: string[]
}

export interface SuggestArgs {
  pool: Item[]
  /** The person who'd wear it — anything in the pool they don't own is borrowed. */
  wearerId: string
  warmth?: Warmth | null
  vibe?: Vibe | null
  /** Pieces the outfit must be built around. */
  anchorIds?: string[]
  limit?: number
  /** Used only for reason text ("Aaliyah's jacket does the work here"). */
  friendName?: string | null
}

const DAY = 86_400_000

function matchesWarmth(item: Item, warmth: Warmth | null | undefined): boolean {
  if (!warmth) return true
  if (item.warmth.length === 0) return true
  return item.warmth.includes(warmth)
}

function matchesVibe(item: Item, vibe: Vibe | null | undefined): boolean {
  if (!vibe) return true
  if (item.vibes.length === 0) return true
  return item.vibes.includes(vibe)
}

/**
 * Rewards pieces you haven't worn lately. This is what stops the engine
 * proposing the same three outfits forever, and it's the honest answer to
 * "why do I keep wearing the same thing".
 */
export function freshness(item: Item, now = Date.now()): number {
  if (!item.lastWornAt) return 1
  const days = (now - new Date(item.lastWornAt).getTime()) / DAY
  const recency = Math.min(1, days / 45)
  const overuse = Math.min(0.3, item.wearCount * 0.015)
  return Math.max(0, recency - overuse)
}

function byCategory(items: Item[]): Map<string, Item[]> {
  const m = new Map<string, Item[]>()
  for (const it of items) {
    const list = m.get(it.category)
    if (list) list.push(it)
    else m.set(it.category, [it])
  }
  return m
}

/** Cap each slot so the combinatorics stay small, keeping the freshest first. */
function shortlist(items: Item[] | undefined, n: number, now: number): Item[] {
  if (!items || items.length === 0) return []
  return [...items].sort((a, b) => freshness(b, now) - freshness(a, now)).slice(0, n)
}

function neutralBalance(colors: Hsl[]): number {
  const loud = colors.filter((c) => !isNeutral(c)).length
  if (loud === 0) return 0.78
  if (loud === 1) return 1
  if (loud === 2) return 0.92
  if (loud === 3) return 0.6
  return 0.32
}

function vibeCohesion(items: Item[], requested: Vibe | null | undefined): number {
  const tagged = items.filter((i) => i.vibes.length > 0)
  if (tagged.length === 0) return 0.7
  if (requested) {
    const hits = tagged.filter((i) => i.vibes.includes(requested)).length
    return hits / tagged.length
  }
  const counts = new Map<Vibe, number>()
  for (const it of tagged) {
    for (const v of it.vibes) counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  const best = Math.max(...counts.values())
  return best / tagged.length
}

function pickBest(
  candidates: Item[],
  core: Item[],
  now: number,
  minScore = 0,
): Item | null {
  let best: Item | null = null
  let bestScore = minScore
  for (const c of candidates) {
    if (core.some((i) => i.id === c.id)) continue
    const fit =
      core.reduce((sum, i) => sum + harmony(i.color, c.color), 0) / Math.max(1, core.length)
    const s = fit * 0.8 + freshness(c, now) * 0.2
    if (s > bestScore) {
      bestScore = s
      best = c
    }
  }
  return best
}

function paletteReason(core: Item[]): string | null {
  const loud = core.filter((i) => !i.neutral)
  if (loud.length === 0) return 'All neutrals — quiet, and very hard to get wrong.'
  if (loud.length === 1) {
    const others = core.filter((i) => i.neutral)
    if (others.length > 0) {
      // Just the name: most garment names already carry their colour, and
      // "the pink rose floral midi" reads like a stutter.
      return `The ${loud[0].name.toLowerCase()} pops against the neutrals.`
    }
    return null
  }
  const [a, b] = loud
  const d = hueDistance(a.color.h, b.color.h)
  if (d >= 145) return `${cap(a.colorName)} against ${b.colorName} — opposite colours, on purpose.`
  if (d < 24) return `${cap(a.colorName)} and ${b.colorName} sit close together, so it reads calm.`
  return null
}

function freshnessReason(core: Item[], now: number): string | null {
  const never = core.find((i) => !i.lastWornAt)
  if (never) return `You've never worn the ${never.name.toLowerCase()}.`
  let stalest: Item | null = null
  let stalestDays = 45
  for (const i of core) {
    if (!i.lastWornAt) continue
    const days = (now - new Date(i.lastWornAt).getTime()) / DAY
    if (days > stalestDays) {
      stalestDays = days
      stalest = i
    }
  }
  if (stalest) {
    return `The ${stalest.name.toLowerCase()} hasn't been out in ${Math.round(stalestDays)} days.`
  }
  return null
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Build ranked outfit suggestions from a pool of items. The pool is just "my
 * closet" normally, and "my closet + my friend's" in collab mode — the engine
 * doesn't care whose things they are beyond labelling the result.
 */
export function suggestOutfits(args: SuggestArgs): OutfitSuggestion[] {
  const { pool, wearerId, warmth = null, vibe = null, anchorIds = [], limit = 12 } = args
  const now = Date.now()

  const anchors = pool.filter((i) => anchorIds.includes(i.id))
  const usable = pool.filter(
    (i) => anchorIds.includes(i.id) || (matchesWarmth(i, warmth) && matchesVibe(i, vibe)),
  )
  const cats = byCategory(usable)

  const anchorCats = new Set(anchors.map((a) => a.category))
  const pick = (cat: string, n: number): Item[] => {
    const anchored = anchors.filter((a) => a.category === cat)
    if (anchored.length > 0) return anchored
    return shortlist(cats.get(cat), n, now)
  }

  const dresses = anchorCats.has('top') || anchorCats.has('bottom') ? [] : pick('dress', 6)
  const tops = anchorCats.has('dress') ? [] : pick('top', 10)
  const bottoms = anchorCats.has('dress') ? [] : pick('bottom', 10)
  const shoes = pick('shoes', 8)
  const outers = pick('outer', 5)
  const jewelry = pick('jewelry', 6)
  const bags = pick('bag', 4)
  const accessories = pick('accessory', 4)

  // A base is the thing that covers you: a dress, or a top with a bottom.
  const bases: Item[][] = []
  for (const d of dresses) bases.push([d])
  for (const t of tops) for (const b of bottoms) bases.push([t, b])
  if (bases.length === 0) return []

  const shoeOptions: (Item | null)[] = shoes.length > 0 ? shoes : [null]
  const wantsOuter = warmth === 'cold'

  const seen = new Set<string>()
  const out: OutfitSuggestion[] = []

  for (const base of bases) {
    for (const shoe of shoeOptions) {
      const core = shoe ? [...base, shoe] : [...base]
      const key = core
        .map((i) => i.id)
        .sort()
        .join('|')
      if (seen.has(key)) continue
      seen.add(key)

      const colors = core.map((i) => i.color)
      const palette = paletteScore(colors)
      const fresh = core.reduce((s, i) => s + freshness(i, now), 0) / core.length
      const cohesion = vibeCohesion(core, vibe)
      const balance = neutralBalance(colors)

      const extras: Item[] = []
      const outer = wantsOuter ? pickBest(outers, core, now, 0.45) : null
      if (outer) extras.push(outer)
      const jewel = pickBest(jewelry, core, now, 0.62)
      if (jewel) extras.push(jewel)
      const bag = pickBest(bags, core, now, 0.62)
      if (bag) extras.push(bag)
      const acc = pickBest(accessories, core, now, 0.68)
      if (acc) extras.push(acc)

      const all = [...core, ...extras]
      const borrowedIds = all.filter((i) => i.ownerId !== wearerId).map((i) => i.id)

      let score =
        palette * 0.5 + cohesion * 0.2 + fresh * 0.16 + balance * 0.14
      // Nudge collab outfits up: surfacing them is the whole point of the app.
      if (borrowedIds.length > 0) score += 0.035
      // A cold-weather outfit with nothing to put on over it is not an outfit.
      if (wantsOuter && !outer) score -= 0.08

      const reasons: string[] = []
      const pr = paletteReason(core)
      if (pr) reasons.push(pr)
      if (vibe && cohesion >= 0.99) reasons.push(`Every piece reads ${vibe.replace('-', ' ')}.`)
      const fr = freshnessReason(core, now)
      if (fr) reasons.push(fr)
      if (borrowedIds.length > 0 && args.friendName) {
        const borrowed = all.find((i) => i.id === borrowedIds[0])
        if (borrowed) {
          reasons.push(
            `${args.friendName}'s ${borrowed.name.toLowerCase()} is what makes it work.`,
          )
        }
      }

      out.push({ key, items: all, score, reasons: reasons.slice(0, 3), borrowedIds })
    }
  }

  out.sort((a, b) => b.score - a.score)
  return diversify(out, limit)
}

/**
 * Without this the top ten results are the same shirt ten times. Prefer
 * suggestions that don't overlap with what's already been picked, then relax
 * the rule if that can't fill the list.
 */
function diversify(ranked: OutfitSuggestion[], limit: number): OutfitSuggestion[] {
  const chosen: OutfitSuggestion[] = []
  for (const maxShared of [1, 2, 3]) {
    for (const cand of ranked) {
      if (chosen.length >= limit) break
      if (chosen.some((c) => c.key === cand.key)) continue
      const candIds = new Set(cand.key.split('|'))
      const clashes = chosen.some((c) => {
        const shared = c.key.split('|').filter((id) => candIds.has(id)).length
        return shared > maxShared
      })
      if (!clashes) chosen.push(cand)
    }
    if (chosen.length >= limit) break
  }
  return chosen
}

/** Human summary of an item's palette, used under item names. */
export function itemSubtitle(item: Item): string {
  const bits = [colorName(item.color)]
  if (item.brand) bits.push(item.brand)
  return bits.join(' · ')
}
