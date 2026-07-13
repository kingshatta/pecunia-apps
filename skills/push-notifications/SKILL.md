---
name: push-notifications
description: Use when an app needs to notify users — "send a notification", "alert users", "remind people", "push when done", timers that fire when the app is closed. Covers Web Push/VAPID for PWAs, iOS limits, and the Supabase cron → edge function pipeline.
---

# Push Notifications for PWAs (Web Push / VAPID)

## The moving parts
1. **VAPID key pair** — generate once (`npx web-push generate-vapid-keys`). Public key ships in the app; PRIVATE key goes only in Supabase Edge Function secrets.
2. **Service worker** (`push` + `notificationclick` handlers) — receives pushes even when the app is closed.
3. **Subscription** — after user grants permission, `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`; store the subscription JSON in the `push_subscriptions` table keyed by device_id.
4. **Sender** — a Supabase Edge Function using a Web Push library (e.g. `jsr:@negrel/webpush` or `npm:web-push` via esm.sh) signs and POSTs to each subscription endpoint.

## Scheduled/timer notifications (app closed)
Client-side timers die when the app closes — server must fire them:
- Enable `pg_cron` + `pg_net` in Supabase.
- A cron job every minute calls a SQL function that finds due work (loads finished, reminders due) and `net.http_post`s the edge function with the payload list.
- The edge function pushes to the matching devices and marks rows notified (idempotency column, e.g. `notified_done_at`), so a slow tick never double-sends.

## Platform truths (put these in every DEPLOY.md and poster)
- **iOS**: Web Push works ONLY when the PWA is added to Home Screen, iOS 16.4+. Safari tab = no push. Permission prompt must be triggered by a user gesture.
- **Android**: works in Chrome directly and installed; much more forgiving.
- Expired/revoked subscriptions return 404/410 from the push service — delete those rows when it happens.
- Always provide an in-app fallback (banner/badge polling) for users who decline notifications.

## Etiquette
- Notify only the affected user for personal events (your load is done / displaced).
- Camp-wide pushes (events) only for user-created events; include the event title and time in the body.
- Never notify more than once per state transition.
