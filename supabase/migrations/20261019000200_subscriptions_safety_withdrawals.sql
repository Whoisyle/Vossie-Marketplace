-- Subscriptions, safety (trusted contacts, campus security number, reports), withdrawals back to a card, and
-- referrals that pay Vossie Points. Same rules as before: RLS on, read policies only, writes through functions,
-- and every cent through the ledger.
--
-- Demo-phase notes (see docs/architecture/backend.md):
--  * subscription perks (R4 off, free Vossie courier over R100, double points, 10% off services) are applied
--    by the app for now; quote_cart does not apply them yet
--  * a card withdrawal only records the request and moves the money to a clearing account; sending it to the
--    card needs the payment provider, so settle_withdrawal is a trusted function
--  * wishlist collections, saved searches, book swaps, lost and found and bill splits are app-only for now

-- ---------------------------------------------------------------------------
-- Ledger: two new accounts (create or replace keeps the original rules and adds subscription revenue)
-- ---------------------------------------------------------------------------
create or replace function private.ledger_account(p_code text, p_owner uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_kind public.ledger_kind;
begin
  select id into v_id from public.ledger_accounts
   where code = p_code and owner_user_id is not distinct from p_owner;
  if found then return v_id; end if;
  v_kind := case p_code
    when 'provider_clearing' then 'asset' when 'payouts_clearing' then 'asset'
    when 'platform_fees' then 'revenue' when 'delivery_revenue' then 'revenue' when 'subscription_revenue' then 'revenue'
    when 'promotions_expense' then 'expense'
    else 'liability' end;
  insert into public.ledger_accounts (code, kind, owner_user_id) values (p_code, v_kind, p_owner)
  on conflict (code, owner_user_id) do nothing;
  select id into v_id from public.ledger_accounts
   where code = p_code and owner_user_id is not distinct from p_owner;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Referrals now pay points: 200 each when the friend's first seller order completes
-- ---------------------------------------------------------------------------
drop trigger orders_reward_referral on public.orders;

create or replace function private.reward_referral() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r public.referrals;
  v_points int := coalesce((private.setting('referral_reward_points') #>> '{}')::int, 200);
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    select * into r from public.referrals where referred_id = new.buyer_id and status <> 'rewarded' for update;
    if found
       and not exists (select 1 from public.seller_orders where buyer_id = new.buyer_id and status = 'completed' and id <> new.id) then
      insert into public.points_ledger (user_id, points, kind, label, ref_type, ref_id)
      values (r.referred_id, v_points, 'referral', 'Referral reward', 'referral', uuid_in(md5(r.id::text || 'referred')::cstring)),
             (r.referrer_id, v_points, 'referral', 'Referral reward', 'referral', uuid_in(md5(r.id::text || 'referrer')::cstring))
      on conflict (kind, ref_id) do nothing;
      update public.referrals set status = 'rewarded', rewarded_at = now() where id = r.id;
      insert into public.notifications (user_id, kind, title, body)
      values (r.referrer_id, 'referral', 'Referral reward', 'A friend''s first order arrived. You each earned ' || v_points || ' points.'),
             (r.referred_id, 'referral', 'Referral reward', 'Your first order arrived. You and your friend each earned ' || v_points || ' points.');
    end if;
  end if;
  return null;
end $$;
create trigger seller_orders_reward_referral after update of status on public.seller_orders
  for each row execute function private.reward_referral();

-- ---------------------------------------------------------------------------
-- Subscriptions (Vossie Plus, Seller Pro, Study Pass), paid monthly from the wallet
-- ---------------------------------------------------------------------------
create table public.subscription_plans (
  id text primary key check (id ~ '^[a-z-]+$'),
  name text not null,
  price_cents bigint not null check (price_cents > 0),
  audience text not null default '',
  perks jsonb not null default '[]',
  active boolean not null default true
);
insert into public.subscription_plans (id, name, price_cents, audience, perks) values
  ('plus', 'Vossie Plus', 4900, 'Every student',
   '["R4 off every order", "Free Vossie courier on orders over R100", "Double Vossie Points on every order"]'),
  ('seller-pro', 'Vossie Seller Pro', 9900, 'Sellers',
   '["Featured listings in Explore", "Promotion tools for your store", "Priority support"]'),
  ('study-pass', 'Vossie Study Pass', 2900, 'Students who study here',
   '["10% off tutoring and study rooms", "Early access to booking slots", "Exam-season study packs"]');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id text not null references public.subscription_plans (id),
  status text not null default 'active' check (status in ('active', 'ended')),
  cancel_at_period_end boolean not null default false,
  started_at timestamptz not null default now(),
  current_period_end timestamptz not null
);
create unique index subscriptions_one_active on public.subscriptions (user_id, plan_id) where status = 'active';
create index subscriptions_due_idx on public.subscriptions (current_period_end) where status = 'active';

create function private.charge_plan(p_user uuid, p_plan public.subscription_plans, p_sub uuid, p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform private.wallet_move(p_user, -p_plan.price_cents, 'purchase', p_plan.name || ' subscription', 'subscription_revenue',
                              'subscription', p_sub, p_key);
end $$;

create function public.subscribe_plan(p_plan_id text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  p public.subscription_plans;
  v_id uuid := gen_random_uuid();
begin
  select * into p from public.subscription_plans where id = p_plan_id and active;
  if not found then raise exception 'unknown_plan' using errcode = '22023'; end if;
  if exists (select 1 from public.subscriptions where user_id = v_user and plan_id = p_plan_id and status = 'active') then
    raise exception 'already_subscribed' using errcode = '23505';
  end if;
  insert into public.subscriptions (id, user_id, plan_id, current_period_end)
  values (v_id, v_user, p_plan_id, now() + interval '1 month');
  perform private.charge_plan(v_user, p, v_id, 'sub:' || v_id || ':first');
  return v_id;
end $$;

create function public.cancel_subscription(p_plan_id text) returns void
language sql security definer set search_path = public as $$
  update public.subscriptions set cancel_at_period_end = true
   where user_id = auth.uid() and plan_id = p_plan_id and status = 'active'
$$;

create function public.resume_subscription(p_plan_id text) returns void
language sql security definer set search_path = public as $$
  update public.subscriptions set cancel_at_period_end = false
   where user_id = auth.uid() and plan_id = p_plan_id and status = 'active' and current_period_end > now()
$$;

-- Trusted (a scheduled job): ends cancelled plans and charges the next month; a plan the wallet cannot pay ends.
create function public.renew_subscriptions() returns int
language plpgsql security definer set search_path = public as $$
declare
  s record;
  p public.subscription_plans;
  n int := 0;
begin
  for s in select * from public.subscriptions where status = 'active' and current_period_end <= now() for update skip locked loop
    select * into p from public.subscription_plans where id = s.plan_id;
    if s.cancel_at_period_end then
      update public.subscriptions set status = 'ended' where id = s.id;
    else
      begin
        perform private.charge_plan(s.user_id, p, s.id, 'sub:' || s.id || ':' || to_char(s.current_period_end, 'YYYYMMDDHH24MISS'));
        update public.subscriptions set current_period_end = current_period_end + interval '1 month' where id = s.id;
        n := n + 1;
      exception when others then
        update public.subscriptions set status = 'ended' where id = s.id;
        insert into public.notifications (user_id, kind, title, body)
        values (s.user_id, 'subscription', 'Subscription ended', p.name || ' ended because your wallet could not cover the payment.');
      end;
    end if;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Safety: trusted contacts, campus security number, reports
-- ---------------------------------------------------------------------------
create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(btrim(name)) >= 2),
  phone text not null check (phone ~ '^[0-9+ ()-]{9,20}$'),
  relationship text not null default '',
  created_at timestamptz not null default now()
);
create index emergency_contacts_user_idx on public.emergency_contacts (user_id);

create table public.safety_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  campus_security_number text not null default ''
);

create table public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id),
  category text not null check (category in ('User', 'Listing', 'Delivery or courier', 'Safety incident', 'Other')),
  notes text not null check (length(btrim(notes)) >= 5),
  status text not null default 'received' check (status in ('received', 'in_review', 'closed')),
  created_at timestamptz not null default now()
);
create index safety_reports_reporter_idx on public.safety_reports (reporter_id, created_at desc);

