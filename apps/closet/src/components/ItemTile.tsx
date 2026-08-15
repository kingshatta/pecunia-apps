import { wornLabel } from '../lib/format'
import { itemSubtitle } from '../lib/outfit'
import type { Item } from '../lib/types'
import { CheckIcon } from './Icons'

interface ItemTileProps {
  item: Item
  onClick?: (item: Item) => void
  selected?: boolean
  /** Small corner label, e.g. the owner's name in a shared closet. */
  badge?: string
  showWorn?: boolean
}

export function ItemTile({
  item,
  onClick,
  selected = false,
  badge,
  showWorn = true,
}: ItemTileProps) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      {...(onClick
        ? { type: 'button' as const, onClick: () => onClick(item), 'aria-pressed': selected }
        : {})}
      className={`group relative flex w-full flex-col border text-left transition-colors ${
        selected ? 'border-ink bg-porcelain' : 'border-hairline bg-porcelain'
      }`}
    >
      <div className="relative aspect-[4/5] w-full">
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-contain p-3"
        />
        {badge ? (
          <span className="u-label absolute left-2 top-2 bg-ink px-1.5 py-1 text-stone">
            {badge}
          </span>
        ) : null}
        {selected ? (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center bg-ink text-stone">
            <CheckIcon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <div className="border-t border-hairline px-3 py-2.5">
        <p className="truncate text-[13px] font-medium leading-tight">{item.name}</p>
        <p className="mt-1 truncate text-[11.5px] text-graphite">{itemSubtitle(item)}</p>
        {showWorn ? (
          <p className="mt-0.5 truncate text-[11.5px] text-graphite/75">
            {wornLabel(item.lastWornAt, item.wearCount)}
          </p>
        ) : null}
      </div>
    </Wrapper>
  )
}

/** The row of garment thumbnails that stands in for a whole outfit. */
export function OutfitStrip({ items, max = 6 }: { items: Item[]; max?: number }) {
  const shown = items.slice(0, max)
  const extra = items.length - shown.length
  return (
    <div className="flex items-center gap-1.5">
      {shown.map((it) => (
        <div key={it.id} className="h-20 w-16 shrink-0 border border-hairline bg-porcelain">
          <img src={it.imageUrl} alt={it.name} className="h-full w-full object-contain p-1" />
        </div>
      ))}
      {extra > 0 ? (
        <span className="text-[12px] text-graphite tnum">+{extra}</span>
      ) : null}
    </div>
  )
}
