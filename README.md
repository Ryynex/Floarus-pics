# Florus.pics — AI Fashion Studio

B2B Next.js app that turns mannequin/fabric photos into editorial model lookbooks
(Fal.ai `flux-2-pro/edit`, Supabase, Cloudinary).

## Requirements

- Node 18+
- A Supabase project (schema in `supabase_schema.sql`)
- Fal.ai, Cloudinary credentials (see `.env.example`)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

Both `dev` and `build` use the webpack bundler (`next dev --webpack` /
`next build --webpack`), which this app requires.

## Database

`supabase_schema.sql` is idempotent (safe to re-run). Apply it in the Supabase
SQL Editor together with deploying the code, because both the admin panel and the
generation API call RPCs defined there. See [MIGRATION.md](MIGRATION.md) for the
full migration checklist, deploy order, admin bootstrap steps, and verification
queries.

## Environment variables

See `.env.example` for the complete list (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `FAL_KEY`, Cloudinary vars, etc.).

Never commit `.env*` files — they are git-ignored.

## Authentication & roles

- Sessions live in localStorage; `AuthCookieSync` mirrors the access token into
  an `florus_at` cookie that `src/proxy.ts` uses to gate `/dashboard/*`
  (cheap expiry check) and `/god/html/admin/*` (token verified server-side plus
  `profiles.is_admin`).
- Public signup is closed by default. The `enforce_signup_gate` trigger reads
  the `allow_public_signup` flag from `app_settings`.

## Billing

1 credit = `CREDIT_PRICE_INR` INR (`src/lib/pricing.ts`). Balance changes only
happen through security-definer RPCs.

The generation API charges **before** any paid work:

1. `reserve_generation_credit` takes the credit and opens a `processing`
   generation row keyed by `(user_id, idempotency_key)`.
2. If the build fails for any reason, `refund_generation` returns the credit
   (reservations abandoned for 30+ minutes are refunded automatically).
3. On success, `finalize_generation` marks the row completed and billed.

A replayed idempotency key is rejected with HTTP 409 instead of being treated as
already paid. One account may have at most two reservations in flight.
`deduct_balance_for_generation` is retired and no longer executable by app users.

## Admin console

`/god/html/admin` (any account with `profiles.is_admin = true`). Money actions go
through atomic admin RPCs; list views are paginated (50/page).

## Scripts

- `npm run dev` — dev server (webpack)
- `npm run build` — production build (webpack)
- `npm run lint` — ESLint
- `npx tsc --noEmit` — typecheck
