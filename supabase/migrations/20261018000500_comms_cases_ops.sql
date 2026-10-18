-- Communication and operations: conversations, messages, blocks and reports, notifications,
-- cases (disputes, no-shows, handoff issues, support), staff invitations, analytics.

create type public.conversation_kind as enum ('order', 'support', 'direct');
create type public.case_kind as enum
  ('order_issue', 'dispute', 'no_show', 'handoff_issue', 'delivery_exception', 'support', 'message_report');
create type public.case_status as enum ('open', 'in_review', 'resolved', 'denied');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null,
  seller_order_id uuid references public.seller_orders (id),
  title text not null default '',
  created_by uuid references public.profiles (id),
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index conversations_one_per_order on public.conversations (seller_order_id) where kind = 'order';

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  muted boolean not null default false,
  primary key (conversation_id, user_id)
);
create index conversation_participants_user_idx on public.conversation_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id),
  body text not null check (length(btrim(body)) between 1 and 2000),
  system boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id),
  reporter_id uuid not null references public.profiles (id),
  reason text not null,
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  href text,
  data jsonb not null default '{}',
  read_at timestamptz,
  email_required boolean not null default false,
  push_sent_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.push_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- Cases link to the thing they are about; staff decide, everyone concerned can read.
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  kind public.case_kind not null,
  status public.case_status not null default 'open',
  seller_order_id uuid references public.seller_orders (id),
  booking_id uuid references public.bookings (id),
  delivery_job_id uuid references public.delivery_jobs (id),
  campus_id text references public.campuses (id),
  opened_by uuid not null references public.profiles (id),
  assigned_to uuid references public.profiles (id),
  reason text not null check (length(btrim(reason)) >= 3),
  outcome text check (outcome in ('refund_full', 'refund_partial', 'release_payout', 'return', 'deny', 'other')),
  outcome_cents bigint check (outcome_cents >= 0),
  resolution_note text,
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  appeal_of uuid references public.cases (id),
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cases_status_idx on public.cases (status, campus_id);
create index cases_order_idx on public.cases (seller_order_id);
create unique index cases_one_open_per_order_kind on public.cases (seller_order_id, kind)
  where status in ('open', 'in_review') and seller_order_id is not null;
create trigger cases_touch before update on public.cases
  for each row execute function private.touch_updated_at();

create table public.case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  internal boolean not null default false,
  evidence_path text,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  name text not null check (name ~ '^[a-z0-9_.]{2,60}$'),
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------
create function private.notify(p_user uuid, p_kind text, p_title text, p_body text default '',
                               p_href text default null, p_data jsonb default '{}', p_email boolean default false)
returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, href, data, email_required)
  values (p_user, p_kind, p_title, p_body, p_href, coalesce(p_data, '{}'), p_email)
$$;

