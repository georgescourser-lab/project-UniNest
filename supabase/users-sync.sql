-- =============================================================================
-- UniNest Supabase Users Sync Migration (auth.users + public.users)
-- Run this script once in the Supabase Dashboard -> SQL Editor to ensure every
-- user who signs up or signs in on UniNest automatically appears in:
--   1. Supabase Dashboard -> Authentication -> Users (auth.users)
--   2. Supabase Dashboard -> Table Editor -> public.users
-- =============================================================================

create extension if not exists pgcrypto;

-- 1. Create public.users table for viewing all registered users in Table Editor
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  role text not null default 'student',
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);

alter table public.users enable row level security;

drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- 2. Trigger: Automatically mirror any new or updated row in auth.users into public.users
create or replace function public.handle_auth_user_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role, created_at, last_sign_in_at)
  values (
    new.id,
    lower(trim(new.email)),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    ),
    case
      when lower(trim(new.email)) in ('georgescourser@gmail.com', 'oderocarilus@gmail.com') then 'agent'
      else 'student'
    end,
    coalesce(new.created_at, now()),
    coalesce(new.last_sign_in_at, now())
  )
  on conflict (email) do update set
    full_name = coalesce(excluded.full_name, public.users.full_name),
    last_sign_in_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row
  when (new.email is not null)
  execute function public.handle_auth_user_sync();

-- Backfill any existing auth.users into public.users immediately
insert into public.users (id, email, full_name, role, created_at, last_sign_in_at)
select
  u.id,
  lower(trim(u.email)),
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(u.email, '@', 1)
  ),
  case
    when lower(trim(u.email)) in ('georgescourser@gmail.com', 'oderocarilus@gmail.com') then 'agent'
    else 'student'
  end,
  coalesce(u.created_at, now()),
  coalesce(u.last_sign_in_at, now())
from auth.users u
where u.email is not null
on conflict (email) do nothing;

-- 3. RPC Function: Directly registers any signed-up user email into both
--    auth.users (Authentication -> Users) and public.users (Table Editor -> users)
create or replace function public.register_uninest_user(
  p_email text,
  p_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_clean_email text;
  v_name text;
  v_role text;
  v_user_id uuid;
begin
  v_clean_email := lower(trim(coalesce(p_email, '')));
  if v_clean_email = '' or position('@' in v_clean_email) = 0 then
    raise exception 'Invalid email address';
  end if;

  v_name := coalesce(nullif(trim(p_full_name), ''), split_part(v_clean_email, '@', 1));
  v_role := case
    when v_clean_email in ('georgescourser@gmail.com', 'oderocarilus@gmail.com') then 'agent'
    else 'student'
  end;

  -- Check if user already exists in auth.users
  select id into v_user_id
  from auth.users
  where lower(email) = v_clean_email
  limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      is_sso_user,
      is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid,
      v_user_id,
      'authenticated',
      'authenticated',
      v_clean_email,
      crypt('UniNestVerifiedUser2026!', gen_salt('bf')),
      now(),
      now(),
      '{"provider":"google","providers":["google","email"]}'::jsonb,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_clean_email,
        'full_name', v_name,
        'display_name', v_name,
        'email_verified', true
      ),
      now(),
      now(),
      '',
      '',
      '',
      '',
      false,
      false
    );

    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      v_user_id,
      v_clean_email,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_clean_email,
        'full_name', v_name,
        'email_verified', true
      ),
      'email',
      now(),
      now(),
      now()
    )
    on conflict do nothing;
  else
    update auth.users
       set last_sign_in_at = now(),
           updated_at = now()
     where id = v_user_id;
  end if;

  -- Also ensure the user is present in public.users
  insert into public.users (id, email, full_name, role, created_at, last_sign_in_at)
  values (v_user_id, v_clean_email, v_name, v_role, now(), now())
  on conflict (email) do update set
    full_name = coalesce(excluded.full_name, public.users.full_name),
    role = excluded.role,
    last_sign_in_at = now();

  return v_user_id;
end;
$$;

grant execute on function public.register_uninest_user(text, text) to anon, authenticated, service_role;
grant select, insert, update on public.users to anon, authenticated, service_role;
