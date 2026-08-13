-- Closet — schema + row-level security.
--
-- Paste this whole file into the Supabase SQL editor (Dashboard → SQL Editor →
-- New query → Run). It is idempotent: re-running it is safe.
--
-- SECURITY MODEL, in one paragraph:
--   A closet is private personal data, so unlike The Sho this app has real
--   accounts (Supabase Auth) and every table is protected by RLS. You can read
--   your own rows always. You can read a friend's ITEMS only when a friendship
--   row between you exists with status 'accepted' — that single predicate,
--   are_friends(), is the entire access boundary and it is used by every
--   cross-user policy below. Friend requests go through invite codes; profiles
--   are NOT publicly readable, so nobody can enumerate users. There is no
--   contacts import anywhere in this app, by design.

-- ---------------------------------------------------------------- extensions
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default 'Friend',
  code        text not null unique,
  sizes       text,
  created_at  timestamptz not null default now()
);

-- Readable-aloud invite codes: no vowels (no accidental words), no 0/O/1/I.
create or replace function public.gen_invite_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := '23456789BCDFGHJKMNPQRSTVWXYZ';
  out text;
  i int;
begin
  loop
    out := '';
    for i in 1..6 loop
      out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles p where p.code = out);
  end loop;
  return out;
end;
$$;

-- Every new auth user gets a profile with a code, automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, code)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    public.gen_invite_code()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------- friendships
create table if not exists public.friendships (
  id               uuid primary key default gen_random_uuid(),
  requester        uuid not null references public.profiles (id) on delete cascade,
  addressee        uuid not null references public.profiles (id) on delete cascade,
  status           text not null default 'pending' check (status in ('pending', 'accepted')),
  size_compatible  boolean not null default true,
  created_at       timestamptz not null default now(),
  constraint friendships_distinct check (requester <> addressee),
  constraint friendships_pair unique (requester, addressee)
);

create index if not exists friendships_requester_idx on public.friendships (requester);
create index if not exists friendships_addressee_idx on public.friendships (addressee);

/*
 * The access boundary for the whole app.
 *
 * SECURITY DEFINER on purpose: policies on other tables call this, and it has
 * to read friendships without tripping that table's own RLS (which would
 * recurse). It only ever returns a boolean, so it leaks nothing.
 */
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.friendships f
     where f.status = 'accepted'
       and ((f.requester = a and f.addressee = b)
         or (f.requester = b and f.addressee = a))
  );
$$;

/*
 * Like are_friends(), but also true while a request is still pending. Used
 * only by the profiles policy, so an incoming request can show a name.
 */
create or replace function public.has_friend_link(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.friendships f
     where (f.requester = a and f.addressee = b)
        or (f.requester = b and f.addressee = a)
  );
$$;

-- Guards the two things RLS alone can't express on an UPDATE.
create or replace function public.friendships_guard()
returns trigger
language plpgsql
as $$
begin
  if new.requester is distinct from old.requester
     or new.addressee is distinct from old.addressee then
    raise exception 'Cannot reassign a friendship';
  end if;
  if new.status is distinct from old.status then
    if not (old.status = 'pending'
            and new.status = 'accepted'
            and old.addressee = auth.uid()) then
      raise exception 'Only the person who received the request can accept it';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists friendships_guard_trigger on public.friendships;
create trigger friendships_guard_trigger
  before update on public.friendships
  for each row execute function public.friendships_guard();

-- ------------------------------------------------------------------- items
create table if not exists public.items (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references public.profiles (id) on delete cascade,
  name          text not null,
  category      text not null check (category in
                  ('top','bottom','dress','outer','shoes','bag','jewelry','accessory')),
  warmth        text[] not null default '{}',
  vibes         text[] not null default '{}',
  color_h       double precision not null default 0,
  color_s       double precision not null default 0,
  color_l       double precision not null default 0.5,
  color_name    text not null default 'grey',
  neutral       boolean not null default true,
  image_path    text,
  size          text,
  brand         text,
  created_at    timestamptz not null default now(),
  last_worn_at  timestamptz,
  wear_count    integer not null default 0
);

create index if not exists items_owner_idx on public.items (owner);
create index if not exists items_owner_category_idx on public.items (owner, category);

