-- Commerce: cart, addresses, vouchers, orders (buyer level), seller orders (fulfilment and settlement
-- units), order items, bookings, couriers, delivery jobs, packages and custody.
-- One buyer payment produces one seller_order per seller; each has independent state (plan.md 6.3).

create type public.fulfilment_method as enum ('campus_handoff', 'vossie_delivery');
create type public.order_status as enum ('pending_payment', 'paid', 'cancelled', 'expired', 'payment_failed');
create type public.seller_order_status as enum
  ('awaiting_payment', 'awaiting_seller', 'accepted', 'preparing', 'ready', 'in_fulfilment', 'delivered',
   'issue_window', 'completed', 'rejected', 'timed_out', 'cancelled', 'disputed', 'refunded');
create type public.booking_status as enum
  ('held', 'booked', 'in_progress', 'provider_complete', 'completed', 'cancelled', 'expired',
   'no_show_review', 'disputed');
create type public.delivery_status as enum
  ('pending_assignment', 'assigned', 'picked_up', 'in_transit', 'arrived', 'delivered', 'exception', 'cancelled');
create type public.payout_state as enum ('none', 'held', 'available', 'requested', 'paid_out');

create sequence public.order_number_seq start 5001;

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null default 'Campus',
  line1 text not null check (length(btrim(line1)) >= 5),
  campus_id text references public.campuses (id),
  instructions text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index addresses_one_default on public.addresses (user_id) where is_default;

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  option_id uuid not null references public.listing_options (id) on delete cascade,
  slot_id uuid references public.service_slots (id) on delete cascade,
  quantity int not null default 1 check (quantity between 1 and 20),
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, option_id, slot_id)
);
create index cart_items_user_idx on public.cart_items (user_id);

create table public.vouchers (
  code text primary key check (code = upper(code)),
  description text not null default '',
  percent_off int check (percent_off between 1 and 100),
  cents_off bigint check (cents_off > 0),
  min_subtotal_cents bigint not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses int,
  used_count int not null default 0,
  active boolean not null default true,
  check ((percent_off is null) <> (cents_off is null))
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('#' || nextval('public.order_number_seq')),
  buyer_id uuid not null references public.profiles (id),
  status public.order_status not null default 'pending_payment',
  fulfilment public.fulfilment_method not null,
  delivery_address text,
  delivery_campus_id text references public.campuses (id),
  delivery_instructions text not null default '',
  voucher_code text references public.vouchers (code),
  subtotal_cents bigint not null default 0,
  delivery_fee_cents bigint not null default 0,
  discount_cents bigint not null default 0,
  total_cents bigint not null default 0,
  payment_method public.payment_method not null,
  idempotency_key text not null,
  expires_at timestamptz not null,
  paid_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_id, idempotency_key)
);
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_expiry_idx on public.orders (expires_at) where status = 'pending_payment';
create trigger orders_touch before update on public.orders
  for each row execute function private.touch_updated_at();

create table public.seller_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  number text not null,
  seller_id uuid not null references public.sellers (id),
  seller_user_id uuid not null references public.profiles (id),
  buyer_id uuid not null references public.profiles (id),
  campus_id text not null references public.campuses (id),
  status public.seller_order_status not null default 'awaiting_payment',
  fulfilment public.fulfilment_method not null,
  has_goods boolean not null,
  subtotal_cents bigint not null,
  delivery_fee_cents bigint not null default 0,
  discount_cents bigint not null default 0,
  total_cents bigint not null,
  fee_cents bigint not null default 0,
  fee_policy_id uuid references public.fee_policies (id),
  refunded_cents bigint not null default 0,
  payout_state public.payout_state not null default 'none',
  accept_by timestamptz,
  accepted_at timestamptz,
  delivered_at timestamptz,
  issue_window_ends_at timestamptz,
  completed_at timestamptz,
  seller_note text,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, seller_id),
  check (refunded_cents <= subtotal_cents + delivery_fee_cents)
);
create index seller_orders_buyer_idx on public.seller_orders (buyer_id, created_at desc);
create index seller_orders_seller_idx on public.seller_orders (seller_user_id, status);
create index seller_orders_accept_idx on public.seller_orders (accept_by) where status = 'awaiting_seller';
create index seller_orders_window_idx on public.seller_orders (issue_window_ends_at) where status = 'issue_window';
create trigger seller_orders_touch before update on public.seller_orders
  for each row execute function private.touch_updated_at();

