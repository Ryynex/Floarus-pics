-- Supabase Database Schema for Florus.pics B2B AI Fashion SaaS
-- Fresh install: paste this script directly into your Supabase SQL Editor.
-- Upgrading an existing project? Use MIGRATION.sql instead (same statements, idempotent).

-- --------------------------------------------------------
-- 1. Profiles Table (extends auth.users)
-- --------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  balance_inr numeric(12, 2) not null default 0.00,
  is_admin boolean not null default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()),

  -- Prevent balance from dropping below zero at database level
  constraint balance_non_negative check (balance_inr >= 0.00)
);

alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Enable Row Level Security (RLS) on profiles
alter table public.profiles enable row level security;

-- Profiles Policies
-- Users may read their own row (admins may read every row via the admin policy).
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- NOTE: there is intentionally NO "users can update own profile" policy.
-- Balance changes go through the security definer RPCs in section 9 only.
-- (Dropping the legacy policy is what closes the self-credit hole.)
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can delete own profile" on public.profiles;

-- --------------------------------------------------------
-- 2. Admin helpers (must exist before any policy references them)
-- --------------------------------------------------------

-- Single source of truth for "is this caller an admin?".
-- security definer so it can read profiles without tripping over profiles RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Reused by every security definer RPC so they can never be executed anonymously.
create or replace function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
end;
$$;

-- --------------------------------------------------------
-- 3. Generations Table (logs generative model API requests)
-- --------------------------------------------------------
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  prompt text not null,
  garment_url text not null,
  face_url text, -- nullable if choosing a random model
  output_url text, -- nullable until API successfully compiles/returns the image
  status text not null default 'pending',
  cost_inr numeric(10, 2) not null default 0.00,
  idempotency_key uuid, -- client supplied per-generation key; unique = no double charge
  created_at timestamp with time zone default timezone('utc'::text, now()),

  -- Ensure status matches allowed states
  constraint generations_status_check check (status in ('pending', 'processing', 'completed', 'failed'))
);

alter table public.generations add column if not exists idempotency_key uuid;

-- Enable Row Level Security (RLS) on generations
alter table public.generations enable row level security;

drop policy if exists "Users can view own generations" on public.generations;
create policy "Users can view own generations"
  on public.generations for select
  using (auth.uid() = user_id or public.is_admin());

-- No insert/update/delete policies for regular users: rows are only written by
-- the security definer RPC (deduct_balance_for_generation) and edited by admins.
drop policy if exists "Users can insert own generations" on public.generations;
drop policy if exists "Users can update own generations" on public.generations;
drop policy if exists "Users can delete own generations" on public.generations;

-- --------------------------------------------------------
-- 4. Payments Table (logs UPI wallet replenishment events)
-- --------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  amount numeric(12, 2) not null,
  upi_txn_id text not null unique,
  status text not null default 'completed',
  created_at timestamp with time zone default timezone('utc'::text, now()),

  constraint payments_amount_check check (amount > 0.00),
  constraint payments_status_check check (status in ('pending', 'completed', 'failed'))
);

-- Enable Row Level Security (RLS) on payments
alter table public.payments enable row level security;

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id or public.is_admin());

-- NOTE: there is intentionally NO insert policy for regular users.
-- Payment rows are created by submit_upi_payment / admin RPCs only, so a user
-- can never fabricate a "completed" payment from the browser.
drop policy if exists "Users can insert own payments" on public.payments;
drop policy if exists "Users can update own payments" on public.payments;
drop policy if exists "Users can delete own payments" on public.payments;

-- --------------------------------------------------------
-- 5. App settings + closed public signup
-- --------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- No policies on purpose: only security definer functions / service role can touch it.
alter table public.app_settings enable row level security;

insert into public.app_settings (key, value)
values ('allow_public_signup', 'false')
on conflict (key) do nothing;

