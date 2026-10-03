# TriviaPay Web

The TriviaPay trivia game as a **web app** — same gameplay and look as the
mobile app, deployed on **Vercel**, sharing the **same Supabase database**.

## Why this design

- **Next.js (App Router) + TypeScript + Tailwind** — Vercel's native framework,
  deploy-by-push, no server to manage.
- **Supabase Auth + `profiles`** — web users register into the *same*
  `public.profiles` / `quiz_rounds` / `transactions` tables the mobile app
  targets. Accounts created here are real rows in the shared database.
- **Questions load one category at a time, in batches of 10.** The app opens
  instantly; the first category becomes playable while the rest stream in. Each
  Home card is greyed out with a live progress bar until its category is ready,
  then unlocks — same behaviour as the mobile app.
- **Questions are cached in `localStorage`** per category, so a reload doesn't
  re-download everything.
- **Daily limit is server-side** (`public.daily_answers`) so it can't be reset
  by clearing browser storage.
- **Answer tones** are synthesised with the Web Audio API — no audio files.

## Getting started

```bash
cd "TriviaPay Web"
npm install
npm run dev        # http://localhost:3000
```

Optional: copy `.env.local.example` to `.env.local` to point at a different
Supabase project. The defaults in `src/lib/config.ts` already target the
TriviaPay project, so the app runs with no configuration.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **New Project → import the repo** and set the **Root Directory**
   to `TriviaPay Web`.
3. (Optional) add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables.
4. Deploy. Vercel auto-detects Next.js — no build config needed.

## Database changes (already in `database/supabase_schema.sql`)

The web app expects these additions — run the new sections (10 & 11) in the
Supabase SQL Editor if you haven't:

- `public.profiles.premium` + `public.profiles.premium_since`
- `handle_new_user()` now copies `username` from sign-up metadata and credits
  the **KSh 500** welcome bonus server-side.
- `public.daily_answers` (`user_id`, `day`, `count`) with own-row RLS.

## Auth notes

- Sign-up asks for **name + M-Pesa phone number + a 4-digit PIN** — no email,
  no username. The phone number *is* the username.
- Only **Safaricom M-Pesa** (07XX / 01XX) and **Airtel Money** (073X / 078X)
  numbers are accepted, since those are the lines an STK push can reach.
  Telkom / Equitel lines are rejected at sign-up.
- Under the hood Supabase still authenticates by email: the app derives a
  private, deterministic address (`<2547XXXXXXXX>@players.triviapay.online`) and
  pads the PIN into a password. The player never sees either.
- Because that address is synthetic, **email confirmation MUST be OFF**
  (Supabase → Authentication → Providers → Email → *Confirm email*). If it is
  left on, sign-up returns no session and the app tells the user to ask the
  owner to turn it off.
- Guest play works without an account (no earning).

## Project structure

```
src/
  app/
    page.tsx            # Home — category grid, progress, multi-select, Start
    quiz/page.tsx       # Rounds of 10, 20s timer, tones, review loop, payout
    results/page.tsx    # Score + earnings summary
    login/ register/    # Supabase auth
    wallet/ account/    # Balance + withdrawals + profile
    premium/page.tsx    # Premium (KSh 250)
  components/           # CategoryCard, QuestionCard, AnswerTile, ...
  lib/
    config.ts           # Same constants as the mobile app
    categories.ts       # 20 categories + colour themes
    material.ts         # Batched, per-category question loading + cache
    daily.ts            # Server-side daily counter
    sound.ts            # Web Audio tones
  providers/
    AuthProvider.tsx    # Supabase session + profile
    MaterialProvider.tsx# Background per-category loader with progress
```

## Ads (Adsterra)

Ad revenue funds the player payouts, so slots are spread across the app:

| Placement | Unit |
|---|---|
| Every page (site-wide) | Social Bar (Popunder is disabled) |
| Home | 300×250 + Native Banner + (728×90 desktop / 320×50 mobile) |
| Quiz (question screen) | 320×50 top + 300×250 bottom |
| Quiz (round-break screen) | 300×250 |
| Results | 300×250 + Native Banner + (728×90 / 320×50) |
| Wallet, Account | 300×250 |

- Config lives in **`src/lib/ads.ts`** (website `triviapay.online`, ID `6095746`).
  Units: Popunder `31543518`, Native Banner `31543519`, Social Bar `31543520`,
  Banner 300×250 `31543521`, 320×50 `31543522`, 728×90 `31543523`.
- `AdScripts` injects the site-wide Social Bar script once (Popunder disabled).
- `AdBanner` renders each banner in an **isolated `<iframe srcdoc>`** so per-unit
  `atOptions` blocks can't collide; `AdNative` mounts the Native Banner snippet.
- **Premium stays ad-free**, and **login / register / premium pages show no ads**
  (enforced inside the components).

To swap or disable a unit, edit `src/lib/ads.ts` (set `enabled: false` to turn
all ads off).

## Payments (M-Pesa)

Premium (KSh 250) is collected with a real **M-Pesa STK push**, proxied
server-side through our own route handlers so the shared gateway secret never
reaches the browser:

```
browser → POST /api/pay/request  (Supabase session) → gateway POST /api/stk-push          (X-App-Secret)
browser → GET  /api/pay/status?txn_id=…             → gateway GET  /api/transaction-status (X-App-Secret)
```

- `src/app/api/pay/request/route.ts` — verifies the Supabase session, reads the
  **phone from the user's own profile** (never from the browser), sends a **fixed
  KSh 250** amount, and returns the gateway's `transactionRequestId`.
- `src/app/api/pay/status/route.ts` — proxies the status check and always answers
  `200 { status }`, so a pending/unknown state is never shown as a failure.
- `src/app/premium/page.tsx` — sends the prompt, polls every 3s (up to ~60s), and
  activates Premium **only** when M-Pesa reports `Completed`.

### Required environment variables (Vercel → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `PAYMENT_GATEWAY_URL` | `https://payment-process-seven.vercel.app` |
| `PAYMENT_APP_SECRET` | the gateway's `X-App-Secret` (copy from the gateway's own env) |

> Both are **server-only** — never prefix with `NEXT_PUBLIC_`. The secret must not
> end up in client code.

### Database prerequisite

`profiles.premium` and `profiles.premium_since` must exist. Run sections **10**
(profiles columns) and **11** (`daily_answers`) of `../database/supabase_schema.sql`.
Without them, activation fails with *"Could not find the 'premium' column of
'profiles' in the schema cache"*.

## Notes / next steps

- Withdrawals are recorded as `pending` in `transactions` (manual approval),
  matching the mobile app. Move the payout itself to a Daraja B2C Edge Function
  before going live.
- Premium payment is a placeholder (activates immediately) until the M-Pesa
  Daraja STK push is wired through an Edge Function.
- Referral rewards exist in the mobile app; porting them to web needs a
  `referrals` table + server-side credit.
