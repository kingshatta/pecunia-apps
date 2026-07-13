import { useEffect, useState } from 'react'
import type { Banner } from '../lib/banners'
import { dismissBanner, subscribeBanners } from '../lib/banners'

const TONE: Record<Banner['tone'], string> = {
  info: 'border-sky-300 bg-sky-50 text-sky-900',
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
}

export function Banners() {
  const [banners, setBanners] = useState<Banner[]>([])
  useEffect(() => subscribeBanners(setBanners), [])
  if (banners.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 px-3">
      {banners.map((b) => (
        <button
          key={b.id}
          onClick={() => dismissBanner(b.id)}
          className={`anim-drop pointer-events-auto w-full max-w-md rounded-2xl border-2 p-3 text-left shadow-lg ${TONE[b.tone]}`}
        >
          <div className="font-bold">{b.title}</div>
          {b.body && <div className="text-sm opacity-90">{b.body}</div>}
        </button>
      ))}
    </div>
  )
}
