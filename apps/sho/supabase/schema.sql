-- ============================================================
-- The Sho — Supabase schema. Paste this whole file into the
-- Supabase SQL Editor and click Run. Safe to run more than once.
--
-- >>> BEFORE RUNNING, EDIT ONE THING: <<<
-- Project ref jehsflkioicahjeigqst is baked into the cron job at the very bottom
-- (find it in Project Settings → General → Reference ID).
-- Machine seed below is 6 washers + 6 dryers per sho; adjust the
-- generate_series(1, 6) only if the real counts ever change.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------- tables ----------

create table if not exists machines (
  id text primary key, -- e.g. "pines-washer-1"
  location text not null check (location in ('pines', 'timbers')),
  kind text not null check (kind in ('washer', 'dryer')),
  number int not null
);

-- 6 washers + 6 dryers per sho. Make sure the physical machines are
-- labeled with the same numbers the app shows.
insert into machines (id, location, kind, number)
select l.loc || '-' || k.kind || '-' || n, l.loc, k.kind, n
from (values ('pines'), ('timbers')) as l(loc),
     (values ('washer'), ('dryer')) as k(kind),
     generate_series(1, 6) as n
on conflict (id) do nothing;

create table if not exists loads (
  id uuid primary key default gen_random_uuid(),
  machine_id text not null references machines (id),
  location text not null check (location in ('pines', 'timbers')),
  owner_name text not null,
  device_id text not null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'running' check (status in ('running', 'collected', 'displaced')),
  collected_at timestamptz,
  displaced_at timestamptz,
  displaced_by_name text,
  -- set by the push edge function so nothing is ever double-sent
  notified_done_at timestamptz,
  notified_reminder_at timestamptz,
  notified_displaced_at timestamptz
);
create index if not exists loads_machine_running on loads (machine_id) where status = 'running';
create index if not exists loads_device on loads (device_id, started_at desc);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  place text not null,
  side text not null check (side in ('pines', 'timbers', 'both')),
  starts_at timestamptz not null,
  creator_name text not null,
  creator_device_id text not null,
  created_at timestamptz not null default now(),
  reports int not null default 0,
  notified_at timestamptz
);

create table if not exists push_subscriptions (
  device_id text primary key,
  owner_name text not null default '',
  subscription jsonb not null,
  side text not null check (side in ('pines', 'timbers')),
  wants_events boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------- row level security ----------
-- Anyone (anon key) may READ machines/loads/events. All WRITES go
-- through the security-definer functions below, never direct table
-- access. Push subscription endpoints are not readable by clients.

alter table machines enable row level security;
alter table loads enable row level security;
alter table events enable row level security;
alter table push_subscriptions enable row level security;

drop policy if exists machines_read on machines;
create policy machines_read on machines for select using (true);

drop policy if exists loads_read on loads;
create policy loads_read on loads for select using (true);

drop policy if exists events_read on events;
create policy events_read on events for select using (true);

-- ---------- realtime ----------
do $$
begin
  alter publication supabase_realtime add table loads;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table events;
exception when duplicate_object then null;
end $$;

-- ---------- write functions (called by the app via RPC) ----------

create or replace function start_load(
  p_machine_id text, p_minutes int, p_owner_name text, p_device_id text
) returns loads
language plpgsql security definer set search_path = public as $$
declare
  v_machine machines%rowtype;
  v_load loads;
begin
  if p_minutes < 1 or p_minutes > 240 then
    raise exception 'minutes must be between 1 and 240';
  end if;
  if length(trim(p_owner_name)) < 1 or length(p_owner_name) > 40 then
    raise exception 'name required (max 40 chars)';
  end if;
  select * into v_machine from machines where id = p_machine_id;
  if not found then
    raise exception 'unknown machine %', p_machine_id;
  end if;

  -- whoever was in the machine gets displaced (and notified by the tick)
  update loads
  set status = 'displaced', displaced_at = now(), displaced_by_name = trim(p_owner_name)
  where machine_id = p_machine_id and status = 'running';

  insert into loads (machine_id, location, owner_name, device_id, ends_at)
  values (p_machine_id, v_machine.location, trim(p_owner_name), p_device_id,
          now() + make_interval(mins => p_minutes))
  returning * into v_load;
  return v_load;
end $$;

create or replace function collect_load(p_load_id uuid, p_device_id text)
returns void
language sql security definer set search_path = public as $$
  update loads
  set status = 'collected', collected_at = now()
  where id = p_load_id and device_id = p_device_id and status = 'running';
$$;

create or replace function adjust_load(p_load_id uuid, p_device_id text, p_minutes int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_minutes < 1 or p_minutes > 240 then
    raise exception 'minutes must be between 1 and 240';
  end if;
  update loads
  set ends_at = now() + make_interval(mins => p_minutes),
      notified_done_at = null, notified_reminder_at = null
  where id = p_load_id and device_id = p_device_id and status = 'running';
end $$;

create or replace function create_event(
  p_title text, p_description text, p_place text, p_side text,
  p_starts_at timestamptz, p_creator_name text, p_creator_device_id text
) returns events
language plpgsql security definer set search_path = public as $$
declare v_event events;
begin
  if length(trim(p_title)) < 3 or length(p_title) > 80 then
    raise exception 'title must be 3-80 characters';
  end if;
  if length(p_description) > 500 or length(p_place) > 80 then
    raise exception 'details too long';
  end if;
  if p_side not in ('pines', 'timbers', 'both') then
    raise exception 'bad side';
  end if;
  insert into events (title, description, place, side, starts_at, creator_name, creator_device_id)
  values (trim(p_title), trim(coalesce(p_description, '')), trim(p_place), p_side,
          p_starts_at, trim(p_creator_name), p_creator_device_id)
  returning * into v_event;
  return v_event;
end $$;

create or replace function delete_event(p_event_id uuid, p_device_id text)
returns void
language sql security definer set search_path = public as $$
  delete from events where id = p_event_id and creator_device_id = p_device_id;
$$;

create or replace function report_event(p_event_id uuid)
returns void
language sql security definer set search_path = public as $$
  update events set reports = reports + 1 where id = p_event_id;
$$;

create or replace function save_push_subscription(
  p_device_id text, p_subscription jsonb, p_side text, p_owner_name text
) returns void
language sql security definer set search_path = public as $$
  insert into push_subscriptions (device_id, subscription, side, owner_name, updated_at)
  values (p_device_id, p_subscription, p_side, coalesce(p_owner_name, ''), now())
  on conflict (device_id) do update
  set subscription = excluded.subscription,
      side = excluded.side,
      owner_name = excluded.owner_name,
      updated_at = now();
$$;

-- ---------- notification tick ----------
-- Every minute, ping the push edge function; it finds finished /
-- overdue / displaced loads and notifies their owners.
-- Project ref: jehsflkioicahjeigqst (set 2026-07-13)
select cron.schedule(
  'sho-push-tick',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://jehsflkioicahjeigqst.supabase.co/functions/v1/push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"type": "tick"}'::jsonb
  );
  $$
);
