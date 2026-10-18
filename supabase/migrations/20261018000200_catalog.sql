-- Catalog: sellers and providers, listings, options, media, service slots, moderation,
-- favourites, follows, reviews and (deferred-in-v1) reels.

create type public.seller_status as enum ('draft', 'pending_review', 'active', 'rejected', 'suspended');
create type public.listing_type as enum ('goods', 'service');
create type public.listing_status as enum
  ('draft', 'checking', 'flagged', 'under_review', 'published', 'paused', 'sold_out', 'archived', 'rejected');
create type public.service_mode as enum ('on_campus', 'remote');

create table public.categories (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null,
  icon text,
  kind public.listing_type not null default 'goods',
  sort_order int not null default 0,
  active boolean not null default true
);

-- Versioned attribute definitions per category (structured seller input).
create table public.category_attributes (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.categories (id),
  key text not null,
  label text not null,
  value_type text not null check (value_type in ('text', 'number', 'choice', 'boolean')),
  choices text[],
  required boolean not null default false,
  version int not null default 1,
  unique (category_id, key, version)
);

-- One seller entity covers goods sellers and service providers.
create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id),
  display_name text not null check (length(btrim(display_name)) >= 2),
  bio text not null default '',
  location_text text not null default '',
  campus_id text not null references public.campuses (id),
  sells_goods boolean not null default true,
  provides_services boolean not null default false,
  status public.seller_status not null default 'draft',
  review_note text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  rating_avg numeric(3, 2) not null default 0,
  rating_count int not null default 0,
  follower_count int not null default 0,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sells_goods or provides_services)
);
create index sellers_campus_idx on public.sellers (campus_id) where status = 'active';
create trigger sellers_touch before update on public.sellers
  for each row execute function private.touch_updated_at();

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id),
  type public.listing_type not null,
  category_id text not null references public.categories (id),
  campus_id text not null references public.campuses (id),
  title text not null check (length(btrim(title)) between 3 and 120),
  description text not null default '',
  base_price_cents bigint not null check (base_price_cents >= 0),
  status public.listing_status not null default 'draft',
  condition text check (condition in ('new', 'like_new', 'good', 'fair')),
  weight_grams int check (weight_grams > 0),
  handoff_available boolean not null default true,
  delivery_eligible boolean not null default true,
  pickup_note text not null default '',
  open_hours text not null default '',
  prep_minutes_min int check (prep_minutes_min >= 0),
  prep_minutes_max int check (prep_minutes_max >= prep_minutes_min),
  -- services only
  duration_minutes int check (duration_minutes > 0),
  mode public.service_mode,
  cancel_cutoff_hours int not null default 24 check (cancel_cutoff_hours >= 0),
  attributes jsonb not null default '{}',
  rating_avg numeric(3, 2) not null default 0,
  rating_count int not null default 0,
  sold_count int not null default 0,
  review_note text,
  published_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type = 'goods' or (duration_minutes is not null and mode is not null))
);
create index listings_feed_idx on public.listings (campus_id, category_id, published_at desc) where status = 'published';
create index listings_seller_idx on public.listings (seller_id);
create index listings_search_idx on public.listings
  using gin (to_tsvector('simple', title || ' ' || description)) where status = 'published';
create trigger listings_touch before update on public.listings
  for each row execute function private.touch_updated_at();

-- Every listing has at least one option; a plain listing has a single "Standard" option.
create table public.listing_options (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  label text not null,
  price_cents bigint not null check (price_cents >= 0),
  on_hand int not null default 0 check (on_hand >= 0),
  reserved int not null default 0 check (reserved >= 0),
  unlimited boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  check (unlimited or reserved <= on_hand)
);
create index listing_options_listing_idx on public.listing_options (listing_id);

create table public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  alt text not null default '',
  sort_order int not null default 0
);
create index listing_media_listing_idx on public.listing_media (listing_id, sort_order);

-- Bookable slots for services.
create table public.service_slots (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int not null default 1 check (capacity > 0),
  reserved int not null default 0 check (reserved >= 0),
  cancelled boolean not null default false,
  check (ends_at > starts_at),
  check (reserved <= capacity)
);
create index service_slots_listing_idx on public.service_slots (listing_id, starts_at);

-- Automated checks and reports/moderation.
create table public.policy_terms (
  term text primary key,
  severity text not null default 'block' check (severity in ('block', 'review')),
  note text
);

