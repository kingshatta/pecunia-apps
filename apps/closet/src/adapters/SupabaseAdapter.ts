import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { colorName, isNeutral } from '../lib/color'
import { getConfig } from '../lib/config'
import { dataUrlToBlob } from '../lib/image'
import { silhouette } from '../lib/silhouette'
import type {
  BorrowRequest,
  BorrowStatus,
  Category,
  FitCheck,
  Friend,
  Item,
  Outfit,
  Profile,
  Vibe,
  Warmth,
} from '../lib/types'
import type {
  DataAdapter,
  ItemPatch,
  NewItemInput,
  NewOutfitInput,
  Session,
} from './DataAdapter'

interface ProfileRow {
  id: string
  name: string
  code: string
  sizes: string | null
}

interface ItemRow {
  id: string
  owner: string
  name: string
  category: Category
  warmth: Warmth[]
  vibes: Vibe[]
  color_h: number
  color_s: number
  color_l: number
  color_name: string
  neutral: boolean
  image_path: string | null
  size: string | null
  brand: string | null
  created_at: string
  last_worn_at: string | null
  wear_count: number
}

interface FriendshipRow {
  id: string
  requester: string
  addressee: string
  status: 'pending' | 'accepted'
  size_compatible: boolean
  created_at: string
}

interface OutfitRow {
  id: string
  owner: string
  author: string
  title: string
  item_ids: string[]
  note: string | null
  created_at: string
}

interface FitCheckRow {
  id: string
  from_user: string
  to_user: string
  note: string
  status: 'open' | 'answered'
  created_at: string
}

interface ReplyRow {
  id: string
  fit_check_id: string
  author: string
  item_ids: string[]
  note: string
  created_at: string
}

interface BorrowRow {
  id: string
  item_id: string
  owner: string
  borrower: string
  status: BorrowStatus
  note: string
  created_at: string
}

const BUCKET = 'items'
const SIGNED_URL_TTL = 60 * 60 // 1h; the app refetches on every load anyway

/** The live multi-user backend. Every read below is additionally filtered by RLS. */
export class SupabaseAdapter implements DataAdapter {
  readonly label = 'Live'
  readonly demo = false

  private sb: SupabaseClient
  private userId: string | null = null
  private profileCache = new Map<string, Profile>()

  constructor() {
    const { supabaseUrl, supabaseAnonKey } = getConfig()
    this.sb = createClient(supabaseUrl, supabaseAnonKey)
  }

  private async uid(): Promise<string> {
    if (this.userId) return this.userId
    const { data } = await this.sb.auth.getUser()
    if (!data.user) throw new Error('Not signed in')
    this.userId = data.user.id
    return this.userId
  }

  /** Every profile RLS lets us see: ourselves plus anyone we've swapped codes with. */
  private async profiles(force = false): Promise<Map<string, Profile>> {
    if (!force && this.profileCache.size > 0) return this.profileCache
    const { data, error } = await this.sb.from('profiles').select('id,name,code,sizes')
    if (error) throw error
    this.profileCache = new Map(
      (data as ProfileRow[]).map((p) => [p.id, { id: p.id, name: p.name, code: p.code, sizes: p.sizes }]),
    )
    return this.profileCache
  }

  private async nameOf(id: string): Promise<string> {
    const p = await this.profiles()
    return p.get(id)?.name ?? 'Friend'
  }

