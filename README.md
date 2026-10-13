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
SQL Editor **before** deploying code that calls the admin RPCs. See
[MIGRATION.md](MIGRATION.md) for the full migration checklist, admin bootstrap
steps, and verification queries.

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
happen through security-definer RPCs (`deduct_balance_for_generation`,
`admin_*`). The generation API returns HTTP 503 and charges nothing when the
image backend is unavailable.

## Admin console

`/god/html/admin` (admin email only). Money actions go through atomic admin
RPCs; list views are paginated (50/page).

## Scripts

- `npm run dev` — dev server (webpack)
- `npm run build` — production build (webpack)
- `npm run lint` — ESLint
- `npx tsc --noEmit` — typecheck
