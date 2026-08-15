# Closet — your wardrobe, with your people in it

A free PWA where you photograph what you own, get outfit suggestions that
actually go together, and hand your closet to your best friend when you're
standing in front of it with nothing to wear.

Built for two people first (Sheen + Dolce Nicole). Everything here is scoped to make
that work properly before it tries to be a product.

## The idea in one line

Every dead closet app died on the cataloguing chore, and the ones that survived
are solo-user utilities. The catalogue is not the product here — it's the tax.
The product is **"Dolce Nicole, pick my fit", and she can actually reach into your
closet and answer.**

## What's in v1

| Feature | What it does |
|---|---|
| Closet | Photograph a piece, background comes off on-device, colour is read automatically, three taps to tag it. |
| Outfits | Rule-based suggestions filtered by weather and vibe, each one explaining itself. |
| Collab | Flip one chip and the engine builds outfits across both closets. |
| Fit check | "I have nothing to wear" → your friend picks from *your* actual wardrobe and sends it back. |
| Friends | Invite by text or a six-character code. **No contacts import, ever.** |
| Borrowing | Ask for a specific piece; track requested → lent → returned. |
| Wear tracking | Every suggestion favours what you haven't worn. "Gathering dust" shows what you never reach for. |

Deliberately **not** in v1: the BeReal-style feed, contacts import, chat,
subscriptions, merch. Reasons are in `/projects/closet.md`.

## How it's built

House stack per `skills/app-development`: Vite + React 18 + TypeScript (strict)
+ Tailwind v4 + vite-plugin-pwa, Supabase free tier, GitHub Pages.

```
src/
  adapters/     DataAdapter interface + LocalDemoAdapter + SupabaseAdapter
  lib/          types, colour maths, the outfit engine, image pipeline, demo seed
  components/   Sheet, ItemTile, shared UI primitives, icons
  screens/      Onboarding, MyCloset, AddItem, Outfits, FitChecks, Friends,
                FriendCloset, Me
supabase/
  schema.sql    tables, RLS policies, RPCs, storage rules — the whole backend
verify/         Playwright drive-through of the full journey in demo mode
```

### The outfit engine is rules, not a model

`src/lib/outfit.ts` fills slots (dress, or top + bottom, plus shoes, plus
optional outer and accessories), scores each combination on colour harmony,
vibe cohesion, how recently you wore things, and how many loud colours are in
play, then diversifies the top results so you don't get the same shirt ten
times.

This is a deliberate choice over an LLM. It runs instantly, offline, in demo
mode, with no credentials and no per-request cost — and it can explain itself,
which is most of why a suggestion gets trusted. Taste is personal enough that a
guessed "cocktail vibe" is worse than a tapped one.

`src/lib/color.ts` carries the fashion-specific part: black, white, grey, cream,
beige, tan, camel, navy and denim are all treated as **neutrals that pair with
anything**, which is what makes the suggestions look like something a person
would wear.

### Photos never leave the phone until you save

`src/lib/image.ts` does capture → downscale to 900px → background knock-out →
dominant colour → WebP, all on-device. No remove.bg, no vision API, no
per-image cost, and nothing uploaded while you're still deciding.

Background removal is a flood fill inward from the frame edges. It handles the
common case — a garment on a bed or against a wall — and when it fails it does
nothing harmful, which is why the Add screen previews the result and lets you
switch it off. **Upgrade path:** drop a WASM segmentation model in behind
`removeFlatBackground()`; the signature is the seam. Left out of v1 because it's
a multi-megabyte download for a step you can eyeball.

### Inviting by phone number

The Friends screen takes a phone number and opens the phone's own Messages app
with the invite already written, carrying a link like `?invite=DNC742`. Tapping
that link opens Closet on Friends with the code filled in.

The number never leaves the device. There is deliberately **no** number →
account lookup: that would be an enumeration oracle, letting anyone probe
numbers to discover who uses the app. Sign-in remains an emailed magic link,
because SMS auth needs a paid provider and this app runs on free tiers.

### Look and feel

Editorial fashion rather than app-store default: a stone ground (`#EDEBE6`),
warm near-black ink, hairline rules instead of shadows, and squared geometry —
rounded pills read as software, sharp edges read as couture. Bodoni Moda carries
the display voice and Jost handles anything functional; both are self-hosted via
`@fontsource`, so there is no CDN and nothing to block. One accent, claret, is
spent only where something genuinely wants attention.

It commits to a single light theme on purpose — fashion retail is a paper-like
world — so every colour is painted explicitly rather than inherited.

### Garment renderings

`src/lib/silhouette.ts` draws each piece as an SVG with gradient shading from a
consistent top-left light source, seams and topstitching, ribbed cuffs and
waistbands, hardware, and a contact shadow. The shape is chosen from the item's
**name** first and its category second, so a denim mini skirt, cargo pants and
tailored trousers don't all come out as the same rectangle.

These are the demo wardrobe's artwork and the fallback when a real photo fails
to load. Anything you photograph yourself uses your actual picture.

### Security

A closet is private personal data, so unlike The Sho this app has real accounts
and every table is behind row-level security. The whole access boundary is one
predicate — `are_friends()` — used by every cross-user policy in
`supabase/schema.sql`. Profiles are not publicly readable, so nobody can
enumerate users; codes resolve to people only through the `request_friend()`
RPC. Photos sit in a private bucket, read through signed URLs, with storage
policies keyed off the owner's folder.

## Running it

```bash
cd apps/closet
npm install
npm run dev        # http://localhost:5173 — demo mode, seeded wardrobe
npm run build      # tsc --noEmit (strict) + vite build
```

With no Supabase URL configured the app runs entirely in **demo mode**: a seeded
33-piece wardrobe, a seeded friend with her own 17 pieces, and an open fit check
waiting for an answer. Every feature — including the two-person collab loop —
works with no account and no network. Add `?demo=1` to force it even once a
backend is configured.

## Verifying

```bash
cd verify
npm install playwright
npx playwright install chromium     # skip if PLAYWRIGHT_BROWSERS_PATH is set
cd ../ && npm run build && npx vite preview --port 4173 &
BASE=http://127.0.0.1:4173 node verify/e2e.cjs
```

30 checks covering the whole journey: onboarding, suggestions and their
reasoning, weather/vibe filters, collab mode, saving, shuffle, adding a real
photo (colour detection included), wear tracking, answering a fit check out of a
friend's closet, borrowing, building and sending an outfit, and persistence
across reload. Screenshots land in `verify/shots/`.

## Known limits

- **Storage ceiling.** Supabase free tier is 1GB. Two full wardrobes is roughly
  90MB, so about 20 users before the free-tier rule breaks.
- **Background removal** is geometric, not semantic. Busy backgrounds keep their
  background; that's what the toggle is for.
- **Sizes are a self-declared string.** The size-compatible flag per friendship
  is what actually gates borrowing and collab, not any size maths.
- **No push notifications yet.** A fit check waiting for you is visible in the
  app, not on your lock screen.
