-- Row Level Security. Default is deny: every public table has RLS on and clients get SELECT only where a
-- policy below allows it. Writes go through the RPCs (SECURITY DEFINER), except a few owner-scoped tables.
-- Cross-table checks use SECURITY DEFINER helpers so policies never recurse into each other.

-- ---------------------------------------------------------------------------
-- Policy helpers (definer: they read tables without applying those tables' policies)
-- ---------------------------------------------------------------------------
create function private.owns_seller(p_seller uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sellers where id = p_seller and user_id = auth.uid())
$$;

create function private.is_order_party(p_so uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.seller_orders where id = p_so and auth.uid() in (buyer_id, seller_user_id))
$$;

create function private.is_job_courier(p_so uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.delivery_jobs where seller_order_id = p_so and courier_id = auth.uid())
$$;

create function private.so_campus(p_so uuid) returns text
language sql stable security definer set search_path = public as $$
  select campus_id from public.seller_orders where id = p_so
$$;

create function private.is_conversation_member(p_conversation uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_participants where conversation_id = p_conversation and user_id = auth.uid())
$$;

create function private.listing_is_public(p_listing uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.listings l join public.sellers s on s.id = l.seller_id
                  where l.id = p_listing and l.status = 'published' and s.status = 'active')
$$;

create function private.owns_listing(p_listing uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.listings l join public.sellers s on s.id = l.seller_id
                  where l.id = p_listing and s.user_id = auth.uid())
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
create policy campuses_read on public.campuses for select using (true);
create policy categories_read on public.categories for select using (true);
create policy category_attributes_read on public.category_attributes for select using (true);
create policy app_settings_read on public.app_settings for select to authenticated
  using (key in ('demo_email_domain', 'demo_student_prefix', 'seller_accept_hours', 'issue_window_hours',
                 'payment_window_minutes', 'delivery_fee_cents'));
create policy fee_policies_read on public.fee_policies for select to authenticated using (status = 'active' or private.has_role('finance'));
create policy policy_terms_staff on public.policy_terms for select to authenticated using (private.is_staff());

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
create policy profiles_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_staff on public.profiles for select to authenticated using (private.is_staff());
-- the student number is visible to its owner only; staff never read it through the API
create policy profile_private_own on public.profile_private for select to authenticated using (user_id = auth.uid());
create policy identity_links_own on public.identity_links for select to authenticated using (user_id = auth.uid());
create policy eligibility_own on public.student_eligibility for select to authenticated using (user_id = auth.uid());
create policy memberships_own on public.memberships for select to authenticated using (user_id = auth.uid());
create policy memberships_admin on public.memberships for select to authenticated using (private.has_role('admin'));
create policy invitations_admin on public.staff_invitations for select to authenticated using (private.has_role('admin') or private.has_role('operations'));
create policy audit_admin on public.audit_events for select to authenticated using (private.has_role('admin'));
create policy deletion_own on public.account_deletion_requests for select to authenticated using (user_id = auth.uid());

-- Counterparty names and photos without exposing the profile row.
create view public.profile_cards as
select p.id, p.display_name, p.avatar_path
  from public.profiles p
 where p.deleted_at is null
   and (p.id = auth.uid()
        or exists (select 1 from public.sellers s where s.user_id = p.id and s.status = 'active')
        or exists (select 1 from public.conversation_participants a
                     join public.conversation_participants b on b.conversation_id = a.conversation_id
                    where a.user_id = auth.uid() and b.user_id = p.id));

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create policy sellers_public on public.sellers for select using (status = 'active');
create policy sellers_own on public.sellers for select to authenticated using (user_id = auth.uid());
create policy sellers_staff on public.sellers for select to authenticated using (private.is_staff(campus_id));

create policy listings_public on public.listings for select
  using (status = 'published' and exists (select 1 from public.sellers s where s.id = seller_id and s.status = 'active'));
create policy listings_own on public.listings for select to authenticated using (private.owns_seller(seller_id));
create policy listings_staff on public.listings for select to authenticated using (private.is_staff(campus_id));

create policy listing_options_public on public.listing_options for select using (private.listing_is_public(listing_id));
create policy listing_options_own on public.listing_options for select to authenticated using (private.owns_listing(listing_id));
create policy listing_media_public on public.listing_media for select using (private.listing_is_public(listing_id));
create policy listing_media_own on public.listing_media for select to authenticated using (private.owns_listing(listing_id));
create policy service_slots_public on public.service_slots for select
  using (private.listing_is_public(listing_id) and not cancelled and starts_at > now());
create policy service_slots_own on public.service_slots for select to authenticated using (private.owns_listing(listing_id));

create policy policy_checks_own on public.listing_policy_checks for select to authenticated
  using (private.owns_listing(listing_id) or private.is_staff());
create policy flags_own on public.listing_flags for select to authenticated using (reporter_id = auth.uid() or private.is_staff());
create policy moderation_cases_staff on public.moderation_cases for select to authenticated
  using (private.is_staff() or (seller_id is not null and private.owns_seller(seller_id)));

create policy favourites_own on public.favourites for select to authenticated using (user_id = auth.uid());
create policy follows_own on public.follows for select to authenticated using (user_id = auth.uid());
create policy reviews_public on public.reviews for select using (true);
create policy reels_public on public.reels for select using (published or private.owns_seller(seller_id));
create policy reel_likes_own on public.reel_likes for select to authenticated using (user_id = auth.uid());
create policy reel_comments_public on public.reel_comments for select
  using (exists (select 1 from public.reels r where r.id = reel_id and r.published));

create function public.add_reel_comment(p_reel_id uuid, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.reels where id = p_reel_id and published) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into public.reel_comments (reel_id, user_id, body) values (p_reel_id, private.require_user(), btrim(p_body))
  returning id into v_id;
  return v_id;
end $$;

create function public.finance_set_fee_policy(p_bps int, p_note text, p_activate boolean default false) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_fin uuid := private.require_role('finance');
  v_id uuid;
begin
  insert into public.fee_policies (version, transaction_fee_bps, note, status)
  values ((select coalesce(max(version), 0) + 1 from public.fee_policies), p_bps, coalesce(p_note, ''), 'draft')
  returning id into v_id;
  if p_activate then
    perform private.require_role('admin');
    update public.fee_policies set status = 'retired' where status = 'active';
    update public.fee_policies set status = 'active', approved_by = v_fin, effective_from = now() where id = v_id;
  end if;
  perform private.audit('fee_policy.created', 'fee_policy', v_id::text, jsonb_build_object('bps', p_bps, 'active', p_activate));
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Money (buyers see their own; finance sees all)
-- ---------------------------------------------------------------------------
create policy wallets_own on public.wallets for select to authenticated using (user_id = auth.uid());
create policy wallet_tx_own on public.wallet_transactions for select to authenticated using (user_id = auth.uid());
create policy payment_methods_own on public.payment_methods for select to authenticated using (user_id = auth.uid());
create policy intents_own on public.payment_intents for select to authenticated using (buyer_id = auth.uid() or private.has_role('finance'));
create policy payment_events_own on public.payment_events for select to authenticated
  using (private.has_role('finance') or exists (select 1 from public.payment_intents i where i.id = payment_intent_id and i.buyer_id = auth.uid()));
create policy webhooks_finance on public.provider_webhook_events for select to authenticated using (private.has_role('finance'));
create policy ledger_accounts_finance on public.ledger_accounts for select to authenticated using (private.has_role('finance'));
create policy ledger_journals_finance on public.ledger_journals for select to authenticated using (private.has_role('finance'));
create policy ledger_entries_finance on public.ledger_entries for select to authenticated using (private.has_role('finance'));
create policy refunds_own on public.refunds for select to authenticated
  using (private.has_role('finance') or exists (select 1 from public.payment_intents i where i.id = payment_intent_id and i.buyer_id = auth.uid()));
create policy payout_destinations_own on public.payout_destinations for select to authenticated using (user_id = auth.uid());
create policy payouts_own on public.payouts for select to authenticated using (user_id = auth.uid() or private.has_role('finance'));
create policy reconciliation_finance on public.reconciliation_runs for select to authenticated using (private.has_role('finance'));

-- ---------------------------------------------------------------------------
-- Commerce
-- ---------------------------------------------------------------------------
create policy addresses_own on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cart_own on public.cart_items for select to authenticated using (user_id = auth.uid());
create policy vouchers_staff on public.vouchers for select to authenticated using (private.is_staff());

create policy orders_own on public.orders for select to authenticated using (buyer_id = auth.uid());
create policy orders_staff on public.orders for select to authenticated using (private.is_staff(delivery_campus_id));

create policy seller_orders_party on public.seller_orders for select to authenticated
  using (auth.uid() in (buyer_id, seller_user_id));
create policy seller_orders_courier on public.seller_orders for select to authenticated using (private.is_job_courier(id));
create policy seller_orders_staff on public.seller_orders for select to authenticated using (private.is_staff(campus_id));

create policy order_items_visible on public.order_items for select to authenticated
  using (private.is_order_party(seller_order_id) or private.is_job_courier(seller_order_id) or private.is_staff(private.so_campus(seller_order_id)));
create policy bookings_party on public.bookings for select to authenticated
  using (buyer_id = auth.uid() or private.owns_seller(seller_id) or private.is_staff(private.so_campus(seller_order_id)));
create policy order_events_visible on public.order_events for select to authenticated
  using (private.is_order_party(seller_order_id) or private.is_staff(private.so_campus(seller_order_id)));

-- ---------------------------------------------------------------------------
-- Fulfilment
-- ---------------------------------------------------------------------------
create policy courier_profiles_own on public.courier_profiles for select to authenticated using (user_id = auth.uid() or private.is_staff());
create policy delivery_jobs_courier on public.delivery_jobs for select to authenticated using (courier_id = auth.uid());
create policy delivery_jobs_party on public.delivery_jobs for select to authenticated using (private.is_order_party(seller_order_id));
create policy delivery_jobs_staff on public.delivery_jobs for select to authenticated using (private.is_staff(campus_id));
create policy packages_visible on public.packages for select to authenticated
  using (private.is_order_party(seller_order_id) or private.is_job_courier(seller_order_id) or private.is_staff(private.so_campus(seller_order_id)));
-- handoff_challenges: no policy. Only the RPCs touch it.
create policy custody_visible on public.custody_events for select to authenticated
  using (private.is_order_party(seller_order_id) or private.is_job_courier(seller_order_id) or private.is_staff(private.so_campus(seller_order_id)));
create policy delivery_exceptions_visible on public.delivery_exceptions for select to authenticated
  using (reported_by = auth.uid() or private.is_staff());
create policy carrier_bookings_staff on public.carrier_bookings for select to authenticated using (private.is_staff());

-- Couriers see a coarse pool: no buyer address until they hold the job.
create view public.courier_job_pool as
select j.id, j.campus_id, j.pickup_text, j.courier_fee_cents, j.created_at
  from public.delivery_jobs j
 where j.status = 'pending_assignment'
   and exists (select 1 from public.courier_profiles c
                where c.user_id = auth.uid() and c.status = 'active' and j.campus_id = any (c.campus_ids));

-- Buyers and sellers see who is carrying the order, nothing more.
create view public.delivery_courier_cards as
select j.seller_order_id, j.id as job_id, j.status, c.full_name as courier_name, c.vehicle, c.rating_avg
  from public.delivery_jobs j
  join public.courier_profiles c on c.user_id = j.courier_id
 where private.is_order_party(j.seller_order_id);

-- ---------------------------------------------------------------------------
-- Communication and operations
-- ---------------------------------------------------------------------------
create policy conversations_member on public.conversations for select to authenticated using (private.is_conversation_member(id));
create policy participants_member on public.conversation_participants for select to authenticated using (private.is_conversation_member(conversation_id));
create policy messages_member on public.messages for select to authenticated using (private.is_conversation_member(conversation_id));
create policy blocks_own on public.user_blocks for select to authenticated using (blocker_id = auth.uid());
create policy message_reports_own on public.message_reports for select to authenticated using (reporter_id = auth.uid() or private.is_staff());
create policy notifications_own on public.notifications for select to authenticated using (user_id = auth.uid());
create policy push_tokens_own on public.push_tokens for select to authenticated using (user_id = auth.uid());

create policy cases_visible on public.cases for select to authenticated
  using (opened_by = auth.uid()
         or (seller_order_id is not null and private.is_order_party(seller_order_id))
         or private.is_staff(campus_id));
create policy case_notes_visible on public.case_notes for select to authenticated
  using (private.is_staff()
         or (not internal and exists (select 1 from public.cases c where c.id = case_id)));
create policy analytics_staff on public.analytics_events for select to authenticated
  using (private.has_role('operations') or private.has_role('admin'));