-- ----------------------------------------------------------------- outfits
-- item_ids is a plain array: an outfit referencing an item you can't see does
-- NOT leak that item, because items has its own RLS and is read separately.
create table if not exists public.outfits (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references public.profiles (id) on delete cascade, -- who'd wear it
  author      uuid not null references public.profiles (id) on delete cascade, -- who built it
  title       text not null default 'Outfit',
  item_ids    uuid[] not null default '{}',
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists outfits_owner_idx on public.outfits (owner);
create index if not exists outfits_author_idx on public.outfits (author);

-- -------------------------------------------------------------- fit checks
create table if not exists public.fit_checks (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references public.profiles (id) on delete cascade,
  to_user     uuid not null references public.profiles (id) on delete cascade,
  note        text not null default '',
  status      text not null default 'open' check (status in ('open', 'answered')),
  created_at  timestamptz not null default now()
);

create table if not exists public.fit_check_replies (
  id            uuid primary key default gen_random_uuid(),
  fit_check_id  uuid not null references public.fit_checks (id) on delete cascade,
  author        uuid not null references public.profiles (id) on delete cascade,
  item_ids      uuid[] not null default '{}',
  note          text not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists fit_checks_to_idx on public.fit_checks (to_user);
create index if not exists fit_checks_from_idx on public.fit_checks (from_user);
create index if not exists fit_check_replies_parent_idx on public.fit_check_replies (fit_check_id);

-- ----------------------------------------------------------------- borrows
create table if not exists public.borrows (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.items (id) on delete cascade,
  owner       uuid not null references public.profiles (id) on delete cascade,
  borrower    uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'requested'
                check (status in ('requested', 'declined', 'lent', 'returned')),
  note        text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists borrows_owner_idx on public.borrows (owner);
create index if not exists borrows_borrower_idx on public.borrows (borrower);

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
alter table public.profiles          enable row level security;
alter table public.friendships       enable row level security;
alter table public.items             enable row level security;
alter table public.outfits           enable row level security;
alter table public.fit_checks        enable row level security;
alter table public.fit_check_replies enable row level security;
alter table public.borrows           enable row level security;

-- profiles ---------------------------------------------------------------
-- Deliberately NOT public: you can see yourself and the people you have a
-- friendship row with, nobody else. Discovery happens through
-- request_friend(code), never by reading this table.
--
-- Note this covers PENDING links too, not just accepted ones — otherwise an
-- incoming request would arrive from a nameless stranger. It reveals only the
-- name of someone who already exchanged an invite code with you.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.has_friend_link(id, auth.uid()));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- friendships ------------------------------------------------------------
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select using (requester = auth.uid() or addressee = auth.uid());

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert with check (requester = auth.uid());

-- Either side may update (accept, or flip size_compatible); the trigger above
-- is what stops a requester from accepting their own request.
drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships
  for update using (requester = auth.uid() or addressee = auth.uid())
  with check (requester = auth.uid() or addressee = auth.uid());

drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships
  for delete using (requester = auth.uid() or addressee = auth.uid());

-- items ------------------------------------------------------------------
drop policy if exists items_select on public.items;
create policy items_select on public.items
  for select using (owner = auth.uid() or public.are_friends(owner, auth.uid()));

drop policy if exists items_insert on public.items;
create policy items_insert on public.items
  for insert with check (owner = auth.uid());

drop policy if exists items_update on public.items;
create policy items_update on public.items
  for update using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists items_delete on public.items;
create policy items_delete on public.items
  for delete using (owner = auth.uid());

-- outfits ----------------------------------------------------------------
drop policy if exists outfits_select on public.outfits;
create policy outfits_select on public.outfits
  for select using (owner = auth.uid() or author = auth.uid());

-- You may build an outfit for yourself, or for a friend (that's the point).
drop policy if exists outfits_insert on public.outfits;
create policy outfits_insert on public.outfits
  for insert with check (
    author = auth.uid()
    and (owner = auth.uid() or public.are_friends(owner, auth.uid()))
  );

drop policy if exists outfits_update on public.outfits;
create policy outfits_update on public.outfits
  for update using (author = auth.uid()) with check (author = auth.uid());

-- The wearer can throw away a suggestion they didn't ask for.
drop policy if exists outfits_delete on public.outfits;
create policy outfits_delete on public.outfits
  for delete using (author = auth.uid() or owner = auth.uid());

-- fit checks -------------------------------------------------------------
drop policy if exists fit_checks_select on public.fit_checks;
create policy fit_checks_select on public.fit_checks
  for select using (from_user = auth.uid() or to_user = auth.uid());

drop policy if exists fit_checks_insert on public.fit_checks;
create policy fit_checks_insert on public.fit_checks
  for insert with check (
    from_user = auth.uid() and public.are_friends(to_user, auth.uid())
  );

drop policy if exists fit_checks_update on public.fit_checks;
create policy fit_checks_update on public.fit_checks
  for update using (from_user = auth.uid() or to_user = auth.uid())
  with check (from_user = auth.uid() or to_user = auth.uid());

drop policy if exists fit_checks_delete on public.fit_checks;
create policy fit_checks_delete on public.fit_checks
  for delete using (from_user = auth.uid());

drop policy if exists fit_check_replies_select on public.fit_check_replies;
create policy fit_check_replies_select on public.fit_check_replies
  for select using (
    exists (
      select 1 from public.fit_checks c
       where c.id = fit_check_id
         and (c.from_user = auth.uid() or c.to_user = auth.uid())
    )
  );

drop policy if exists fit_check_replies_insert on public.fit_check_replies;
create policy fit_check_replies_insert on public.fit_check_replies
  for insert with check (
    author = auth.uid()
    and exists (
      select 1 from public.fit_checks c
       where c.id = fit_check_id
         and (c.from_user = auth.uid() or c.to_user = auth.uid())
    )
  );

-- borrows ----------------------------------------------------------------
drop policy if exists borrows_select on public.borrows;
create policy borrows_select on public.borrows
  for select using (owner = auth.uid() or borrower = auth.uid());

drop policy if exists borrows_insert on public.borrows;
create policy borrows_insert on public.borrows
  for insert with check (
    borrower = auth.uid()
    and public.are_friends(owner, auth.uid())
    and exists (select 1 from public.items i where i.id = item_id and i.owner = borrows.owner)
  );

drop policy if exists borrows_update on public.borrows;
create policy borrows_update on public.borrows
  for update using (owner = auth.uid() or borrower = auth.uid())
  with check (owner = auth.uid() or borrower = auth.uid());

drop policy if exists borrows_delete on public.borrows;
create policy borrows_delete on public.borrows
  for delete using (borrower = auth.uid() or owner = auth.uid());

-- =========================================================================
-- RPCs
-- =========================================================================

/*
 * Add a friend by invite code.
 *
 * SECURITY DEFINER because profiles is not readable by strangers — this is the
 * ONLY way to turn a code into a person, it returns a friendship row rather
 * than profile data, and it refuses your own code. If the other person had
 * already requested you, this accepts instead of creating a duplicate.
 */
create or replace function public.request_friend(p_code text)
returns public.friendships
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  target   uuid;
  existing public.friendships;
  result   public.friendships;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select id into target from public.profiles where code = upper(trim(p_code));
  if target is null then
    raise exception 'No one is using that code';
  end if;
  if target = auth.uid() then
    raise exception 'That is your own code';
  end if;

  select * into existing
    from public.friendships
   where (requester = auth.uid() and addressee = target)
      or (requester = target and addressee = auth.uid());

  if existing.id is not null then
    if existing.status = 'pending' and existing.addressee = auth.uid() then
      update public.friendships
         set status = 'accepted'
       where id = existing.id
      returning * into result;
      return result;
    end if;
    return existing;
  end if;

  insert into public.friendships (requester, addressee, status)
  values (auth.uid(), target, 'pending')
  returning * into result;
  return result;
end;
$$;

revoke all on function public.request_friend(text) from public, anon;
grant execute on function public.request_friend(text) to authenticated;

/* Bump wear counts for a set of my items. RLS still applies to the update. */
create or replace function public.mark_worn(p_item_ids uuid[])
returns void
language sql
volatile
set search_path = public
as $$
  update public.items
     set last_worn_at = now(),
         wear_count = wear_count + 1
   where id = any (p_item_ids)
     and owner = auth.uid();
$$;

revoke all on function public.mark_worn(uuid[]) from public, anon;
grant execute on function public.mark_worn(uuid[]) to authenticated;

-- =========================================================================
-- STORAGE — garment photos
-- =========================================================================
-- Photos live at items/<owner-uuid>/<item-uuid>.webp. The first path segment
-- is the owner, which is what these policies key off. The bucket is private;
-- the app reads through signed URLs.
insert into storage.buckets (id, name, public)
values ('items', 'items', false)
on conflict (id) do nothing;

drop policy if exists items_storage_select on storage.objects;
create policy items_storage_select on storage.objects
  for select using (
    bucket_id = 'items'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.are_friends(((storage.foldername(name))[1])::uuid, auth.uid())
    )
  );

drop policy if exists items_storage_insert on storage.objects;
create policy items_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'items' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists items_storage_update on storage.objects;
create policy items_storage_update on storage.objects
  for update using (
    bucket_id = 'items' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists items_storage_delete on storage.objects;
create policy items_storage_delete on storage.objects
  for delete using (
    bucket_id = 'items' and (storage.foldername(name))[1] = auth.uid()::text
  );
