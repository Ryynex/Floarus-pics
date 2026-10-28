# Database migration — security & billing hardening

The whole of `supabase_schema.sql` is **idempotent** (safe to re-run), so the
migration is the same script. The schema and the matching code deploy
**together**: the generation API and the admin panel now call RPCs that only
exist after this script runs (see step 4 for what happens if they don't).

## Steps

1. **Back up** (Supabase Dashboard → Database → Backups), or at minimum export
   `profiles`, `payments`, `generations`.
2. Open **SQL Editor** and paste the entire contents of `supabase_schema.sql`.
3. Run it. Re-running it later is safe.
4. **Deploy the matching code back-to-back with step 3.** The two are not
   independently compatible:
   - old code + new schema → the legacy charge RPC is revoked, so the old API
     fails its billing step after doing the work (HTTP 500, no free renders).
   - new code + old schema → `reserve_generation_credit` does not exist yet, so
     the API fails **before** any paid work is done.

   If you must split the two, deploy the **code first**: it fails closed without
   spending inference, whereas schema-first burns a Fal call per attempted
   generation.
5. **Bootstrap the admin account** (section 12 of the script):

   ```sql
   -- temporarily open signup
   update public.app_settings set value = 'true' where key = 'allow_public_signup';
   -- register the account through the app, then:
   update public.app_settings set value = 'false' where key = 'allow_public_signup';
   update public.profiles set is_admin = true where email = 'you@example.com';
   ```

6. Also confirm **Settings → Authentication → Providers → Email → "Enable sign ups"**
   is unchecked in the Supabase dashboard (defense in depth; the DB trigger now
   enforces it regardless).

## Latest change — reservation billing (closes a free-generation hole)

The old flow charged **after** inference and treated the client-supplied
idempotency key as proof of payment. Replaying any key — or pre-seeding one with
a ₹0.01 direct RPC call — made every later render free.

| Area | Before | After |
|---|---|---|
| Charge timing | after Fal returns | `reserve_generation_credit` charges **before** any paid work |
| Failed render | user silently lost the credit (or was never charged) | `refund_generation` hands it back; abandoned reservations (>30 min) are swept automatically |
| Idempotency key | global `EXISTS` check, any user's key counted | scoped to `(user_id, idempotency_key)`, unique index, duplicates rejected with HTTP 409 |
| Parallel spend | one credit could fund N concurrent Fal runs | wallet row lock + max 2 in-flight reservations per account |
| Legacy RPC | `deduct_balance_for_generation` executable by users | revoked from `authenticated`; `service_role` only |

## Earlier change — RLS, RPC and admin hardening

| Area | Before | After |
|---|---|---|
| `profiles` UPDATE | any user could set their own `balance_inr` | no user UPDATE policy; balance moves only via security-definer RPCs |
| `deduct_balance_for_generation` | accepted `p_cost = -999999` (mint credits), `EXECUTE` to PUBLIC, no `search_path` | bounded `p_cost`, `REVOKE` from PUBLIC, `set search_path`; now retired entirely |
| `submit_upi_payment` | no amount validation | amount/reference validated, `search_path` set, revoked from PUBLIC |
| Admin | email string match in RLS + client-only UI check | `profiles.is_admin` + `is_admin()`/`assert_admin()` used by RLS **and** RPCs; server-side route guard + client guard read the same column |
| Payment approval | client-side read/modify/write → double-credit or lost credit | `admin_approve_payment` locks the row and credits in one transaction |
| User deletion | removed only the `profiles` row (login kept working) | `admin_delete_user` removes `auth.users` (cascades); the admin panel also purges the user's storage folder first |
| RPC EXECUTE | Supabase default: `PUBLIC` (including `anon`) could call them | `REVOKE` from `PUBLIC`/`anon`, granted to `authenticated`/`service_role`; body still checks admin or `auth.uid()` |
| Admin overview numbers | summed from whatever the client had loaded | `admin_dashboard_stats()` aggregates in the database; manual `MANUAL_*` adjustments no longer counted as revenue |
| Signup | closed only in React | `before insert on auth.users` trigger + `app_settings` flag |
| Storage reads | blanket `SELECT` policy on both buckets (anyone with the anon key could **list** every upload) | owner-or-admin only; public URLs still work because the buckets are public |
| Storage cleanup | nothing removed on account deletion | admin `DELETE` policy + recursive purge in the admin panel |
| Indexes | none beyond PKs | `(user_id, created_at)`, `(created_at)`, unique `(user_id, idempotency_key)` |

## Verify afterwards

```sql
-- reservation RPCs exist
select proname from pg_proc
 where proname in ('reserve_generation_credit','finalize_generation','refund_generation');

-- legacy chargers must be gone for app users
select has_function_privilege('authenticated',
  'public.deduct_balance_for_generation(numeric,text,text,text,text,uuid)', 'execute');
-- expected: false

-- unique per-user idempotency index
select indexname from pg_indexes where indexname = 'generations_user_idem_uniq';

-- storage listing policy must no longer be open to everyone
select polname, polcmd from pg_policy
 where polrelid = 'storage.objects'::regclass;

-- must return 0 rows (self-credit policy gone)
select policyname from pg_policies
 where tablename = 'profiles' and policyname = 'Users can update own profile';

-- must fail with 'Forbidden' when called by a non-admin
select public.admin_set_balance(auth.uid(), 999999);

-- must fail with 'permission denied' when called as anon
select public.admin_dashboard_stats();

-- buckets
select id from storage.buckets where id in ('generated-lookbooks', 'garments');
```

From the browser console (logged in as a normal user) this must now be
**denied by RLS** — it was previously the full-wallet compromise:

```js
await supabase.from("profiles").update({ balance_inr: 999999 }).eq("id", <own id>)
```

...and this must fail rather than mint a free render:

```js
await supabase.rpc("reserve_generation_credit", {
  p_cost: 0.01, p_idempotency_key: crypto.randomUUID(),
  p_prompt: "x", p_garment_url: "x", p_face_url: null
})
// succeeds ONCE (self-charge), then:
await fetch("/api/generate", { /* real payload */ })  // must charge, not reuse
```

## Rollback

Restore the database backup and redeploy the previous build. Note that rolling
back re-opens the replay exploit, so only do it to recover a broken deploy.
