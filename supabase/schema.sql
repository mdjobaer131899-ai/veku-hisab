-- ভেকুর হিসাব খাতা: Supabase database setup.
-- This is the same SQL that was applied to the live project. Run it in the
-- SQL editor of a fresh Supabase project to rebuild the database.

-- ===== core tables =====
create table public.app_owner (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.app_setup (
  id int primary key default 1 check (id = 1),
  code text not null
);
create table public.settings (
  id int primary key default 1 check (id = 1),
  vekus jsonb not null default '{"v1":{"name":"ভেকু ১"},"v2":{"name":"ভেকু ২"}}',
  owners jsonb not null default '[{"name":"মালিক ১","s1":20,"s2":20},{"name":"মালিক ২","s1":20,"s2":20},{"name":"মালিক ৩","s1":20,"s2":20},{"name":"মালিক ৪","s1":20,"s2":20},{"name":"মালিক ৫","s1":20,"s2":20}]',
  diesel_rate numeric not null default 0,
  shops text[] not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  phone text not null default '',
  rate_type text not null default 'hour' check (rate_type in ('hour','day','manual')),
  rate numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  veku text not null check (veku in ('v1','v2')),
  date date not null,
  site text not null default '',
  hours numeric not null default 0,
  litres numeric not null default 0,
  fuel_cost numeric not null default 0,
  fuel_src text not null default '',
  fuel_pay text not null default '' check (fuel_pay in ('','cash','due')),
  deposit numeric not null default 0,
  driver_wage numeric not null default 0,
  driver_id uuid references public.drivers(id) on delete set null,
  remarks text not null default '',
  submission_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index entries_date_idx on public.entries(date);
create index entries_driver_idx on public.entries(driver_id);
create index entries_due_idx on public.entries(fuel_src) where fuel_pay = 'due';

create table public.repairs (
  id uuid primary key default gen_random_uuid(),
  veku text not null check (veku in ('v1','v2')),
  date date not null,
  kind text not null default 'মেরামত' check (kind in ('মেরামত','যন্ত্রাংশ','অন্যান্য')),
  description text not null default '',
  amount numeric not null default 0,
  remarks text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index repairs_date_idx on public.repairs(date);

create table public.driver_payments (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  date date not null,
  amount numeric not null check (amount > 0),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index driver_payments_driver_idx on public.driver_payments(driver_id);

create table public.shop_payments (
  id uuid primary key default gen_random_uuid(),
  shop text not null,
  date date not null,
  amount numeric not null check (amount > 0),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index shop_payments_shop_idx on public.shop_payments(shop);

-- ===== helper functions =====
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_owner where user_id = (select auth.uid()));
$$;

create or replace function public.my_driver_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.drivers where user_id = (select auth.uid()) limit 1;
$$;

create or replace function public.my_active_driver_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.drivers where user_id = (select auth.uid()) and active limit 1;
$$;

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null default public.my_active_driver_id() references public.drivers(id) on delete cascade,
  veku text not null check (veku in ('v1','v2')),
  date date not null,
  hours numeric not null default 0,
  litres numeric not null default 0,
  fuel_cost numeric not null default 0,
  fuel_src text not null default '',
  fuel_pay text not null default '' check (fuel_pay in ('','cash','due')),
  remarks text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz
);
create index submissions_driver_idx on public.submissions(driver_id, created_at desc);
create index submissions_status_idx on public.submissions(status);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger entries_touch before update on public.entries for each row execute function public.touch_updated_at();
create trigger repairs_touch before update on public.repairs for each row execute function public.touch_updated_at();
create trigger submissions_touch before update on public.submissions for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();

-- ===== row level security =====
alter table public.app_owner enable row level security;
alter table public.app_setup enable row level security;
alter table public.settings enable row level security;
alter table public.drivers enable row level security;
alter table public.entries enable row level security;
alter table public.repairs enable row level security;
alter table public.driver_payments enable row level security;
alter table public.shop_payments enable row level security;
alter table public.submissions enable row level security;

create policy settings_owner on public.settings for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy entries_owner on public.entries for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy repairs_owner on public.repairs for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy shop_payments_owner on public.shop_payments for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

create policy drivers_owner on public.drivers for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy drivers_self_read on public.drivers for select to authenticated using (user_id = (select auth.uid()));

create policy driver_payments_owner on public.driver_payments for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy driver_payments_self_read on public.driver_payments for select to authenticated using (driver_id = (select public.my_driver_id()));

create policy submissions_owner on public.submissions for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy submissions_self_read on public.submissions for select to authenticated using (driver_id = (select public.my_driver_id()));
create policy submissions_self_insert on public.submissions for insert to authenticated
  with check (driver_id = (select public.my_active_driver_id()) and status = 'pending');
create policy submissions_self_update on public.submissions for update to authenticated
  using (driver_id = (select public.my_active_driver_id()) and status = 'pending')
  with check (driver_id = (select public.my_active_driver_id()) and status = 'pending');
create policy submissions_self_delete on public.submissions for delete to authenticated
  using (driver_id = (select public.my_active_driver_id()) and status = 'pending');

-- ===== RPCs =====
create or replace function public.has_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_owner);
$$;

create or replace function public.whoami() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'owner', exists (select 1 from public.app_owner where user_id = (select auth.uid())),
    'driver', (select to_jsonb(d) - 'user_id' from public.drivers d where d.user_id = (select auth.uid()) limit 1)
  );
$$;

create or replace function public.pub_info() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('vekus', s.vekus, 'shops', to_jsonb(s.shops)) from public.settings s where s.id = 1;
$$;

create or replace function public.driver_balances() returns table(driver_id uuid, earned numeric, paid numeric)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.is_owner() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    select d.id,
      coalesce((select sum(e.driver_wage) from public.entries e where e.driver_id = d.id), 0),
      coalesce((select sum(p.amount) from public.driver_payments p where p.driver_id = d.id), 0)
    from public.drivers d;
end $$;

create or replace function public.shop_balances() returns table(shop text, due numeric, paid numeric)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.is_owner() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    with names as (
      select unnest(s.shops) as nm from public.settings s where s.id = 1
      union select e.fuel_src from public.entries e where e.fuel_pay = 'due' and e.fuel_src <> ''
      union select p.shop from public.shop_payments p
    )
    select n.nm,
      coalesce((select sum(e.fuel_cost) from public.entries e where e.fuel_pay = 'due' and e.fuel_src = n.nm), 0),
      coalesce((select sum(p.amount) from public.shop_payments p where p.shop = n.nm), 0)
    from names n where n.nm is not null and n.nm <> '';
end $$;

create or replace function public.driver_statement(p_driver uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_owner() and (public.my_driver_id() is null or public.my_driver_id() <> p_driver) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.date desc, x.created_at desc), '[]'::jsonb) into v from (
    select * from (
      select 'earn'::text as kind, e.id, e.date, e.veku, e.hours, e.driver_wage as amount, ''::text as note, e.created_at
        from public.entries e where e.driver_id = p_driver and e.driver_wage <> 0
      union all
      select 'paid'::text, p.id, p.date, null::text, null::numeric, p.amount, p.note, p.created_at
        from public.driver_payments p where p.driver_id = p_driver
    ) u order by u.date desc, u.created_at desc limit 300
  ) x;
  return v;
