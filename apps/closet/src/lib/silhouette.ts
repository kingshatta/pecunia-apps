import { hslToCss } from './color'
import type { Category, Hsl } from './types'

/**
 * Garment renderings, drawn as inline SVG data URLs.
 *
 * These do two jobs: they're the artwork for demo mode (a full wardrobe with
 * no binary assets committed), and they're the fallback when someone's real
 * photo fails to load.
 *
 * They aim to look like clothes rather than icons — gradient shading with a
 * consistent top-left light source, seams and construction lines, ribbed
 * bands, hardware, and a contact shadow. The shape is chosen from the item's
 * NAME first and its category second, so "denim mini skirt" and "cargo pants"
 * don't come out as the same rectangle.
 */

interface Palette {
  light: string
  base: string
  dark: string
  seam: string
  sheen: string
}

/** Light source sits top-left; dark garments need a wider spread to read. */
function palette(c: Hsl): Palette {
  const spread = c.l < 0.22 ? 0.16 : c.l > 0.85 ? 0.07 : 0.11
  const shade = (delta: number, satMul = 1): string =>
    hslToCss({
      h: c.h,
      s: Math.min(1, c.s * satMul),
      l: Math.max(0.03, Math.min(0.98, c.l + delta)),
    })
  return {
    light: shade(spread, 0.92),
    base: shade(0),
    dark: shade(-spread * 0.9, 1.04),
    // Pale garments need a disproportionately darker outline, or a white shirt
    // dissolves into the porcelain tile behind it.
    seam: c.l > 0.8 ? shade(-0.26, 1.1) : shade(-spread * 1.7, 1.08),
    sheen: c.l > 0.8 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.22)',
  }
}

type Draw = (p: Palette) => string

const F = 'url(#body)'

/** Seam / topstitch line. */
const seam = (d: string, p: Palette, w = 1.6, opacity = 0.55) =>
  `<path d="${d}" fill="none" stroke="${p.seam}" stroke-width="${w}" stroke-linecap="round" opacity="${opacity}"/>`

/** Ribbed band — cuffs, hems, waistbands. */
const rib = (x: number, y: number, w: number, h: number, p: Palette) => {
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${p.dark}" opacity="0.85"/>`
  for (let i = x + 4; i < x + w - 2; i += 5) {
    out += `<path d="M${i} ${y + 1.5}V${y + h - 1.5}" stroke="${p.seam}" stroke-width="0.9" opacity="0.4"/>`
  }
  return out
}

const button = (cx: number, cy: number, p: Palette) =>
  `<circle cx="${cx}" cy="${cy}" r="3.2" fill="${p.seam}" opacity="0.9"/>`

/* ------------------------------------------------------------------ tops */

const tee: Draw = (p) =>
  `<path d="M64 52 L42 62 L26 100 L52 112 L60 96 L60 186 Q100 194 140 186 L140 96 L148 112 L174 100 L158 62 L136 52 Q120 74 100 74 Q80 74 64 52 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  seam('M60 96 Q60 140 60 184', p) +
  seam('M140 96 Q140 140 140 184', p) +
  seam('M64 52 Q100 78 136 52', p, 1.4, 0.4)

const longSleeve: Draw = (p) =>
  `<path d="M64 52 L40 64 L22 150 L48 158 L62 104 L62 186 Q100 194 138 186 L138 104 L152 158 L178 150 L160 64 L136 52 Q120 74 100 74 Q80 74 64 52 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  rib(24, 148, 26, 12, p) +
  rib(150, 148, 26, 12, p) +
  seam('M62 104 V184', p) +
  seam('M138 104 V184', p)