-- The order conversation has the buyer and the seller; couriers join only via the job (read-only system notes).
create function private.ensure_order_conversation(p_seller_order_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  so public.seller_orders;
  v_id uuid;
begin
  select id into v_id from public.conversations where kind = 'order' and seller_order_id = p_seller_order_id;
  if found then return v_id; end if;
  select * into so from public.seller_orders where id = p_seller_order_id;
  insert into public.conversations (kind, seller_order_id, title, created_by)
  values ('order', so.id, 'Order ' || so.number, so.buyer_id) returning id into v_id;
  insert into public.conversation_participants (conversation_id, user_id) values (v_id, so.buyer_id), (v_id, so.seller_user_id);
  return v_id;
end $$;

create function private.system_message(p_conversation uuid, p_body text) returns void
language sql security definer set search_path = public as $$
  with m as (
    insert into public.messages (conversation_id, body, system) values (p_conversation, p_body, true) returning created_at
  )
  update public.conversations set last_message_at = (select created_at from m) where id = p_conversation
$$;

-- ---------------------------------------------------------------------------
-- Messaging RPCs
-- ---------------------------------------------------------------------------
create function public.send_message(p_conversation_id uuid, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_id uuid;
  v_other uuid;
  v_recent int;
begin
  if not exists (select 1 from public.conversation_participants where conversation_id = p_conversation_id and user_id = v_user) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if exists (select 1 from public.conversation_participants p
              join public.user_blocks b on (b.blocker_id = p.user_id and b.blocked_id = v_user)
             where p.conversation_id = p_conversation_id and p.user_id <> v_user) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  select count(*) into v_recent from public.messages
   where sender_id = v_user and created_at > now() - interval '1 minute';
  if v_recent >= 20 then raise exception 'rate_limited' using errcode = '53400'; end if;
  insert into public.messages (conversation_id, sender_id, body) values (p_conversation_id, v_user, btrim(p_body))
  returning id into v_id;
  update public.conversations set last_message_at = now() where id = p_conversation_id;
  update public.conversation_participants set last_read_at = now()
   where conversation_id = p_conversation_id and user_id = v_user;
  for v_other in select user_id from public.conversation_participants
                  where conversation_id = p_conversation_id and user_id <> v_user and not muted loop
    perform private.notify(v_other, 'message', 'New message', left(btrim(p_body), 120),
                           '/account/inbox/' || p_conversation_id, jsonb_build_object('conversation_id', p_conversation_id));
  end loop;
  return v_id;
end $$;

create function public.mark_conversation_read(p_conversation_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.conversation_participants set last_read_at = now()
   where conversation_id = p_conversation_id and user_id = private.require_user()
$$;

-- Direct chat with a seller before an order exists.
create function public.open_seller_conversation(p_seller_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_seller_user uuid;
  v_id uuid;
begin
  select user_id into v_seller_user from public.sellers where id = p_seller_id and status = 'active';
  if not found or v_seller_user = v_user then raise exception 'not_found' using errcode = 'P0002'; end if;
  select c.id into v_id from public.conversations c
   where c.kind = 'direct'
     and exists (select 1 from public.conversation_participants where conversation_id = c.id and user_id = v_user)
     and exists (select 1 from public.conversation_participants where conversation_id = c.id and user_id = v_seller_user);
  if found then return v_id; end if;
  insert into public.conversations (kind, title, created_by) values ('direct', '', v_user) returning id into v_id;
  insert into public.conversation_participants (conversation_id, user_id) values (v_id, v_user), (v_id, v_seller_user);
  return v_id;
end $$;

create function public.open_support_conversation() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_id uuid;
begin
  select c.id into v_id from public.conversations c
    join public.conversation_participants p on p.conversation_id = c.id and p.user_id = v_user
   where c.kind = 'support' limit 1;
  if found then return v_id; end if;
  insert into public.conversations (kind, title, created_by) values ('support', 'Vossie Support', v_user) returning id into v_id;
  insert into public.conversation_participants (conversation_id, user_id) values (v_id, v_user);
  return v_id;
end $$;

-- Staff join a support conversation they are working.
create function public.join_support_conversation(p_conversation_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_staff uuid := private.require_staff();
begin
  if not exists (select 1 from public.conversations where id = p_conversation_id and kind = 'support') then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into public.conversation_participants (conversation_id, user_id) values (p_conversation_id, v_staff)
  on conflict do nothing;
end $$;

create function public.block_user(p_user_id uuid) returns void
language sql security definer set search_path = public as $$
  insert into public.user_blocks (blocker_id, blocked_id) values (private.require_user(), p_user_id) on conflict do nothing
$$;

create function public.unblock_user(p_user_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.user_blocks where blocker_id = private.require_user() and blocked_id = p_user_id
$$;

create function public.report_message(p_message_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_case uuid;
begin
  if not exists (select 1 from public.messages m join public.conversation_participants p
                   on p.conversation_id = m.conversation_id and p.user_id = v_user where m.id = p_message_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.message_reports (message_id, reporter_id, reason) values (p_message_id, v_user, p_reason)
  on conflict do nothing;
  insert into public.cases (kind, opened_by, reason) values ('message_report', v_user, p_reason);
end $$;

create function public.mark_notifications_read(p_ids uuid[] default null) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  update public.notifications set read_at = now()
   where user_id = private.require_user() and read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create function public.register_push_token(p_token text, p_platform text) returns void
language sql security definer set search_path = public as $$
  insert into public.push_tokens (user_id, token, platform) values (private.require_user(), p_token, p_platform)
  on conflict do nothing
$$;

create function public.track_event(p_name text, p_props jsonb default '{}') returns void
language sql security definer set search_path = public as $$
  insert into public.analytics_events (user_id, name, props) values (auth.uid(), p_name, coalesce(p_props, '{}'))
$$;

-- ---------------------------------------------------------------------------
-- Cases
-- ---------------------------------------------------------------------------
create function public.add_case_note(p_case_id uuid, p_body text, p_internal boolean default false,
                                     p_evidence_path text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  c public.cases;
  v_id uuid;
begin
  select * into c from public.cases where id = p_case_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if private.is_staff(c.campus_id) then
    null;
  elsif p_internal or not (c.opened_by = v_user or exists (
      select 1 from public.seller_orders so where so.id = c.seller_order_id and v_user in (so.buyer_id, so.seller_user_id))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.case_notes (case_id, author_id, body, internal, evidence_path)
  values (p_case_id, v_user, p_body, p_internal, p_evidence_path) returning id into v_id;
  return v_id;
end $$;

create function public.claim_case(p_case_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  c public.cases;
  v_staff uuid;
begin
  select * into c from public.cases where id = p_case_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  v_staff := private.require_staff(c.campus_id);
  update public.cases set assigned_to = v_staff, status = 'in_review' where id = p_case_id and status in ('open', 'in_review');
end $$;

-- ---------------------------------------------------------------------------
-- Staff and courier invitations
-- ---------------------------------------------------------------------------
-- Returns the one-time token; email delivery is handled by the trusted Edge Function.
create function public.invite_staff(p_email text, p_role public.app_role, p_campus_id text default null) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid;
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if p_role = 'seller' then raise exception 'invalid_role' using errcode = '22023'; end if;
  v_admin := private.require_role(case when p_role in ('admin', 'finance') then 'admin'::public.app_role else 'operations' end);
  insert into public.staff_invitations (email, role, campus_id, invited_by, token_hash)
  values (lower(btrim(p_email)), p_role, p_campus_id, v_admin, encode(sha256(convert_to(v_token, 'utf8')), 'hex'));
  perform private.audit('staff.invited', 'staff_invitation', lower(btrim(p_email)), jsonb_build_object('role', p_role));
  return v_token;
end $$;

create function public.accept_invitation(p_token text, p_full_name text default null, p_phone text default null) returns public.app_role
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_email text := (select email from public.profiles where id = v_user);
  inv public.staff_invitations;
begin
  select * into inv from public.staff_invitations
   where token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex')
     and accepted_at is null and expires_at > now() for update;
  if not found or lower(inv.email) <> lower(coalesce(v_email, '')) then
    raise exception 'invalid_invitation' using errcode = '42501';
  end if;
  update public.staff_invitations set accepted_by = v_user, accepted_at = now() where id = inv.id;
  insert into public.memberships (user_id, role, campus_id, state, granted_by)
  values (v_user, inv.role, inv.campus_id, 'active', inv.invited_by)
  on conflict (user_id, role, campus_id) do update set state = 'active', granted_by = inv.invited_by;
  if inv.role = 'courier' then
    insert into public.courier_profiles (user_id, full_name, phone, campus_ids)
    values (v_user, coalesce(nullif(btrim(p_full_name), ''), (select display_name from public.profiles where id = v_user)),
            coalesce(nullif(btrim(p_phone), ''), 'unknown'),
            case when inv.campus_id is null then (select array_agg(id) from public.campuses) else array[inv.campus_id] end)
    on conflict (user_id) do nothing;
  end if;
  perform private.audit('staff.invitation_accepted', 'staff_invitation', inv.id::text);
  return inv.role;
end $$;

create function public.set_membership_state(p_user uuid, p_role public.app_role, p_state public.membership_state) returns void
language plpgsql security definer set search_path = public as $$
declare v_admin uuid := private.require_role('admin');
begin
  update public.memberships set state = p_state, granted_by = v_admin where user_id = p_user and role = p_role;
  if p_role = 'courier' then
    update public.courier_profiles set status = case when p_state = 'active' then 'active' else 'suspended' end,
           online = online and p_state = 'active' where user_id = p_user;
  end if;
  perform private.audit('membership.state_changed', 'profile', p_user::text, jsonb_build_object('role', p_role, 'state', p_state));
end $$;

create function public.set_courier_online(p_online boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_role('courier');
begin
  update public.courier_profiles set online = p_online where user_id = v_user and status = 'active';
end $$;
