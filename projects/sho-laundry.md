# Project: The Sho — Camp Cho-Yeh Laundry Tracker

## What it is
Free PWA for Camp Cho-Yeh's two laundry rooms (Pines Sho, Timbers Sho). Live machine board (who's using what, minutes left), push notification when your load is done, displaced-load tracking when someone pulls your clothes out, Planet-Fitness-style busyness meter, and a camp events board (watch parties) with notify-all.

## Key decisions (confirmed with Sheen 2026-07-12)
- PWA, not app store — $0, QR-code distribution, iOS 16.4+ Add-to-Home-Screen for push.
- Name-only identity, no login. Device UUID in localStorage.
- Anyone can create events; creator can delete, anyone can report.
- Backend: Supabase free tier. Hosting: GitHub Pages.
- 6 washers + 6 dryers per sho.
- Busyness is LIVE-ONLY (current machines in use) — no historical "typically busy" strip.
- Full Camp Cho-Yeh branding: official logo, greens #004712/#387c2b, slogan
  "Nature That Nurtures", mission statement in onboarding/footer/poster.

## Current State
LIVE on real backend at https://kingshatta.github.io/pecunia-apps/ (DEMO off since
2026-07-13). Supabase project ref jehsflkioicahjeigqst: schema loaded (24 machines
= 6+6 × 2 shos, verified via REST), publishable key sb_publishable_wI4Li…, edge
function named `push`. config.js has supabaseUrl + publishable key + VAPID public
key. Playwright e2e vs LIVE db passed: onboard → start load → persisted to Supabase
→ collected → board clean, no console errors. Auto-deploy: push to main touching
`apps/sho/` builds + force-pushes dist to `gh-pages` (Pages configure-pages route
needs admin token the workflow lacks). Sho hours: locked 11:30 PM–7:00 AM (strip,
start blocked, warnings; device-local) + matching push quiet hours (America/Chicago).
VAPID keypair generated locally (not via vapid-setup), validated round-trip through
@negrel/webpush importVapidKeys. PUSH FULLY DEPLOYED 2026-07-13 via Supabase
Management API (temp PAT, since revoked): function `push` (lowercase — the dashboard
had created it as capital `Push`, which is why /functions/v1/push 404'd; template
deleted), verify_jwt off, secrets VAPID_KEYS + VAPID_CONTACT set. Verified: tick →
200 {"ok":true,"sent":0} (loads keys + runs all queries), vapid-setup → 400 "already
set", cron `sho-push-tick` active every minute at /functions/v1/push. REMAINING: only
the real on-phone closed-app push test (DEPLOY.md step 6 — needs a physical iOS 16.4+
home-screen install), then poster print + soft launch. Everything else is live.

Update 2026-07-13 (v4 of push fn): Timbers now 2 washers + 2 dryers (Pines still
6+6) — schema per-location seed + live DB trimmed (deleted timbers machines 3-6 via
Management API). Load timers start at 15 min. Notification permission auto-requested
on the onboarding "Let's go" tap (user gesture, iOS-safe). In-app chime (Web Audio,
src/lib/chime.ts) on load-done. Deduped to one alert per event: banner+chime when
tab visible, system notification when hidden, and the SW skips showNotification while
any tab is visible; 10-min reminder reworded to a distinct "someone's waiting" nudge.
All verified live (Playwright vs real site+DB: Timbers 2+2, 15-min preset, no DEMO).
