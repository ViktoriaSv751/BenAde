-- BenAde 2.0 schema — workspaces, normalized entities, schedules, tasks, notifications, audit.
-- Idempotent where practical. Run in the Supabase SQL editor.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------- drop v1 (no production data yet) ----------
drop table if exists public.items cascade;
drop table if exists public.vehicles cascade;
drop table if exists public.drivers cascade;
drop table if exists public.companies cascade;

-- ---------- enums ----------
do $$ begin
  create type public.member_role as enum ('owner','member','viewer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.task_type as enum ('vu_download','card_download','calibration','card_expiry','training','invoice');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.task_status as enum ('open','done','skipped');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.notif_channel as enum ('push','email','sms','inapp');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.notif_status as enum ('scheduled','sending','sent','failed','opened','cancelled');
exception when duplicate_object then null; end $$;

-- ---------- workspaces & membership ----------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text, email text, address text, tax_id text, logo_path text,
  timezone text not null default 'Europe/Budapest',
  defaults jsonb not null default '{"vuDays":90,"cardDays":28,"calibrationDays":730,"cardExpiryDays":1825,"invoiceDays":30,"remindDaysBefore":[7,1,0],"remindTime":"08:00","trainingTimes":["-1T16:00","0T06:00"],"quietFrom":"21:00","quietTo":"06:00","vatPercent":27}'::jsonb,
  ics_token text not null default encode(gen_random_bytes(18),'hex'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'member',
  token text not null default encode(gen_random_bytes(16),'hex'),
  accepted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  theme text not null default 'system',
  notif_prefs jsonb not null default '{"push":true,"email":true,"sms":false,"weeklyDigest":true,"dailyDigest":true}'::jsonb,
  last_workspace_id uuid references public.workspaces(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- helper: is the current user a member (optionally with min role)
create or replace function public.is_member(ws uuid, min_role public.member_role default 'viewer')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = ws and m.user_id = auth.uid()
      and (case m.role when 'owner' then 3 when 'member' then 2 else 1 end)
          >= (case min_role when 'owner' then 3 when 'member' then 2 else 1 end)
  );
$$;

-- ---------- customers ----------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  tax_id text, address text, email text, phone text,
  notes text, tags text[] not null default '{}',
  invoice_days int,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists companies_ws_idx on public.companies(workspace_id);
create index if not exists companies_name_trgm on public.companies using gin (name gin_trgm_ops);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, phone text, email text, role text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists contacts_company_idx on public.contacts(company_id);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  plate text not null,            -- display form, e.g. ABC-123 or AA BB-123
  plate_key text generated always as (regexp_replace(upper(plate), '[^A-Z0-9]', '', 'g')) stored,
  make text, model text, vu_type text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, plate_key)
);
create index if not exists vehicles_company_idx on public.vehicles(company_id);
create index if not exists vehicles_plate_trgm on public.vehicles using gin (plate gin_trgm_ops);

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, card_number text, phone text, notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drivers_company_idx on public.drivers(company_id);
create index if not exists drivers_name_trgm on public.drivers using gin (name gin_trgm_ops);

-- ---------- schedules (recurring rules) ----------
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type public.task_type not null,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete cascade,
  cycle_days int not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (vehicle_id is not null or driver_id is not null)
);
create index if not exists schedules_ws_idx on public.schedules(workspace_id);

-- ---------- tasks ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  type public.task_type not null,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete cascade,
  schedule_id uuid references public.schedules(id) on delete set null,
  base_date date,                    -- download / issue / previous event date
  due_at timestamptz not null,        -- legal deadline or event time
  all_day boolean not null default false,
  remind_at timestamptz[] not null default '{}',
  status public.task_status not null default 'open',
  done_at timestamptz, done_by uuid references auth.users(id) on delete set null,
  note text,
  -- training
  address text, contact_name text, contact_phone text, participants int, topic text,
  -- invoice
  invoice_no text, issue_date date, net_amount numeric(14,2), vat_percent numeric(5,2), gross_amount numeric(14,2),
  paid_at date, attachment_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_ws_due_idx on public.tasks(workspace_id, status, due_at);
