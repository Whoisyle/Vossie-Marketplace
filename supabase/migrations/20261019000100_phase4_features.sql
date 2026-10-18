-- Phase 4 features: courier ratings and tips, Vossie Points, referrals, the voucher wallet, order for later,
-- safe meet-up spots, shared order tracking, price and stock alerts, verified sellers and reorder.
-- Every new table has RLS on and a read policy only; writes go through the functions below. Money moves
-- through the same ledger as everything else (private.post_journal / private.wallet_move).
--
-- Demo-phase notes (see docs/architecture/backend.md):
--  * a tip is paid from the buyer's wallet; tips on card payments wait for the payment provider
--  * points are earned when a seller order is completed (after the issue window), so a refunded order
--    does not keep its points

-- ---------------------------------------------------------------------------
-- Courier ratings and tips
-- ---------------------------------------------------------------------------
create table public.courier_ratings (
  id uuid primary key default gen_random_uuid(),
  delivery_job_id uuid not null unique references public.delivery_jobs (id),
  seller_order_id uuid not null references public.seller_orders (id),
  buyer_id uuid not null references public.profiles (id),
  courier_id uuid not null references public.courier_profiles (user_id),
  rating int not null check (rating between 1 and 5),
  tip_cents bigint not null default 0 check (tip_cents between 0 and 50000),
  created_at timestamptz not null default now()
);
create index courier_ratings_courier_idx on public.courier_ratings (courier_id);
create trigger courier_ratings_immutable before update or delete on public.courier_ratings
  for each row execute function private.forbid_change();

create function public.rate_courier(p_job_id uuid, p_rating int, p_tip_cents bigint default 0) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  j public.delivery_jobs;
  so public.seller_orders;
  v_id uuid := gen_random_uuid();
  v_balance bigint;
begin
  if p_rating not between 1 and 5 then raise exception 'invalid_rating' using errcode = '22023'; end if;
  if p_tip_cents < 0 or p_tip_cents > 50000 then raise exception 'invalid_tip' using errcode = '22023'; end if;
  select * into j from public.delivery_jobs where id = p_job_id;
  if not found then raise exception 'not_found' using errcode = '42704'; end if;
  select * into so from public.seller_orders where id = j.seller_order_id;
  if so.buyer_id <> v_user then raise exception 'forbidden' using errcode = '42501'; end if;
  if j.status <> 'delivered' or j.courier_id is null then raise exception 'not_delivered' using errcode = '55000'; end if;
  if exists (select 1 from public.courier_ratings where delivery_job_id = j.id) then
    raise exception 'already_rated' using errcode = '23505';
  end if;

  insert into public.courier_ratings (id, delivery_job_id, seller_order_id, buyer_id, courier_id, rating, tip_cents)
  values (v_id, j.id, so.id, v_user, j.courier_id, p_rating, p_tip_cents);

  if p_tip_cents > 0 then
    perform private.ensure_wallet(v_user);
    select balance_cents into v_balance from public.wallets where user_id = v_user for update;
    if v_balance < p_tip_cents then raise exception 'insufficient_funds' using errcode = '23514'; end if;
    update public.wallets set balance_cents = balance_cents - p_tip_cents, updated_at = now()
     where user_id = v_user returning balance_cents into v_balance;
    insert into public.wallet_transactions (user_id, amount_cents, balance_after_cents, kind, label, ref_type, ref_id)
    values (v_user, -p_tip_cents, v_balance, 'purchase', 'Courier tip', 'courier_tip', v_id);
    perform private.post_journal('courier_tip', v_id, 'Courier tip',
      jsonb_build_array(jsonb_build_object('account', 'wallet', 'owner', v_user, 'debit', p_tip_cents),
                        jsonb_build_object('account', 'courier_payable', 'owner', j.courier_id, 'credit', p_tip_cents)),
      'tip:' || v_id);
    insert into public.notifications (user_id, kind, title, body)
    values (j.courier_id, 'tip', 'You got a tip', 'A student tipped you for a delivery.');
  end if;

  update public.courier_profiles
     set rating_avg = (select round(avg(rating)::numeric, 2) from public.courier_ratings where courier_id = j.courier_id)
   where user_id = j.courier_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Vossie Points: 1 point per R10 of a completed order, 10 points = R1, redeemed in steps of 100
