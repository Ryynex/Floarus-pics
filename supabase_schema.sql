-- Supabase Database Schema for Floarus.pics B2B AI Fashion SaaS
-- paste this script directly into your Supabase SQL Editor

-- --------------------------------------------------------
-- 1. Profiles Table (extends auth.users)
-- --------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  balance_inr numeric(12, 2) not null default 0.00,
  updated_at timestamp with time zone default timezone('utc'::text, now())
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
-- 3. Automatic Profile Creation Trigger
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
-- 4. Storage Bucket Setup
-- --------------------------------------------------------
-- Create the bucket for generated lookbooks
insert into storage.buckets (id, name, public)
values ('generated-lookbooks', 'generated-lookbooks', true)
on conflict (id) do nothing;

-- Storage Policies: allow public read access
create policy "Public Access to Generated Lookbooks"
  on storage.objects for select
  using (bucket_id = 'generated-lookbooks');

-- Storage Policies: allow authenticated users to upload
create policy "Users can upload own lookbooks"
  on storage.objects for insert
  with check (
    bucket_id = 'generated-lookbooks'
  );

