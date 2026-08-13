# Project: Closet — Shared Wardrobe & Outfit Collab

*Working name. Naming is a Sheen call before any merch or store listing.*

## What it is
A PWA where you photograph everything you own, tag it in ~4 seconds an item, and get
rule-based outfit suggestions filtered by season and vibe. The differentiator is the
social layer: add a best friend by invite code, get read access to each other's closet,
build outfits **from their items**, send them over, and ask "what should I wear?" when
you're standing in front of your closet with nothing to wear. Borrow requests track who
has whose jacket.

## The strategic call
The closet catalog is not the product — it's the tax you pay to reach the product. Every
dead competitor (Cladwell, Pureple, Smart Closet) died on the cataloging chore, and the
survivors (Whering, Stylebook, Indyx) are solo-user utilities with no friend graph.
The novel, defensible loop here is **"Aaliyah, pick my fit" — and she can actually reach
into my closet and answer.** Build that loop excellently; build everything else minimally.

## Key decisions (proposed 2026-08-11, AWAITING SHEEN'S GO)
- **v1 is a two-person app.** Sheen + Aaliyah. N=2 is the ideal seed, not a cold start.
- **CUT from v1:** BeReal-style feed (empty room at N=2, most expensive to build,
  drags in moderation), contacts import, chat, subscriptions, merch.
- **KEEP for v1:** closet capture + tagging, outfit engine, friend-by-code, shared
  closet read access, collab outfit send, "pick my fit" request, borrow tracking.
- **Contacts import is killed, not deferred.** Uploading a phone's address book is the
  single biggest privacy/App-Store risk in the spec and buys nothing at N=2.
  Friends join by 6-character invite code.
- **"SOS" renamed → "Fit Check."** SOS means emergency (Life360); wrong signal, and a
  name that invites store-review trouble.
- **Real auth, unlike The Sho.** This is private personal data with cross-user access.
  Supabase Auth (magic link) + Row Level Security. RLS is the entire security story:
  items readable by owner + *accepted* friends only. Top-tier model designs the policies.
- **$0 image pipeline, all on-device:** camera capture → `@imgly/background-removal`
  (ONNX/WASM, free, private) → canvas downscale to ~800px WebP (~80KB) → Supabase
  Storage. No remove.bg, no per-image API cost.
- **No vision-model auto-tagging.** "Automatically categorizes vibes" is an overpromise
  we can't afford at free tier. Instead: dominant colour extracted in-browser via canvas,
  plus a 3-tap tagger (type / warmth / vibe) at scan time. ~4s per item, and it produces
  *better* data than a model guessing at something as personal as "cocktail vibe."
- **Outfit engine is rule-based, not AI.** Slot-filling (top + bottom + shoes + optional
  outer/accessories), HSL colour-harmony scoring, neutral handling, ≤3 non-neutral
  colours, filtered by warmth + vibe. Instant, deterministic, offline, free — and it
  works fully in demo mode with zero credentials, per the hard rule.
- Stack per `skills/app-development`: Vite + React 18 + TS strict + Tailwind +
  vite-plugin-pwa, Supabase free tier, GitHub Pages. DataAdapter with LocalDemoAdapter
  + SupabaseAdapter.
- **Demo mode ships a seeded 30-item closet plus a fake friend with her own 20 items**,
  so the whole collab loop is Playwright-verifiable before any account exists.

## Open questions for Sheen (blocking scope, not blocking start)
1. **How many items are in each closet?** Determines whether cataloging is a 20-minute
   job or a 6-hour one. This is the make-or-break number for the whole app.
2. **Do you and Aaliyah wear the same size?** The largest unstated assumption in the
   spec — collab outfits and borrowing are near-useless across incompatible sizes.
3. Both on iPhone? (PWA push needs iOS 16.4+ Add-to-Home-Screen.)
4. Is this "an app for me and my best friend" or a business? The build differs.
5. Want wear-tracking ("you haven't worn this in 6 months")? It's the retention hook
   every surviving closet app has, and it's cheap to add now, expensive to retrofit.

## Known cliffs (named now, not later)
- Supabase free tier: 1GB storage / 500MB db. Two full closets ≈ 90MB — fine. Roughly
  20 users is the ceiling; past that, storage costs money and the free-tier rule breaks.
- Subscription economics are inverted at this stage: Stripe + tax + 30% store cut
  against a 2-person base, while charging blocks the network effect that is the only
  real asset. Merch (sticker/hat) is the better early monetization because it doesn't
  gate the graph. Both are post-retention questions.
- If this ever opens to teens broadly, the feed + friend graph makes it a social network
  for minors: COPPA, age rating, duty of care. That is a deliberate later decision,
  and cutting the feed from v1 keeps the door closed until it's made on purpose.

## Current State
**BUILT and verified in demo mode. Not deployed — awaiting Sheen's go.** Full app at
`apps/closet/`: Vite + React 18 + TS strict + Tailwind v4 + PWA, DataAdapter with
LocalDemoAdapter (seeded 33-piece wardrobe + seeded friend "Aaliyah" with 17 pieces +
one open fit check) and a complete SupabaseAdapter. `npm run build` clean under strict
TS. Playwright drive-through **30/30 green** against the production bundle at 390px:
onboarding, suggestions + their reasoning, weather/vibe filters, collab mode ("Uses 2 of
Aaliyah's"), save, shuffle, add a real photo (background knocked out on-device, colour
read as "navy"), wear tracking, answering a fit check from her closet, borrow request,
building and sending an outfit mixing both closets, persistence across reload, zero
console errors and zero failed requests. Harness committed at `apps/closet/verify/`,
screenshots in `verify/shots/`.

Engine is rules + colour maths (`lib/outfit.ts`, `lib/color.ts`) — no model, no API cost,
explains every suggestion. Fashion neutrals (black/white/grey/cream/beige/tan/camel/navy/
denim) pair with anything; that predicate is what makes results look wearable. Two real
bugs found and fixed by unit-checking the palette: cream and light-wash denim weren't
classed as neutrals, and beige read as "yellow".

Backend is written but unapplied: `supabase/schema.sql` has every table, RLS policy,
`request_friend`/`mark_worn` RPCs and private-bucket storage rules. Access boundary is
one predicate, `are_friends()`. Profiles are not publicly readable — no user enumeration.
No Supabase project exists yet, no keys, `public/config.js` empty (so it runs in demo).

DEPLOY CONFLICT HANDLED: The Sho force-pushes the Pages root and would wipe `closet/`.
`deploy-sho.yml` now copies `closet/` forward first; `deploy-closet.yml` publishes only
that subfolder. **Both files must reach `main` in the same merge** — DEPLOY.md step 0.

REMAINING (all Sheen-side): create Supabase project, run schema.sql, fill config.js,
merge, then the two-phone two-account test in DEPLOY.md step 8 — especially 8.6, which
checks a closet is NOT visible before the friendship is accepted.

STILL UNANSWERED: closet size (cataloguing effort) and whether you and Aaliyah wear the
same size. Built around it rather than blocking: every item carries a size, and each
friendship has a `size_compatible` flag that gates borrowing and collab. If sizes don't
match, turn it off and the app degrades to fit-check advice, which still works.
