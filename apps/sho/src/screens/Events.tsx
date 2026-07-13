import { useState } from 'react'
import type { CampEvent, EventSide, LocationId } from '../lib/types'
import { datetimeLocalValue, formatEventTime } from '../lib/time'
import { Sheet } from '../components/Sheet'

const SIDE_LABEL: Record<EventSide, string> = {
  pines: '🌲 Pines',
  timbers: '🪵 Timbers',
  both: '🏕️ All camp',
}

export interface EventsProps {
  events: CampEvent[]
  side: LocationId
  now: number
  myDeviceId: string
  onCreate: (input: {
    title: string
    description: string
    place: string
    side: EventSide
    startsAt: string
  }) => void
  onDelete: (event: CampEvent) => void
  onReport: (event: CampEvent) => void
}

function CreateEventSheet({
  side,
  onCreate,
  onClose,
}: {
  side: LocationId
  onCreate: EventsProps['onCreate']
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')
  const [when, setWhen] = useState(datetimeLocalValue(2 * 3600 * 1000))
  const [eventSide, setEventSide] = useState<EventSide>(side)
  const [description, setDescription] = useState('')
  const ready = title.trim().length >= 3 && place.trim().length >= 2 && when

  const input =
    'mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-slate-900'
  return (
    <Sheet title="Create an event" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-slate-700">
          What's happening?
          <input
            className={input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Watch party: World Cup final"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Where?
          <input
            className={input}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="e.g. Timbers Sho porch"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          When?
          <input
            type="datetime-local"
            className={input}
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </label>
        <div className="text-sm font-semibold text-slate-700">Who's invited?</div>
        <div className="grid grid-cols-3 gap-2">
          {(['pines', 'timbers', 'both'] as EventSide[]).map((s) => (
            <button
              key={s}
              onClick={() => setEventSide(s)}
              className={`rounded-xl border-2 px-2 py-2 text-sm font-bold ${
                eventSide === s
                  ? 'border-pine bg-pine-soft text-pine'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              {SIDE_LABEL[s]}
            </button>
          ))}
        </div>
        <label className="block text-sm font-semibold text-slate-700">
          Details (optional)
          <textarea
            className={input}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Bring a blanket!"
          />
        </label>
        <div className="rounded-xl bg-sky-50 p-3 text-xs text-sky-800">
          Everyone with the app gets a notification about your event. Be cool 🙂
        </div>
        <button
          disabled={!ready}
          onClick={() =>
            onCreate({
              title: title.trim(),
              description: description.trim(),
              place: place.trim(),
              side: eventSide,
              startsAt: new Date(when).toISOString(),
            })
          }
          className="w-full rounded-xl bg-pine py-3.5 font-bold text-white transition-all disabled:opacity-40"
        >
          Post event + notify camp
        </button>
      </div>
    </Sheet>
  )
}

export function Events(props: EventsProps) {
  const { events, side, now, myDeviceId, onCreate, onDelete, onReport } = props
  const [creating, setCreating] = useState(false)
  const visible = events.filter((e) => e.side === 'both' || e.side === side)
  const elsewhere = events.length - visible.length

  return (
    <div className="px-4 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-slate-900">Upcoming events</h2>
        <button
          onClick={() => setCreating(true)}
          className="rounded-full bg-pine px-4 py-2 text-sm font-bold text-white transition-transform active:scale-95"
        >
          + New event
        </button>
      </div>

      {visible.length === 0 && (
        <div className="mt-6 rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm">
          <div className="text-3xl">🎬</div>
          <div className="mt-2 font-semibold text-slate-700">Nothing planned yet</div>
          <div className="mt-1 text-sm">
            Movie night? Watch party? Post it and the whole camp gets a ping.
          </div>
        </div>
      )}

      <div className="mt-3 space-y-3">
        {visible.map((e) => (
          <div key={e.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-slate-900">{e.title}</div>
                <div className="mt-0.5 text-sm font-semibold text-pine">
                  {formatEventTime(e.startsAt, now)} · {e.place}
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                {SIDE_LABEL[e.side]}
              </span>
            </div>
            {e.description && <div className="mt-2 text-sm text-slate-600">{e.description}</div>}
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>by {e.creatorName}</span>
              {e.creatorDeviceId === myDeviceId ? (
                <button className="font-semibold text-rose-500" onClick={() => onDelete(e)}>
                  Delete
                </button>
              ) : (
                <button className="font-semibold" onClick={() => onReport(e)}>
                  Report
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {elsewhere > 0 && (
        <div className="mt-3 text-center text-xs text-slate-400">
          {elsewhere} event{elsewhere > 1 ? 's' : ''} on the other side — switch sides up top to
          see {elsewhere > 1 ? 'them' : 'it'}.
        </div>
      )}

      {creating && (
        <CreateEventSheet
          side={side}
          onCreate={(input) => {
            onCreate(input)
            setCreating(false)
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  )
}
