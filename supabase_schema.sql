-- Supabase Database Schema for Florus.pics B2B AI Fashion SaaS
-- paste this script directly into your Supabase SQL Editor

-- --------------------------------------------------------
-- 1. Profiles Table (extends auth.users)
-- --------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  balance_inr numeric(12, 2) not null default 0.00,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  
  -- Prevent balance from dropping below zero at database level
  constraint balance_non_negative check (balance_inr >= 0.00)
);

-- Enable Row Level Security (RLS) on profiles
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- --------------------------------------------------------
-- 2. Generations Table (logs generative model API requests)
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
  created_at timestamp with time zone default timezone('utc'::text, now()),
  
  -- Ensure status matches allowed states
  constraint generations_status_check check (status in ('pending', 'processing', 'completed', 'failed'))
);

-- Enable Row Level Security (RLS) on generations
alter table public.generations enable row level security;

-- Generations Policies
create policy "Users can view own generations" 
  on public.generations for select 
  using (auth.uid() = user_id);

create policy "Users can insert own generations" 
  on public.generations for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own generations" 
  on public.generations for update 
  using (auth.uid() = user_id);

-- --------------------------------------------------------
-- 3. Payments Table (logs UPI wallet replenishment events)
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

-- Payments Policies
create policy "Users can view own payments" 
  on public.payments for select 
  using (auth.uid() = user_id);

create policy "Users can insert own payments" 
  on public.payments for insert 
  with check (auth.uid() = user_id);

-- --------------------------------------------------------
-- 4. Automatic Profile Creation Trigger
-- --------------------------------------------------------
-- Trigger function that automatically creates a profile when a new user registers
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, balance_inr)
  values (new.id, new.email, 0.00);
  return new;
end;
$$;

-- Trigger definition linked to auth.users insertions
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --------------------------------------------------------
-- 5. Storage Bucket Setup
-- --------------------------------------------------------
-- Create the bucket for generated lookbooks
insert into storage.buckets (id, name, public)
values ('generated-lookbooks', 'generated-lookbooks', true)
on conflict (id) do nothing;

-- Storage Policies: allow public read access
drop policy if exists "Public Access to Generated Lookbooks" on storage.objects;
create policy "Public Access to Generated Lookbooks"
  on storage.objects for select
  using (bucket_id = 'generated-lookbooks');

-- Storage Policies: restrict authenticated users to upload to their own directory only
drop policy if exists "Users can upload own lookbooks" on storage.objects;
create policy "Users can upload own lookbooks"
  on storage.objects for insert
  with check (
    bucket_id = 'generated-lookbooks' AND
    (auth.uid()::text = (storage.foldername(name))[1])
  );

-- --------------------------------------------------------
-- 6. Atomic RPC Operations (Transactions)
-- --------------------------------------------------------

-- RPC to atomically deduct user balance and insert generation log
create or replace function public.deduct_balance_for_generation(
  p_cost numeric,
  p_prompt text,
  p_garment_url text,
  p_face_url text,
  p_output_url text
)
returns numeric
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_balance numeric;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Select profile balance and lock it for update
  select balance_inr into v_balance
  from public.profiles
  where id = v_user_id
  for update;

  if v_balance is null then
    raise exception 'User profile not found';
  end if;

  if v_balance < p_cost then
    raise exception 'Insufficient balance';
  end if;

  -- Deduct balance
  update public.profiles
  set balance_inr = balance_inr - p_cost
  where id = v_user_id;

  -- Insert generation record
  insert into public.generations (user_id, prompt, garment_url, face_url, output_url, status, cost_inr)
  values (v_user_id, p_prompt, p_garment_url, p_face_url, p_output_url, 'completed', p_cost);

  return v_balance - p_cost;
end;
$$;

-- RPC to atomically log UPI payments and update profile balance
create or replace function public.submit_upi_payment(
  p_amount numeric,
  p_upi_txn_id text
)
returns numeric
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_balance numeric;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Log payment event as 'pending'
  insert into public.payments (user_id, amount, upi_txn_id, status)
  values (v_user_id, p_amount, p_upi_txn_id, 'pending');

  -- Retrieve and return current profile balance (unaltered)
  select balance_inr into v_balance
  from public.profiles
  where id = v_user_id;

  return v_balance;
end;
$$;


-- --------------------------------------------------------
-- 7. Admin RLS Policies (For admin@florus.pics)
-- --------------------------------------------------------

-- Allow admin full CRUD on Profiles
drop policy if exists "Admin full access on profiles" on public.profiles;
create policy "Admin full access on profiles"
  on public.profiles
  for all
  using (auth.jwt() ->> 'email' = 'admin@florus.pics')
  with check (auth.jwt() ->> 'email' = 'admin@florus.pics');

-- Allow admin full CRUD on Generations
drop policy if exists "Admin full access on generations" on public.generations;
create policy "Admin full access on generations"
  on public.generations
  for all
  using (auth.jwt() ->> 'email' = 'admin@florus.pics')
  with check (auth.jwt() ->> 'email' = 'admin@florus.pics');

-- Allow admin full CRUD on Payments
drop policy if exists "Admin full access on payments" on public.payments;
create policy "Admin full access on payments"
  on public.payments
  for all
  using (auth.jwt() ->> 'email' = 'admin@florus.pics')
  with check (auth.jwt() ->> 'email' = 'admin@florus.pics');


-- Storage Policies: allow authenticated users to delete their own uploaded files
drop policy if exists "Users can delete own lookbooks" on storage.objects;
create policy "Users can delete own lookbooks"
  on storage.objects for delete
  using (
    bucket_id = 'generated-lookbooks' AND
    (auth.uid()::text = (storage.foldername(name))[1])
  );