-- Blocks POST /auth/v1/signup at the database level (UI-level closing is not enough).
create or replace function public.handle_signup_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allow text;
begin
  select value into v_allow from public.app_settings where key = 'allow_public_signup';
  if coalesce(v_allow, 'false') <> 'true' then
    raise exception 'Public signup is closed. Contact the platform team for an invite.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_signup_gate on auth.users;
create trigger enforce_signup_gate
  before insert on auth.users
  for each row execute procedure public.handle_signup_gate();

-- --------------------------------------------------------
-- 6. Automatic Profile Creation Trigger
-- --------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, balance_inr, is_admin)
  values (new.id, new.email, 0.00, false);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --------------------------------------------------------
-- 7. Storage Buckets Setup
-- --------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('generated-lookbooks', 'generated-lookbooks', true)
on conflict (id) do nothing;

-- Custom shoots / reference uploads (referenced by the app but previously missing)
insert into storage.buckets (id, name, public)
values ('garments', 'garments', true)
on conflict (id) do nothing;

-- Read access is scoped to the owner (the uid folder) or an admin.
-- NOTE: these buckets are public, so images are still served from
-- /storage/v1/object/public/... without RLS. The difference is that a blanket
-- `using (bucket_id in (...))` policy also let ANYONE holding the anon key call
-- the storage list endpoint and enumerate every customer's uploads.
drop policy if exists "Public Access to Generated Lookbooks" on storage.objects;
drop policy if exists "Users can read own lookbook objects" on storage.objects;
create policy "Users can read own lookbook objects"
  on storage.objects for select
  using (
    bucket_id in ('generated-lookbooks', 'garments') AND
    (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
  );

-- Upload to your own folder only
drop policy if exists "Users can upload own lookbooks" on storage.objects;
create policy "Users can upload own lookbooks"
  on storage.objects for insert
  with check (
    bucket_id in ('generated-lookbooks', 'garments') AND
    (auth.uid()::text = (storage.foldername(name))[1])
  );

-- Upsert flows (upsert: true in the app) require an UPDATE policy too
drop policy if exists "Users can update own lookbooks" on storage.objects;
create policy "Users can update own lookbooks"
  on storage.objects for update
  using (
    bucket_id in ('generated-lookbooks', 'garments') AND
    (auth.uid()::text = (storage.foldername(name))[1])
  )
  with check (
    bucket_id in ('generated-lookbooks', 'garments') AND
    (auth.uid()::text = (storage.foldername(name))[1])
  );

drop policy if exists "Users can delete own lookbooks" on storage.objects;
create policy "Users can delete own lookbooks"
  on storage.objects for delete
  using (
    bucket_id in ('generated-lookbooks', 'garments') AND
    (auth.uid()::text = (storage.foldername(name))[1])
  );

-- Admins may purge any object so deleting an account also removes its files.
drop policy if exists "Admins can delete any lookbook object" on storage.objects;
create policy "Admins can delete any lookbook object"
  on storage.objects for delete
  using (
    bucket_id in ('generated-lookbooks', 'garments') AND
    public.is_admin()
  );

-- --------------------------------------------------------
-- 8. Indexes (dashboard history queries + rate limiting)
-- --------------------------------------------------------
create index if not exists generations_user_created_idx
  on public.generations (user_id, created_at desc);
create index if not exists generations_created_idx
  on public.generations (created_at desc);
create index if not exists generations_idempotency_idx
  on public.generations (idempotency_key) where idempotency_key is not null;

-- The reservation RPC relies on this being UNIQUE **per user** (not globally,
-- and not merely indexed): it is what makes a replayed key impossible to charge
-- against, and what keeps a client key from colliding with another account's.
do $$
begin
  if exists (
    select 1
      from public.generations
     where idempotency_key is not null
     group by user_id, idempotency_key
    having count(*) > 1
  ) then
    raise notice 'Duplicate (user_id, idempotency_key) rows found; unique index skipped. Clean them up and re-run section 8.';
  else
    execute 'create unique index if not exists generations_user_idem_uniq
               on public.generations (user_id, idempotency_key)
               where idempotency_key is not null';
  end if;
end $$;
create index if not exists payments_user_created_idx
  on public.payments (user_id, created_at desc);

-- --------------------------------------------------------
-- 9. Atomic RPC Operations (Transactions)
-- --------------------------------------------------------

-- DEPRECATED — superseded by reserve/finalize/refund below. It is kept only so
-- an in-flight deploy can still be rolled back; EXECUTE is revoked from
-- `authenticated` in section 10b, so app users cannot call it at all.
--
-- RPC to atomically deduct user balance and insert generation log.
-- p_idempotency_key makes client retries safe: a repeated key returns the
-- current balance WITHOUT charging a second time.
create or replace function public.deduct_balance_for_generation(
  p_cost numeric,
  p_prompt text,
  p_garment_url text,
  p_face_url text,
  p_output_url text,
  p_idempotency_key uuid default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_balance numeric;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Server-side price sanity: cost must be a positive, bounded amount.
  if p_cost is null or p_cost <= 0 or p_cost > 1000 then
    raise exception 'Invalid cost';
  end if;

  -- Select profile balance and lock it for update
  select balance_inr into v_balance
  from public.profiles
  where id = v_user_id
  for update;

  if v_balance is null then
    raise exception 'User profile not found';
  end if;

  -- Fast path: this request was already charged.
  if p_idempotency_key is not null and exists (
    select 1 from public.generations where idempotency_key = p_idempotency_key
  ) then
    return v_balance;
  end if;

  if v_balance < p_cost then
    raise exception 'Insufficient balance';
  end if;

  begin
    -- Deduct balance
    update public.profiles
    set balance_inr = balance_inr - p_cost,
        updated_at = now()
    where id = v_user_id;

    -- Insert generation record
    insert into public.generations (user_id, prompt, garment_url, face_url, output_url, status, cost_inr, idempotency_key)
    values (v_user_id, p_prompt, p_garment_url, p_face_url, p_output_url, 'completed', p_cost, p_idempotency_key);
  exception when unique_violation then
    -- Concurrent duplicate slipped past the fast path: roll back the deduction
    -- for this sub-transaction and report the current balance.
    select balance_inr into v_balance from public.profiles where id = v_user_id;
    return v_balance;
  end;

  return v_balance - p_cost;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9b. Reservation-based billing
--
-- The previous flow charged AFTER the paid inference and treated the
-- client-supplied idempotency key as proof that the work had already been paid
-- for. Because the key is chosen by the caller and was never bound to a user or
-- a payload, replaying any key (or pre-seeding one through a direct RPC call)
-- produced renders for free.
--
-- The three functions below invert the order: the credit is taken BEFORE any
-- paid work, and handed back if the build fails. A key is only ever valid for
-- the user that reserved it, and only while that reservation is `processing`.
-- ---------------------------------------------------------------------------

-- Credits older than this are considered abandoned and are refunded.
create or replace function public.reservation_stale_interval()
returns interval
language sql
immutable
as $$ select interval '30 minutes' $$;

-- Refund this user's abandoned reservations (called on every new reservation,
-- so a crashed instance can never permanently swallow a credit).
create or replace function public.release_stale_reservations(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric := 0;
begin
  if p_user_id is null or auth.uid() is null or p_user_id <> auth.uid() then
    raise exception 'Forbidden';
  end if;

  with stale as (
    update public.generations
       set status = 'failed'
     where user_id = p_user_id
       and status = 'processing'
       and created_at < now() - public.reservation_stale_interval()
    returning cost_inr
  )
  select coalesce(sum(cost_inr), 0) into v_total from stale;

  if v_total > 0 then
    update public.profiles
       set balance_inr = balance_inr + v_total,
           updated_at = now()
     where id = p_user_id;
  end if;

  return v_total;
end;
$$;

-- Take the credit and open a `processing` generation row, atomically.
create or replace function public.reserve_generation_credit(
  p_cost numeric,
  p_idempotency_key uuid,
  p_prompt text,
  p_garment_url text,
  p_face_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_balance numeric;
  v_existing public.generations%rowtype;
  v_inflight integer;
  v_generation_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_cost is null or p_cost <= 0 or p_cost > 1000 then
    raise exception 'Invalid cost';
  end if;
  if p_idempotency_key is null then
    raise exception 'Request identifier is required';
  end if;

  -- Sweep abandoned reservations first (it takes locks generations -> profiles,
  -- in that order, so it must run before we hold the wallet lock ourselves).
  perform public.release_stale_reservations(v_user_id);

  -- Lock the wallet: every reservation for one user serialises here, so two
  -- parallel requests can never both pass on the same credit.
  select balance_inr into v_balance
    from public.profiles
   where id = v_user_id
   for update;
  if v_balance is null then
    raise exception 'User profile not found';
  end if;

  -- Same logical request already seen (in flight or finished): never charge it
  -- a second time, and never build it a second time.
  select * into v_existing
    from public.generations
   where user_id = v_user_id
     and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'status', 'duplicate',
      'generation_id', v_existing.id,
      'generation_status', v_existing.status,
      'balance', v_balance
    );
  end if;

  -- Bound the number of paid runs one account can have open at once.
  select count(*) into v_inflight
    from public.generations
   where user_id = v_user_id
     and status = 'processing';
  if v_inflight >= 2 then
    raise exception 'Another generation is already running';
  end if;

  if v_balance < p_cost then
    raise exception 'Insufficient balance';
  end if;

  update public.profiles
     set balance_inr = balance_inr - p_cost,
         updated_at = now()
   where id = v_user_id;

  insert into public.generations
    (user_id, prompt, garment_url, face_url, output_url, status, cost_inr, idempotency_key)
  values
    (v_user_id, p_prompt, p_garment_url, p_face_url, null, 'processing', p_cost, p_idempotency_key)
  returning id into v_generation_id;

  return jsonb_build_object(
    'status', 'reserved',
    'generation_id', v_generation_id,
    'balance', v_balance - p_cost
  );
end;
$$;

-- Turn a reservation into a paid, completed generation. The `status =
-- 'processing'` guard makes this idempotent: a reservation that was already
-- refunded can never be completed (and therefore charged) afterwards.
create or replace function public.finalize_generation(
  p_generation_id uuid,
  p_output_url text
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_balance numeric;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  update public.generations
     set output_url = p_output_url,
         status = 'completed'
   where id = p_generation_id
     and user_id = v_user_id
     and status = 'processing';

  if not found then
    raise exception 'Generation reservation is not chargeable';
  end if;

  select balance_inr into v_balance
    from public.profiles
   where id = v_user_id;
  return v_balance;
end;
$$;

-- Hand a reservation back (failed build, upstream outage, timeout...).
-- Idempotent: a reservation that is no longer `processing` is left untouched.
create or replace function public.refund_generation(p_generation_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_generation public.generations%rowtype;
  v_balance numeric;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select * into v_generation
    from public.generations
   where id = p_generation_id
     and user_id = v_user_id
   for update;
  if not found then
    raise exception 'Generation not found';
  end if;

  if v_generation.status <> 'processing' then
    select balance_inr into v_balance from public.profiles where id = v_user_id;
    return v_balance;
  end if;

  update public.generations
     set status = 'failed'
   where id = p_generation_id;

  update public.profiles
     set balance_inr = balance_inr + v_generation.cost_inr,
         updated_at = now()
   where id = v_user_id
   returning balance_inr into v_balance;

  return v_balance;
end;
$$;

-- RPC to atomically log a UPI payment as pending (balance is NOT changed here;
-- an admin approves it later through admin_approve_payment).
create or replace function public.submit_upi_payment(
  p_amount numeric,
  p_upi_txn_id text
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_balance numeric;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 1000000 then
    raise exception 'Invalid amount';
  end if;
  if p_upi_txn_id is null or length(trim(p_upi_txn_id)) < 4 then
    raise exception 'Transaction reference is required';
  end if;

  -- Bound the review queue a single account can create.
  if (select count(*) from public.payments
       where user_id = v_user_id and status = 'pending') >= 5 then
    raise exception 'You already have several payments awaiting review';
  end if;

  -- Log payment event as 'pending'
  insert into public.payments (user_id, amount, upi_txn_id, status)
  values (v_user_id, p_amount, trim(p_upi_txn_id), 'pending');

  -- Retrieve and return current profile balance (unaltered)
  select balance_inr into v_balance
  from public.profiles
  where id = v_user_id;

  return v_balance;
end;
$$;

-- --------------------------------------------------------
-- 10. Admin RPC Operations (atomic money movements)
-- --------------------------------------------------------

-- Set an absolute balance and record the delta in the payments ledger.
create or replace function public.admin_set_balance(p_user_id uuid, p_new_balance numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old numeric;
  v_diff numeric;
  v_txn text;
begin
  perform public.assert_admin();

  if p_new_balance is null or p_new_balance < 0 or p_new_balance > 100000000 then
    raise exception 'Invalid balance';
  end if;

  select balance_inr into v_old from public.profiles where id = p_user_id for update;
  if v_old is null then
    raise exception 'User profile not found';
  end if;

  update public.profiles
  set balance_inr = p_new_balance, updated_at = timezone('utc'::text, now())
  where id = p_user_id;

  v_diff := p_new_balance - v_old;
  if v_diff <> 0 then
    v_txn := 'MANUAL_' || case when v_diff > 0 then 'CREDIT' else 'DEBIT' end || '_' ||
             to_char(timezone('utc'::text, now()), 'YYYYMMDDHH24MISSMS') || '_' ||
             substr(gen_random_uuid()::text, 1, 8);
    insert into public.payments (user_id, amount, upi_txn_id, status)
    values (p_user_id, abs(v_diff), v_txn, 'completed');
  end if;

  return p_new_balance;
end;
$$;

-- Approve a pending payment: flips status and credits the wallet in ONE
-- transaction. The FOR UPDATE lock + status check make double approval impossible.
create or replace function public.admin_approve_payment(p_payment_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_balance numeric;
begin
  perform public.assert_admin();

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;
  if v_payment.status <> 'pending' then
    raise exception 'Payment is not pending';
  end if;

  update public.payments set status = 'completed' where id = p_payment_id;

  update public.profiles
  set balance_inr = balance_inr + v_payment.amount,
      updated_at = timezone('utc'::text, now())
  where id = v_payment.user_id
  returning balance_inr into v_balance;

  if v_balance is null then
    raise exception 'User profile not found';
  end if;

  return v_balance;
end;
$$;

-- Reject a pending payment (no wallet change).
create or replace function public.admin_reject_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  perform public.assert_admin();

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;
  if v_payment.status <> 'pending' then
    raise exception 'Payment is not pending';
  end if;

  update public.payments set status = 'failed' where id = p_payment_id;
end;
$$;

-- Manually log a payment; when logged as completed it credits the wallet atomically.
create or replace function public.admin_log_payment(
  p_user_id uuid,
  p_amount numeric,
  p_upi_txn_id text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;
  if p_upi_txn_id is null or length(trim(p_upi_txn_id)) < 4 then
    raise exception 'Transaction reference is required';
  end if;
  if p_status is null or p_status not in ('pending', 'completed', 'failed') then
    raise exception 'Invalid status';
  end if;

  insert into public.payments (user_id, amount, upi_txn_id, status)
  values (p_user_id, p_amount, trim(p_upi_txn_id), p_status);

  if p_status = 'completed' then
    update public.profiles
    set balance_inr = balance_inr + p_amount,
        updated_at = now()
    where id = p_user_id;
    if not found then
      raise exception 'User profile not found';
    end if;
  end if;
end;
$$;

-- Delete a user everywhere (auth.users cascade removes profiles/generations/payments).
-- The previous client-side variant only removed the profiles row and left a
-- half-broken account that could still sign in.
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own admin account';
  end if;

  delete from auth.users where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

-- Aggregate stats for the admin overview cards. Computed in the database so
-- the numbers stay correct now that list views are paginated.
create or replace function public.admin_dashboard_stats()
returns table (
  total_users bigint,
  total_balance numeric,
  total_generations bigint,
  completed_revenue numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  return query
  select
    (select count(*) from public.profiles)::bigint,
    (select coalesce(sum(balance_inr), 0) from public.profiles)::numeric,
    (select count(*) from public.generations)::bigint,
    -- Manual wallet edits are written to the ledger as `MANUAL_*` rows; they
    -- are adjustments, not income, so they must not inflate reported revenue.
    (select coalesce(sum(amount), 0) from public.payments
      where status = 'completed'
        and upi_txn_id not like 'MANUAL\_%')::numeric;
end;
$$;

-- --------------------------------------------------------
-- 10b. RPC execution privileges
-- --------------------------------------------------------
-- Supabase grants EXECUTE on new functions to PUBLIC by default. None of these
-- may be callable by anon; the money-moving ones only need the authenticated
-- role (each function still verifies admin or the calling user itself).
--
-- deduct_balance_for_generation is DEPRECATED and no longer executable by app
-- users: the server now reserves a credit before generating. Leaving it
-- callable let a client pre-seed an idempotency key and then replay it for a
-- free render.
revoke execute on function public.deduct_balance_for_generation(numeric, text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.reserve_generation_credit(numeric, uuid, text, text, text) from public, anon;
revoke execute on function public.finalize_generation(uuid, text) from public, anon;
revoke execute on function public.refund_generation(uuid) from public, anon;
revoke execute on function public.release_stale_reservations(uuid) from public, anon;
revoke execute on function public.submit_upi_payment(numeric, text) from public, anon;
revoke execute on function public.admin_set_balance(uuid, numeric) from public, anon;
revoke execute on function public.admin_approve_payment(uuid) from public, anon;
revoke execute on function public.admin_reject_payment(uuid) from public, anon;
revoke execute on function public.admin_log_payment(uuid, numeric, text, text) from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;
revoke execute on function public.admin_dashboard_stats() from public, anon;

grant execute on function public.deduct_balance_for_generation(numeric, text, text, text, text, uuid) to service_role;
grant execute on function public.reserve_generation_credit(numeric, uuid, text, text, text) to authenticated, service_role;
grant execute on function public.finalize_generation(uuid, text) to authenticated, service_role;
grant execute on function public.refund_generation(uuid) to authenticated, service_role;
grant execute on function public.release_stale_reservations(uuid) to authenticated, service_role;
grant execute on function public.submit_upi_payment(numeric, text) to authenticated, service_role;
grant execute on function public.admin_set_balance(uuid, numeric) to authenticated, service_role;
grant execute on function public.admin_approve_payment(uuid) to authenticated, service_role;
grant execute on function public.admin_reject_payment(uuid) to authenticated, service_role;
grant execute on function public.admin_log_payment(uuid, numeric, text, text) to authenticated, service_role;
grant execute on function public.admin_delete_user(uuid) to authenticated, service_role;
grant execute on function public.admin_dashboard_stats() to authenticated, service_role;

-- --------------------------------------------------------
-- 11. Admin RLS Policies
-- --------------------------------------------------------
drop policy if exists "Admin full access on profiles" on public.profiles;
create policy "Admin full access on profiles"
  on public.profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin full access on generations" on public.generations;
create policy "Admin full access on generations"
  on public.generations
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin full access on payments" on public.payments;
create policy "Admin full access on payments"
  on public.payments
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- --------------------------------------------------------
-- 12. Bootstrap the admin account (run once)
-- --------------------------------------------------------
-- 1. Temporarily open signup from the SQL Editor:
--      update public.app_settings set value = 'true' where key = 'allow_public_signup';
-- 2. Register admin@florus.pics through the app, then close signup again:
--      update public.app_settings set value = 'false' where key = 'allow_public_signup';
-- 3. Promote it:
--      update public.profiles set is_admin = true where email = 'admin@florus.pics';
