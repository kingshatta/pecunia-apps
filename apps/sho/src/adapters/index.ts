import type { DataAdapter } from './DataAdapter'
import { LocalDemoAdapter } from './LocalDemoAdapter'
import { SupabaseAdapter } from './SupabaseAdapter'
import { getConfig, isDemo } from '../lib/config'

let adapter: DataAdapter | null = null

export function getAdapter(): DataAdapter {
  if (!adapter) {
    if (isDemo()) {
      adapter = new LocalDemoAdapter()
    } else {
      const c = getConfig()
      adapter = new SupabaseAdapter(c.supabaseUrl, c.supabaseAnonKey)
    }
  }
  return adapter
}