-- Immutable price, fee, seller and listing snapshots (plan.md 9.2).
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  seller_order_id uuid not null references public.seller_orders (id),
  listing_id uuid not null references public.listings (id),
  option_id uuid not null references public.listing_options (id),
  slot_id uuid references public.service_slots (id),
  type public.listing_type not null,
  title text not null,
  option_label text not null,
  unit_price_cents bigint not null,
  quantity int not null check (quantity > 0),
  line_total_cents bigint not null,
  fee_bps int not null default 0,
  stock_committed boolean not null default false
);
create index order_items_so_idx on public.order_items (seller_order_id);
create trigger order_items_no_edit before update of unit_price_cents, quantity, line_total_cents, title, fee_bps
  on public.order_items for each row execute function private.forbid_change();

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.order_items (id),
  seller_order_id uuid not null references public.seller_orders (id),
  buyer_id uuid not null references public.profiles (id),
  seller_id uuid not null references public.sellers (id),
  listing_id uuid not null references public.listings (id),
  slot_id uuid not null references public.service_slots (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  cancel_cutoff_at timestamptz not null,
  status public.booking_status not null default 'held',
  hold_expires_at timestamptz,
  provider_completed_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_buyer_idx on public.bookings (buyer_id, starts_at);
create index bookings_seller_idx on public.bookings (seller_id, starts_at);
create trigger bookings_touch before update on public.bookings
  for each row execute function private.touch_updated_at();

create table public.order_events (
  id bigint generated always as identity primary key,
  seller_order_id uuid not null references public.seller_orders (id),
  actor_id uuid,
  from_status public.seller_order_status,
  to_status public.seller_order_status not null,
  note text,
  created_at timestamptz not null default now()
);
create index order_events_so_idx on public.order_events (seller_order_id, id);
create trigger order_events_immutable before update or delete on public.order_events
  for each row execute function private.forbid_change();

-- ---------------------------------------------------------------------------
-- Couriers, delivery jobs, packages, custody, handoff codes
-- ---------------------------------------------------------------------------
create table public.courier_profiles (
  user_id uuid primary key references public.profiles (id),
  full_name text not null,
  phone text not null,
  vehicle text not null default 'on_foot' check (vehicle in ('on_foot', 'bicycle', 'scooter', 'car')),
  campus_ids text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'suspended')),
  online boolean not null default false,
  rating_avg numeric(3, 2) not null default 0,
  deliveries_count int not null default 0,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  seller_order_id uuid not null unique references public.seller_orders (id),
  campus_id text not null references public.campuses (id),
  courier_id uuid references public.courier_profiles (user_id),
  status public.delivery_status not null default 'pending_assignment',
  pickup_text text not null,
  dropoff_text text not null,
  fee_cents bigint not null default 0,
  courier_fee_cents bigint not null default 0,
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index delivery_jobs_pool_idx on public.delivery_jobs (campus_id) where status = 'pending_assignment';
create index delivery_jobs_courier_idx on public.delivery_jobs (courier_id, status);
create trigger delivery_jobs_touch before update on public.delivery_jobs
  for each row execute function private.touch_updated_at();

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  seller_order_id uuid not null unique references public.seller_orders (id),
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  description text not null default '',
  weight_grams int,
  created_at timestamptz not null default now()
);

