export interface ClosetConfig {
  supabaseUrl: string
  supabaseAnonKey: string
}

declare global {
  interface Window {
    CLOSET_CONFIG?: Partial<ClosetConfig>
  }
}

export function getConfig(): ClosetConfig {
  const c = window.CLOSET_CONFIG ?? {}
  return {
    supabaseUrl: c.supabaseUrl ?? '',
    supabaseAnonKey: c.supabaseAnonKey ?? '',
  }
}

/** Demo mode: forced with ?demo=1, or automatic when no backend is configured. */
export function isDemo(): boolean {
  const params = new URLSearchParams(window.location.search)
  if (params.get('demo') === '1') return true
  const c = getConfig()
  return !c.supabaseUrl || !c.supabaseAnonKey
}
