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
App built and branded at `apps/sho/`: official Cho-Yeh logo + brand greens, Outfit
display font, animated onboarding/cards/sheets/banners (reduced-motion safe), 6+6
machines per sho, live-only busyness meter. Demo mode + SupabaseAdapter, schema,
push edge function, deploy workflow, DEPLOY.md, branded QR poster. 17-check
Playwright e2e passes. NOT deployed — waiting on: (1) Sheen to create the standalone
pecunia-apps repo (see MIGRATE.md), (2) Supabase project creation per DEPLOY.md,
(3) explicit go-live approval.
