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
VAPID keypair was generated locally (not via vapid-setup) and validated round-trip
through @negrel/webpush importVapidKeys; private half handed to Sheen as VAPID_KEYS.
REMAINING for push delivery: (1) `push` function must be DEPLOYED — invoking it
returned NOT_FOUND, so redeploy in dashboard + JWT verification OFF; (2) save secret
VAPID_KEYS (value sent to Sheen) + VAPID_CONTACT=mailto:kandohsheen@gmail.com; cron
tick already points at /functions/v1/push. Then on-phone push test (DEPLOY.md step 6),
poster print, soft launch. Do NOT run vapid-setup (VAPID_KEYS is pre-set).
