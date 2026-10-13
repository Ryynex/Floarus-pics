# Database migration — security & billing hardening

The whole of `supabase_schema.sql` is now **idempotent** (safe to re-run), so the
migration is the same script. Apply it **before** deploying the matching code,
because the admin panel now calls the new RPCs.

## Steps

1. **Back up** (Supabase Dashboard → Database → Backups), or at minimum export
   `profiles`, `payments`, `generations`.
2. Open **SQL Editor** and paste the entire contents of `supabase_schema.sql`.
3. Run it. Re-running it later is safe.
4. **Bootstrap the admin account** (section 12 of the script):

   ```sql
   -- temporarily open signup
   update public.app_settings set value = 'true' where key = 'allow_public_signup';
   -- register admin@florus.pics through the app, then:
   update public.app_settings set value = 'false' where key = 'allow_public_signup';
   update public.profiles set is_admin = true where email = 'admin@florus.pics';
   ```

5. Also confirm **Settings → Authentication → Providers → Email → "Enable sign ups"**
   is unchecked in the Supabase dashboard (defense in depth; the DB trigger now
   enforces it regardless).

## What changed

| Area | Before | After |
|---|---|---|
| `profiles` UPDATE | any user could set their own `balance_inr` | no user UPDATE policy; balance moves only via security-definer RPCs |
| `deduct_balance_for_generation` | accepted `p_cost = -999999` (mint credits), `EXECUTE` to PUBLIC, no `search_path` | `p_cost` must be `0 < cost <= 1000`, `REVOKE` from PUBLIC, `set search_path`, idempotency key |
| `submit_upi_payment` | no amount validation | amount/reference validated, `search_path` set, revoked from PUBLIC |
| Admin | email string match in RLS + client-only UI check | `profiles.is_admin` + `is_admin()`/`assert_admin()` used by RLS **and** RPCs; server-side route guard in the app |
| Payment approval | client-side read/modify/write → double-credit or lost credit | `admin_approve_payment` locks the row and credits in one transaction |
| User deletion | removed only the `profiles` row (login kept working) | `admin_delete_user` removes `auth.users` (cascades) |
| RPC EXECUTE | Supabase default: `PUBLIC` (including `anon`) could call them | `REVOKE` from `PUBLIC`/`anon`, granted to `authenticated`/`service_role`; body still checks admin or `auth.uid()` |
| Admin overview numbers | summed from whatever the client had loaded | `admin_dashboard_stats()` aggregates in the database (list views are now paginated) |
| Signup | closed only in React | `before insert on auth.users` trigger + `app_settings` flag |
| Storage | `garments` bucket never existed → custom shoot upload always failed | bucket created, plus missing UPDATE policies for `upsert: true` |
| Indexes | none beyond PKs | `(user_id, created_at)` on `generations`/`payments`, `(created_at)` for rate limiting |

## Verify afterwards

```sql
-- must return 0 rows (self-credit policy gone)
select policyname from pg_policies
 where tablename = 'profiles' and policyname = 'Users can update own profile';

-- must say 'f' for a normal user session context
select public.is_admin();

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

## Rollback

Restore the database backup. (There is no reason to roll back: none of the old
behaviour was intentional.)