end $$;

create or replace function public.my_account() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare d public.drivers;
begin
  select * into d from public.drivers where user_id = (select auth.uid()) limit 1;
  if not found then return null; end if;
  return jsonb_build_object(
    'driver', to_jsonb(d) - 'user_id',
    'earned', coalesce((select sum(e.driver_wage) from public.entries e where e.driver_id = d.id), 0),
    'paid', coalesce((select sum(p.amount) from public.driver_payments p where p.driver_id = d.id), 0),
    'statement', public.driver_statement(d.id)
  );
end $$;

create or replace function public.shop_statement(p_shop text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_owner() then raise exception 'not allowed' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.date desc, x.created_at desc), '[]'::jsonb) into v from (
    select * from (
      select 'due'::text as kind, e.id, e.date, e.veku, e.litres, e.fuel_cost as amount, ''::text as note, e.created_at
        from public.entries e where e.fuel_pay = 'due' and e.fuel_src = p_shop
      union all
      select 'paid'::text, p.id, p.date, null::text, null::numeric, p.amount, p.note, p.created_at
        from public.shop_payments p where p.shop = p_shop
    ) u order by u.date desc, u.created_at desc limit 300
  ) x;
  return v;
end $$;

create or replace function public.approve_submission(p_id uuid, p_entry jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare s public.submissions; new_id uuid;
begin
  if not public.is_owner() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into s from public.submissions where id = p_id for update;
  if not found then raise exception 'submission not found'; end if;
  insert into public.entries (veku, date, site, hours, litres, fuel_cost, fuel_src, fuel_pay, deposit, driver_wage, driver_id, remarks, submission_id)
  values (
    p_entry->>'veku', (p_entry->>'date')::date, coalesce(p_entry->>'site', ''),
    coalesce((p_entry->>'hours')::numeric, 0), coalesce((p_entry->>'litres')::numeric, 0),
    coalesce((p_entry->>'fuel_cost')::numeric, 0), coalesce(p_entry->>'fuel_src', ''), coalesce(p_entry->>'fuel_pay', ''),
    coalesce((p_entry->>'deposit')::numeric, 0), coalesce((p_entry->>'driver_wage')::numeric, 0),
    nullif(p_entry->>'driver_id', '')::uuid, coalesce(p_entry->>'remarks', ''), p_id)
  on conflict (submission_id) do update set
    veku = excluded.veku, date = excluded.date, site = excluded.site, hours = excluded.hours, litres = excluded.litres,
    fuel_cost = excluded.fuel_cost, fuel_src = excluded.fuel_src, fuel_pay = excluded.fuel_pay, deposit = excluded.deposit,
    driver_wage = excluded.driver_wage, driver_id = excluded.driver_id, remarks = excluded.remarks
  returning id into new_id;
  update public.submissions set status = 'approved', decided_at = now() where id = p_id;
  return new_id;
end $$;

-- ===== execute permissions =====
revoke execute on all functions in schema public from public, anon;
grant execute on function public.has_owner() to anon, authenticated;
grant execute on function public.is_owner(), public.my_driver_id(), public.my_active_driver_id(), public.whoami(), public.pub_info(),
  public.driver_balances(), public.shop_balances(), public.driver_statement(uuid), public.my_account(),
  public.shop_statement(text), public.approve_submission(uuid, jsonb) to authenticated;

-- ===== first-time setup code =====
-- The owner account is created from the website with this one-time code.
-- insert into public.app_setup (id, code) values (1, 'YOUR-CODE');

-- ===== sites (added later) =====
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  client text not null default '',
  phone text not null default '',
  address text not null default '',
  rate numeric not null default 0,
  status text not null default 'active' check (status in ('active','done')),
  notes text not null default '',
  created_at timestamptz not null default now()
);
alter table public.sites enable row level security;
create policy sites_owner on public.sites for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

