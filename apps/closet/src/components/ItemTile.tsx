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
      className={`group relative flex w-full flex-col overflow-hidden rounded-card border text-left transition-colors ${
        selected ? 'border-ink bg-berry-soft/50' : 'border-line bg-surface active:bg-paper'
      }`}
    >
      <div className="relative aspect-[4/5] w-full bg-paper">
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-contain p-2"
        />
        {badge ? (
          <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-paper">
            {badge}
          </span>
        ) : null}
        {selected ? (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper">
            <CheckIcon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <div className="px-3 pb-3 pt-2">
        <p className="truncate text-[14px] font-semibold leading-tight">{item.name}</p>
        <p className="mt-0.5 truncate text-[12px] text-muted">{itemSubtitle(item)}</p>
        {showWorn ? (
          <p className="mt-0.5 truncate text-[12px] text-muted/80">
            {wornLabel(item.lastWornAt, item.wearCount)}
          </p>
        ) : null}
      </div>
    </Wrapper>
  )
}

/** The little row of garment thumbnails that represents a whole outfit. */
export function OutfitStrip({ items, max = 6 }: { items: Item[]; max?: number }) {
  const shown = items.slice(0, max)
  const extra = items.length - shown.length
  return (
    <div className="flex items-center gap-2">
      {shown.map((it) => (
        <div
          key={it.id}
          className="h-16 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-paper"
        >
          <img src={it.imageUrl} alt={it.name} className="h-full w-full object-contain p-1" />
        </div>
      ))}
      {extra > 0 ? <span className="text-[13px] font-medium text-muted">+{extra}</span> : null}
    </div>
  )
}
