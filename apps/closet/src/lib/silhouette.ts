import { hslToCss } from './color'
import type { Category, Hsl } from './types'

/**
 * Flat garment silhouettes as inline SVG data URLs.
 *
 * Two jobs: they're the artwork for demo mode (so the app looks like a real
 * wardrobe with no binary assets committed), and they're the fallback when a
 * real photo fails to load.
 */

const SHAPES: Record<Category, (fill: string, line: string) => string> = {
  top: (f, l) =>
    `<path d="M30 18 L20 24 L12 40 L24 46 L26 40 L26 104 L74 104 L74 40 L76 46 L88 40 L80 24 L70 18 L62 26 Q50 34 38 26 Z" fill="${f}" stroke="${l}" stroke-width="2.5" stroke-linejoin="round"/>`,
  bottom: (f, l) =>
    `<path d="M28 16 L72 16 L77 108 L58 108 L50 60 L42 108 L23 108 Z" fill="${f}" stroke="${l}" stroke-width="2.5" stroke-linejoin="round"/>`,
  dress: (f, l) =>
    `<path d="M34 16 L44 24 Q50 28 56 24 L66 16 L74 34 L66 40 L84 106 L16 106 L34 40 L26 34 Z" fill="${f}" stroke="${l}" stroke-width="2.5" stroke-linejoin="round"/>`,
  outer: (f, l) =>
    `<path d="M32 16 L20 24 L12 44 L24 50 L26 44 L26 106 L47 106 L47 30 L53 30 L53 106 L74 106 L74 44 L76 50 L88 44 L80 24 L68 16 L50 34 Z" fill="${f}" stroke="${l}" stroke-width="2.5" stroke-linejoin="round"/>`,
  shoes: (f, l) =>
    `<path d="M14 84 Q16 60 32 60 L42 60 L54 74 L78 82 Q88 85 88 95 L88 101 L14 101 Z" fill="${f}" stroke="${l}" stroke-width="2.5" stroke-linejoin="round"/>`,
  bag: (f, l) =>
    `<path d="M33 46 Q33 22 50 22 Q67 22 67 46" fill="none" stroke="${l}" stroke-width="4"/>` +
    `<path d="M21 46 L79 46 L85 104 L15 104 Z" fill="${f}" stroke="${l}" stroke-width="2.5" stroke-linejoin="round"/>`,
  jewelry: (f, l) =>
    `<path d="M27 26 Q50 80 73 26" fill="none" stroke="${l}" stroke-width="3.5" stroke-linecap="round"/>` +
    `<circle cx="50" cy="76" r="11" fill="${f}" stroke="${l}" stroke-width="2.5"/>`,
  accessory: (f, l) =>
    `<path d="M18 74 Q18 34 50 34 Q82 34 82 74 Z" fill="${f}" stroke="${l}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M9 74 L91 74 L91 86 L9 86 Z" fill="${f}" stroke="${l}" stroke-width="2.5" stroke-linejoin="round"/>`,
}

/** A darker version of the colour, for the outline. */
function outline(c: Hsl): string {
  return hslToCss({ h: c.h, s: Math.min(1, c.s * 1.05), l: Math.max(0.06, c.l - 0.16) })
}

export function silhouette(category: Category, color: Hsl): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">` +
    SHAPES[category](hslToCss(color), outline(color)) +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
