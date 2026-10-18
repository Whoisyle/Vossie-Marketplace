-- Vossie Marketplace: foundation, identity and access.
-- Source of design: plan.md sections 5-10. Money is integer ZAR cents; time is timestamptz (UTC).
-- Rules used throughout:
--   * every public table has RLS enabled; clients read through policies and write through RPCs
--   * RPCs are SECURITY DEFINER with a pinned search_path and check auth.uid() themselves
--   * helpers that must not be callable from the API live in schema "private"

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('seller', 'courier', 'support', 'operations', 'finance', 'admin');
create type public.membership_state as enum ('pending', 'active', 'suspended', 'revoked');
create type public.student_status as enum ('demo_unverified', 'verified', 'expired');
create type public.workspace as enum ('buyer', 'seller', 'service_provider');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create function private.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.version := coalesce(old.version, 0) + 1;
  return new;
end $$;

create function private.forbid_change() returns trigger
language plpgsql as $$
begin
  raise exception '% rows are append-only', tg_table_name using errcode = '55000';
end $$;

-- ---------------------------------------------------------------------------
-- Settings (non-secret policy values the backend reads)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value, description) values
  ('demo_email_domain', '"vossie.net"', 'Demo sign-up only. Never proves Eduvos identity.'),
  ('demo_student_prefix', '"eduv"', 'Demo sign-up only.'),
  ('seller_accept_hours', '24', 'Hours a seller has to accept a paid order'),
  ('issue_window_hours', '48', 'Buyer issue window after delivery or service completion'),
  ('payment_window_minutes', '15', 'Minutes an unpaid order and its stock or slot holds are kept'),
  ('waitlist_hours', '24', 'Maximum paid waitlist when no fulfilment option exists'),
  ('handoff_code_minutes', '240', 'Lifetime of a one-time handoff code'),
  ('handoff_max_attempts', '5', 'Wrong-code attempts before a challenge locks'),
  ('account_purge_days', '30', 'Days after deletion before private data is purged'),
  ('delivery_fee_cents', '1500', 'Vossie delivery fee per seller order (pilot default)'),
  ('courier_share_bps', '8000', 'Share of the delivery fee paid to the courier');

create function private.setting(p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select value from public.app_settings where key = p_key
$$;

-- ---------------------------------------------------------------------------
-- Campuses (stable keys approved by the owner; not official Eduvos codes)
-- ---------------------------------------------------------------------------
create table public.campuses (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Profiles. One row per auth user; created by trigger on sign-up.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  email text,
  phone text,
  avatar_path text,
  preferred_campus_id text references public.campuses (id),
  workspace public.workspace not null default 'buyer',
  student_status public.student_status not null default 'demo_unverified',
  onboarded_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- Owner-only private data. The demo student number is not proof of anything.
create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  student_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);
create trigger profile_private_touch before update on public.profile_private
  for each row execute function private.touch_updated_at();

-- Federated identity evidence (Eduvos Entra, later). Written by trusted code only.
create table public.identity_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null,
  issuer text not null,
  subject text not null,
  tenant text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, issuer, subject)
);

create table public.student_eligibility (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  campus_id text references public.campuses (id),
  status public.student_status not null default 'demo_unverified',
  evidence_source text,
  verified_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Roles beyond buyer. campus_id null means all campuses.
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  campus_id text references public.campuses (id),
  state public.membership_state not null default 'pending',
  granted_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique nulls not distinct (user_id, role, campus_id)
);
create index memberships_user_idx on public.memberships (user_id) where state = 'active';
create trigger memberships_touch before update on public.memberships
  for each row execute function private.touch_updated_at();

create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role public.app_role not null,
  campus_id text references public.campuses (id),
  invited_by uuid not null references public.profiles (id),
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references public.profiles (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (role in ('courier', 'support', 'operations', 'finance', 'admin'))
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target_type text,
  target_id text,
  outcome text not null default 'ok',
  meta jsonb not null default '{}',
  correlation_id uuid,
  created_at timestamptz not null default now()
);
create index audit_events_target_idx on public.audit_events (target_type, target_id);
create index audit_events_actor_idx on public.audit_events (actor_id, created_at desc);
create trigger audit_events_immutable before update or delete on public.audit_events
  for each row execute function private.forbid_change();

create function private.audit(p_action text, p_target_type text default null, p_target_id text default null,
                              p_meta jsonb default '{}') returns void
language sql security definer set search_path = public as $$
  insert into public.audit_events (actor_id, action, target_type, target_id, meta)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_meta, '{}'))
$$;

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------------
create function private.has_role(p_role public.app_role, p_campus text default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.role = p_role
      and m.state = 'active'
      and (m.campus_id is null or p_campus is null or m.campus_id = p_campus)
  ) or exists (
    select 1 from public.memberships a
    where a.user_id = auth.uid() and a.role = 'admin' and a.state = 'active'
      and (a.campus_id is null or p_campus is null or a.campus_id = p_campus)
  )
$$;

create function private.is_staff(p_campus text default null) returns boolean
language sql stable security definer set search_path = public as $$
  select private.has_role('support', p_campus) or private.has_role('operations', p_campus)
      or private.has_role('finance', p_campus) or private.has_role('admin', p_campus)
$$;

create function private.require_user() returns uuid
language plpgsql stable as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return v;
end $$;

