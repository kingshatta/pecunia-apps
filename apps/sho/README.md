# The Sho 🧺

Free PWA for Camp Cho-Yeh's two laundry rooms — **Pines Sho** and **Timbers Sho**.
Ends the "whose clothes are these and why are they on the table" wars.

## What it does
- **Live machine board** — every washer/dryer shows Free / In use (owner + countdown) /
  Done awaiting pickup. Timers are entered by whoever starts the load.
- **Notifications** — push when your load finishes, a reminder if you leave it sitting
  10+ minutes, and an alert if someone takes your load out ("no longer in Washer 3 —
  check the table").
- **Takeovers, tracked** — if a machine holds an uncollected load, the next person can
  take it over; the old load is marked displaced with attribution instead of vanishing.
- **Busyness meter** — Planet-Fitness-style: live occupancy plus a typical-day
  hour-by-hour strip built from real usage history.
- **Events** — anyone can post a watch party / movie night; everyone opted-in gets a
  push. Creators can delete; 3 reports auto-hide.
- **Two shos, one app** — switch sides from the header.

## Tech
Vite + React + TypeScript + Tailwind PWA (installable on iPhone iOS 16.4+ and Android).
Supabase free tier: Postgres + Realtime + Edge Function web-push + pg_cron minute tick.
Hosted free on GitHub Pages. Total running cost: **$0**.

## Run it locally / demo mode
```bash
cd apps/sho && npm install && npm run dev
```
With no backend configured (or with `?demo=1`) the app runs fully offline with seeded
demo data — the whole flow is testable without any accounts.

## Deploy
See [DEPLOY.md](DEPLOY.md) — ~30 minutes from an iPad, no command line needed.

## Structure
- `src/adapters/` — `DataAdapter` interface; `LocalDemoAdapter` (offline demo) and
  `SupabaseAdapter` (live) implement it.
- `supabase/schema.sql` — tables, RLS, write RPCs, busyness function, cron tick.
- `supabase/functions/push/index.ts` — web-push sender (done/reminder/displaced/event)
  plus one-time VAPID key setup.
- `public/poster.html` — printable QR poster for the sho walls.
