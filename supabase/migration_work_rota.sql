-- Munkarend: a lezárt napok azok, amikor a felhasználó máshol dolgozik (ismétlődő minta + kézi bejelölés / feloldás), workspaces.defaults.
--   defaults.workRota     = { "enabled": true, "start": "2026-10-20", "work": 1, "free": 3 } → okt. 20. munkanap (lezárva), 3 szabad nap,
--                           okt. 24. újra munkanap, ismétlődve. (Régi alak: { "on": n, "off": m } = n szabad, m lezárt nap.)
--   defaults.dayOverrides = { "2026-10-25": "lock" | "free" }                            → kézi eltérés a mintától
-- Lezárt napra eső emlékeztető automatikusan az előtte lévő utolsó munkanapra kerül (ugyanarra az órára).
-- tasks.remind_plan őrzi az eredeti időpontokat, így ha egy napot később feloldanak, az emlékeztető visszakerül.

create or replace function public.is_locked_day(def jsonb, d date) returns boolean language plpgsql immutable as $$
declare ov text; r jsonb; st date; a int; b int; n int; k int;
begin
  ov := def->'dayOverrides'->>to_char(d, 'YYYY-MM-DD');
  if ov = 'lock' then return true; elsif ov = 'free' then return false; end if;
  r := def->'workRota';
  if r is null or jsonb_typeof(r) <> 'object' or coalesce((r->>'enabled')::boolean, false) = false then return false; end if;
  st := (r->>'start')::date; if st is null then return false; end if;
  if r ? 'work' then
    -- from the first work day on: `work` locked (busy) days, then `free` open days, repeating
    a := coalesce((r->>'work')::int, 0); b := coalesce((r->>'free')::int, 0);
    if a < 1 or b < 1 or d < st then return false; end if;
    n := a + b; k := (d - st) % n; return k < a;
  end if;
  -- legacy shape: `on` open days, then `off` locked days
  a := coalesce((r->>'on')::int, 0); b := coalesce((r->>'off')::int, 0);
  if a < 1 or b < 1 then return false; end if;
  n := a + b; return ((((d - st) % n) + n) % n) >= a;
end $$;

alter table public.tasks add column if not exists remind_plan timestamptz[];
comment on column public.tasks.remind_plan is 'Reminders as set by the user / system before moving them off locked days (Munkarend). remind_at is derived from it.';

create or replace function public.shift_reminders(def jsonb, tz text, arr timestamptz[]) returns timestamptz[] language plpgsql stable as $$
declare r timestamptz; nr timestamptz; d date; i int; outv timestamptz[] := '{}';
begin
  if arr is null then return '{}'; end if;
  foreach r in array arr loop
    nr := r;
    if r > now() then
      d := (r at time zone tz)::date; i := 0;
      while public.is_locked_day(def, d) and i < 60 loop d := d - 1; i := i + 1; end loop;
      nr := (d + (r at time zone tz)::time) at time zone tz;
      if nr <> r and nr < now() then nr := null; end if; -- the free day before is already over
    end if;
    if nr is not null and not (nr = any(outv)) then outv := outv || nr; end if;
  end loop;
  return (select coalesce(array_agg(x order by x), '{}') from unnest(outv) x);
end $$;

create or replace function public.shift_locked_reminders() returns trigger language plpgsql security definer set search_path = public as $$
declare def jsonb; tz text;
begin
  -- the plan = reminders as written by the app; remind_at = the plan moved off locked days
  if tg_op = 'INSERT' or new.remind_at is distinct from old.remind_at or new.remind_plan is null then new.remind_plan := new.remind_at; end if;
  if new.status <> 'open' or new.remind_plan is null or cardinality(new.remind_plan) = 0 then return new; end if;
  select defaults, coalesce(timezone, 'Europe/Budapest') into def, tz from public.workspaces where id = new.workspace_id;
  if def is null or (def->'workRota' is null and def->'dayOverrides' is null) then new.remind_at := new.remind_plan; return new; end if;
  new.remind_at := public.shift_reminders(def, tz, new.remind_plan);
  return new;
end $$;

drop trigger if exists shift_locked on public.tasks;
create trigger shift_locked before insert or update of remind_at, due_at, status on public.tasks
  for each row execute function public.shift_locked_reminders();

-- after the work pattern / a day changed: recompute open tasks' reminders from the plan (a freed day gets its reminders back)
create or replace function public.reapply_locked_days(p_ws uuid) returns int language plpgsql security definer set search_path = public as $$
declare def jsonb; tz text; n int;
begin
  if not public.is_member(p_ws, 'owner') then raise exception 'not allowed'; end if;
  select defaults, coalesce(timezone, 'Europe/Budapest') into def, tz from public.workspaces where id = p_ws;
  update public.tasks t set remind_at = coalesce(t.remind_plan, t.remind_at)
   where t.workspace_id = p_ws and t.status = 'open'
     and exists (select 1 from unnest(coalesce(t.remind_plan, t.remind_at)) r where r > now())
     and public.shift_reminders(def, tz, coalesce(t.remind_plan, t.remind_at)) is distinct from t.remind_at;
  get diagnostics n = row_count; return n;
end $$;
revoke execute on function public.reapply_locked_days(uuid) from public, anon;
grant execute on function public.reapply_locked_days(uuid) to authenticated;