const tank: Draw = (p) =>
  `<path d="M72 46 L64 58 L60 186 Q100 194 140 186 L136 58 L128 46 Q116 70 100 70 Q84 70 72 46 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  `<path d="M72 46 Q78 34 86 30" fill="none" stroke="${p.seam}" stroke-width="7" stroke-linecap="round"/>` +
  `<path d="M128 46 Q122 34 114 30" fill="none" stroke="${p.seam}" stroke-width="7" stroke-linecap="round"/>` +
  seam('M72 46 Q100 74 128 46', p, 1.4, 0.4)

const cami: Draw = (p) =>
  `<path d="M70 58 Q100 84 130 58 L138 74 L136 188 Q100 196 64 188 L62 74 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.3" stroke-linejoin="round"/>` +
  `<path d="M74 58 Q80 36 92 28" fill="none" stroke="${p.seam}" stroke-width="3.4" stroke-linecap="round"/>` +
  `<path d="M126 58 Q120 36 108 28" fill="none" stroke="${p.seam}" stroke-width="3.4" stroke-linecap="round"/>` +
  `<path d="M78 82 Q88 140 82 186" fill="none" stroke="${p.sheen}" stroke-width="9" stroke-linecap="round" opacity="0.5"/>`

const buttonDown: Draw = (p) =>
  `<path d="M64 56 L42 66 L26 104 L52 116 L60 100 L60 190 Q100 197 140 190 L140 100 L148 116 L174 104 L158 66 L136 56 L100 76 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  // collar
  `<path d="M100 76 L64 56 L84 50 L100 66 Z" fill="${p.light}" stroke="${p.seam}" stroke-width="1.3" stroke-linejoin="round"/>` +
  `<path d="M100 76 L136 56 L116 50 L100 66 Z" fill="${p.dark}" stroke="${p.seam}" stroke-width="1.3" stroke-linejoin="round"/>` +
  // placket
  `<rect x="93" y="76" width="14" height="112" fill="${p.dark}" opacity="0.55"/>` +
  seam('M100 78 V186', p, 1.2, 0.5) +
  button(100, 100, p) +
  button(100, 126, p) +
  button(100, 152, p) +
  button(100, 176, p)

const sweatshirt: Draw = (p) =>
  `<path d="M62 54 L36 66 L18 148 L46 158 L58 108 L58 178 Q100 186 142 178 L142 108 L154 158 L182 148 L164 66 L138 54 Q120 76 100 76 Q80 76 62 54 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  rib(20, 146, 28, 14, p) +
  rib(152, 146, 28, 14, p) +
  rib(58, 176, 84, 16, p) +
  `<path d="M62 54 Q100 80 138 54" fill="none" stroke="${p.seam}" stroke-width="5" stroke-linecap="round" opacity="0.8"/>`

const sweater: Draw = (p) => {
  let knit = ''
  for (let y = 96; y < 172; y += 9) {
    knit += `<path d="M58 ${y} Q100 ${y + 4} 142 ${y}" fill="none" stroke="${p.seam}" stroke-width="0.8" opacity="0.25"/>`
  }
  return (
    `<path d="M62 56 L34 68 L16 150 L44 160 L56 110 L56 176 Q100 184 144 176 L144 110 L156 160 L184 150 L166 68 L138 56 Q120 80 100 80 Q80 80 62 56 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
    knit +
    rib(18, 148, 28, 14, p) +
    rib(154, 148, 28, 14, p) +
    rib(56, 174, 88, 16, p) +
    `<path d="M62 56 Q100 84 138 56" fill="none" stroke="${p.dark}" stroke-width="8" stroke-linecap="round"/>`
  )
}

/* --------------------------------------------------------------- bottoms */

const pants: Draw = (p) =>
  `<path d="M52 54 L148 54 L152 62 L146 214 L110 214 L100 118 L90 214 L54 214 L48 62 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  rib(48, 54, 104, 15, p) +
  seam('M100 70 V112', p, 1.4, 0.6) +
  seam('M100 120 L106 210', p, 1.2, 0.4) +
  seam('M100 120 L94 210', p, 1.2, 0.4) +
  `<path d="M58 72 Q70 84 82 74" fill="none" stroke="${p.seam}" stroke-width="1.3" opacity="0.5"/>` +
  `<path d="M142 72 Q130 84 118 74" fill="none" stroke="${p.seam}" stroke-width="1.3" opacity="0.5"/>` +
  button(112, 62, p)

const cargo: Draw = (p) =>
  `<path d="M50 54 L150 54 L154 62 L148 214 L110 214 L100 120 L90 214 L52 214 L46 62 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  rib(46, 54, 108, 15, p) +
  seam('M100 70 V114', p, 1.4, 0.6) +
  // cargo pockets
  `<rect x="54" y="112" width="30" height="34" fill="${p.dark}" stroke="${p.seam}" stroke-width="1.2" opacity="0.9"/>` +
  `<rect x="116" y="112" width="30" height="34" fill="${p.dark}" stroke="${p.seam}" stroke-width="1.2" opacity="0.9"/>` +
  seam('M54 122 H84', p, 1.1, 0.5) +
  seam('M116 122 H146', p, 1.1, 0.5)