-- Numbers for each campus (security desk, clinic, hub), kept in the database so the owner can fill and update
-- them without a new app release. Every signed-in student can read them; only trusted code writes them.
create table public.campus_contacts (
  id uuid primary key default gen_random_uuid(),
  campus_id text not null references public.campuses (id),
  kind text not null check (kind in ('security', 'clinic', 'hub')),
  label text not null check (length(btrim(label)) >= 2),
  phone text not null check (phone ~ '^[0-9+ ()-]{9,20}$'),
  active boolean not null default true,
  sort_order int not null default 0,
  unique (campus_id, kind, label)
);
create index campus_contacts_campus_idx on public.campus_contacts (campus_id) where active;

create function public.add_emergency_contact(p_name text, p_phone text, p_relationship text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_id uuid;
begin
  if (select count(*) from public.emergency_contacts where user_id = v_user) >= 5 then
    raise exception 'too_many_contacts' using errcode = '55000';
  end if;
  insert into public.emergency_contacts (user_id, name, phone, relationship)
  values (v_user, btrim(p_name), btrim(p_phone), btrim(coalesce(p_relationship, ''))) returning id into v_id;
  return v_id;
end $$;

create function public.remove_emergency_contact(p_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.emergency_contacts where id = p_id and user_id = auth.uid()
$$;

create function public.set_campus_security_number(p_number text) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_user();
begin
  if btrim(p_number) !~ '^[0-9+ ()-]{0,20}$' then raise exception 'invalid_phone' using errcode = '22023'; end if;
  insert into public.safety_settings (user_id, campus_security_number) values (v_user, btrim(p_number))
  on conflict (user_id) do update set campus_security_number = excluded.campus_security_number;
end $$;

create function public.submit_safety_report(p_category text, p_notes text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_id uuid;
begin
  if (select count(*) from public.safety_reports where reporter_id = v_user and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  insert into public.safety_reports (reporter_id, category, notes) values (v_user, p_category, p_notes) returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Withdraw wallet money back to a saved card (minimum R60)
-- ---------------------------------------------------------------------------
create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  payment_method_id uuid not null references public.payment_methods (id),
  amount_cents bigint not null check (amount_cents >= 6000),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index withdrawal_requests_user_idx on public.withdrawal_requests (user_id, created_at desc);

create function public.request_card_withdrawal(p_amount_cents bigint, p_payment_method_id uuid, p_idempotency_key text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_id uuid;
begin
  if p_amount_cents < 6000 or p_amount_cents > 2000000 then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then raise exception 'idempotency_key_required' using errcode = '22023'; end if;
  if not exists (select 1 from public.payment_methods where id = p_payment_method_id and user_id = v_user) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select id into v_id from public.withdrawal_requests where user_id = v_user and id = uuid_in(md5(v_user::text || p_idempotency_key)::cstring);
  if found then return v_id; end if;
  v_id := uuid_in(md5(v_user::text || p_idempotency_key)::cstring);
  insert into public.withdrawal_requests (id, user_id, payment_method_id, amount_cents) values (v_id, v_user, p_payment_method_id, p_amount_cents);
  -- raises insufficient_funds (and undoes the request) when the wallet cannot cover it
  perform private.wallet_move(v_user, -p_amount_cents, 'withdrawal', 'Withdrawal to card', 'withdrawals_clearing',
                              'withdrawal', v_id, 'withdraw:' || v_id);
  return v_id;
end $$;

-- Trusted: the payment provider reported the payout. Paid moves the money out; failed puts it back in the wallet.
create function public.settle_withdrawal(p_id uuid, p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
declare w public.withdrawal_requests;
begin
  select * into w from public.withdrawal_requests where id = p_id for update;
  if not found or w.status <> 'pending' then raise exception 'not_pending' using errcode = '55000'; end if;
  if p_ok then
    perform private.post_journal('withdrawal', w.id, 'Withdrawal paid out',
      jsonb_build_array(jsonb_build_object('account', 'withdrawals_clearing', 'debit', w.amount_cents),
                        jsonb_build_object('account', 'provider_clearing', 'credit', w.amount_cents)), 'withdraw-paid:' || w.id);
    update public.withdrawal_requests set status = 'paid', settled_at = now() where id = w.id;
  else
    perform private.wallet_move(w.user_id, w.amount_cents, 'refund', 'Withdrawal failed, money returned', 'withdrawals_clearing',
                                'withdrawal', w.id, 'withdraw-failed:' || w.id);
    update public.withdrawal_requests set status = 'failed', settled_at = now() where id = w.id;
    insert into public.notifications (user_id, kind, title, body)
    values (w.user_id, 'withdrawal', 'Withdrawal failed', 'We could not send your money to the card, so it is back in your wallet.');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RLS, grants and execution rights
-- ---------------------------------------------------------------------------
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.safety_settings enable row level security;
alter table public.safety_reports enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.campus_contacts enable row level security;

create policy subscription_plans_read on public.subscription_plans for select using (active);
create policy subscriptions_own_read on public.subscriptions for select using (user_id = auth.uid());
create policy emergency_contacts_own_read on public.emergency_contacts for select using (user_id = auth.uid());
create policy safety_settings_own_read on public.safety_settings for select using (user_id = auth.uid());
create policy safety_reports_read on public.safety_reports for select using (reporter_id = auth.uid() or private.is_staff());
create policy campus_contacts_read on public.campus_contacts for select using (active);
create policy withdrawal_requests_own_read on public.withdrawal_requests for select using (user_id = auth.uid() or private.is_staff());

revoke all on public.subscription_plans, public.subscriptions, public.emergency_contacts, public.safety_settings,
  public.safety_reports, public.withdrawal_requests, public.campus_contacts from anon, authenticated;
grant select on public.subscription_plans to anon, authenticated;
grant select on public.campus_contacts to authenticated;
grant select on public.subscriptions, public.emergency_contacts, public.safety_settings, public.safety_reports,
  public.withdrawal_requests to authenticated;
grant all on public.subscription_plans, public.subscriptions, public.emergency_contacts, public.safety_settings,
  public.safety_reports, public.withdrawal_requests, public.campus_contacts to service_role;

revoke execute on function
  public.subscribe_plan(text), public.cancel_subscription(text), public.resume_subscription(text),
  public.renew_subscriptions(), public.add_emergency_contact(text, text, text), public.remove_emergency_contact(uuid),
  public.set_campus_security_number(text), public.submit_safety_report(text, text),
  public.request_card_withdrawal(bigint, uuid, text), public.settle_withdrawal(uuid, boolean)
  from public, anon, authenticated;
grant execute on function
  public.subscribe_plan(text), public.cancel_subscription(text), public.resume_subscription(text),
  public.add_emergency_contact(text, text, text), public.remove_emergency_contact(uuid),
  public.set_campus_security_number(text), public.submit_safety_report(text, text),
  public.request_card_withdrawal(bigint, uuid, text)
  to authenticated;
-- trusted only
grant execute on function public.renew_subscriptions(), public.settle_withdrawal(uuid, boolean) to service_role;
grant execute on all functions in schema public to service_role;