create table public.listing_policy_checks (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  passed boolean not null,
  issues jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create type public.flag_status as enum ('open', 'under_review', 'actioned', 'dismissed');

create table public.listing_flags (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reporter_id uuid references public.profiles (id),
  reason text not null check (length(btrim(reason)) >= 3),
  status public.flag_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id),
  seller_id uuid references public.sellers (id),
  opened_by uuid references public.profiles (id),
  assigned_to uuid references public.profiles (id),
  reason text not null,
  decision text check (decision in ('approved', 'rejected', 'changes_requested', 'suspended', 'dismissed')),
  decision_note text,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (listing_id is not null or seller_id is not null)
);

-- Saved items and follows.
create table public.favourites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, seller_id)
);

create function private.bump_follower_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.sellers set follower_count = follower_count + 1 where id = new.seller_id;
  else
    update public.sellers set follower_count = greatest(0, follower_count - 1) where id = old.seller_id;
  end if;
  return null;
end $$;
create trigger follows_count after insert or delete on public.follows
  for each row execute function private.bump_follower_count();

-- Reviews are written by RPC after an order completes (see commerce migration).
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id),
  seller_id uuid not null references public.sellers (id),
  buyer_id uuid not null references public.profiles (id),
  seller_order_id uuid not null,
  rating int not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default now(),
  unique (seller_order_id, listing_id)
);

create function private.apply_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.listings l set
    rating_count = s.c, rating_avg = s.a
  from (select count(*) c, round(avg(rating)::numeric, 2) a from public.reviews where listing_id = new.listing_id) s
  where l.id = new.listing_id;
  update public.sellers l set
    rating_count = s.c, rating_avg = s.a
  from (select count(*) c, round(avg(rating)::numeric, 2) a from public.reviews where seller_id = new.seller_id) s
  where l.id = new.seller_id;
  return null;
end $$;
create trigger reviews_apply after insert on public.reviews
  for each row execute function private.apply_review();