const shorts: Draw = (p) =>
  `<path d="M54 54 L146 54 L150 62 L146 148 L110 148 L100 104 L90 148 L54 148 L50 62 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  rib(50, 54, 100, 15, p) +
  seam('M100 70 V100', p, 1.4, 0.6) +
  `<path d="M58 72 Q70 84 82 74" fill="none" stroke="${p.seam}" stroke-width="1.3" opacity="0.5"/>`

const skirt: Draw = (p) =>
  `<path d="M62 56 L138 56 L160 202 Q100 212 40 202 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  rib(62, 56, 76, 14, p) +
  seam('M100 72 Q100 140 100 204', p, 1.1, 0.3) +
  button(120, 63, p)

const pleatedSkirt: Draw = (p) => {
  let pleats = ''
  for (let i = 0; i < 7; i++) {
    const topX = 66 + i * 11.5
    const botX = 46 + i * 18
    pleats += `<path d="M${topX} 72 L${botX} 204" fill="none" stroke="${p.seam}" stroke-width="1.3" opacity="0.45"/>`
  }
  return (
    `<path d="M62 56 L138 56 L164 204 Q100 214 36 204 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
    pleats +
    rib(62, 56, 76, 14, p)
  )
}

/* --------------------------------------------------------------- dresses */

const dress: Draw = (p) =>
  `<path d="M66 52 L48 64 L54 92 L62 104 L40 212 Q100 222 160 212 L138 104 L146 92 L152 64 L134 52 Q118 76 100 76 Q82 76 66 52 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  seam('M62 104 Q100 112 138 104', p, 1.4, 0.55) +
  seam('M76 112 L62 208', p, 1.1, 0.3) +
  seam('M124 112 L138 208', p, 1.1, 0.3)

const slipDress: Draw = (p) =>
  `<path d="M70 58 Q100 82 130 58 L138 78 L146 212 Q100 222 54 212 L62 78 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.3" stroke-linejoin="round"/>` +
  `<path d="M74 58 Q80 34 92 26" fill="none" stroke="${p.seam}" stroke-width="3.2" stroke-linecap="round"/>` +
  `<path d="M126 58 Q120 34 108 26" fill="none" stroke="${p.seam}" stroke-width="3.2" stroke-linecap="round"/>` +
  `<path d="M80 86 Q92 150 84 208" fill="none" stroke="${p.sheen}" stroke-width="11" stroke-linecap="round" opacity="0.45"/>`

/* ----------------------------------------------------------------- outer */

const jacket: Draw = (p) =>
  `<path d="M64 52 L40 64 L24 146 L50 156 L60 106 L60 192 L96 192 L96 74 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  `<path d="M136 52 L160 64 L176 146 L150 156 L140 106 L140 192 L104 192 L104 74 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  // lapels
  `<path d="M64 52 L96 74 L96 96 L74 62 Z" fill="${p.light}" stroke="${p.seam}" stroke-width="1.2" stroke-linejoin="round"/>` +
  `<path d="M136 52 L104 74 L104 96 L126 62 Z" fill="${p.dark}" stroke="${p.seam}" stroke-width="1.2" stroke-linejoin="round"/>` +
  rib(26, 144, 26, 12, p) +
  rib(148, 144, 26, 12, p) +
  button(92, 132, p) +
  button(92, 156, p)

const coat: Draw = (p) =>
  `<path d="M62 52 L36 66 L20 152 L46 162 L58 112 L56 218 Q100 226 144 218 L142 112 L154 162 L180 152 L164 66 L138 52 L100 78 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  `<path d="M62 52 L100 78 L100 104 L74 60 Z" fill="${p.light}" stroke="${p.seam}" stroke-width="1.2" stroke-linejoin="round"/>` +
  `<path d="M138 52 L100 78 L100 104 L126 60 Z" fill="${p.dark}" stroke="${p.seam}" stroke-width="1.2" stroke-linejoin="round"/>` +
  seam('M100 104 V214', p, 1.2, 0.45) +
  button(88, 122, p) +
  button(112, 122, p) +
  button(88, 158, p) +
  button(112, 158, p) +
  rib(22, 150, 26, 12, p) +
  rib(152, 150, 26, 12, p)

const cardigan: Draw = (p) => {
  let knit = ''
  for (let y = 100; y < 186; y += 10) {
    knit += `<path d="M58 ${y} Q100 ${y + 3} 142 ${y}" fill="none" stroke="${p.seam}" stroke-width="0.8" opacity="0.22"/>`
  }
  return (
    `<path d="M62 56 L36 68 L20 150 L46 160 L58 110 L58 194 Q100 200 142 194 L142 110 L154 160 L180 150 L164 68 L138 56 Q120 76 100 76 Q80 76 62 56 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
    knit +
    `<rect x="92" y="76" width="16" height="118" fill="${p.dark}" opacity="0.5"/>` +
    seam('M100 78 V192', p, 1.2, 0.45) +
    button(100, 104, p) +
    button(100, 132, p) +
    button(100, 160, p) +
    rib(22, 148, 26, 13, p) +
    rib(152, 148, 26, 13, p)
  )
}

