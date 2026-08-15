# Deploying Closet

Written for an iPad and a browser. No terminal needed.

## Already live (demo mode)

**https://kingshatta.github.io/pecunia-apps/closet/** — public, shareable, no
account needed. Published 2026-08-15 by adding a `closet/` folder to the
existing `gh-pages` branch; The Sho at the site root was not touched.

That deploy was done by hand, so it is **not** yet wired to rebuild itself. Two
consequences:

- Pushing new code to the branch does not update the live site until the
  workflows below reach `main`.
- If The Sho deploys before then, its force-push deletes `closet/`. It only
  deploys when something under `apps/sho/` changes, so this is unlikely — but
  see step 0, and the fix is a re-run of the Closet workflow.

The steps below are for going further: automatic deploys, and real accounts
instead of the demo wardrobe.

**Before you start, read step 0.** It's the one thing that can break The Sho.

---

## 0. The shared Pages site (read this first)

Both apps live on one GitHub Pages site:

- The Sho → `https://kingshatta.github.io/pecunia-apps/`
- Closet → `https://kingshatta.github.io/pecunia-apps/closet/`

The Sho's workflow publishes by **force-pushing** the whole `gh-pages` branch,
which would wipe `closet/` on its next run. `deploy-sho.yml` has been updated to
copy any existing `closet/` folder forward before it pushes, so the two apps
coexist.

**This means both workflow files must be on `main` together.** If you merge
Closet without `deploy-sho.yml`'s change, the next Sho deploy deletes Closet.
Nothing breaks permanently — a re-run of the Closet workflow restores it — but
don't split them.

---

## 1. Make the Supabase project

1. Go to **supabase.com** → sign in → **New project**.
2. Name it `closet`. Pick the region closest to you. Save the database password
   somewhere safe (you won't need it for this app, but you'll want it later).
3. Wait for it to finish provisioning — about two minutes.

## 2. Load the schema

1. In the project, open **SQL Editor** → **New query**.
2. Open `apps/closet/supabase/schema.sql` in GitHub, tap **Raw**, select all,
   copy.
3. Paste it into the SQL editor and tap **Run**.
4. You should see `Success. No rows returned`. The file is safe to re-run if you
   need to.

This creates every table, all the row-level-security policies, the
`request_friend` and `mark_worn` functions, and the private `items` storage
bucket.

## 3. Turn on email sign-in

1. **Authentication** → **Providers** → make sure **Email** is enabled.
2. Turn **Confirm email** ON.
3. **Authentication** → **URL Configuration** → set **Site URL** to
   `https://kingshatta.github.io/pecunia-apps/closet/` and add the same address
   under **Redirect URLs**.

Free-tier Supabase sends a limited number of emails per hour. That's fine for
two people; if it ever bites, plug in a free SMTP provider under
**Project Settings → Auth → SMTP**.

## 4. Copy the two public keys

1. **Project Settings** → **API**.
2. Copy the **Project URL**.
3. Copy the **publishable / anon public** key.

> Both are public and safe to commit. **Never** copy the `service_role` key into
> this repo — it bypasses every security policy in step 2.

## 5. Put the keys in the app

1. In GitHub, open `apps/closet/public/config.js`.
2. Tap the pencil to edit.
3. Fill in the two values:

```js
window.CLOSET_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'sb_publishable_...',
}
```

4. Commit to the `claude/closet-outfit-app-3wqr1j` branch.

Leaving these empty keeps the app in demo mode, which is how you show it to
someone without making them sign up.

## 6. Go live

1. Merge the branch into `main`. Make sure `deploy-closet.yml` **and** the
   updated `deploy-sho.yml` are both in the merge (see step 0).
2. **Actions** → watch **Deploy Closet to GitHub Pages** finish.
3. Open `https://kingshatta.github.io/pecunia-apps/closet/`.
4. Check The Sho still loads at `https://kingshatta.github.io/pecunia-apps/`.

## 7. Install it on both phones

1. Open the URL in **Safari** (not Chrome — iOS only allows home-screen installs
   from Safari).
2. Share button → **Add to Home Screen**.
3. Open it from the home screen icon.

Needs iOS 16.4 or newer.

## 8. Prove it works with two real accounts

Do this together, one phone each:

1. Both sign in with your own email and open the link.
2. **You** → Friends → **Invite by text** → type their number → **Text it**. Your
   Messages app should open with the invite written. Send it.
3. They tap the link (it opens Closet with the code already filled) and tap
   **Add** → you get a pending request. Reading the six-character code aloud
   works too.
4. You → Friends → **Accept**.
5. Each add three or four pieces (a top, a bottom, shoes).
6. Open her name → you should see her closet. **If you can see it before
   accepting, stop and tell me — that's a security bug, not a feature.**
7. Outfits → tap **+ Dolce Nicole's** → suggestions should start mixing both closets.
8. Fit check → **Ask** → she should get it, answer it out of your closet, and
   you should see her picks under "You asked".
9. Her closet → tap a piece → **Ask to borrow** → she approves it on Friends.

That's the whole product. If all nine work, it's real.

---

## Troubleshooting

**"No one is using that code"** — codes are six characters, no vowels and no
`0`/`O`/`1`/`I`. Check for a typo before assuming it's broken.

**Sign-in email never arrives** — check spam, then Supabase
**Authentication → Logs**. Free tier rate-limits emails per hour.

**Photos don't load, everything else works** — the `items` storage bucket or its
policies didn't get created. Re-run `schema.sql`; it's idempotent.

**Friend's closet is empty but she's added things** — the friendship isn't
`accepted` yet. Both sides need to see each other under "Your people", not
"Waiting on them".

**Closet 404s after a Sho deploy** — that's step 0. Re-run the Closet workflow
from **Actions** → **Deploy Closet to GitHub Pages** → **Run workflow**, then
make sure `deploy-sho.yml` on `main` has the preserve step.
