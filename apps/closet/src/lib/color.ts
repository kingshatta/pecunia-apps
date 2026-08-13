import type { Hsl } from './types'

/**
 * Colour maths for the outfit engine. All of it runs in the browser for free —
 * there is no vision API in this app, by design (see the project file).
 */

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
  else if (max === gn) h = ((bn - rn) / d + 2) * 60
  else h = ((rn - gn) / d + 4) * 60
  return { h, s, l }
}

export function hslToCss({ h, s, l }: Hsl): string {
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`
}

/**
 * Fashion neutrals, not colour-theory neutrals. Black, white, grey, cream and
 * tan all pair with anything — and so does denim, which is why the blue band
 * is in here. This one predicate does most of the work in the engine.
 */
/**
 * Cream, beige, tan, camel, brown — the muted warm band. Shared by isNeutral
 * and colorName so the two can't drift apart and start disagreeing about
 * whether a camel coat goes with everything.
 */
function isWarmNeutral({ h, s, l }: Hsl): boolean {
  return h >= 15 && h <= 62 && s < 0.5 && l >= 0.2 && l <= 0.92
}

export function isNeutral(c: Hsl): boolean {
  const { h, s, l } = c
  if (s < 0.18) return true // greys, black, white
  if (l < 0.12 || l > 0.92) return true // near-black / near-white at any hue
  if (isWarmNeutral(c)) return true
  // Denim and navy, up to and including a light wash.
  if (h >= 196 && h <= 235 && s < 0.62 && l < 0.72) return true
  return false
}

interface NamedBand {
  name: string
  from: number
  to: number
}

const HUE_NAMES: NamedBand[] = [
  { name: 'red', from: 345, to: 360 },
  { name: 'red', from: 0, to: 12 },
  { name: 'orange', from: 12, to: 40 },
  { name: 'yellow', from: 40, to: 66 },
  { name: 'olive', from: 66, to: 90 },
  { name: 'green', from: 90, to: 156 },
  { name: 'teal', from: 156, to: 190 },
  { name: 'blue', from: 190, to: 245 },
  { name: 'purple', from: 245, to: 290 },
  { name: 'pink', from: 290, to: 345 },
]

/** A human name for a colour, used in outfit reasons and item subtitles. */
export function colorName(c: Hsl): string {
  const { h, s, l } = c
  if (s < 0.12) {
    if (l < 0.14) return 'black'
    if (l < 0.35) return 'charcoal'
    if (l < 0.62) return 'grey'
    if (l < 0.88) return 'light grey'
    return 'white'
  }
  if (l < 0.12) return 'black'
  if (l > 0.93) return 'white'

  // Muted warm hues are the wardrobe staples people call cream, beige, tan and
  // brown — never "yellow" or "orange", which is what a raw hue lookup gives.
  if (isWarmNeutral(c)) {
    if (l > 0.82) return 'cream'
    if (l > 0.6) return 'beige'
    if (l > 0.4) return 'tan'
    return 'brown'
  }
  if (h >= 15 && h <= 62 && s < 0.5 && l < 0.2) return 'brown'
  if (h >= 38 && h <= 56 && s >= 0.5 && l < 0.65) return 'gold'

  const base = HUE_NAMES.find((b) => h >= b.from && h < b.to)?.name ?? 'blue'

  if (base === 'blue' && l < 0.32) return 'navy'
  if (base === 'red' && l < 0.32) return 'burgundy'
  if (l > 0.78) return `light ${base}`
  if (l < 0.3) return `deep ${base}`
  return base
}

/** Shortest distance between two hues, 0–180. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360)
  return d > 180 ? 360 - d : d
}

/**
 * How well two colours sit together, 0–1.
 *
 * Neutrals score high with everything. For two real colours we reward
 * analogous (close hues) and complementary (opposite hues), and penalise the
 * awkward middle — that 60–110° gap is where outfits go wrong.
 */
export function harmony(a: Hsl, b: Hsl): number {
  const an = isNeutral(a)
  const bn = isNeutral(b)
  if (an && bn) {
    // Two neutrals: fine, but reward some light contrast over a flat match.
    const contrast = Math.abs(a.l - b.l)
    return 0.82 + Math.min(contrast, 0.4) * 0.45
  }
  if (an || bn) return 0.9

  const d = hueDistance(a.h, b.h)
  let score: number
  if (d < 24) score = 0.88
  else if (d < 55) score = 0.6
  else if (d < 105) score = 0.34
  else if (d < 145) score = 0.58
  else score = 0.82

  // Two loud colours together is a bolder call than most people want.
  if (a.s > 0.65 && b.s > 0.65) score -= 0.12
  // Same lightness in two different hues reads flat.
  if (Math.abs(a.l - b.l) < 0.08) score -= 0.05
  return Math.max(0, Math.min(1, score))
}

/** Average pairwise harmony across a set of colours. */
export function paletteScore(colors: Hsl[]): number {
  if (colors.length < 2) return 0.8
  let total = 0
  let pairs = 0
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      total += harmony(colors[i], colors[j])
      pairs++
    }
  }
  return total / pairs
}

/**
 * Dominant colour of a garment photo. Samples the middle of the frame (where
 * the clothing is), skips transparent pixels left by background removal, then
 * buckets into coarse HSL cells and returns the average of the biggest cell.
 * Cheap, deterministic, and good enough to tag a wardrobe.
 */
export function dominantColor(data: ImageData): Hsl {
  const { width, height } = data
  const px = data.data
  const x0 = Math.floor(width * 0.2)
  const x1 = Math.ceil(width * 0.8)
  const y0 = Math.floor(height * 0.2)
  const y1 = Math.ceil(height * 0.8)

  const buckets = new Map<string, { h: number; s: number; l: number; n: number }>()
  const step = Math.max(1, Math.floor(Math.min(width, height) / 120))

  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = (y * width + x) * 4
      if (px[i + 3] < 128) continue // transparent: background was removed
      const hsl = rgbToHsl(px[i], px[i + 1], px[i + 2])
      // Ignore the paper-white / pure-black extremes that are usually surface,
      // unless the whole sample turns out to be that (handled by the fallback).
      const key = `${Math.round(hsl.h / 24)}:${Math.round(hsl.s * 5)}:${Math.round(hsl.l * 6)}`
      const b = buckets.get(key)
      if (b) {
        b.h += hsl.h
        b.s += hsl.s
        b.l += hsl.l
        b.n++
      } else {
        buckets.set(key, { h: hsl.h, s: hsl.s, l: hsl.l, n: 1 })
      }
    }
  }

  if (buckets.size === 0) return { h: 0, s: 0, l: 0.5 }

  let best = { h: 0, s: 0, l: 0.5, n: 0 }
  for (const b of buckets.values()) if (b.n > best.n) best = b
  return { h: best.h / best.n, s: best.s / best.n, l: best.l / best.n }
}