create function private.require_role(p_role public.app_role, p_campus text default null) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v uuid := private.require_user();
begin
  if not private.has_role(p_role, p_campus) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v;
end $$;

create function private.require_staff(p_campus text default null) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v uuid := private.require_user();
begin
  if not private.is_staff(p_campus) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Sign-up plumbing
-- ---------------------------------------------------------------------------
-- Profile row is created for every new auth user.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, preferred_campus_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    (select c.id from public.campuses c where c.id = new.raw_user_meta_data ->> 'campus_id')
  );
  insert into public.profile_private (user_id) values (new.id);
  insert into public.student_eligibility (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Supabase "before user created" auth hook: demo sign-up only accepts the demo domain.
-- Enable in config.toml. Replace with the Eduvos Entra contract when it exists.
create function public.hook_before_user_created(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_email text := lower(coalesce(event -> 'user' ->> 'email', ''));
  v_domain text := private.setting('demo_email_domain') #>> '{}';
begin
  if v_email = '' or right(v_email, length(v_domain) + 1) <> '@' || v_domain then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 400,
      'message', 'Demo accounts need an @' || v_domain || ' email address.'));
  end if;
  return '{}'::jsonb;
end $$;

-- After the OTP session exists, the client submits the student number once.
create function public.submit_student_number(p_student_number text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_clean text := lower(btrim(p_student_number));
  v_prefix text := private.setting('demo_student_prefix') #>> '{}';
begin
  if left(v_clean, length(v_prefix)) <> v_prefix or length(v_clean) < length(v_prefix) + 3 then
    raise exception 'invalid_student_number' using errcode = '22023';
  end if;
  update public.profile_private set student_number = v_clean where user_id = v_user;
  perform private.audit('profile.student_number_submitted', 'profile', v_user::text);
end $$;

-- Profile setup and edits. Email and status come from identity and are not editable here.
create function public.update_my_profile(p_display_name text default null, p_phone text default null,
                                         p_campus_id text default null, p_avatar_path text default null,
                                         p_workspace public.workspace default null) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_row public.profiles;
begin
  if p_display_name is not null and length(btrim(p_display_name)) < 2 then
    raise exception 'invalid_display_name' using errcode = '22023';
  end if;
  if p_campus_id is not null and not exists (select 1 from public.campuses where id = p_campus_id and active) then
    raise exception 'unknown_campus' using errcode = '22023';
  end if;
  if p_workspace is not null and p_workspace <> 'buyer'
     and not exists (select 1 from public.sellers s where s.user_id = v_user and s.status = 'active') then
    raise exception 'workspace_not_available' using errcode = '42501';
  end if;
  update public.profiles p set
    display_name = coalesce(btrim(p_display_name), p.display_name),
    phone = coalesce(nullif(btrim(p_phone), ''), p.phone),
    preferred_campus_id = coalesce(p_campus_id, p.preferred_campus_id),
    avatar_path = coalesce(p_avatar_path, p.avatar_path),
    workspace = coalesce(p_workspace, p.workspace),
    onboarded_at = coalesce(p.onboarded_at,
      case when coalesce(p_display_name, p.display_name) <> '' and coalesce(p_campus_id, p.preferred_campus_id) is not null
           then now() end)
  where p.id = v_user
  returning * into v_row;
  return v_row;
end $$;

-- Account deletion is a reviewed privacy workflow, not a blanket delete.
create table public.account_deletion_requests (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  requested_at timestamptz not null default now(),
  purge_after timestamptz not null,
  purged_at timestamptz,
  cancelled_at timestamptz
);

create function public.request_account_deletion() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_days int := (private.setting('account_purge_days') #>> '{}')::int;
  v_at timestamptz := now() + make_interval(days => v_days);
begin
  if exists (select 1 from public.seller_orders so
             where (so.buyer_id = v_user or so.seller_user_id = v_user)
               and so.status not in ('completed', 'rejected', 'timed_out', 'cancelled', 'refunded')) then
    raise exception 'open_orders_exist' using errcode = '55000';
  end if;
  insert into public.account_deletion_requests (user_id, purge_after) values (v_user, v_at)
  on conflict (user_id) do update set requested_at = now(), purge_after = v_at, cancelled_at = null;
  update public.profiles set deleted_at = now() where id = v_user;
  perform private.audit('account.deletion_requested', 'profile', v_user::text);
  return v_at;
end $$;

create function public.cancel_account_deletion() returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_user();
begin
  update public.account_deletion_requests set cancelled_at = now()
   where user_id = v_user and purged_at is null and cancelled_at is null;
  update public.profiles set deleted_at = null where id = v_user;
end $$;

-- Scheduled: removes the private student number once the retention period passes.
create function private.purge_deleted_accounts() returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with due as (
    select user_id from public.account_deletion_requests
     where purged_at is null and cancelled_at is null and purge_after <= now()
  ), wiped as (
    update public.profile_private pp set student_number = null from due where pp.user_id = due.user_id
    returning pp.user_id
  )
  update public.profiles p set display_name = 'Deleted user', email = null, phone = null, avatar_path = null
    from wiped where p.id = wiped.user_id;
  update public.account_deletion_requests set purged_at = now()
   where purged_at is null and cancelled_at is null and purge_after <= now();
  get diagnostics v_count = row_count;
  return v_count;
end $$;