-- ---------------------------------------------------------------------------
create table public.points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  points int not null check (points <> 0),
  kind text not null check (kind in ('order', 'redeem', 'bonus', 'referral')),
  label text not null default '',
  ref_type text,
  ref_id uuid,
  created_at timestamptz not null default now(),
  unique (kind, ref_id)
);
create index points_ledger_user_idx on public.points_ledger (user_id, created_at desc);
create trigger points_ledger_immutable before update or delete on public.points_ledger
  for each row execute function private.forbid_change();

create function private.points_of(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(points), 0)::int from public.points_ledger where user_id = p_user
$$;

create function private.award_order_points() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_points int;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    v_points := floor(greatest(0, new.total_cents - new.refunded_cents) / 1000.0)::int;
    if v_points > 0 then
      insert into public.points_ledger (user_id, points, kind, label, ref_type, ref_id)
      values (new.buyer_id, v_points, 'order', 'Order ' || new.number || ' completed', 'seller_order', new.id)
      on conflict (kind, ref_id) do nothing;
    end if;
  end if;
  return null;
end $$;
create trigger seller_orders_award_points after update of status on public.seller_orders
  for each row execute function private.award_order_points();

create function public.my_points() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_points int := private.points_of(v_user);
begin
  return jsonb_build_object(
    'points', v_points,
    'value_cents', (v_points / 10) * 100,
    'tier', case when v_points >= 1500 then 'gold' when v_points >= 500 then 'silver' else 'bronze' end);
end $$;

create function public.redeem_points(p_points int, p_idempotency_key text) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_id uuid := gen_random_uuid();
  v_cents bigint;
begin
  if p_points < 100 or p_points % 100 <> 0 then raise exception 'invalid_points' using errcode = '22023'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then raise exception 'idempotency_key_required' using errcode = '22023'; end if;
  -- one redemption at a time per student, and a retry with the same key does nothing twice
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  if exists (select 1 from public.points_ledger where kind = 'redeem' and ref_id = uuid_in(md5(v_user::text || p_idempotency_key)::cstring)) then
    return (select balance_cents from public.wallets where user_id = v_user);
  end if;
  if private.points_of(v_user) < p_points then raise exception 'insufficient_points' using errcode = '23514'; end if;
  v_cents := (p_points / 10) * 100;
  insert into public.points_ledger (user_id, points, kind, label, ref_type, ref_id)
  values (v_user, -p_points, 'redeem', 'Redeemed for wallet credit', 'points_redeem', uuid_in(md5(v_user::text || p_idempotency_key)::cstring));
  return private.wallet_move(v_user, v_cents, 'adjustment', p_points || ' points redeemed', 'promotions_expense',
                             'points_redeem', v_id, 'points:' || v_user || ':' || p_idempotency_key);
end $$;

-- ---------------------------------------------------------------------------
-- Referrals: both sides get wallet credit after the friend's first paid order
-- ---------------------------------------------------------------------------
create table public.referral_codes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z]{4}-[0-9]{4}$'),
  created_at timestamptz not null default now()
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id),
  referred_id uuid not null unique references public.profiles (id),
  code text not null,
  status text not null default 'joined' check (status in ('joined', 'ordered', 'rewarded')),
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  check (referrer_id <> referred_id)
);
create index referrals_referrer_idx on public.referrals (referrer_id);

create function public.my_referral_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_code text;
  v_prefix text;
