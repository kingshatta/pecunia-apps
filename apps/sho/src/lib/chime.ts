// A short, friendly two-note chime played in-app when a load finishes.
// Uses Web Audio (no asset, works offline). Mobile browsers require a user
// gesture before audio can start, so we lazily create the context and resume
// it on the first tap — after that, timer-driven chimes can play freely.

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  return ctx
}

/** Call once on a user gesture to unlock audio for later timer-driven chimes. */
export function unlockAudio(): void {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume()
}

export function playChime(): void {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  const now = c.currentTime
  const gain = c.createGain()
  gain.connect(c.destination)
  // Two soft sine notes (C6 → E6), quick bell-like decay.
  for (const [freq, start] of [
    [1046.5, 0],
    [1318.5, 0.16],
  ] as [number, number][]) {
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, now + start)
    g.gain.exponentialRampToValueAtTime(0.22, now + start + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.5)
    osc.connect(g)
    g.connect(gain)
    osc.start(now + start)
    osc.stop(now + start + 0.55)
  }
}