-- One-time codes, stored only as salted hashes. Participants rotate-and-reveal; couriers submit.
create table public.handoff_challenges (
  id uuid primary key default gen_random_uuid(),
  seller_order_id uuid not null references public.seller_orders (id),
  kind text not null check (kind in ('pickup', 'dropoff', 'campus_handoff')),
  code_hash text not null,
  salt text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index handoff_challenges_so_idx on public.handoff_challenges (seller_order_id, kind, created_at desc);

create table public.custody_events (
  id bigint generated always as identity primary key,
  seller_order_id uuid not null references public.seller_orders (id),
  delivery_job_id uuid references public.delivery_jobs (id),
  actor_id uuid not null,
  actor_role text not null check (actor_role in ('seller', 'courier', 'buyer', 'staff', 'system')),
  event text not null,
  location_text text,
  lat numeric(9, 6),
  lng numeric(9, 6),
  evidence_path text,
  note text,
  created_at timestamptz not null default now()
);
create index custody_events_so_idx on public.custody_events (seller_order_id, id);
create trigger custody_events_immutable before update or delete on public.custody_events
  for each row execute function private.forbid_change();

create table public.delivery_exceptions (
  id uuid primary key default gen_random_uuid(),
  delivery_job_id uuid not null references public.delivery_jobs (id),
  reported_by uuid not null references public.profiles (id),
  kind text not null check (kind in ('buyer_unavailable', 'seller_not_ready', 'item_damaged', 'wrong_address', 'safety', 'other')),
  notes text not null default '',
  evidence_path text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

-- Carrier adapters (PAXI, The Courier Guy, Aramex) record bookings here once a contract is proven.
create table public.carrier_bookings (
  id uuid primary key default gen_random_uuid(),
  seller_order_id uuid not null references public.seller_orders (id),
  carrier text not null,
  external_ref text,
  status text not null default 'quoted',
  quote_cents bigint,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (carrier, external_ref)
);

-- ---------------------------------------------------------------------------
-- Reviews (buyer, after completion)
-- ---------------------------------------------------------------------------
create function public.leave_review(p_seller_order_id uuid, p_listing_id uuid, p_rating int, p_body text default '')
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  so public.seller_orders;
begin
  select * into so from public.seller_orders where id = p_seller_order_id;
  if not found or so.buyer_id <> v_user or so.status <> 'completed' then
    raise exception 'review_not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.order_items where seller_order_id = so.id and listing_id = p_listing_id) then
    raise exception 'review_not_allowed' using errcode = '42501';
  end if;
  insert into public.reviews (listing_id, seller_id, buyer_id, seller_order_id, rating, body)
  values (p_listing_id, so.seller_id, v_user, so.id, p_rating, left(coalesce(p_body, ''), 1000));
end $$;

-- ---------------------------------------------------------------------------
-- Cart RPCs (direct table writes are not granted)
-- ---------------------------------------------------------------------------
create function public.cart_add(p_option_id uuid, p_quantity int default 1, p_slot_id uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_listing public.listings;
  v_id uuid;
begin
  select l.* into v_listing from public.listing_options o join public.listings l on l.id = o.listing_id
   where o.id = p_option_id and o.active and l.status = 'published';
  if not found then raise exception 'listing_unavailable' using errcode = 'P0002'; end if;
  if v_listing.type = 'service' and (p_slot_id is null or not exists (
       select 1 from public.service_slots where id = p_slot_id and listing_id = v_listing.id and not cancelled and starts_at > now())) then
    raise exception 'slot_required' using errcode = '22023';
  end if;
  if v_listing.type = 'goods' then p_slot_id := null; end if;
  insert into public.cart_items (user_id, listing_id, option_id, slot_id, quantity)
  values (v_user, v_listing.id, p_option_id, p_slot_id, least(20, greatest(1, p_quantity)))
  on conflict (user_id, option_id, slot_id) do update set quantity = least(20, public.cart_items.quantity + excluded.quantity)
  returning id into v_id;
  return v_id;
end $$;

create function public.cart_set_quantity(p_item_id uuid, p_quantity int) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_user();
begin
  if p_quantity <= 0 then
    delete from public.cart_items where id = p_item_id and user_id = v_user;
  else
    update public.cart_items set quantity = least(20, p_quantity) where id = p_item_id and user_id = v_user;
  end if;
end $$;

create function public.cart_clear() returns void
language sql security definer set search_path = public as $$
  delete from public.cart_items where user_id = private.require_user()
$$;

create function public.toggle_favourite(p_listing_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_user();
begin
  delete from public.favourites where user_id = v_user and listing_id = p_listing_id;
  if found then return false; end if;
  insert into public.favourites (user_id, listing_id) values (v_user, p_listing_id);
  return true;
end $$;

create function public.toggle_follow(p_seller_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_user();
begin
  delete from public.follows where user_id = v_user and seller_id = p_seller_id;
  if found then return false; end if;
  insert into public.follows (user_id, seller_id) values (v_user, p_seller_id);
  return true;
end $$;

create function public.toggle_reel_like(p_reel_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_user();
begin
  delete from public.reel_likes where user_id = v_user and reel_id = p_reel_id;
  if found then return false; end if;
  insert into public.reel_likes (reel_id, user_id) values (p_reel_id, v_user);
  return true;
end $$;

-- Late foreign keys (money tables are created before orders).
alter table public.payment_intents
  add constraint payment_intents_order_fk foreign key (order_id) references public.orders (id);
alter table public.refunds
  add constraint refunds_seller_order_fk foreign key (seller_order_id) references public.seller_orders (id);
alter table public.reviews
  add constraint reviews_seller_order_fk foreign key (seller_order_id) references public.seller_orders (id);
