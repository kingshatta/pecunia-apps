import { dominantColor } from './color'
import type { Hsl } from './types'

/**
 * On-device photo processing. Nothing here touches the network: your bedroom
 * photos never leave the phone until you save the item, and there is no
 * per-image API bill. See README for the upgrade path to a WASM cutout model.
 */

const MAX_EDGE = 900
const OUTPUT_QUALITY = 0.82

export interface ProcessedPhoto {
  dataUrl: string
  color: Hsl
  width: number
  height: number
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that image'))
    img.src = src
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(new Error('Could not read that file'))
    fr.readAsDataURL(file)
  })
}

/**
 * Knock out a plain background by flood-filling inward from the edges.
 *
 * This handles the common case well — a garment laid on a bed or held against
 * a wall — and does nothing harmful when it fails, which is why the Add screen
 * shows a preview and lets you switch it off. A proper segmentation model is a
 * drop-in replacement here (same signature); it was left out of v1 because the
 * WASM model is a multi-megabyte download for a step you can eyeball.
 */
export function removeFlatBackground(data: ImageData, tolerance = 62): number {
  const { width, height } = data
  const px = data.data

  // Reference colour: the average of the frame's border pixels.
  let rs = 0
  let gs = 0
  let bs = 0
  let n = 0
  const sample = (x: number, y: number) => {
    const i = (y * width + x) * 4
    rs += px[i]
    gs += px[i + 1]
    bs += px[i + 2]
    n++
  }
  for (let x = 0; x < width; x++) {
    sample(x, 0)
    sample(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    sample(0, y)
    sample(width - 1, y)
  }
  const rr = rs / n
  const gg = gs / n
  const bb = bs / n

  const tol2 = tolerance * tolerance
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0

  const push = (idx: number) => {
    if (visited[idx]) return
    const i = idx * 4
    const dr = px[i] - rr
    const dg = px[i + 1] - gg
    const db = px[i + 2] - bb
    if (dr * dr + dg * dg + db * db > tol2) return
    visited[idx] = 1
    queue[tail++] = idx
  }

  for (let x = 0; x < width; x++) {
    push(x)
    push((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    push(y * width)
    push(y * width + width - 1)
  }

  let cleared = 0
  while (head < tail) {
    const idx = queue[head++]
    px[idx * 4 + 3] = 0
    cleared++
    const x = idx % width
    const y = (idx / width) | 0
    if (x > 0) push(idx - 1)
    if (x < width - 1) push(idx + 1)
    if (y > 0) push(idx - width)
    if (y < height - 1) push(idx + width)
  }

  return cleared / (width * height)
}

/**
 * Camera roll / capture → a square-ish, downscaled WebP plus the garment's
 * dominant colour. Runs entirely on the main thread in well under a second
 * for a phone photo at MAX_EDGE.
 */
export async function processPhoto(
  file: File,
  opts: { removeBackground: boolean },
): Promise<ProcessedPhoto> {
  const src = await fileToDataUrl(file)
  const img = await loadImage(src)

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is unavailable on this device')
  ctx.drawImage(img, 0, 0, width, height)

  let data = ctx.getImageData(0, 0, width, height)
  if (opts.removeBackground) {
    const cleared = removeFlatBackground(data)
    // If it ate almost everything the photo wasn't a flat background — keep
    // the original rather than hand back a hole.
    if (cleared > 0.92) {
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      data = ctx.getImageData(0, 0, width, height)
    } else {
      ctx.putImageData(data, 0, 0)
    }
  }

  const color = dominantColor(data)
  const dataUrl = canvas.toDataURL('image/webp', OUTPUT_QUALITY)
  return { dataUrl, color, width, height }
}

/** Turn a data: URL back into a Blob for upload to Supabase Storage. */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}