create index if not exists tasks_company_idx on public.tasks(company_id);
create index if not exists tasks_vehicle_idx on public.tasks(vehicle_id);
create index if not exists tasks_driver_idx on public.tasks(driver_id);
create index if not exists tasks_invoice_trgm on public.tasks using gin (coalesce(invoice_no,'') gin_trgm_ops);

-- ---------- notifications & devices ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,  -- null = all members
  channel public.notif_channel not null default 'inapp',
  scheduled_at timestamptz not null,
  status public.notif_status not null default 'scheduled',
  title text not null, body text not null,
  sent_at timestamptz, opened_at timestamptz, error text,
  created_at timestamptz not null default now()
);
create index if not exists notif_due_idx on public.notifications(status, scheduled_at);
create index if not exists notif_user_idx on public.notifications(workspace_id, user_id, scheduled_at desc);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,             -- web | ios | android
  token text not null,                -- web push subscription JSON or FCM/APNs token
  last_seen timestamptz not null default now(),
  unique (user_id, token)
);

-- ---------- audit & imports ----------
create table if not exists public.activity_log (
  id bigserial primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid,
  entity text not null, entity_id uuid, action text not null,
  before jsonb, after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_ws_idx on public.activity_log(workspace_id, created_at desc);

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  file_name text, mapping jsonb, result jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.schedules enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;
alter table public.devices enable row level security;
alter table public.activity_log enable row level security;
alter table public.imports enable row level security;

drop policy if exists ws_select on public.workspaces;
create policy ws_select on public.workspaces for select to authenticated using (public.is_member(id));
drop policy if exists ws_insert on public.workspaces;
create policy ws_insert on public.workspaces for insert to authenticated with check (created_by = auth.uid());
drop policy if exists ws_update on public.workspaces;
create policy ws_update on public.workspaces for update to authenticated using (public.is_member(id,'owner'));
drop policy if exists ws_delete on public.workspaces;
create policy ws_delete on public.workspaces for delete to authenticated using (public.is_member(id,'owner'));

drop policy if exists mem_select on public.memberships;
create policy mem_select on public.memberships for select to authenticated using (user_id = auth.uid() or public.is_member(workspace_id));
drop policy if exists mem_insert on public.memberships;
create policy mem_insert on public.memberships for insert to authenticated with check (
  user_id = auth.uid() and (
    exists (select 1 from public.workspaces w where w.id = workspace_id and w.created_by = auth.uid())
    or exists (select 1 from public.invites i where i.workspace_id = workspace_id and lower(i.email) = lower(auth.jwt()->>'email') and i.accepted_at is null)
  ));
drop policy if exists mem_update on public.memberships;
create policy mem_update on public.memberships for update to authenticated using (public.is_member(workspace_id,'owner'));
drop policy if exists mem_delete on public.memberships;
create policy mem_delete on public.memberships for delete to authenticated using (public.is_member(workspace_id,'owner') or user_id = auth.uid());

drop policy if exists inv_all on public.invites;
create policy inv_all on public.invites for all to authenticated using (public.is_member(workspace_id,'owner') or lower(email) = lower(auth.jwt()->>'email')) with check (public.is_member(workspace_id,'owner'));

drop policy if exists prof_all on public.profiles;
create policy prof_all on public.profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- generic member policies
do $$ declare t text; begin
  foreach t in array array['companies','contacts','vehicles','drivers','schedules','tasks','imports'] loop
    execute format('drop policy if exists %1$s_sel on public.%1$I', t);
    execute format('drop policy if exists %1$s_ins on public.%1$I', t);
    execute format('drop policy if exists %1$s_upd on public.%1$I', t);
    execute format('drop policy if exists %1$s_del on public.%1$I', t);
    execute format('create policy %1$s_sel on public.%1$I for select to authenticated using (public.is_member(workspace_id))', t);
    execute format('create policy %1$s_ins on public.%1$I for insert to authenticated with check (public.is_member(workspace_id,''member''))', t);
    execute format('create policy %1$s_upd on public.%1$I for update to authenticated using (public.is_member(workspace_id,''member''))', t);
    execute format('create policy %1$s_del on public.%1$I for delete to authenticated using (public.is_member(workspace_id,%2$L))', t, case when t='companies' then 'owner' else 'member' end);
  end loop; end $$;

drop policy if exists notif_sel on public.notifications;
create policy notif_sel on public.notifications for select to authenticated using (public.is_member(workspace_id) and (user_id is null or user_id = auth.uid()));
drop policy if exists notif_upd on public.notifications;
create policy notif_upd on public.notifications for update to authenticated using (public.is_member(workspace_id));
drop policy if exists notif_ins on public.notifications;
create policy notif_ins on public.notifications for insert to authenticated with check (public.is_member(workspace_id,'member'));
drop policy if exists notif_del on public.notifications;
create policy notif_del on public.notifications for delete to authenticated using (public.is_member(workspace_id,'member'));

drop policy if exists dev_all on public.devices;
create policy dev_all on public.devices for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists act_sel on public.activity_log;
create policy act_sel on public.activity_log for select to authenticated using (public.is_member(workspace_id));

-- ---------- triggers ----------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['companies','vehicles','drivers','tasks'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$I', t);
    execute format('create trigger touch_%1$s before update on public.%1$I for each row execute function public.touch_updated_at()', t);
  end loop; end $$;

-- audit
create or replace function public.log_activity() returns trigger language plpgsql security definer set search_path = public as $$
declare ws uuid; eid uuid;
begin
  if tg_op = 'DELETE' then ws := old.workspace_id; eid := old.id; else ws := new.workspace_id; eid := new.id; end if;
  insert into public.activity_log(workspace_id, user_id, entity, entity_id, action, before, after)
  values (ws, auth.uid(), tg_table_name, eid, lower(tg_op),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  if tg_op = 'DELETE' then return old; end if; return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['companies','vehicles','drivers','tasks','contacts'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.log_activity()', t);
  end loop; end $$;

-- notifications: (re)schedule in-app + push + email rows for a task from its remind_at[]
create or replace function public.task_title(t public.tasks) returns text language sql stable as $$
  select case t.type
    when 'vu_download' then 'Fedélzeti egység letöltés'
    when 'card_download' then 'Vezetői kártya letöltés'
    when 'calibration' then 'Tachográf kalibráció'
    when 'card_expiry' then 'Vezetői kártya lejárat'
    when 'training' then 'Oktatás'
    when 'invoice' then 'Számla fizetési határidő' end;
$$;

create or replace function public.task_subject(t public.tasks) returns text language plpgsql stable as $$
declare s text; c text;
begin
  select name into c from public.companies where id = t.company_id;
  if t.vehicle_id is not null then select plate into s from public.vehicles where id = t.vehicle_id; end if;
  if t.driver_id is not null then select name into s from public.drivers where id = t.driver_id; end if;
  if t.type = 'invoice' then s := coalesce(t.invoice_no,'') || case when t.gross_amount is not null then ' · ' || to_char(t.gross_amount,'FM999G999G999') || ' Ft' else '' end; end if;
  if t.type = 'training' then s := coalesce(t.address,''); end if;
  return coalesce(c,'') || case when s is not null and s <> '' then ' · ' || s else '' end;
end $$;

create or replace function public.reschedule_notifications() returns trigger language plpgsql security definer set search_path = public as $$
declare r timestamptz; ttl text; body text;
begin
  -- cancel pending rows for this task
  update public.notifications set status = 'cancelled' where task_id = new.id and status = 'scheduled';
  if new.status <> 'open' then return new; end if;
  ttl := public.task_title(new);
  body := public.task_subject(new) || ' · ' || to_char(new.due_at at time zone (select timezone from public.workspaces where id = new.workspace_id), 'YYYY. MM. DD.') ||
          case when new.all_day then '' else ' ' || to_char(new.due_at at time zone (select timezone from public.workspaces where id = new.workspace_id), 'HH24:MI') end ||
          case when new.note is not null and new.note <> '' then ' · ' || new.note else '' end;
  foreach r in array new.remind_at loop
    if r > now() - interval '1 hour' then
      insert into public.notifications(workspace_id, task_id, channel, scheduled_at, title, body) values (new.workspace_id, new.id, 'inapp', r, ttl, body);
      insert into public.notifications(workspace_id, task_id, channel, scheduled_at, title, body) values (new.workspace_id, new.id, 'push', r, ttl, body);
      insert into public.notifications(workspace_id, task_id, channel, scheduled_at, title, body) values (new.workspace_id, new.id, 'email', r, ttl, body);
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists resched_tasks on public.tasks;
create trigger resched_tasks after insert or update of remind_at, status, due_at, note on public.tasks for each row execute function public.reschedule_notifications();

-- next cycle when a scheduled task is done
create or replace function public.spawn_next_cycle() returns trigger language plpgsql security definer set search_path = public as $$
declare s public.schedules; ws public.workspaces; nxt timestamptz; base date; rem timestamptz[]; d int; tm text;
begin
  if new.status = 'done' and old.status = 'open' and new.schedule_id is not null then
    select * into s from public.schedules where id = new.schedule_id and active;
    if not found then return new; end if;
    -- avoid duplicates: another open task for the same schedule
    if exists (select 1 from public.tasks where schedule_id = s.id and status = 'open' and id <> new.id) then return new; end if;
    select * into ws from public.workspaces where id = new.workspace_id;
    base := coalesce(new.done_at::date, current_date);
    nxt := ((base + s.cycle_days)::text || ' 08:00')::timestamp at time zone ws.timezone;
    tm := coalesce(ws.defaults->>'remindTime','08:00');
    rem := '{}';
    for d in select jsonb_array_elements_text(coalesce(ws.defaults->'remindDaysBefore','[7,1,0]'::jsonb))::int loop
      rem := rem || ((((base + s.cycle_days - d)::text) || ' ' || tm)::timestamp at time zone ws.timezone);
    end loop;
    insert into public.tasks(workspace_id, company_id, type, vehicle_id, driver_id, schedule_id, base_date, due_at, all_day, remind_at, created_by)
    values (new.workspace_id, new.company_id, new.type, new.vehicle_id, new.driver_id, s.id, base, nxt, false, rem, auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists next_cycle on public.tasks;
create trigger next_cycle after update of status on public.tasks for each row execute function public.spawn_next_cycle();

-- ---------- RPC ----------
create or replace function public.create_workspace(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare wid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.workspaces(name, created_by) values (coalesce(nullif(trim(p_name),''),'Szervizem'), auth.uid()) returning id into wid;
  insert into public.memberships(workspace_id, user_id, role) values (wid, auth.uid(), 'owner');
  insert into public.profiles(user_id, last_workspace_id) values (auth.uid(), wid)
    on conflict (user_id) do update set last_workspace_id = excluded.last_workspace_id;
  return wid;
end $$;
grant execute on function public.create_workspace(text) to authenticated;

create or replace function public.accept_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.invites;
begin
  select * into inv from public.invites where token = p_token and accepted_at is null;
  if not found then raise exception 'invalid invite'; end if;
  if lower(inv.email) <> lower(auth.jwt()->>'email') then raise exception 'invite is for another e-mail'; end if;
  insert into public.memberships(workspace_id, user_id, role) values (inv.workspace_id, auth.uid(), inv.role) on conflict do nothing;
  update public.invites set accepted_at = now() where id = inv.id;
  return inv.workspace_id;
end $$;
grant execute on function public.accept_invite(text) to authenticated;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  -- workspaces only this user owns go with them
  delete from public.workspaces w where w.created_by = auth.uid()
    and not exists (select 1 from public.memberships m where m.workspace_id = w.id and m.role = 'owner' and m.user_id <> auth.uid());
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- global search
create or replace function public.search_all(ws uuid, q text) returns table(kind text, id uuid, title text, subtitle text, company_id uuid)
language sql stable security definer set search_path = public as $$
  select * from (
    select 'company'::text, c.id, c.name, coalesce(c.tax_id,''), c.id from public.companies c where c.workspace_id = ws and c.archived_at is null and (c.name ilike '%'||q||'%' or c.tax_id ilike '%'||q||'%')
    union all
    select 'vehicle', v.id, v.plate, c.name, v.company_id from public.vehicles v join public.companies c on c.id = v.company_id where v.workspace_id = ws and v.archived_at is null and (v.plate ilike '%'||q||'%' or v.plate_key ilike '%'||regexp_replace(upper(q),'[^A-Z0-9]','','g')||'%')
    union all
    select 'driver', d.id, d.name, c.name, d.company_id from public.drivers d join public.companies c on c.id = d.company_id where d.workspace_id = ws and d.archived_at is null and d.name ilike '%'||q||'%'
    union all
    select 'task', t.id, public.task_title(t), public.task_subject(t), t.company_id from public.tasks t where t.workspace_id = ws and (t.invoice_no ilike '%'||q||'%' or t.note ilike '%'||q||'%' or t.address ilike '%'||q||'%')
  ) s where public.is_member(ws) limit 40;
$$;
grant execute on function public.search_all(uuid, text) to authenticated;

-- ---------- views ----------
create or replace view public.v_company_overview with (security_invoker = true) as
select c.id, c.workspace_id, c.name, c.tax_id, c.archived_at,
  (select count(*) from public.vehicles v where v.company_id = c.id and v.archived_at is null) as vehicles,
  (select count(*) from public.drivers d where d.company_id = c.id and d.archived_at is null) as drivers,
  (select min(due_at) from public.tasks t where t.company_id = c.id and t.status = 'open') as next_due,
  (select count(*) from public.tasks t where t.company_id = c.id and t.status = 'open' and t.due_at < now()) as overdue,
  (select coalesce(sum(gross_amount),0) from public.tasks t where t.company_id = c.id and t.type = 'invoice' and t.paid_at is null) as outstanding
from public.companies c;

-- ---------- realtime ----------
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then create publication supabase_realtime; end if;
end $$;
do $$ declare t text; begin
  foreach t in array array['companies','contacts','vehicles','drivers','schedules','tasks','notifications'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', t); exception when duplicate_object then null; end;
  end loop; end $$;

-- ---------- cron: hand due notifications to the sender (edge function) ----------
-- The sender runs as an Edge Function; the cron row is created by setup_cron(url, secret) after deploy.
create or replace function public.setup_cron(p_url text, p_secret text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'benade-send-notifications';
  perform cron.schedule('benade-send-notifications', '* * * * *',
    format($c$ select net.http_post(url := %L, headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || %L), body := '{}'::jsonb); $c$, p_url, p_secret));
end $$;
revoke all on function public.setup_cron(text, text) from public;

-- storage bucket for attachments & logos
insert into storage.buckets (id, name, public) values ('attachments','attachments', false) on conflict (id) do nothing;
drop policy if exists att_rw on storage.objects;
create policy att_rw on storage.objects for all to authenticated
  using (bucket_id = 'attachments' and public.is_member((storage.foldername(name))[1]::uuid))
  with check (bucket_id = 'attachments' and public.is_member((storage.foldername(name))[1]::uuid, 'member'));

select 'schema v2 ok' as result;
