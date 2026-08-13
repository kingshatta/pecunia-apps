import { isDemo } from '../lib/config'
import type { DataAdapter } from './DataAdapter'
import { LocalDemoAdapter } from './LocalDemoAdapter'
import { SupabaseAdapter } from './SupabaseAdapter'

let instance: DataAdapter | null = null

/** One adapter per session: demo when no backend is configured, live otherwise. */
export function getAdapter(): DataAdapter {
  if (!instance) instance = isDemo() ? new LocalDemoAdapter() : new SupabaseAdapter()
  return instance
}

export type { DataAdapter } from './DataAdapter'
