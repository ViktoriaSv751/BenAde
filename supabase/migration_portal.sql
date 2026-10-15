-- BenAde: read-only customer portal (additive migration)
-- Adds companies.portal_token and the public portal_feed(token) RPC.
-- Safe to re-run: only adds a nullable column, an index and a function.

alter table public.companies add column if not exists portal_token text;
create unique index if not exists companies_portal_token_key on public.companies(portal_token) where portal_token is not null;

create or replace function public.portal_feed(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  c public.companies;
  w public.workspaces;
begin
  if p_token is null or length(p_token) < 16 then return null; end if;
  select * into c from public.companies where portal_token = p_token and archived_at is null limit 1;
  if not found then return null; end if;
  select * into w from public.workspaces where id = c.workspace_id;

  return jsonb_build_object(
    'company', jsonb_build_object('name', c.name),
    'workspace', jsonb_build_object('name', w.name, 'phone', w.phone, 'email', w.email, 'address', w.address),
    'generated_at', now(),
    'vehicles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'plate', v.plate, 'make', v.make,
        'next_vu', (select min(t.due_at) from public.tasks t where t.vehicle_id = v.id and t.company_id = c.id and t.type = 'vu_download' and t.status = 'open'),
        'next_calibration', (select min(t.due_at) from public.tasks t where t.vehicle_id = v.id and t.company_id = c.id and t.type = 'calibration' and t.status = 'open'),
        'last_vu', (select max(t.done_at) from public.tasks t where t.vehicle_id = v.id and t.company_id = c.id and t.type = 'vu_download' and t.status = 'done')
      ) order by v.plate)
      from public.vehicles v where v.company_id = c.id and v.archived_at is null), '[]'::jsonb),
    'drivers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', d.name,
        'next_card', (select min(t.due_at) from public.tasks t where t.driver_id = d.id and t.company_id = c.id and t.type = 'card_download' and t.status = 'open'),
        'card_expiry', (select min(t.due_at) from public.tasks t where t.driver_id = d.id and t.company_id = c.id and t.type = 'card_expiry' and t.status = 'open'),
        'last_card', (select max(t.done_at) from public.tasks t where t.driver_id = d.id and t.company_id = c.id and t.type = 'card_download' and t.status = 'done')
      ) order by d.name)
      from public.drivers d where d.company_id = c.id and d.archived_at is null), '[]'::jsonb),
    'trainings', coalesce((
      select jsonb_agg(jsonb_build_object('due_at', t.due_at, 'topic', t.topic, 'address', t.address, 'participants', t.participants) order by t.due_at)
      from public.tasks t where t.company_id = c.id and t.type = 'training' and t.status = 'open'), '[]'::jsonb),
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object('invoice_no', t.invoice_no, 'issue_date', t.issue_date, 'due_at', t.due_at, 'gross_amount', t.gross_amount) order by t.due_at)
      from public.tasks t where t.company_id = c.id and t.type = 'invoice' and t.paid_at is null and t.status <> 'skipped'), '[]'::jsonb)
  );
end $$;

revoke all on function public.portal_feed(text) from public;
grant execute on function public.portal_feed(text) to anon, authenticated;