  /** Batch-sign the private photo URLs, falling back to a drawn silhouette. */
  private async toItems(rows: ItemRow[]): Promise<Item[]> {
    const paths = rows.map((r) => r.image_path).filter((p): p is string => !!p)
    const signed = new Map<string, string>()
    if (paths.length > 0) {
      const { data } = await this.sb.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL)
      for (const entry of data ?? []) {
        if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl)
      }
    }
    return rows.map((r) => {
      const color = { h: r.color_h, s: r.color_s, l: r.color_l }
      return {
        id: r.id,
        ownerId: r.owner,
        name: r.name,
        category: r.category,
        warmth: r.warmth ?? [],
        vibes: r.vibes ?? [],
        color,
        colorName: r.color_name,
        neutral: r.neutral,
        imageUrl:
          (r.image_path ? signed.get(r.image_path) : undefined) ?? silhouette(r.category, color),
        size: r.size,
        brand: r.brand,
        createdAt: r.created_at,
        lastWornAt: r.last_worn_at,
        wearCount: r.wear_count,
      }
    })
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.sb.auth.getUser()
    if (!data.user) return null
    this.userId = data.user.id
    const profiles = await this.profiles(true)
    const profile = profiles.get(data.user.id)
    if (!profile) return null // trigger hasn't created the row yet
    return { userId: data.user.id, profile }
  }

  async signIn(identifier: string): Promise<{ needsEmailLink: boolean }> {
    const email = identifier.trim()
    const { error } = await this.sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    })
    if (error) throw error
    return { needsEmailLink: true }
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut()
    this.userId = null
    this.profileCache.clear()
  }

  async updateProfile(patch: { name?: string; sizes?: string | null }): Promise<Profile> {
    const uid = await this.uid()
    const { data, error } = await this.sb
      .from('profiles')
      .update(patch)
      .eq('id', uid)
      .select('id,name,code,sizes')
      .single()
    if (error) throw error
    const row = data as ProfileRow
    const profile: Profile = { id: row.id, name: row.name, code: row.code, sizes: row.sizes }
    this.profileCache.set(profile.id, profile)
    return profile
  }

  async getMyItems(): Promise<Item[]> {
    const uid = await this.uid()
    const { data, error } = await this.sb
      .from('items')
      .select('*')
      .eq('owner', uid)
      .order('created_at', { ascending: false })
    if (error) throw error
    return this.toItems(data as ItemRow[])
  }

  async getFriendItems(friendUserId: string): Promise<Item[]> {
    const { data, error } = await this.sb
      .from('items')
      .select('*')
      .eq('owner', friendUserId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return this.toItems(data as ItemRow[])
  }

  async addItem(input: NewItemInput): Promise<Item> {
    const uid = await this.uid()
    const id = crypto.randomUUID()
    const path = `${uid}/${id}.webp`

    const blob = await dataUrlToBlob(input.imageDataUrl)
    const up = await this.sb.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/webp', upsert: true })
    if (up.error) throw up.error

    const { data, error } = await this.sb
      .from('items')
      .insert({
        id,
        owner: uid,
        name: input.name,
        category: input.category,
        warmth: input.warmth,
        vibes: input.vibes,
        color_h: input.color.h,
        color_s: input.color.s,
        color_l: input.color.l,
        color_name: colorName(input.color),
        neutral: isNeutral(input.color),
        image_path: path,
        size: input.size,
        brand: input.brand,
      })
      .select('*')
      .single()
    if (error) throw error
    const [item] = await this.toItems([data as ItemRow])
    return item
  }

  async updateItem(id: string, patch: ItemPatch): Promise<Item> {
    const { data, error } = await this.sb
      .from('items')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    const [item] = await this.toItems([data as ItemRow])
    return item
  }

  async deleteItem(id: string): Promise<void> {
    const uid = await this.uid()
    const { error } = await this.sb.from('items').delete().eq('id', id)
    if (error) throw error
    await this.sb.storage.from(BUCKET).remove([`${uid}/${id}.webp`])
  }

  async markWorn(itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return
    const { error } = await this.sb.rpc('mark_worn', { p_item_ids: itemIds })
    if (error) throw error
  }

  async getFriends(): Promise<Friend[]> {
    const uid = await this.uid()
    const { data, error } = await this.sb.from('friendships').select('*')
    if (error) throw error
    const profiles = await this.profiles(true)
    return (data as FriendshipRow[]).map((f) => {
      const otherId = f.requester === uid ? f.addressee : f.requester
      const other = profiles.get(otherId)
      const status: Friend['status'] =
        f.status === 'accepted' ? 'accepted' : f.requester === uid ? 'pending-out' : 'pending-in'
      return {
        id: f.id,
        userId: otherId,
        name: other?.name ?? 'Friend',
        code: other?.code ?? '',
        status,
        sizeCompatible: f.size_compatible,
        createdAt: f.created_at,
      }
    })
  }

  async requestFriend(code: string): Promise<Friend> {
    const uid = await this.uid()
    const { data, error } = await this.sb.rpc('request_friend', { p_code: code })
    if (error) throw new Error(error.message)
    const row = data as FriendshipRow
    const profiles = await this.profiles(true)
    const otherId = row.requester === uid ? row.addressee : row.requester
    const other = profiles.get(otherId)
    return {
      id: row.id,
      userId: otherId,
      name: other?.name ?? 'Friend',
      code: other?.code ?? '',
      status:
        row.status === 'accepted' ? 'accepted' : row.requester === uid ? 'pending-out' : 'pending-in',
      sizeCompatible: row.size_compatible,
      createdAt: row.created_at,
    }
  }

  async acceptFriend(friendshipId: string): Promise<void> {
    const { error } = await this.sb
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
    if (error) throw error
  }

  async removeFriend(friendshipId: string): Promise<void> {
    const { error } = await this.sb.from('friendships').delete().eq('id', friendshipId)
    if (error) throw error
  }

  async setSizeCompatible(friendshipId: string, value: boolean): Promise<void> {
    const { error } = await this.sb
      .from('friendships')
      .update({ size_compatible: value })
      .eq('id', friendshipId)
    if (error) throw error
  }

  async getOutfits(): Promise<Outfit[]> {
    const uid = await this.uid()
    const { data, error } = await this.sb
      .from('outfits')
      .select('*')
      .eq('owner', uid)
      .order('created_at', { ascending: false })
    if (error) throw error
    const profiles = await this.profiles()
    return (data as OutfitRow[]).map((o) => ({
      id: o.id,
      ownerId: o.owner,
      authorId: o.author,
      authorName: profiles.get(o.author)?.name ?? 'Friend',
      title: o.title,
      itemIds: o.item_ids,
      note: o.note,
      createdAt: o.created_at,
      source: o.author === uid ? 'saved' : 'from-friend',
    }))
  }

  async saveOutfit(input: NewOutfitInput): Promise<Outfit> {
    const uid = await this.uid()
    const owner = input.forUserId ?? uid
    const { data, error } = await this.sb
      .from('outfits')
      .insert({
        owner,
        author: uid,
        title: input.title,
        item_ids: input.itemIds,
        note: input.note,
      })
      .select('*')
      .single()
    if (error) throw error
    const o = data as OutfitRow
    return {
      id: o.id,
      ownerId: o.owner,
      authorId: o.author,
      authorName: await this.nameOf(o.author),
      title: o.title,
      itemIds: o.item_ids,
      note: o.note,
      createdAt: o.created_at,
      source: o.author === o.owner ? 'saved' : 'from-friend',
    }
  }

  async deleteOutfit(id: string): Promise<void> {
    const { error } = await this.sb.from('outfits').delete().eq('id', id)
    if (error) throw error
  }

  async getFitChecks(): Promise<FitCheck[]> {
    const { data, error } = await this.sb
      .from('fit_checks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    const rows = data as FitCheckRow[]
    if (rows.length === 0) return []

    const { data: replyData, error: replyError } = await this.sb
      .from('fit_check_replies')
      .select('*')
      .in(
        'fit_check_id',
        rows.map((r) => r.id),
      )
      .order('created_at', { ascending: true })
    if (replyError) throw replyError

    const profiles = await this.profiles()
    const byParent = new Map<string, ReplyRow[]>()
    for (const r of (replyData ?? []) as ReplyRow[]) {
      const list = byParent.get(r.fit_check_id)
      if (list) list.push(r)
      else byParent.set(r.fit_check_id, [r])
    }

    return rows.map((c) => ({
      id: c.id,
      fromUserId: c.from_user,
      fromName: profiles.get(c.from_user)?.name ?? 'Friend',
      toUserId: c.to_user,
      toName: profiles.get(c.to_user)?.name ?? 'Friend',
      note: c.note,
      status: c.status,
      createdAt: c.created_at,
      replies: (byParent.get(c.id) ?? []).map((r) => ({
        id: r.id,
        authorId: r.author,
        authorName: profiles.get(r.author)?.name ?? 'Friend',
        itemIds: r.item_ids,
        note: r.note,
        createdAt: r.created_at,
      })),
    }))
  }

  async createFitCheck(toUserId: string, note: string): Promise<FitCheck> {
    const uid = await this.uid()
    const { data, error } = await this.sb
      .from('fit_checks')
      .insert({ from_user: uid, to_user: toUserId, note })
      .select('*')
      .single()
    if (error) throw error
    const c = data as FitCheckRow
    return {
      id: c.id,
      fromUserId: c.from_user,
      fromName: await this.nameOf(c.from_user),
      toUserId: c.to_user,
      toName: await this.nameOf(c.to_user),
      note: c.note,
      status: c.status,
      createdAt: c.created_at,
      replies: [],
    }
  }

  async replyFitCheck(id: string, reply: { itemIds: string[]; note: string }): Promise<void> {
    const uid = await this.uid()
    const { error } = await this.sb
      .from('fit_check_replies')
      .insert({ fit_check_id: id, author: uid, item_ids: reply.itemIds, note: reply.note })
    if (error) throw error
    const { error: statusError } = await this.sb
      .from('fit_checks')
      .update({ status: 'answered' })
      .eq('id', id)
    if (statusError) throw statusError
  }

  async getBorrows(): Promise<BorrowRequest[]> {
    const { data, error } = await this.sb
      .from('borrows')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    const rows = data as BorrowRow[]
    if (rows.length === 0) return []

    const { data: itemData } = await this.sb
      .from('items')
      .select('id,name')
      .in(
        'id',
        rows.map((r) => r.item_id),
      )
    const itemNames = new Map(
      ((itemData ?? []) as { id: string; name: string }[]).map((i) => [i.id, i.name]),
    )
    const profiles = await this.profiles()

    return rows.map((b) => ({
      id: b.id,
      itemId: b.item_id,
      itemName: itemNames.get(b.item_id) ?? 'An item',
      ownerId: b.owner,
      ownerName: profiles.get(b.owner)?.name ?? 'Friend',
      borrowerId: b.borrower,
      borrowerName: profiles.get(b.borrower)?.name ?? 'Friend',
      status: b.status,
      note: b.note,
      createdAt: b.created_at,
    }))
  }

  async requestBorrow(itemId: string, note: string): Promise<BorrowRequest> {
    const uid = await this.uid()
    const { data: itemRow, error: itemError } = await this.sb
      .from('items')
      .select('id,name,owner')
      .eq('id', itemId)
      .single()
    if (itemError) throw itemError
    const item = itemRow as { id: string; name: string; owner: string }

    const { data, error } = await this.sb
      .from('borrows')
      .insert({ item_id: itemId, owner: item.owner, borrower: uid, note })
      .select('*')
      .single()
    if (error) throw error
    const b = data as BorrowRow
    return {
      id: b.id,
      itemId: b.item_id,
      itemName: item.name,
      ownerId: b.owner,
      ownerName: await this.nameOf(b.owner),
      borrowerId: b.borrower,
      borrowerName: await this.nameOf(b.borrower),
      status: b.status,
      note: b.note,
      createdAt: b.created_at,
    }
  }

  async setBorrowStatus(id: string, status: BorrowStatus): Promise<void> {
    const { error } = await this.sb.from('borrows').update({ status }).eq('id', id)
    if (error) throw error
  }

  /**
   * Realtime, with a 30s poll behind it — per the house convention, realtime
   * must degrade gracefully rather than silently stop updating.
   */
  subscribe(cb: () => void): () => void {
    const channel = this.sb
      .channel('closet-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outfits' }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fit_checks' }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fit_check_replies' }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'borrows' }, cb)
      .subscribe()

    const poll = window.setInterval(cb, 30_000)
    return () => {
      window.clearInterval(poll)
      void this.sb.removeChannel(channel)
    }
  }
}
