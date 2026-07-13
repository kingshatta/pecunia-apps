# DEPLOY.md — Putting The Sho live (all from iPad Safari, ~30 min, $0)

Everything below is free tier. Do the steps in order. Where you see
✏️ you have to edit or copy something.

## 0. Prerequisites
- The `pecunia-apps` folder has been migrated to its own **public** GitHub repo
  (see MIGRATE.md at the repo root). Public is required for free GitHub Pages —
  there are no secrets anywhere in this repo, so public is safe.
- The app is set up for **6 washers + 6 dryers per sho**. If that ever changes,
  update BOTH:
  - `apps/sho/supabase/schema.sql` — the seed block near the top
  - `apps/sho/src/adapters/LocalDemoAdapter.ts` — `MACHINE_COUNTS` (demo mode only)
- Label the physical machines with numbers matching the app (Washer 1, 2, … Dryer 1, 2, …).

## 1. Turn on hosting (GitHub Pages)
1. Repo → Settings → Pages → Source: **GitHub Actions**.
2. Actions tab → run "Deploy The Sho to GitHub Pages" (or push any change to `apps/sho/`).
3. Your app is now at `https://<your-username>.github.io/pecunia-apps/` — open it.
   It runs in **DEMO mode** (yellow badge) until step 5 is done. That's expected.

## 2. Create the Supabase project (the shared brain)
1. Go to supabase.com → sign up (free) → **New project**.
   - Name: `sho` · Region: a US central/east region · generate a DB password (you
     won't need it again, but save it in your password manager).
2. Wait ~2 minutes for the project to provision.

## 3. Load the database
1. ✏️ Open `apps/sho/supabase/schema.sql` in the GitHub editor. Fix the two marked spots:
   - machine counts (if not 4+4 per sho)
   - `YOUR-PROJECT-REF` in the last block — your project's Reference ID is in
     Supabase → Project Settings → General.
   Commit the change, then copy the whole file.
2. Supabase → **SQL Editor** → paste → **Run**. You should see "Success".
3. Supabase → Database → **Extensions** → verify `pg_cron` and `pg_net` are enabled
   (the script enables them; double-check).

## 4. Deploy the notification sender (Edge Function)
1. Supabase → **Edge Functions** → Create function → name it exactly `push`.
2. Paste the contents of `apps/sho/supabase/functions/push/index.ts` → Deploy.
3. In the function's settings, turn **OFF "Enforce JWT verification"**
   (the cron tick calls it without a token; every action is harmless + idempotent).
4. Edge Functions → **Secrets** → add:
   - `VAPID_CONTACT` = `mailto:kandohsheen@gmail.com`
5. Invoke the function once with body `{"type":"vapid-setup"}` — easiest way:
   the function's **Test/Invoke** panel in the dashboard (Body → paste the JSON → Send).
   ✏️ From the response, copy:
   - the long JSON string → save as a new secret named `VAPID_KEYS`
   - the short base64 string → you'll paste it into `config.js` next.

## 5. Point the app at your backend
1. ✏️ Edit `apps/sho/public/config.js` in the GitHub editor:
   - `supabaseUrl`: Supabase → Project Settings → API → Project URL
   - `supabaseAnonKey`: same page → `anon` `public` key (safe to expose)
   - `vapidPublicKey`: the short base64 string from step 4.5
2. Commit — the site redeploys itself in ~2 minutes. Reload the app: the DEMO
   badge is gone. You're live.

## 6. Prove it works (do this before telling anyone)
1. On your phone: open the app URL → Add to Home Screen → open it → name +
   side → **turn on notifications** (My Laundry tab if you skipped it).
2. Start a load on a real machine with a 1-minute timer. Lock your phone.
3. Within ~2 minutes you should get the "…is done! 🧺" push. 10 minutes later,
   the reminder. Have a second phone take over that machine — first phone gets
   the "your load was taken out" push.

## 7. Roll it out
- Open `<app-url>poster.html`, print one per sho, tape them up.
- Soft-launch with the media team for a few days before announcing camp-wide.

## Ongoing / gotchas
- **Cost:** $0. Supabase free tier pauses after ~1 week of no traffic
  (off-season) — unpause from the dashboard, data is kept.
- **iPhone push only works from the Home-Screen app**, iOS 16.4+. Safari-tab
  users still see everything; they just don't get closed-app pings.
- Wrong timer? The load owner can tap their machine → "Fix the remaining time".
- Event spam: 3 reports auto-hide an event; creators can delete their own.
