-- Anexa Club core schema — Week 1 foundation.
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- Profiles: one row per auth.users, public-facing info.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role_title text,       -- e.g. "Співвласник · Lumen Studio"
  company text,
  avatar_url text,
  bio text,
  is_approved boolean not null default false, -- closed beta / invite gating
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Invite codes: closed-beta gating for the private community.
create table if not exists public.invite_codes (
  code text primary key,
  created_by uuid references public.profiles(id),
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invite_codes enable row level security;

create policy "Invite codes are readable by authenticated users"
  on public.invite_codes for select
  to authenticated
  using (true);

-- Anonymous (not-yet-signed-up) visitors must be able to validate an invite
-- code during registration, before they have a session. Only expose unused
-- codes, and only via an exact code match (no way to list them).
create policy "Unused invite codes are readable for registration"
  on public.invite_codes for select
  to anon
  using (used_by is null);

-- Auto-create a profile row whenever a new auth user signs up, and mark
-- their invite code as used in the same transaction. Runs as security
-- definer so it works regardless of the caller's RLS/session state (e.g.
-- before email confirmation, when the client has no session yet).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Новий учасник'));

  if new.raw_user_meta_data ? 'invite_code' then
    update public.invite_codes
    set used_by = new.id, used_at = now()
    where code = new.raw_user_meta_data->>'invite_code'
      and used_by is null;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