/* ----------------------------------------------------------------- shoes */

const sneaker: Draw = (p) =>
  `<path d="M28 170 Q32 122 64 122 L86 122 L112 150 L158 164 Q178 170 178 188 L28 188 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  `<path d="M26 186 L180 186 Q182 200 172 200 L34 200 Q24 200 26 186 Z" fill="${p.light}" stroke="${p.seam}" stroke-width="1.3" stroke-linejoin="round"/>` +
  seam('M62 128 L92 156', p, 1.5, 0.5) +
  seam('M74 124 L104 152', p, 1.5, 0.5) +
  seam('M50 130 Q44 156 46 184', p, 1.4, 0.45) +
  `<path d="M112 150 Q140 158 158 164" fill="none" stroke="${p.seam}" stroke-width="1.4" opacity="0.5"/>`

const boot: Draw = (p) =>
  `<path d="M52 60 L108 60 L112 150 L158 166 Q178 172 178 188 L46 188 Q44 130 48 92 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  `<path d="M44 186 L180 186 Q182 202 172 202 L52 202 Q42 202 44 186 Z" fill="${p.seam}" stroke="${p.seam}" stroke-width="1.2" stroke-linejoin="round"/>` +
  seam('M52 74 H110', p, 1.4, 0.45) +
  seam('M112 150 Q140 160 158 166', p, 1.4, 0.5)

const heel: Draw = (p) =>
  `<path d="M46 92 Q54 78 74 84 L104 148 L166 178 Q178 182 178 190 L120 190 L96 176 Q56 156 46 124 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  `<path d="M120 190 L142 190 L136 176 L124 174 Z" fill="${p.dark}" stroke="${p.seam}" stroke-width="1.2"/>` +
  `<path d="M50 128 Q52 174 58 190 L46 190 Q42 160 44 126 Z" fill="${p.dark}" stroke="${p.seam}" stroke-width="1.2" stroke-linejoin="round"/>` +
  `<path d="M60 90 Q80 100 100 146" fill="none" stroke="${p.sheen}" stroke-width="6" stroke-linecap="round" opacity="0.5"/>`

const sandal: Draw = (p) =>
  `<path d="M30 174 Q100 168 172 174 Q178 176 176 186 Q100 192 26 186 Q22 178 30 174 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  `<path d="M58 174 Q72 138 104 132" fill="none" stroke="${p.base}" stroke-width="7" stroke-linecap="round"/>` +
  `<path d="M96 174 Q112 142 140 138" fill="none" stroke="${p.base}" stroke-width="7" stroke-linecap="round"/>` +
  `<path d="M132 176 Q152 158 164 142" fill="none" stroke="${p.base}" stroke-width="7" stroke-linecap="round"/>` +
  `<path d="M26 184 Q100 190 176 184" fill="none" stroke="${p.seam}" stroke-width="3" opacity="0.7"/>`

