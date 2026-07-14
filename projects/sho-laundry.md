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

Update 2026-07-14c (SECURITY): full audit + hardening, LIVE & verified. Findings:
(1) load/event ownership was authorized only by the publicly-readable device_id →
anyone could scrape it and collect/adjust/delete others' items. FIX: per-device
private secret (localStorage sho_device_secret), stored server-side only as sha256
(sho_hash + owner_secret_hash/creator_secret_hash cols); collect/adjust/delete/
save_push require it. (2) report_event had no dedup → one person hid any event. FIX:
reporter_hashes[] dedup, 3 distinct devices. (3) unlimited event creation = camp push
spam. FIX: rate limits (≤6 loads/2min, ≤4 events/10min per device). Migration applied
via PAT (revoked); OLD function overloads DROPPED (create-or-replace with new arg count
made overloads — the 2-arg insecure versions had to be dropped, also added to schema.sql).
Verified with live attack-sim SQL (rollback DO-blocks): stolen device_id w/o secret
blocked, owner w/ secret works; dedup=2; 5th event blocked. device_id still readable via
REST (by design — harmless under hash-secret model). No XSS/injection/committed secrets;
HTTPS throughout. PDF report generated (scratchpad/The-Sho-Security-Report.pdf) for camp
leadership. Push fn UNCHANGED this round.

Update 2026-07-14b: machine panels now open from the TOP (Sheet position='top',
anchored to #sho-header/#sho-top-anchor so they start where the hours notice ends;
slide-down anim + × close). All StartLoadSheet variants top-anchored; name/event
sheets stay bottom. Copy: 'others' not 'camper' (push fn v6 deployed live).
Verified: panel.top == notice bottom, start-load E2E from top panel, regressions
green. LIVE.

Update 2026-07-14: (a) Reminder cadence rewritten in code — nudges at 5/10/30 min
after done (REMINDERS list in push fn; reminders_sent counter on loads, reset in
adjust_load; latest-due-only so quiet-hours gaps collapse to one catch-up).
DEPLOYED LIVE 2026-07-14 (push fn v5) via temp PAT (revoked): reminders_sent column
migrated, adjust_load updated. Proven end-to-end on deploy: Sheen's real load
(pines-washer-4, done 45 min) got exactly one catch-up nudge (the 30-min one),
reminders_sent=3 — the latest-due-only collapse works in production.
(b) Hour-aware times SHIPPED LIVE: formatMinutes ('1h 12m' past 59m) across cards/
sheets/My Laundry; countdown flips mm:ss→'1h 12m' at the hour; 'left' label on card
countdowns; 'Free' text bumped; demo seeds a >1h dryer cycle. Verified via Playwright
(clock at 10 AM + 2h fast-forward) and in the live bundle.

Update 2026-07-13 (UX round, frontend-only, no backend touch): take-over sheet
compacted so "Take over this machine" is visible without scrolling (status line →
button → short courtesy note). Added change-name: "You're using the Sho as …/Change"
card in My Laundry opens NameSheet. Name-in-use guard (adapter.isNameTaken, read-only,
case-insensitive) blocks a name already on a running load by another device — enforced
at onboarding + change-name with live inline hint; no DB migration, applies to future
loads (existing loads keep their name). New: src/hooks/useNameCheck.ts,
components/NameSheet.tsx. Verified via Playwright demo (name block, change flow,
take-over button fully in viewport). Note: verify tests that open a free-machine start
sheet must run at a daytime clock — the 11:30 PM–7 AM lock replaces the picker.
