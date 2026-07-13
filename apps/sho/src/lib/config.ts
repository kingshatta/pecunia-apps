export interface ShoConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  vapidPublicKey: string
}

declare global {
  interface Window {
    SHO_CONFIG?: Partial<ShoConfig>
  }
}

export function getConfig(): ShoConfig {
  const c = window.SHO_CONFIG ?? {}
  return {
    supabaseUrl: c.supabaseUrl ?? '',
    supabaseAnonKey: c.supabaseAnonKey ?? '',
    vapidPublicKey: c.vapidPublicKey ?? '',
  }
}

/** Demo mode: forced with ?demo=1, or automatic when no backend is configured. */
export function isDemo(): boolean {
  const params = new URLSearchParams(window.location.search)
  if (params.get('demo') === '1') return true
  const c = getConfig()
  return !c.supabaseUrl || !c.supabaseAnonKey
}
