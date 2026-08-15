import { Button } from './ui'

export interface TourStep {
  /** Which tab this step is about — the tour drives the app there. */
  tab: 'closet' | 'outfits' | 'fits' | 'friends' | 'me'
  title: string
  body: string
}

/**
 * The steps someone else needs to understand the app in about ninety seconds.
 * Ordered so the differentiated part — a friend picking out of your closet —
 * lands before the ordinary parts.
 */
export const TOUR: TourStep[] = [
  {
    tab: 'outfits',
    title: 'Outfits that explain themselves',
    body: 'Each one is scored on colour, on what goes with what, and on how long a piece has sat unworn. Read the lines under the row — that reasoning is the whole point.',
  },
  {
    tab: 'outfits',
    title: 'Two closets at once',
    body: "Tap “+ Dolce Nicole's” above. The engine starts pulling from her wardrobe too, and marks which pieces aren't yours.",
  },
  {
    tab: 'fits',
    title: 'The bit nobody else does',
    body: "Dolce Nicole is standing in front of her closet with nothing to wear. Tap “Pick for them” — you're now looking at her actual clothes, choosing her outfit.",
  },
  {
    tab: 'friends',
    title: 'Invite by text',
    body: 'A number, or a six-character code. No contacts upload, and no way to look someone up by number. Tap a friend to browse their closet and ask to borrow something.',
  },
  {
    tab: 'closet',
    title: 'Add something real',
    body: 'Tap Add and photograph a piece you actually own. The background comes off on your phone and the colour is read automatically — nothing is uploaded.',
  },
]

interface DemoTourProps {
  step: number
  onNext: () => void
  onSkip: () => void
}

export function DemoTour({ step, onNext, onSkip }: DemoTourProps) {
  const current = TOUR[step]
  const last = step === TOUR.length - 1
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[74px] z-40 px-3">
      <div className="pointer-events-auto mx-auto w-full max-w-[560px] border border-ink bg-porcelain p-4 shadow-[0_-6px_24px_rgba(20,17,15,0.10)]">
        <p className="u-label tnum">
          Tour · {step + 1} of {TOUR.length}
        </p>
        <h2 className="display mt-1.5 text-[21px] leading-tight">{current.title}</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-graphite">{current.body}</p>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" onClick={onSkip} className="flex-1">
            {last ? 'Close' : 'Skip tour'}
          </Button>
          {!last ? (
            <Button onClick={onNext} className="flex-1">
              Next
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