/* ------------------------------------------------------------------ bags */

const tote: Draw = (p) =>
  `<path d="M64 96 Q64 46 100 46 Q136 46 136 96" fill="none" stroke="${p.seam}" stroke-width="6" stroke-linecap="round"/>` +
  `<path d="M40 92 L160 92 L170 206 Q100 214 30 206 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  seam('M40 106 Q100 114 160 106', p, 1.3, 0.4)

const crossbody: Draw = (p) =>
  `<path d="M56 108 Q60 34 100 30 Q140 34 144 108" fill="none" stroke="${p.seam}" stroke-width="4.5" stroke-linecap="round"/>` +
  `<path d="M48 104 L152 104 L156 194 Q100 202 44 194 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  `<path d="M48 104 L152 104 L154 140 Q100 150 46 140 Z" fill="${p.dark}" stroke="${p.seam}" stroke-width="1.3" stroke-linejoin="round"/>` +
  `<rect x="92" y="136" width="16" height="12" rx="1" fill="${p.seam}"/>`

/* -------------------------------------------------------------- jewelry */

const necklace: Draw = (p) => {
  let links = ''
  for (let i = 0; i <= 22; i++) {
    const t = i / 22
    const x = 46 + t * 108
    const y = 54 + Math.sin(Math.PI * t) * 92
    links += `<circle cx="${x}" cy="${y}" r="3.6" fill="none" stroke="${p.base}" stroke-width="2.4"/>`
  }
  return (
    links +
    `<circle cx="100" cy="164" r="15" fill="${F}" stroke="${p.seam}" stroke-width="1.6"/>` +
    `<circle cx="95" cy="159" r="4.5" fill="${p.light}" opacity="0.8"/>`
  )
}

// Jewelry is small in life but has to fill the same tile as a coat, so these
// are drawn large — a pair of studs rendered at true scale reads as two specks.
const hoops: Draw = (p) =>
  `<circle cx="62" cy="122" r="44" fill="none" stroke="${F}" stroke-width="13"/>` +
  `<circle cx="62" cy="122" r="44" fill="none" stroke="${p.seam}" stroke-width="1.3" opacity="0.45"/>` +
  `<circle cx="144" cy="122" r="44" fill="none" stroke="${F}" stroke-width="13"/>` +
  `<circle cx="144" cy="122" r="44" fill="none" stroke="${p.seam}" stroke-width="1.3" opacity="0.45"/>` +
  `<path d="M34 100 Q42 84 58 76" fill="none" stroke="${p.light}" stroke-width="5" stroke-linecap="round" opacity="0.9"/>` +
  `<path d="M116 100 Q124 84 140 76" fill="none" stroke="${p.light}" stroke-width="5" stroke-linecap="round" opacity="0.9"/>`

const studs: Draw = (p) =>
  `<circle cx="66" cy="122" r="38" fill="${F}" stroke="${p.seam}" stroke-width="1.6"/>` +
  `<circle cx="52" cy="108" r="12" fill="${p.light}" opacity="0.9"/>` +
  `<circle cx="140" cy="122" r="38" fill="${F}" stroke="${p.seam}" stroke-width="1.6"/>` +
  `<circle cx="126" cy="108" r="12" fill="${p.light}" opacity="0.9"/>`

/* ----------------------------------------------------------- accessories */

const cap: Draw = (p) =>
  `<path d="M40 138 Q40 62 100 62 Q160 62 160 138 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  `<path d="M158 136 Q192 140 192 156 Q192 164 176 164 L120 164 Q118 148 122 136 Z" fill="${p.dark}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  seam('M100 64 V136', p, 1.3, 0.45) +
  seam('M70 70 Q64 106 66 136', p, 1.3, 0.35) +
  seam('M130 70 Q136 106 134 136', p, 1.3, 0.35) +
  `<circle cx="100" cy="66" r="4.5" fill="${p.seam}"/>`