alter table public.entries add column site_id uuid references public.sites(id) on delete set null;
create index entries_site_idx on public.entries(site_id);
alter table public.submissions add column site_id uuid references public.sites(id) on delete set null;
alter table public.submissions add column site_name text not null default '';

-- drivers see only the names of running sites
create or replace function public.pub_info() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'vekus', s.vekus,
    'shops', to_jsonb(s.shops),
    'sites', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) order by t.name) from public.sites t where t.status = 'active'), '[]'::jsonb)
  ) from public.settings s where s.id = 1;
$$;

-- all-time totals per site
create or replace function public.site_summary() returns table(site_id uuid, hours_v1 numeric, hours_v2 numeric, deposit numeric, days bigint, first_date date, last_date date, n bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.is_owner() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    select e.site_id,
      coalesce(sum(e.hours) filter (where e.veku = 'v1'), 0),
      coalesce(sum(e.hours) filter (where e.veku = 'v2'), 0),
      coalesce(sum(e.deposit), 0),
      count(distinct e.date) filter (where e.hours > 0),
      min(e.date), max(e.date), count(*)
    from public.entries e where e.site_id is not null group by e.site_id;
end $$;

create or replace function public.approve_submission(p_id uuid, p_entry jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare s public.submissions; new_id uuid;
begin
  if not public.is_owner() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into s from public.submissions where id = p_id for update;
  if not found then raise exception 'submission not found'; end if;
  insert into public.entries (veku, date, site, site_id, hours, litres, fuel_cost, fuel_src, fuel_pay, deposit, driver_wage, driver_id, remarks, submission_id)
  values (
    p_entry->>'veku', (p_entry->>'date')::date, coalesce(p_entry->>'site', ''), nullif(p_entry->>'site_id', '')::uuid,
    coalesce((p_entry->>'hours')::numeric, 0), coalesce((p_entry->>'litres')::numeric, 0),
    coalesce((p_entry->>'fuel_cost')::numeric, 0), coalesce(p_entry->>'fuel_src', ''), coalesce(p_entry->>'fuel_pay', ''),
    coalesce((p_entry->>'deposit')::numeric, 0), coalesce((p_entry->>'driver_wage')::numeric, 0),
    nullif(p_entry->>'driver_id', '')::uuid, coalesce(p_entry->>'remarks', ''), p_id)
  on conflict (submission_id) do update set
    veku = excluded.veku, date = excluded.date, site = excluded.site, site_id = excluded.site_id, hours = excluded.hours, litres = excluded.litres,
    fuel_cost = excluded.fuel_cost, fuel_src = excluded.fuel_src, fuel_pay = excluded.fuel_pay, deposit = excluded.deposit,
    driver_wage = excluded.driver_wage, driver_id = excluded.driver_id, remarks = excluded.remarks
  returning id into new_id;
  update public.submissions set status = 'approved', decided_at = now() where id = p_id;
  return new_id;
end $$;

revoke execute on function public.site_summary() from public, anon;
grant execute on function public.site_summary() to authenticated;
revoke execute on function public.pub_info() from public, anon;
grant execute on function public.pub_info() to authenticated;

-- ===== driver total hours and default diesel rate (added later) =====
create or replace function public.my_account() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare d public.drivers;
begin
  select * into d from public.drivers where user_id = (select auth.uid()) limit 1;
  if not found then return null; end if;
  return jsonb_build_object(
    'driver', to_jsonb(d) - 'user_id',
    'earned', coalesce((select sum(e.driver_wage) from public.entries e where e.driver_id = d.id), 0),
    'paid', coalesce((select sum(p.amount) from public.driver_payments p where p.driver_id = d.id), 0),
    'hours', coalesce((select sum(e.hours) from public.entries e where e.driver_id = d.id), 0),
    'statement', public.driver_statement(d.id)
  );
end $$;

create or replace function public.pub_info() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'vekus', s.vekus,
    'shops', to_jsonb(s.shops),
    'diesel_rate', s.diesel_rate,
    'sites', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) order by t.name) from public.sites t where t.status = 'active'), '[]'::jsonb)
  ) from public.settings s where s.id = 1;
$$;
revoke execute on function public.pub_info(), public.my_account() from public, anon;
grant execute on function public.pub_info(), public.my_account() to authenticated;
