---
name: app-deployment
description: Use when deploying, publishing, or shipping an app — "deploy the app", "put it live", "get it on phones", "set up Supabase", "set up hosting". Covers GitHub Pages hosting, Supabase free-tier setup from an iPad, and the QR-code rollout checklist.
---

# App Deployment — Free-Tier, iPad-First

## Hard rule
Never deploy without Sheen's explicit go. Prepare everything, then wait.

## Hosting: GitHub Pages (free)
1. Each app gets a workflow at `.github/workflows/deploy-<app>.yml`: on push to `main`, `npm ci && npm run build` in `apps/<app>/`, upload `dist/` with `actions/upload-pages-artifact`, deploy with `actions/deploy-pages`.
2. Repo Settings → Pages → Source: **GitHub Actions** (one-time, done from iPad Safari).
3. Vite config needs `base: '/<repo-name>/'` unless a custom domain is used.
4. The app URL becomes `https://<owner>.github.io/<repo-name>/`.

## Backend: Supabase free tier (all doable from iPad Safari)
1. supabase.com → New project (free tier). Region: closest US region.
2. SQL Editor → paste the app's `supabase/schema.sql` → Run. The schema file must be idempotent (`create table if not exists`, guarded seeds).
3. Edge Functions → Deploy via dashboard editor (paste code from `supabase/functions/<name>/index.ts`).
4. Function secrets (Settings → Edge Functions → Secrets): set VAPID keys etc. here — NEVER in the repo.
5. Enable `pg_cron` + `pg_net` extensions (Database → Extensions) if the app schedules notifications.
6. Copy Project URL + anon key into the app's config (these two are safe to commit/expose; Row Level Security does the protecting — verify RLS policies exist for every table).

## Known free-tier gotchas
- Supabase pauses free projects after ~1 week of zero activity. Fine during camp season; off-season, unpause from the dashboard (data is kept). Note this in the app's DEPLOY.md.
- GitHub Pages on a PRIVATE repo requires GitHub Pro; on a FREE personal account the repo must be public for Pages to serve. If the repo must stay private, use Cloudflare Pages (free) instead — DEPLOY.md must state which applies.
- iOS push requires the PWA to be installed to the Home Screen (iOS 16.4+). Put this on the poster.

## Rollout checklist (physical)
- [ ] Label every machine with its number (match the app's numbering exactly).
- [ ] Print the poster page (`apps/<app>/public/poster.html`) with the QR code — one per location.
- [ ] Poster includes: QR, "Add to Home Screen" steps for iPhone and Android, one-line pitch.
- [ ] Soft-launch with a small group before announcing camp-wide.
