import { useRef, useState } from 'react'
import { getAdapter } from '../adapters'
import { CameraIcon } from '../components/Icons'
import { Sheet } from '../components/Sheet'
import { Button, Chips, Field, inputClass } from '../components/ui'
import { colorName, hslToCss } from '../lib/color'
import { processPhoto, type ProcessedPhoto } from '../lib/image'
import {
  CATEGORIES,
  CATEGORY_LABEL,
  VIBES,
  VIBE_LABEL,
  WARMTHS,
  WARMTH_LABEL,
  type Category,
  type Vibe,
  type Warmth,
} from '../lib/types'

interface AddItemProps {
  open: boolean
  onClose: () => void
  onSaved: () => Promise<void>
}

/**
 * The cataloguing flow — the highest-friction screen in any closet app, and
 * the one every dead competitor lost on. Everything here is in service of
 * getting one garment in under about five seconds: shoot, glance at the
 * cut-out, tap three chips, save.
 */
export function AddItem({ open, onClose, onSaved }: AddItemProps) {
  const adapter = getAdapter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [photo, setPhoto] = useState<ProcessedPhoto | null>(null)
  const [cutout, setCutout] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('top')
  const [warmth, setWarmth] = useState<Warmth[]>(['mild'])
  const [vibes, setVibes] = useState<Vibe[]>(['casual'])
  const [size, setSize] = useState('')
  const [brand, setBrand] = useState('')

  const reset = () => {
    setFile(null)
    setPhoto(null)
    setCutout(true)
    setName('')
    setCategory('top')
    setWarmth(['mild'])
    setVibes(['casual'])
    setSize('')
    setBrand('')
    setError(null)
  }

  const close = () => {
    reset()
    onClose()
  }

  const run = async (f: File, removeBackground: boolean) => {
    setWorking(true)
    setError(null)
    try {
      const result = await processPhoto(f, { removeBackground })
      setPhoto(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that photo')
    } finally {
      setWorking(false)
    }
  }

  const onPick = async (f: File | undefined) => {
    if (!f) return
    setFile(f)
    await run(f, cutout)
  }

  const toggleCutout = async () => {
    const next = !cutout
    setCutout(next)
    if (file) await run(file, next)
  }

  const save = async () => {
    if (!photo || !name.trim()) return
    setWorking(true)
    setError(null)
    try {
      await adapter.addItem({
        name: name.trim(),
        category,
        warmth,
        vibes,
        color: photo.color,
        imageDataUrl: photo.dataUrl,
        size: size.trim() || null,
        brand: brand.trim() || null,
      })
      reset()
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that item')
      setWorking(false)
    }
  }

  return (
    <Sheet
      open={open}
      title="Add to closet"
      onClose={close}
      footer={
        photo ? (
          <Button full onClick={save} disabled={!name.trim() || working}>
            {working ? 'Saving…' : 'Save to closet'}
          </Button>
        ) : undefined
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0])}
      />

      {!photo ? (
        <div className="py-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center rounded-card border border-dashed border-hairline bg-porcelain px-6 py-14 text-center active:bg-stone"
          >
            <CameraIcon className="mb-3 h-9 w-9 text-graphite" />
            <span className="text-base font-semibold">
              {working ? 'Reading photo…' : 'Take a photo'}
            </span>
            <span className="mt-1 max-w-[30ch] text-sm leading-relaxed text-graphite">
              Lay it flat on a plain surface. One garment per shot.
            </span>
          </button>
          {error ? <p className="mt-4 text-sm font-medium text-claret">{error}</p> : null}
        </div>
      ) : (
        <div className="space-y-5 pb-2">
          <div className="flex gap-4">
            <div className="h-40 w-32 shrink-0 overflow-hidden rounded-card border border-hairline bg-stone">
              <img
                src={photo.dataUrl}
                alt="The item you're adding"
                className="h-full w-full object-contain p-1.5"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="u-label">
                  Colour picked up
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-hairline"
                    style={{ background: hslToCss(photo.color) }}
                    aria-hidden="true"
                  />
                  <span className="text-[15px] font-medium">{colorName(photo.color)}</span>
                </div>
              </div>
              <label className="flex items-center gap-2.5 text-[14px]">
                <input
                  type="checkbox"
                  checked={cutout}
                  onChange={() => void toggleCutout()}
                  className="h-5 w-5 accent-[#14110f]"
                />
                <span>Cut out the background</span>
              </label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[14px] font-semibold text-claret underline underline-offset-2"
              >
                Retake photo
              </button>
            </div>
          </div>

          <Field label="What is it?">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Black ribbed tank"
              aria-label="Item name"
            />
          </Field>

          <div>
            <p className="u-label mb-2 block">
              Type
            </p>
            <Chips
              ariaLabel="Item type"
              options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
              selected={[category]}
              onToggle={(c) => setCategory(c)}
            />
          </div>

          <div>
            <p className="u-label mb-2 block">
              Warm enough for
            </p>
            <Chips
              ariaLabel="Warmth"
              options={WARMTHS.map((w) => ({ value: w, label: WARMTH_LABEL[w] }))}
              selected={warmth}
              onToggle={(w) =>
                setWarmth((cur) => (cur.includes(w) ? cur.filter((x) => x !== w) : [...cur, w]))
              }
            />
          </div>

          <div>
            <p className="u-label mb-2 block">
              Vibe
            </p>
            <Chips
              ariaLabel="Vibe"
              options={VIBES.map((v) => ({ value: v, label: VIBE_LABEL[v] }))}
              selected={vibes}
              onToggle={(v) =>
                setVibes((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Size">
              <input
                className={inputClass}
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="S"
                aria-label="Size"
              />
            </Field>
            <Field label="Brand">
              <input
                className={inputClass}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="optional"
                aria-label="Brand"
              />
            </Field>
          </div>

          {error ? <p className="text-sm font-medium text-claret">{error}</p> : null}
        </div>
      )}
    </Sheet>
  )
}
