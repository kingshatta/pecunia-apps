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
LIVE (demo mode) at https://kingshatta.github.io/pecunia-apps/ since 2026-07-13;
poster at …/pecunia-apps/poster.html. Deploys automatically: push to main touching
`apps/sho/` builds and force-pushes dist to the `gh-pages` branch (the Pages
API/configure-pages route needs admin permissions the workflow token lacks, so the
workflow publishes via gh-pages instead — no repo settings involved). Verified live
with Playwright: onboarding → start load → countdown + started banner. Next:
Supabase setup per DEPLOY.md steps 2–5 with Sheen (project → schema.sql with real
project ref → `push` edge function, JWT verification off, VAPID_CONTACT secret →
vapid-setup invoke, save VAPID_KEYS → fill public/config.js), then on-phone push
test (step 6), then poster print + soft launch.