-- Short video feed (deferred from v1 per plan.md; the app screen already exists).
create table public.reels (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id),
  listing_id uuid references public.listings (id),
  caption text not null default '',
  video_path text,
  tint text,
  published boolean not null default false,
  like_count int not null default 0,
  created_at timestamptz not null default now()
);
create table public.reel_likes (
  reel_id uuid not null references public.reels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (reel_id, user_id)
);
create table public.reel_comments (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create function private.bump_reel_likes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.reels set like_count = like_count + 1 where id = new.reel_id;
  else
    update public.reels set like_count = greatest(0, like_count - 1) where id = old.reel_id;
  end if;
  return null;
end $$;
create trigger reel_likes_count after insert or delete on public.reel_likes
  for each row execute function private.bump_reel_likes();

-- ---------------------------------------------------------------------------
-- Seller and provider onboarding
-- ---------------------------------------------------------------------------
create function public.submit_seller_profile(p_display_name text, p_bio text, p_location_text text,
                                             p_campus_id text, p_sells_goods boolean default true,
                                             p_provides_services boolean default false) returns public.sellers
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_row public.sellers;
begin
  if not exists (select 1 from public.profiles where id = v_user and deleted_at is null) then
    raise exception 'profile_missing' using errcode = '42501';
  end if;
  insert into public.sellers (user_id, display_name, bio, location_text, campus_id, sells_goods, provides_services, status)
  values (v_user, p_display_name, coalesce(p_bio, ''), coalesce(p_location_text, ''), p_campus_id,
          p_sells_goods, p_provides_services, 'pending_review')
  on conflict (user_id) do update set
    display_name = excluded.display_name, bio = excluded.bio, location_text = excluded.location_text,
    campus_id = excluded.campus_id, sells_goods = excluded.sells_goods,
    provides_services = excluded.provides_services,
    -- an approved seller editing their profile does not lose access; rejected sellers resubmit
    status = case when public.sellers.status in ('active', 'suspended') then public.sellers.status
                  else 'pending_review' end
  returning * into v_row;
  insert into public.memberships (user_id, role, campus_id, state)
  values (v_user, 'seller', p_campus_id, case when v_row.status = 'active' then 'active'::public.membership_state else 'pending' end)
  on conflict (user_id, role, campus_id) do nothing;
  perform private.audit('seller.profile_submitted', 'seller', v_row.id::text);
  return v_row;
end $$;

create function public.review_seller(p_seller_id uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_staff uuid;
  v_seller public.sellers;
begin
  select * into v_seller from public.sellers where id = p_seller_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  v_staff := private.require_staff(v_seller.campus_id);
  if p_decision not in ('approved', 'rejected', 'suspended') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  update public.sellers set
    status = case p_decision when 'approved' then 'active'::public.seller_status
                             when 'rejected' then 'rejected' else 'suspended' end,
    review_note = p_note, reviewed_by = v_staff, reviewed_at = now()
  where id = p_seller_id;
  update public.memberships set
    state = case p_decision when 'approved' then 'active'::public.membership_state
                            when 'rejected' then 'revoked' else 'suspended' end,
    granted_by = v_staff
  where user_id = v_seller.user_id and role = 'seller';
  if p_decision <> 'approved' then
    update public.listings set status = 'paused' where seller_id = p_seller_id and status = 'published';
  end if;
  insert into public.moderation_cases (seller_id, opened_by, reason, decision, decision_note, decided_by, decided_at)
  values (p_seller_id, v_seller.user_id, 'seller review', p_decision, p_note, v_staff, now());
  perform private.audit('seller.reviewed', 'seller', p_seller_id::text, jsonb_build_object('decision', p_decision));
end $$;

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------
create function private.own_seller(p_require_active boolean default false) returns public.sellers
language plpgsql stable security definer set search_path = public as $$
declare v public.sellers;
begin
  select * into v from public.sellers where user_id = private.require_user();
  if not found then raise exception 'not_a_seller' using errcode = '42501'; end if;
  if p_require_active and v.status <> 'active' then
    raise exception 'seller_not_active' using errcode = '42501';
  end if;
  return v;
end $$;

-- Create or edit a draft or paused listing. Options and media are replaced as a set.
-- p_options: [{id?, label, price_cents, on_hand, unlimited?}]; p_media: [{storage_path, alt?}]
create function public.upsert_listing(p_listing jsonb, p_options jsonb, p_media jsonb default '[]') returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_seller public.sellers := private.own_seller(false);
  v_id uuid := nullif(p_listing ->> 'id', '')::uuid;
  v_existing public.listings;
  v_opt jsonb;
  v_i int := 0;
begin
  if v_id is not null then
    select * into v_existing from public.listings where id = v_id for update;
    if not found or v_existing.seller_id <> v_seller.id then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    if v_existing.status in ('checking', 'under_review') then
      raise exception 'listing_in_review' using errcode = '55000';
    end if;
  end if;
  if jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) = 0 then
    raise exception 'options_required' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.listings (seller_id, type, category_id, campus_id, title, description, base_price_cents,
        condition, weight_grams, handoff_available, delivery_eligible, pickup_note, open_hours,
        prep_minutes_min, prep_minutes_max, duration_minutes, mode, cancel_cutoff_hours, attributes)
    values (v_seller.id, (p_listing ->> 'type')::public.listing_type, p_listing ->> 'category_id',
        coalesce(p_listing ->> 'campus_id', v_seller.campus_id), p_listing ->> 'title',
        coalesce(p_listing ->> 'description', ''), (p_options -> 0 ->> 'price_cents')::bigint,
        p_listing ->> 'condition', nullif(p_listing ->> 'weight_grams', '')::int,
        coalesce((p_listing ->> 'handoff_available')::boolean, true),
        coalesce((p_listing ->> 'delivery_eligible')::boolean, true),
        coalesce(p_listing ->> 'pickup_note', ''), coalesce(p_listing ->> 'open_hours', ''),
        nullif(p_listing ->> 'prep_minutes_min', '')::int, nullif(p_listing ->> 'prep_minutes_max', '')::int,
        nullif(p_listing ->> 'duration_minutes', '')::int, (p_listing ->> 'mode')::public.service_mode,
        coalesce((p_listing ->> 'cancel_cutoff_hours')::int, 24), coalesce(p_listing -> 'attributes', '{}'))
    returning id into v_id;
  else
    update public.listings set
      category_id = coalesce(p_listing ->> 'category_id', category_id),
      campus_id = coalesce(p_listing ->> 'campus_id', campus_id),
      title = coalesce(p_listing ->> 'title', title),
      description = coalesce(p_listing ->> 'description', description),
      base_price_cents = (p_options -> 0 ->> 'price_cents')::bigint,
      condition = coalesce(p_listing ->> 'condition', condition),
      weight_grams = coalesce(nullif(p_listing ->> 'weight_grams', '')::int, weight_grams),
      handoff_available = coalesce((p_listing ->> 'handoff_available')::boolean, handoff_available),
      delivery_eligible = coalesce((p_listing ->> 'delivery_eligible')::boolean, delivery_eligible),
      pickup_note = coalesce(p_listing ->> 'pickup_note', pickup_note),
      open_hours = coalesce(p_listing ->> 'open_hours', open_hours),
      prep_minutes_min = coalesce(nullif(p_listing ->> 'prep_minutes_min', '')::int, prep_minutes_min),
      prep_minutes_max = coalesce(nullif(p_listing ->> 'prep_minutes_max', '')::int, prep_minutes_max),
      duration_minutes = coalesce(nullif(p_listing ->> 'duration_minutes', '')::int, duration_minutes),
      mode = coalesce((p_listing ->> 'mode')::public.service_mode, mode),
      cancel_cutoff_hours = coalesce((p_listing ->> 'cancel_cutoff_hours')::int, cancel_cutoff_hours),
      attributes = coalesce(p_listing -> 'attributes', attributes),
      -- a material edit to a published listing takes it back through checks
      status = case when status = 'published' then 'draft'::public.listing_status else status end
    where id = v_id;
  end if;

  -- options: keep ids that are sent, deactivate the rest (they may be referenced by orders)
  update public.listing_options set active = false
   where listing_id = v_id
     and id not in (select (o ->> 'id')::uuid from jsonb_array_elements(p_options) o where o ->> 'id' is not null);
  for v_opt in select * from jsonb_array_elements(p_options) loop
    if v_opt ->> 'id' is not null then
      update public.listing_options set
        label = v_opt ->> 'label', price_cents = (v_opt ->> 'price_cents')::bigint,
        on_hand = coalesce((v_opt ->> 'on_hand')::int, on_hand),
        unlimited = coalesce((v_opt ->> 'unlimited')::boolean, unlimited),
        active = true, sort_order = v_i
      where id = (v_opt ->> 'id')::uuid and listing_id = v_id;
    else
      insert into public.listing_options (listing_id, label, price_cents, on_hand, unlimited, sort_order)
      values (v_id, coalesce(v_opt ->> 'label', 'Standard'), (v_opt ->> 'price_cents')::bigint,
              coalesce((v_opt ->> 'on_hand')::int, 0), coalesce((v_opt ->> 'unlimited')::boolean, false), v_i);
    end if;
    v_i := v_i + 1;
  end loop;

  if jsonb_typeof(p_media) = 'array' then
    delete from public.listing_media where listing_id = v_id;
    insert into public.listing_media (listing_id, storage_path, alt, sort_order)
    select v_id, m ->> 'storage_path', coalesce(m ->> 'alt', ''), ord - 1
      from jsonb_array_elements(p_media) with ordinality as t(m, ord);
  end if;
  return v_id;
end $$;

-- Automated completeness and policy checks. Returns the list of blocking issues.
create function private.listing_issues(p_listing_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  l public.listings;
  v_issues jsonb := '[]';
  v_text text;
begin
  select * into l from public.listings where id = p_listing_id;
  if not exists (select 1 from public.listing_options where listing_id = l.id and active) then
    v_issues := v_issues || '["no_active_option"]';
  end if;
  if l.type = 'goods' then
    if not exists (select 1 from public.listing_media where listing_id = l.id) then v_issues := v_issues || '["photos_required"]'; end if;
    if l.condition is null then v_issues := v_issues || '["condition_required"]'; end if;
    if l.weight_grams is null then v_issues := v_issues || '["size_or_weight_required"]'; end if;
    if not (l.handoff_available or l.delivery_eligible) then v_issues := v_issues || '["fulfilment_required"]'; end if;
  else
    if l.duration_minutes is null then v_issues := v_issues || '["duration_required"]'; end if;
    if not exists (select 1 from public.service_slots s where s.listing_id = l.id and s.starts_at > now() and not s.cancelled) then
      v_issues := v_issues || '["availability_required"]';
    end if;
  end if;
  if length(btrim(l.description)) < 10 then v_issues := v_issues || '["description_required"]'; end if;
  v_text := lower(l.title || ' ' || l.description);
  if exists (select 1 from public.policy_terms t where t.severity = 'block' and position(t.term in v_text) > 0) then
    v_issues := v_issues || '["prohibited_content"]';
  end if;
  return v_issues;
end $$;

-- Seller submits a draft: checks run, clean listings publish, others wait for staff.
create function public.submit_listing(p_listing_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_seller public.sellers := private.own_seller(true);
  l public.listings;
  v_issues jsonb;
  v_review boolean;
  v_status public.listing_status;
begin
  select * into l from public.listings where id = p_listing_id and seller_id = v_seller.id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if l.status not in ('draft', 'paused', 'rejected') then
    raise exception 'invalid_status' using errcode = '55000';
  end if;
  if (l.type = 'goods' and not v_seller.sells_goods) or (l.type = 'service' and not v_seller.provides_services) then
    raise exception 'seller_not_approved_for_type' using errcode = '42501';
  end if;
  v_issues := private.listing_issues(l.id);
  v_review := exists (select 1 from public.policy_terms t
                      where t.severity = 'review' and position(t.term in lower(l.title || ' ' || l.description)) > 0);
  insert into public.listing_policy_checks (listing_id, passed, issues)
  values (l.id, jsonb_array_length(v_issues) = 0 and not v_review, v_issues);
  if jsonb_array_length(v_issues) > 0 then
    v_status := 'draft';
  elsif v_review then
    v_status := 'under_review';
    insert into public.moderation_cases (listing_id, seller_id, opened_by, reason)
    values (l.id, v_seller.id, v_seller.user_id, 'automated policy check flagged this listing');
  else
    v_status := 'published';
  end if;
  update public.listings set status = v_status, review_note = null,
         published_at = case when v_status = 'published' then coalesce(published_at, now()) end
   where id = l.id;
  return jsonb_build_object('status', v_status, 'issues', v_issues);
end $$;

create function public.set_listing_paused(p_listing_id uuid, p_paused boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_seller public.sellers := private.own_seller(false);
begin
  update public.listings set status = case when p_paused then 'paused'::public.listing_status else 'published' end
   where id = p_listing_id and seller_id = v_seller.id
     and status = case when p_paused then 'published'::public.listing_status else 'paused' end;
  if not found then raise exception 'invalid_status' using errcode = '55000'; end if;
end $$;

-- Providers publish bookable slots for a service listing.
create function public.add_service_slots(p_listing_id uuid, p_slots jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_seller public.sellers := private.own_seller(false);
  v_count int;
begin
  if not exists (select 1 from public.listings where id = p_listing_id and seller_id = v_seller.id and type = 'service') then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into public.service_slots (listing_id, starts_at, ends_at, capacity)
  select p_listing_id, (s ->> 'starts_at')::timestamptz, (s ->> 'ends_at')::timestamptz,
         coalesce((s ->> 'capacity')::int, 1)
    from jsonb_array_elements(p_slots) s
   where (s ->> 'starts_at')::timestamptz > now();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create function public.cancel_service_slot(p_slot_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_seller public.sellers := private.own_seller(false);
begin
  update public.service_slots s set cancelled = true
   from public.listings l
   where s.id = p_slot_id and s.listing_id = l.id and l.seller_id = v_seller.id and s.reserved = 0;
  if not found then raise exception 'slot_not_cancellable' using errcode = '55000'; end if;
end $$;

-- Staff moderation of a flagged or reported listing.
create function public.review_listing(p_listing_id uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  l public.listings;
  v_staff uuid;
begin
  select * into l from public.listings where id = p_listing_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  v_staff := private.require_staff(l.campus_id);
  if p_decision not in ('approved', 'rejected', 'changes_requested') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  update public.listings set
    status = case p_decision when 'approved' then 'published'::public.listing_status
                             when 'rejected' then 'rejected' else 'draft' end,
    review_note = p_note,
    published_at = case when p_decision = 'approved' then coalesce(published_at, now()) else published_at end
  where id = l.id;
  update public.moderation_cases set decision = p_decision, decision_note = p_note, decided_by = v_staff, decided_at = now()
   where listing_id = l.id and decided_at is null;
  update public.listing_flags set status = 'actioned' where listing_id = l.id and status in ('open', 'under_review');
  perform private.audit('listing.reviewed', 'listing', l.id::text, jsonb_build_object('decision', p_decision));
end $$;

create function public.report_listing(p_listing_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_user();
begin
  if not exists (select 1 from public.listings where id = p_listing_id and status = 'published') then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into public.listing_flags (listing_id, reporter_id, reason) values (p_listing_id, v_user, p_reason);
  update public.listings set status = 'flagged' where id = p_listing_id
     and (select count(*) from public.listing_flags where listing_id = p_listing_id and status = 'open') >= 3;
end $$;

-- Public-facing card view; security_invoker keeps listings RLS in force.
create view public.listing_cards with (security_invoker = true) as
select
  l.id, l.type, l.title, l.category_id, l.campus_id, l.seller_id,
  s.display_name as seller_name, s.location_text as location,
  coalesce((select min(o.price_cents) from public.listing_options o where o.listing_id = l.id and o.active), l.base_price_cents) as price_cents,
  (select m.storage_path from public.listing_media m where m.listing_id = l.id order by m.sort_order limit 1) as cover_path,
  l.rating_avg, l.rating_count, l.sold_count, l.published_at
from public.listings l
join public.sellers s on s.id = l.seller_id
where l.status = 'published' and s.status = 'active';
