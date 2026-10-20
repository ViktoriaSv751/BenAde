-- Munkarend: lezárt napok (ismétlődő minta + kézi lezárás / feloldás) a workspaces.defaults-ban.
--   defaults.workRota     = { "enabled": true, "start": "2026-10-21", "on": 1, "off": 3 }  → 1 munkanap, utána 3 lezárt nap, ismétlődve
--   defaults.dayOverrides = { "2026-10-25": "lock" | "free" }                            → kézi eltérés a mintától
-- Lezárt napra eső emlékeztető automatikusan az előtte lévő utolsó szabad napra kerül (ugyanarra az órára).

create or replace function public.is_locked_day(def jsonb, d date) returns boolean language plpgsql immutable as $$
declare ov text; r jsonb; st date; n_on int; n_off int; n int;
begin
  ov := def->'dayOverrides'->>to_char(d, 'YYYY-MM-DD');
  if ov = 'lock' then return true; elsif ov = 'free' then return false; end if;
  r := def->'workRota';
  if r is null or jsonb_typeof(r) <> 'object' or coalesce((r->>'enabled')::boolean, false) = false then return false; end if;
  st := (r->>'start')::date; n_on := coalesce((r->>'on')::int, 0); n_off := coalesce((r->>'off')::int, 0);
  if st is null or n_on < 1 or n_off < 1 then return false; end if;
  n := n_on + n_off;
  return ((((d - st) % n) + n) % n) >= n_on;
end $$;

create or replace function public.shift_locked_reminders() returns trigger language plpgsql security definer set search_path = public as $$
declare def jsonb; tz text; r timestamptz; nr timestamptz; d date; i int; outv timestamptz[] := '{}';
begin
  if new.status <> 'open' or new.remind_at is null or cardinality(new.remind_at) = 0 then return new; end if;
  select defaults, timezone into def, tz from public.workspaces where id = new.workspace_id;
  if def is null or (def->'workRota' is null and def->'dayOverrides' is null) then return new; end if;
  tz := coalesce(tz, 'Europe/Budapest');
  foreach r in array new.remind_at loop
    nr := r;
    if r > now() then
      d := (r at time zone tz)::date; i := 0;
      while public.is_locked_day(def, d) and i < 60 loop d := d - 1; i := i + 1; end loop;
      nr := (d + (r at time zone tz)::time) at time zone tz;
      if nr <> r and nr < now() then nr := null; end if; -- the free day before is already over
    end if;
    if nr is not null and not (nr = any(outv)) then outv := outv || nr; end if;
  end loop;
  new.remind_at := (select coalesce(array_agg(x order by x), '{}') from unnest(outv) x);
  return new;
end $$;

drop trigger if exists shift_locked on public.tasks;
create trigger shift_locked before insert or update of remind_at, due_at, status on public.tasks
  for each row execute function public.shift_locked_reminders();

-- after the work pattern changed: move the open tasks' future reminders off the newly locked days
create or replace function public.reapply_locked_days(p_ws uuid) returns int language plpgsql security definer set search_path = public as $$
declare def jsonb; tz text; n int;
begin
  if not public.is_member(p_ws, 'owner') then raise exception 'not allowed'; end if;
  select defaults, coalesce(timezone, 'Europe/Budapest') into def, tz from public.workspaces where id = p_ws;
  update public.tasks t set remind_at = t.remind_at
   where t.workspace_id = p_ws and t.status = 'open'
     and exists (select 1 from unnest(t.remind_at) r where r > now() and public.is_locked_day(def, (r at time zone tz)::date));
  get diagnostics n = row_count; return n;
end $$;
revoke execute on function public.reapply_locked_days(uuid) from public, anon;
grant execute on function public.reapply_locked_days(uuid) to authenticated;
