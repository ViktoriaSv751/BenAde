-- BenAde – Tachográf Emlékeztető
-- Every row belongs to the signed-in user (user_id = auth.uid()); row level security isolates accounts.
-- Entities are stored as JSON documents with a stable client-side id so the app can work offline-first
-- and sync without migrations for every new field.

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.drivers (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.vehicles (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.items (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists companies_user_idx on public.companies(user_id);
create index if not exists drivers_user_idx on public.drivers(user_id);
create index if not exists vehicles_user_idx on public.vehicles(user_id);
create index if not exists items_user_idx on public.items(user_id);

alter table public.companies enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.items enable row level security;

do $$
declare t text;
begin
  foreach t in array array['companies','drivers','vehicles','items'] loop
    execute format('drop policy if exists "%1$s_own_select" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_own_insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_own_update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_own_delete" on public.%1$I', t);
    execute format('create policy "%1$s_own_select" on public.%1$I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "%1$s_own_insert" on public.%1$I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_own_update" on public.%1$I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_own_delete" on public.%1$I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$
declare t text;
begin
  foreach t in array array['companies','drivers','vehicles','items'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$I', t);
    execute format('create trigger touch_%1$s before update on public.%1$I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- Account deletion from inside the app (App Store requirement 5.1.1(v)).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- Realtime so a change on the phone shows up on the desktop at once.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
alter publication supabase_realtime add table public.companies, public.drivers, public.vehicles, public.items;