begin
  select code into v_code from public.referral_codes where user_id = v_user;
  if found then return v_code; end if;
  select rpad(upper(left(regexp_replace(coalesce(nullif(display_name, ''), 'XXXX'), '[^A-Za-z]', '', 'g'), 4)), 4, 'X')
    into v_prefix from public.profiles where id = v_user;
  loop
    v_code := v_prefix || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    begin
      insert into public.referral_codes (user_id, code) values (v_user, v_code);
      return v_code;
    exception when unique_violation then
      if exists (select 1 from public.referral_codes where user_id = v_user) then
        return (select code from public.referral_codes where user_id = v_user);
      end if;
    end;
  end loop;
end $$;

create function public.apply_referral_code(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_owner uuid;
  v_code text := upper(btrim(p_code));
begin
  select user_id into v_owner from public.referral_codes where code = v_code;
  if not found then raise exception 'invalid_code' using errcode = '22023'; end if;
  if v_owner = v_user then raise exception 'own_code' using errcode = '22023'; end if;
  if exists (select 1 from public.orders where buyer_id = v_user and status = 'paid') then
    raise exception 'already_ordered' using errcode = '55000';
  end if;
  insert into public.referrals (referrer_id, referred_id, code) values (v_owner, v_user, v_code);
exception when unique_violation then
  raise exception 'already_referred' using errcode = '23505';
end $$;

create function private.reward_referral() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r public.referrals;
  v_cents bigint := coalesce((private.setting('referral_reward_cents') #>> '{}')::bigint, 3000);
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    select * into r from public.referrals where referred_id = new.buyer_id and status <> 'rewarded' for update;
    if found
       and not exists (select 1 from public.orders where buyer_id = new.buyer_id and status = 'paid' and id <> new.id) then
      perform private.wallet_move(r.referred_id, v_cents, 'adjustment', 'Referral credit', 'promotions_expense',
                                  'referral', r.id, 'referral:' || r.id || ':referred');
      perform private.wallet_move(r.referrer_id, v_cents, 'adjustment', 'Referral credit', 'promotions_expense',
                                  'referral', r.id, 'referral:' || r.id || ':referrer');
      update public.referrals set status = 'rewarded', rewarded_at = now() where id = r.id;
      insert into public.notifications (user_id, kind, title, body)
      values (r.referrer_id, 'referral', 'Referral credit added', 'A friend placed their first order. Your credit is in your wallet.'),
             (r.referred_id, 'referral', 'Referral credit added', 'Your credit for joining with a friend''s code is in your wallet.');
    end if;
  end if;
  return null;
end $$;
create trigger orders_reward_referral after update of status on public.orders
  for each row execute function private.reward_referral();

-- ---------------------------------------------------------------------------
-- Voucher wallet: codes granted to a student, with their expiry and minimum spend
-- ---------------------------------------------------------------------------
create table public.user_vouchers (
  user_id uuid not null references public.profiles (id) on delete cascade,
  code text not null references public.vouchers (code),
  granted_at timestamptz not null default now(),
  used_at timestamptz,
  primary key (user_id, code)
);

-- Trusted: staff tools and campaigns grant vouchers; students cannot.
create function public.grant_voucher(p_user uuid, p_code text) returns void
language sql security definer set search_path = public as $$
  insert into public.user_vouchers (user_id, code) values (p_user, upper(p_code)) on conflict do nothing
$$;

create function public.my_vouchers() returns table (
  code text, description text, percent_off int, cents_off bigint, min_subtotal_cents bigint,
  ends_at timestamptz, expired boolean, used boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_user uuid := private.require_user();
begin
  return query
  select v.code, v.description, v.percent_off, v.cents_off, v.min_subtotal_cents, v.ends_at,
         (v.ends_at is not null and v.ends_at < now()) or not v.active or (v.max_uses is not null and v.used_count >= v.max_uses),
         uv.used_at is not null
    from public.user_vouchers uv
    join public.vouchers v on v.code = uv.code
   where uv.user_id = v_user
   order by uv.used_at is not null, ((v.ends_at is not null and v.ends_at < now()) or not v.active), v.ends_at nulls last;
end $$;

-- ---------------------------------------------------------------------------
-- Order for later
-- ---------------------------------------------------------------------------
alter table public.seller_orders
  add column scheduled_for timestamptz,
  add column prep_reminder_sent_at timestamptz;

-- Slots are 45 minutes to 2 days ahead, on the half hour, 08:00 to 20:00 South African time.
create function public.schedule_seller_order(p_seller_order_id uuid, p_when timestamptz) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  so public.seller_orders;
  v_local timestamp := p_when at time zone 'Africa/Johannesburg';
begin
  select * into so from public.seller_orders where id = p_seller_order_id for update;
  if not found or so.buyer_id <> v_user then raise exception 'forbidden' using errcode = '42501'; end if;
  if so.status not in ('awaiting_payment', 'awaiting_seller') then raise exception 'too_late' using errcode = '55000'; end if;
  if p_when < now() + interval '45 minutes' or p_when > now() + interval '2 days' then
    raise exception 'invalid_slot' using errcode = '22023';
  end if;
  if extract(minute from v_local) not in (0, 30) or v_local::time < time '08:00' or v_local::time > time '20:00' then
    raise exception 'invalid_slot' using errcode = '22023';
  end if;
  update public.seller_orders set scheduled_for = p_when, prep_reminder_sent_at = null where id = so.id;
end $$;

-- Trusted (a scheduled job): reminds sellers 30 minutes before the time a student asked for.
create function public.send_prep_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare so record; n int := 0;
begin
  for so in
    select id, seller_user_id, number from public.seller_orders
     where scheduled_for is not null and prep_reminder_sent_at is null
       and scheduled_for <= now() + interval '30 minutes' and scheduled_for > now()
       and status in ('awaiting_seller', 'accepted', 'preparing')
     for update skip locked
  loop
    insert into public.notifications (user_id, kind, title, body, href)
    values (so.seller_user_id, 'prep_reminder', 'Order due soon', 'Order ' || so.number || ' is due in about 30 minutes.', null);
    update public.seller_orders set prep_reminder_sent_at = now() where id = so.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Safe meet-up spots (busy, well-lit places on each campus)
-- ---------------------------------------------------------------------------
create table public.meetup_points (
  id uuid primary key default gen_random_uuid(),
  campus_id text not null references public.campuses (id),
  name text not null,
  detail text not null default '',
  active boolean not null default true,
  sort_order int not null default 0,
  unique (campus_id, name)
);
insert into public.meetup_points (campus_id, name, detail, sort_order)
select c.id, p.name, p.detail, p.sort_order
  from public.campuses c
 cross join (values
   ('Main entrance', 'Main campus gate, security on duty', 1),
   ('Student centre', 'Ground floor, next to the food court', 2),
   ('Library', 'Front desk, open late', 3),
   ('Residence reception', 'Reception desk, staffed', 4),
   ('Sports centre', 'Next to the sports fields', 5)) as p (name, detail, sort_order);

-- ---------------------------------------------------------------------------
-- Shared order tracking: a link anyone can open for 24 hours, showing status only
-- ---------------------------------------------------------------------------
create table public.tracking_shares (
  token text primary key,
  seller_order_id uuid not null references public.seller_orders (id),
  created_by uuid not null references public.profiles (id),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index tracking_shares_so_idx on public.tracking_shares (seller_order_id);

create function public.create_tracking_share(p_seller_order_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if not exists (select 1 from public.seller_orders where id = p_seller_order_id and buyer_id = v_user) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if (select count(*) from public.tracking_shares
       where seller_order_id = p_seller_order_id and revoked_at is null and expires_at > now()) >= 5 then
    raise exception 'too_many_links' using errcode = '55000';
  end if;
  insert into public.tracking_shares (token, seller_order_id, created_by, expires_at)
  values (v_token, p_seller_order_id, v_user, now() + interval '24 hours');
  return v_token;
end $$;

create function public.revoke_tracking_share(p_token text) returns void
language sql security definer set search_path = public as $$
  update public.tracking_shares set revoked_at = now()
   where token = p_token and created_by = auth.uid() and revoked_at is null
$$;

-- Anyone with the link: status, courier first name and vehicle only. Never the address, phone or items.
create function public.shared_tracking(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  t public.tracking_shares;
  so public.seller_orders;
  j public.delivery_jobs;
  v_first text;
  v_vehicle text;
begin
  select * into t from public.tracking_shares where token = p_token and revoked_at is null and expires_at > now();
  if not found then return null; end if;
  select * into so from public.seller_orders where id = t.seller_order_id;
  select * into j from public.delivery_jobs where seller_order_id = so.id;
  if j.courier_id is not null then
    select split_part(full_name, ' ', 1), vehicle into v_first, v_vehicle from public.courier_profiles where user_id = j.courier_id;
  end if;
  return jsonb_build_object('order_number', so.number, 'status', so.status, 'delivery_status', j.status,
                            'courier_first_name', v_first, 'courier_vehicle', v_vehicle, 'expires_at', t.expires_at);
end $$;

-- ---------------------------------------------------------------------------
-- Price-drop and back-in-stock alerts
-- ---------------------------------------------------------------------------
create table public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  kind text not null check (kind in ('price-drop', 'back-in-stock')),
  price_at_set_cents bigint not null,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (user_id, listing_id, kind)
);
create index price_alerts_listing_idx on public.price_alerts (listing_id, kind) where notified_at is null;

-- Returns true when the alert is now on, false when it was switched off.
create function public.toggle_alert(p_listing_id uuid, p_kind text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_price bigint;
begin
  if p_kind not in ('price-drop', 'back-in-stock') then raise exception 'invalid_kind' using errcode = '22023'; end if;
  if not private.listing_is_public(p_listing_id) then raise exception 'not_found' using errcode = '42704'; end if;
  delete from public.price_alerts where user_id = v_user and listing_id = p_listing_id and kind = p_kind;
  if found then return false; end if;
  select min(price_cents) into v_price from public.listing_options where listing_id = p_listing_id and active;
  insert into public.price_alerts (user_id, listing_id, kind, price_at_set_cents) values (v_user, p_listing_id, p_kind, coalesce(v_price, 0));
  return true;
end $$;

create function private.fire_option_alerts() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_was int := case when old.unlimited then 1 else old.on_hand - old.reserved end;
  v_now int := case when new.unlimited then 1 else new.on_hand - new.reserved end;
begin
  select title into v_title from public.listings where id = new.listing_id;
  if new.price_cents < old.price_cents then
    insert into public.notifications (user_id, kind, title, body, href)
    select a.user_id, 'price_drop', 'Price drop', v_title || ' is now cheaper.', '/home/listing/' || new.listing_id
      from public.price_alerts a where a.listing_id = new.listing_id and a.kind = 'price-drop' and a.notified_at is null;
    update public.price_alerts set notified_at = now(), price_at_set_cents = new.price_cents
     where listing_id = new.listing_id and kind = 'price-drop' and notified_at is null;
  end if;
  if v_was <= 0 and v_now > 0 then
    insert into public.notifications (user_id, kind, title, body, href)
    select a.user_id, 'back_in_stock', 'Back in stock', v_title || ' is available again.', '/home/listing/' || new.listing_id
      from public.price_alerts a where a.listing_id = new.listing_id and a.kind = 'back-in-stock' and a.notified_at is null;
    update public.price_alerts set notified_at = now()
     where listing_id = new.listing_id and kind = 'back-in-stock' and notified_at is null;
  end if;
  return null;
end $$;
create trigger listing_options_alerts after update of price_cents, on_hand, reserved, unlimited on public.listing_options
  for each row execute function private.fire_option_alerts();

-- ---------------------------------------------------------------------------
-- Verified sellers and reorder in one tap
-- ---------------------------------------------------------------------------
-- A strong rating over enough reviews on an active seller; staff review can add to this later.
create function public.is_verified_seller(p_seller uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'active' and rating_avg >= 4.7 and rating_count >= 50 from public.sellers where id = p_seller), false)
$$;

-- Puts the available items from one of my past orders back in the cart; returns how many lines were added.
create function public.reorder_to_cart(p_seller_order_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  i record;
  n int := 0;
begin
  if not exists (select 1 from public.seller_orders where id = p_seller_order_id and buyer_id = v_user) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  for i in
    select oi.option_id, oi.quantity
      from public.order_items oi
      join public.listing_options lo on lo.id = oi.option_id and lo.active
     where oi.seller_order_id = p_seller_order_id and oi.slot_id is null
       and private.listing_is_public(oi.listing_id)
       and (lo.unlimited or lo.on_hand - lo.reserved >= oi.quantity)
  loop
    perform public.cart_add(i.option_id, least(i.quantity, 20));
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security, grants and execution rights for everything above
-- ---------------------------------------------------------------------------
alter table public.courier_ratings enable row level security;
alter table public.points_ledger enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.user_vouchers enable row level security;
alter table public.meetup_points enable row level security;
alter table public.tracking_shares enable row level security;
alter table public.price_alerts enable row level security;

create policy courier_ratings_party_read on public.courier_ratings for select
  using (auth.uid() in (buyer_id, courier_id) or private.is_staff());
create policy points_ledger_own_read on public.points_ledger for select using (user_id = auth.uid());
create policy referral_codes_own_read on public.referral_codes for select using (user_id = auth.uid());
create policy referrals_party_read on public.referrals for select using (auth.uid() in (referrer_id, referred_id));
create policy user_vouchers_own_read on public.user_vouchers for select using (user_id = auth.uid());
create policy meetup_points_read on public.meetup_points for select using (active);
create policy tracking_shares_owner_read on public.tracking_shares for select using (created_by = auth.uid());
create policy price_alerts_own_read on public.price_alerts for select using (user_id = auth.uid());

revoke all on public.courier_ratings, public.points_ledger, public.referral_codes, public.referrals,
  public.user_vouchers, public.meetup_points, public.tracking_shares, public.price_alerts from anon, authenticated;
grant select on public.courier_ratings, public.points_ledger, public.referral_codes, public.referrals,
  public.user_vouchers, public.meetup_points, public.tracking_shares, public.price_alerts to authenticated;
grant all on public.courier_ratings, public.points_ledger, public.referral_codes, public.referrals,
  public.user_vouchers, public.meetup_points, public.tracking_shares, public.price_alerts to service_role;

revoke execute on function
  public.rate_courier(uuid, int, bigint), public.my_points(), public.redeem_points(int, text),
  public.my_referral_code(), public.apply_referral_code(text), public.grant_voucher(uuid, text), public.my_vouchers(),
  public.schedule_seller_order(uuid, timestamptz), public.send_prep_reminders(),
  public.create_tracking_share(uuid), public.revoke_tracking_share(text), public.shared_tracking(text),
  public.toggle_alert(uuid, text), public.is_verified_seller(uuid), public.reorder_to_cart(uuid)
  from public, anon, authenticated;
grant execute on function
  public.rate_courier(uuid, int, bigint), public.my_points(), public.redeem_points(int, text),
  public.my_referral_code(), public.apply_referral_code(text), public.my_vouchers(),
  public.schedule_seller_order(uuid, timestamptz), public.create_tracking_share(uuid),
  public.revoke_tracking_share(text), public.toggle_alert(uuid, text), public.reorder_to_cart(uuid)
  to authenticated;
-- readable without signing in: the shared link and the verified badge
grant execute on function public.shared_tracking(text), public.is_verified_seller(uuid) to anon, authenticated;
-- trusted only
grant execute on function public.grant_voucher(uuid, text), public.send_prep_reminders() to service_role;
grant execute on all functions in schema public to service_role;