const beanie: Draw = (p) =>
  `<path d="M44 148 Q44 58 100 58 Q156 58 156 148 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
  rib(38, 144, 124, 26, p) +
  seam('M74 66 Q68 108 70 144', p, 1.2, 0.3) +
  seam('M126 66 Q132 108 130 144', p, 1.2, 0.3) +
  `<circle cx="100" cy="52" r="13" fill="${p.light}" stroke="${p.seam}" stroke-width="1.3"/>`

const scarf: Draw = (p) => {
  let fringe = ''
  for (let i = 0; i < 7; i++) {
    const x = 66 + i * 12
    fringe += `<path d="M${x} 194 V210" stroke="${p.seam}" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>`
  }
  return (
    `<path d="M56 44 Q100 76 144 44 L152 70 Q112 104 108 194 L64 194 Q68 104 48 70 Z" fill="${F}" stroke="${p.seam}" stroke-width="1.4" stroke-linejoin="round"/>` +
    fringe +
    seam('M86 108 Q84 150 86 190', p, 1.1, 0.3) +
    seam('M56 44 Q100 80 144 44', p, 1.3, 0.4)
  )
}

/* -------------------------------------------------------------- dispatch */

const DEFAULTS: Record<Category, Draw> = {
  top: tee,
  bottom: pants,
  dress: dress,
  outer: jacket,
  shoes: sneaker,
  bag: tote,
  jewelry: necklace,
  accessory: cap,
}

/** Name keywords → shape, checked before falling back to the category. */
const VARIANTS: { cat: Category; match: RegExp; draw: Draw }[] = [
  { cat: 'top', match: /tank|cami\b|camisole/, draw: tank },
  { cat: 'top', match: /silk cami|slip top|satin cami/, draw: cami },
  { cat: 'top', match: /button|shirt|blouse|oxford/, draw: buttonDown },
  { cat: 'top', match: /sweatshirt|hoodie|crew ?neck/, draw: sweatshirt },
  { cat: 'top', match: /sweater|knit|jumper|cardi/, draw: sweater },
  { cat: 'top', match: /long sleeve|longsleeve|turtleneck/, draw: longSleeve },

  { cat: 'bottom', match: /skirt/, draw: skirt },
  { cat: 'bottom', match: /pleat/, draw: pleatedSkirt },
  { cat: 'bottom', match: /short/, draw: shorts },
  { cat: 'bottom', match: /cargo/, draw: cargo },

  { cat: 'dress', match: /slip/, draw: slipDress },

  { cat: 'outer', match: /coat|trench|parka/, draw: coat },
  { cat: 'outer', match: /cardigan|cardi/, draw: cardigan },

  { cat: 'shoes', match: /boot/, draw: boot },
  { cat: 'shoes', match: /heel|pump|stiletto/, draw: heel },
  { cat: 'shoes', match: /sandal|flip|slide/, draw: sandal },

  { cat: 'bag', match: /crossbody|shoulder|clutch|purse/, draw: crossbody },

  { cat: 'jewelry', match: /hoop|earring/, draw: hoops },
  { cat: 'jewelry', match: /stud|pearl/, draw: studs },

  { cat: 'accessory', match: /beanie|toque/, draw: beanie },
  { cat: 'accessory', match: /scarf|shawl|wrap/, draw: scarf },
]

function pickDraw(category: Category, name: string): Draw {
  const n = name.toLowerCase()
  // Later entries win, so the more specific keyword in a name like
  // "cropped cardigan sweater" lands on the cardigan.
  let chosen: Draw | null = null
  for (const v of VARIANTS) {
    if (v.cat === category && v.match.test(n)) chosen = v.draw
  }
  return chosen ?? DEFAULTS[category]
}

/**
 * An SVG data URL of this garment. `name` selects the shape variant — pass it
 * whenever you have it, or you'll get the category's default cut.
 */
export function silhouette(category: Category, color: Hsl, name = ''): string {
  const p = palette(color)
  const body = pickDraw(category, name)(p)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">` +
    `<defs><linearGradient id="body" x1="0" y1="0" x2="0.85" y2="1">` +
    `<stop offset="0" stop-color="${p.light}"/>` +
    `<stop offset="0.52" stop-color="${p.base}"/>` +
    `<stop offset="1" stop-color="${p.dark}"/>` +
    `</linearGradient></defs>` +
    `<ellipse cx="102" cy="223" rx="56" ry="7" fill="rgba(20,17,15,0.07)"/>` +
    body +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
