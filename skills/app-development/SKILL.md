---
name: app-development
description: Use when building a new app, adding features to an existing app, or when Sheen says "build me an app", "add a feature", "make an app for", or names an app in /apps/. Defines the house stack, folder layout, and the data-adapter pattern every app must follow.
---

# App Development — House Stack & Conventions

## The stack (don't deviate without a written reason)
- **Vite + React 18 + TypeScript (strict)** — fast, boring, well-documented.
- **Tailwind CSS** — utility classes, no CSS files beyond `index.css`.
- **vite-plugin-pwa** — manifest + service worker so every app is installable on iPhone (iOS 16.4+, Add to Home Screen) and Android.
- **Supabase (free tier)** for anything multi-user: Postgres + Realtime + Edge Functions.
- **GitHub Pages** for hosting (free, no extra account). Vite `base` must be set to the repo/Pages path.

## Repo layout
```
apps/<app-name>/
  README.md          ← what the app is, for humans
  DEPLOY.md          ← numbered, iPad-friendly deployment steps
  package.json       ← self-contained; each app installs/builds independently
  src/
    adapters/        ← DataAdapter interface + implementations (see below)
    components/
    screens/
    lib/             ← types, helpers, constants
  supabase/          ← schema.sql + edge functions (committed, applied by hand)
  public/            ← icons, poster page
```

## The data-adapter rule (non-negotiable)
Every app talks to its backend through ONE TypeScript interface (`src/adapters/DataAdapter.ts`). Two implementations minimum:
1. `LocalDemoAdapter` — localStorage + timers, zero network. The app must be 100% usable in demo mode (`?demo=1` or when no Supabase URL is configured).
2. `SupabaseAdapter` — the real thing.

Why: Sheen has no dev team. Demo mode is how every build gets verified (Playwright) before any account or credential exists, and how the app gets demoed to stakeholders (camp directors) from any phone.

## Conventions
- Device identity: `crypto.randomUUID()` stored in localStorage under `<app>_device_id`. Display name stored under `<app>_name`. No logins unless the project file says otherwise.
- All timestamps stored as ISO 8601 UTC; render in device-local time.
- Realtime state must degrade gracefully: poll every 30s if the realtime channel drops.
- Mobile-first: design for 390px width; test nothing wider first.
- Every interactive element ≥44px tap target.
- Empty states and error states are designed, not accidental.

## Before calling any app "done"
1. `npm run build` passes (TypeScript strict, no errors).
2. Playwright drive-through of the core user journey in demo mode, screenshots captured.
3. DEPLOY.md written/updated and accurate.
4. Project file Current State updated.
