-- Fulfilment, custody, settlement, disputes and payouts. These functions are the only way an order,
-- delivery job, case or payout changes state; every one checks who is calling and what state it is in.

-- ---------------------------------------------------------------------------
-- One-time handoff codes
-- ---------------------------------------------------------------------------
create function private.random_code() returns text
language sql volatile as $$
  select lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 8))::bit(32)::bigint % 1000000)::text, 6, '0')
$$;

create function private.issue_challenge(p_so uuid, p_kind text) returns table (out_code text, out_expires timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_code text := private.random_code();
  v_salt text := replace(gen_random_uuid()::text, '-', '');
  v_exp timestamptz := now() + make_interval(mins => (private.setting('handoff_code_minutes') #>> '{}')::int);
begin
  update public.handoff_challenges set expires_at = now()
   where seller_order_id = p_so and kind = p_kind and consumed_at is null and expires_at > now();
  insert into public.handoff_challenges (seller_order_id, kind, code_hash, salt, expires_at)
  values (p_so, p_kind, encode(sha256(convert_to(v_code || v_salt, 'utf8')), 'hex'), v_salt, v_exp);
  return query select v_code, v_exp;
end $$;

-- Returns 'ok', 'wrong_code', 'locked', 'expired' or 'no_code'. Failed attempts are counted and persist
-- because callers return the result instead of raising.
create function private.check_code(p_so uuid, p_kind text, p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  h public.handoff_challenges;
  v_max int := (private.setting('handoff_max_attempts') #>> '{}')::int;
begin
  select * into h from public.handoff_challenges
   where seller_order_id = p_so and kind = p_kind and consumed_at is null
   order by created_at desc limit 1 for update;
  if not found then return 'no_code'; end if;
  if h.expires_at <= now() then return 'expired'; end if;
  if h.attempts >= v_max then return 'locked'; end if;
  if h.code_hash = encode(sha256(convert_to(coalesce(btrim(p_code), '') || h.salt, 'utf8')), 'hex') then
    update public.handoff_challenges set consumed_at = now() where id = h.id;
    return 'ok';
  end if;
  update public.handoff_challenges set attempts = attempts + 1 where id = h.id;
  return 'wrong_code';
end $$;

-- The right participant reads a fresh code; the previous one stops working.
--   pickup         -> the seller shows it to the courier
--   dropoff        -> the buyer shows it to the courier
--   campus_handoff -> the buyer shows it to the seller
create function public.reveal_handoff_code(p_seller_order_id uuid, p_kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  so public.seller_orders;
  v_code text;
  v_exp timestamptz;
begin
  select * into so from public.seller_orders where id = p_seller_order_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p_kind = 'pickup' then
    if so.seller_user_id <> v_user or so.fulfilment <> 'vossie_delivery' or so.status not in ('accepted', 'preparing', 'ready') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  elsif p_kind = 'dropoff' then
    if so.buyer_id <> v_user or so.fulfilment <> 'vossie_delivery' or so.status <> 'in_fulfilment' then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  elsif p_kind = 'campus_handoff' then
    if so.buyer_id <> v_user or so.fulfilment <> 'campus_handoff' or so.status <> 'ready' then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  else
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  select i.out_code, i.out_expires into v_code, v_exp from private.issue_challenge(so.id, p_kind) i;
  return jsonb_build_object('code', v_code, 'expires_at', v_exp);
end $$;

-- ---------------------------------------------------------------------------
-- Settlement
-- ---------------------------------------------------------------------------
create function private.start_issue_window(p_so uuid, p_actor uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v_hours int := (private.setting('issue_window_hours') #>> '{}')::int;
begin
  update public.seller_orders set delivered_at = now(), issue_window_ends_at = now() + make_interval(hours => v_hours),
         payout_state = 'held' where id = p_so;
  perform private.set_so_status(p_so, 'issue_window', p_actor, p_note);
  perform private.notify((select buyer_id from public.seller_orders where id = p_so), 'order_delivered',
    'Order delivered', 'Confirm you are happy, or report a problem within ' || v_hours || ' hours.',
    '/activity/order/' || p_so, jsonb_build_object('seller_order_id', p_so));
end $$;

-- Moves held funds out of escrow to the seller, courier and Vossie. Idempotent.
create function private.settle_seller_order(p_so uuid, p_actor uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  so public.seller_orders;
  v_job public.delivery_jobs;
  v_item_refund bigint;
  v_gross bigint;
  v_fee bigint;
  v_delivery_left bigint;
  v_courier bigint := 0;
  v_remaining bigint;
  v_lines jsonb;
begin
  select * into so from public.seller_orders where id = p_so for update;
  if so.status in ('completed', 'refunded', 'rejected', 'timed_out', 'cancelled') then return; end if;
  v_item_refund := least(so.refunded_cents, so.subtotal_cents);
  v_gross := so.subtotal_cents - v_item_refund;
  v_delivery_left := so.delivery_fee_cents - greatest(0, so.refunded_cents - so.subtotal_cents);
  v_fee := case when so.subtotal_cents = 0 then 0 else round(so.fee_cents::numeric * v_gross / so.subtotal_cents)::bigint end;
  v_remaining := v_gross + v_delivery_left;

  select * into v_job from public.delivery_jobs where seller_order_id = so.id and status = 'delivered';
  if found and v_delivery_left > 0 then
    v_courier := least(v_job.courier_fee_cents, v_delivery_left);
  end if;

  if v_remaining > 0 then
    v_lines := jsonb_build_array(jsonb_build_object('account', 'escrow', 'debit', v_remaining),
      jsonb_build_object('account', 'seller_payable', 'owner', so.seller_user_id, 'credit', v_gross - v_fee),
      jsonb_build_object('account', 'platform_fees', 'credit', v_fee));
    if v_delivery_left > 0 then
      if v_courier > 0 then
        v_lines := v_lines || jsonb_build_array(jsonb_build_object('account', 'courier_payable', 'owner', v_job.courier_id, 'credit', v_courier));
      end if;
      v_lines := v_lines || jsonb_build_array(jsonb_build_object('account', 'delivery_revenue', 'credit', v_delivery_left - v_courier));
    end if;
    perform private.post_journal('settlement', so.id, 'Settle ' || so.number, v_lines, 'settle:' || so.id);
  end if;

  update public.seller_orders set fee_cents = v_fee, completed_at = now(), payout_state = 'available' where id = so.id;
  perform private.set_so_status(so.id, 'completed', p_actor, 'settled');
  update public.bookings set status = 'completed' where seller_order_id = so.id and status in ('provider_complete', 'booked', 'disputed', 'no_show_review');
  update public.listings l set sold_count = l.sold_count + i.q
    from (select listing_id, sum(quantity)::int q from public.order_items where seller_order_id = so.id group by listing_id) i
   where l.id = i.listing_id;
  if v_job.courier_id is not null then
    update public.courier_profiles set deliveries_count = deliveries_count + 1 where user_id = v_job.courier_id;
  end if;
  perform private.notify(so.seller_user_id, 'order_completed', 'Order completed', 'Funds for ' || so.number || ' are available.',
                         '/activity/order/' || so.id, jsonb_build_object('seller_order_id', so.id));
end $$;

-- ---------------------------------------------------------------------------
-- Seller / provider actions
-- ---------------------------------------------------------------------------
create function private.lock_my_seller_order(p_so uuid) returns public.seller_orders
language plpgsql security definer set search_path = public as $$
declare so public.seller_orders;
begin
  select * into so from public.seller_orders where id = p_so for update;
  if not found or so.seller_user_id <> private.require_user() then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  return so;
end $$;

create function public.seller_respond(p_seller_order_id uuid, p_accept boolean, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  so public.seller_orders := private.lock_my_seller_order(p_seller_order_id);
  ord public.orders;
  v_seller public.sellers;
  v_fee_share int := (private.setting('courier_share_bps') #>> '{}')::int;
  v_job uuid;
begin
  if so.status <> 'awaiting_seller' then raise exception 'invalid_status' using errcode = '55000'; end if;
  if not p_accept then
    perform private.cancel_seller_order(so.id, 'rejected', so.seller_user_id, coalesce(p_note, 'Seller declined'));
    perform private.notify(so.buyer_id, 'order_rejected', 'Order declined', 'Order ' || so.number || ' was declined and refunded.',
                           '/activity/order/' || so.id, jsonb_build_object('seller_order_id', so.id), true);
    return;
  end if;
  update public.listing_options o set on_hand = o.on_hand - i.quantity, reserved = greatest(0, o.reserved - i.quantity)
    from public.order_items i
   where i.seller_order_id = so.id and i.type = 'goods' and i.option_id = o.id and not o.unlimited;
  update public.order_items set stock_committed = true where seller_order_id = so.id and type = 'goods';
  update public.bookings set status = 'booked', hold_expires_at = null where seller_order_id = so.id and status = 'held';
  update public.seller_orders set accepted_at = now() where id = so.id;
  perform private.set_so_status(so.id, 'accepted', so.seller_user_id, p_note);

  if so.fulfilment = 'vossie_delivery' and so.has_goods then
    select * into v_seller from public.sellers where id = so.seller_id;
    select * into ord from public.orders where id = so.order_id;
    insert into public.delivery_jobs (seller_order_id, campus_id, pickup_text, dropoff_text, fee_cents, courier_fee_cents)
    values (so.id, so.campus_id, coalesce(nullif(v_seller.location_text, ''), v_seller.display_name),
            coalesce(ord.delivery_address, ''), so.delivery_fee_cents, so.delivery_fee_cents * v_fee_share / 10000)
    returning id into v_job;
    insert into public.packages (seller_order_id, description) values (so.id, 'Order ' || so.number);
    insert into public.custody_events (seller_order_id, delivery_job_id, actor_id, actor_role, event)
    values (so.id, v_job, so.seller_user_id, 'seller', 'job_created');
  end if;
  perform private.system_message(private.ensure_order_conversation(so.id), 'The seller accepted order ' || so.number || '.');
  perform private.notify(so.buyer_id, 'order_accepted', 'Order accepted', 'Order ' || so.number || ' was accepted.',
                         '/activity/order/' || so.id, jsonb_build_object('seller_order_id', so.id));
end $$;

create function public.seller_advance(p_seller_order_id uuid, p_to public.seller_order_status) returns void
language plpgsql security definer set search_path = public as $$
declare so public.seller_orders := private.lock_my_seller_order(p_seller_order_id);
begin
  if not so.has_goods then raise exception 'invalid_status' using errcode = '55000'; end if;
  if not ((so.status = 'accepted' and p_to in ('preparing', 'ready')) or (so.status = 'preparing' and p_to = 'ready')) then
    raise exception 'invalid_status' using errcode = '55000';
  end if;
  perform private.set_so_status(so.id, p_to, so.seller_user_id);
  perform private.notify(so.buyer_id, 'order_' || p_to, case p_to when 'ready' then 'Order ready' else 'Order being prepared' end,
                         'Order ' || so.number, '/activity/order/' || so.id, jsonb_build_object('seller_order_id', so.id));
end $$;

-- Campus handoff: the seller enters the code the buyer shows them.
create function public.seller_complete_handoff(p_seller_order_id uuid, p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  so public.seller_orders := private.lock_my_seller_order(p_seller_order_id);
  v_result text;
begin
  if so.status <> 'ready' or so.fulfilment <> 'campus_handoff' then raise exception 'invalid_status' using errcode = '55000'; end if;
  v_result := private.check_code(so.id, 'campus_handoff', p_code);
  if v_result <> 'ok' then return jsonb_build_object('ok', false, 'error', v_result); end if;
  insert into public.custody_events (seller_order_id, actor_id, actor_role, event, location_text)
  values (so.id, so.seller_user_id, 'seller', 'handed_to_buyer', 'campus');
  perform private.start_issue_window(so.id, so.seller_user_id, 'campus handoff verified');
  return jsonb_build_object('ok', true);
end $$;

create function public.provider_mark_complete(p_booking_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  so public.seller_orders;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  so := private.lock_my_seller_order(b.seller_order_id);
  if b.status <> 'booked' or b.starts_at > now() then raise exception 'invalid_status' using errcode = '55000'; end if;
  update public.bookings set status = 'provider_complete', provider_completed_at = now() where id = b.id;
  if not exists (select 1 from public.bookings where seller_order_id = so.id and status not in ('provider_complete', 'completed')) then
    perform private.start_issue_window(so.id, so.seller_user_id, 'provider marked complete');
  end if;
end $$;

create function public.seller_cancel_order(p_seller_order_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare so public.seller_orders := private.lock_my_seller_order(p_seller_order_id);
begin
  if so.status not in ('accepted', 'preparing', 'ready') then raise exception 'invalid_status' using errcode = '55000'; end if;
  perform private.cancel_seller_order(so.id, 'cancelled', so.seller_user_id, coalesce(p_reason, 'Cancelled by seller'));
  perform private.notify(so.buyer_id, 'order_cancelled', 'Order cancelled', 'Order ' || so.number || ' was cancelled and refunded.',
                         '/activity/order/' || so.id, jsonb_build_object('seller_order_id', so.id), true);
end $$;

-- ---------------------------------------------------------------------------
-- Buyer actions
-- ---------------------------------------------------------------------------
create function private.lock_my_buyer_order(p_so uuid) returns public.seller_orders
language plpgsql security definer set search_path = public as $$
declare so public.seller_orders;
begin
  select * into so from public.seller_orders where id = p_so for update;
  if not found or so.buyer_id <> private.require_user() then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  return so;
end $$;

create function public.buyer_cancel_order(p_seller_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  so public.seller_orders := private.lock_my_buyer_order(p_seller_order_id);
  v_late boolean;
begin
  if so.status in ('awaiting_seller', 'awaiting_payment') then
    null;
  elsif so.status in ('accepted', 'preparing') and so.has_goods then
    null;
  elsif so.status = 'accepted' and not so.has_goods then
    select bool_or(now() > b.cancel_cutoff_at) into v_late from public.bookings b where b.seller_order_id = so.id;
    if v_late then raise exception 'past_cancellation_cutoff' using errcode = '55000'; end if;
  else
    raise exception 'cancellation_not_allowed' using errcode = '55000';
  end if;
  if so.status = 'awaiting_payment' then
    perform private.release_holds(so.id);
    perform private.set_so_status(so.id, 'cancelled', so.buyer_id, 'Cancelled before payment');
    return;
  end if;
  perform private.cancel_seller_order(so.id, 'cancelled', so.buyer_id, 'Cancelled by buyer');
  perform private.notify(so.seller_user_id, 'order_cancelled', 'Order cancelled', 'Order ' || so.number || ' was cancelled by the buyer.',
                         '/activity/order/' || so.id, jsonb_build_object('seller_order_id', so.id));
end $$;

create function public.buyer_confirm_received(p_seller_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare so public.seller_orders := private.lock_my_buyer_order(p_seller_order_id);
begin
  if so.status not in ('delivered', 'issue_window') then raise exception 'invalid_status' using errcode = '55000'; end if;
  perform private.settle_seller_order(so.id, so.buyer_id);
end $$;

-- Buyer or seller opens a case. Buyers have the issue window after delivery; either side can report
-- a handoff problem or a no-show, which freezes completion until staff decide.
create function public.open_order_issue(p_seller_order_id uuid, p_kind public.case_kind, p_reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  so public.seller_orders;
  v_case uuid;
  v_is_buyer boolean;
begin
  select * into so from public.seller_orders where id = p_seller_order_id for update;
  if not found or v_user not in (so.buyer_id, so.seller_user_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  v_is_buyer := v_user = so.buyer_id;
  if p_kind not in ('order_issue', 'dispute', 'handoff_issue', 'no_show') then
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if p_kind in ('order_issue', 'dispute') then
    if not v_is_buyer or so.status not in ('delivered', 'issue_window') or coalesce(so.issue_window_ends_at, now()) < now() then
      raise exception 'issue_window_closed' using errcode = '55000';
    end if;
  elsif p_kind = 'handoff_issue' then
    if so.status not in ('ready', 'in_fulfilment', 'delivered', 'issue_window') then raise exception 'invalid_status' using errcode = '55000'; end if;
  else
    if so.has_goods or so.status not in ('accepted', 'issue_window') then raise exception 'invalid_status' using errcode = '55000'; end if;
  end if;
  insert into public.cases (kind, seller_order_id, campus_id, opened_by, reason)
  values (p_kind, so.id, so.campus_id, v_user, p_reason) returning id into v_case;
  update public.bookings set status = case when p_kind = 'no_show' then 'no_show_review'::public.booking_status else 'disputed' end
   where seller_order_id = so.id and status in ('booked', 'provider_complete');
  perform private.set_so_status(so.id, 'disputed', v_user, p_kind || ': ' || left(p_reason, 200));
  update public.seller_orders set payout_state = 'held' where id = so.id;
  perform private.system_message(private.ensure_order_conversation(so.id),
    'A ' || replace(p_kind::text, '_', ' ') || ' report was opened. Vossie support will review it.');
  perform private.notify(case when v_is_buyer then so.seller_user_id else so.buyer_id end, 'case_opened', 'Issue reported',
    'A report was opened on order ' || so.number || '.', '/activity/order/' || so.id, jsonb_build_object('case_id', v_case));
  return v_case;
end $$;

-- ---------------------------------------------------------------------------
-- Delivery (courier role is invite-only)
-- ---------------------------------------------------------------------------
create function private.my_job(p_job uuid, p_courier_only boolean default true) returns public.delivery_jobs
language plpgsql security definer set search_path = public as $$
declare j public.delivery_jobs;
begin
  select * into j from public.delivery_jobs where id = p_job for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p_courier_only and j.courier_id is distinct from private.require_role('courier') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return j;
end $$;

create function public.courier_claim_job(p_job_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_role('courier');
  c public.courier_profiles;
  j public.delivery_jobs;
begin
  select * into c from public.courier_profiles where user_id = v_user;
  if not found or c.status <> 'active' then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into j from public.delivery_jobs where id = p_job_id and status = 'pending_assignment' for update skip locked;
  if not found then raise exception 'job_unavailable' using errcode = '55000'; end if;
  if not (j.campus_id = any (c.campus_ids)) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.delivery_jobs set courier_id = v_user, status = 'assigned', assigned_at = now() where id = j.id;
  insert into public.custody_events (seller_order_id, delivery_job_id, actor_id, actor_role, event)
  values (j.seller_order_id, j.id, v_user, 'courier', 'courier_assigned');
end $$;

create function public.courier_release_job(p_job_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j public.delivery_jobs := private.my_job(p_job_id);
begin
  if j.status <> 'assigned' then raise exception 'invalid_status' using errcode = '55000'; end if;
  update public.delivery_jobs set courier_id = null, status = 'pending_assignment', assigned_at = null where id = j.id;
  insert into public.custody_events (seller_order_id, delivery_job_id, actor_id, actor_role, event)
  values (j.seller_order_id, j.id, auth.uid(), 'courier', 'courier_released');
end $$;

create function public.assign_courier(p_job_id uuid, p_courier_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  j public.delivery_jobs;
  v_staff uuid;
begin
  select * into j from public.delivery_jobs where id = p_job_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  v_staff := private.require_staff(j.campus_id);
  if j.status not in ('pending_assignment', 'assigned', 'exception') then raise exception 'invalid_status' using errcode = '55000'; end if;
  if not exists (select 1 from public.courier_profiles where user_id = p_courier_id and status = 'active') then
    raise exception 'courier_unavailable' using errcode = '55000';
  end if;
  update public.delivery_jobs set courier_id = p_courier_id, status = case when picked_up_at is null then 'assigned'::public.delivery_status else 'picked_up' end,
         assigned_at = now() where id = j.id;
  insert into public.custody_events (seller_order_id, delivery_job_id, actor_id, actor_role, event, note)
  values (j.seller_order_id, j.id, v_staff, 'staff', 'courier_assigned', 'assigned by staff');
  perform private.notify(p_courier_id, 'job_assigned', 'New delivery', 'You have a new delivery.', '/courier/jobs/' || j.id,
                         jsonb_build_object('job_id', j.id));
end $$;

create function public.courier_confirm_pickup(p_job_id uuid, p_code text, p_evidence_path text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  j public.delivery_jobs := private.my_job(p_job_id);
  so public.seller_orders;
  v_result text;
begin
  select * into so from public.seller_orders where id = j.seller_order_id for update;
  if j.status <> 'assigned' or so.status <> 'ready' then raise exception 'invalid_status' using errcode = '55000'; end if;
  v_result := private.check_code(so.id, 'pickup', p_code);
  if v_result <> 'ok' then return jsonb_build_object('ok', false, 'error', v_result); end if;
  update public.delivery_jobs set status = 'picked_up', picked_up_at = now() where id = j.id;
  insert into public.custody_events (seller_order_id, delivery_job_id, actor_id, actor_role, event, evidence_path)
  values (so.id, j.id, j.courier_id, 'courier', 'picked_up', p_evidence_path);
  perform private.set_so_status(so.id, 'in_fulfilment', j.courier_id, 'picked up');
  perform private.notify(so.buyer_id, 'order_in_transit', 'Order on the way', 'Your courier collected order ' || so.number || '.',
                         '/activity/order/' || so.id, jsonb_build_object('seller_order_id', so.id));
  return jsonb_build_object('ok', true);
end $$;

create function public.courier_update_status(p_job_id uuid, p_status public.delivery_status, p_lat numeric default null,
                                             p_lng numeric default null, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare j public.delivery_jobs := private.my_job(p_job_id);
begin
  if not ((j.status = 'picked_up' and p_status in ('in_transit', 'arrived')) or (j.status = 'in_transit' and p_status = 'arrived')) then
    raise exception 'invalid_status' using errcode = '55000';
  end if;
  update public.delivery_jobs set status = p_status where id = j.id;
  insert into public.custody_events (seller_order_id, delivery_job_id, actor_id, actor_role, event, lat, lng, note)
  values (j.seller_order_id, j.id, j.courier_id, 'courier', p_status::text, p_lat, p_lng, p_note);
end $$;

create function public.courier_confirm_delivery(p_job_id uuid, p_code text, p_evidence_path text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  j public.delivery_jobs := private.my_job(p_job_id);
  so public.seller_orders;
  v_result text;
begin
  select * into so from public.seller_orders where id = j.seller_order_id for update;
  if j.status not in ('picked_up', 'in_transit', 'arrived') or so.status <> 'in_fulfilment' then
    raise exception 'invalid_status' using errcode = '55000';
  end if;
  v_result := private.check_code(so.id, 'dropoff', p_code);
  if v_result <> 'ok' then return jsonb_build_object('ok', false, 'error', v_result); end if;
  update public.delivery_jobs set status = 'delivered', delivered_at = now() where id = j.id;
  insert into public.custody_events (seller_order_id, delivery_job_id, actor_id, actor_role, event, evidence_path)
  values (so.id, j.id, j.courier_id, 'courier', 'delivered', p_evidence_path);
  perform private.start_issue_window(so.id, j.courier_id, 'delivery verified');
  return jsonb_build_object('ok', true);
end $$;

create function public.courier_report_exception(p_job_id uuid, p_kind text, p_notes text, p_evidence_path text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  j public.delivery_jobs := private.my_job(p_job_id);
  v_case uuid;
begin
  if j.status not in ('assigned', 'picked_up', 'in_transit', 'arrived') then raise exception 'invalid_status' using errcode = '55000'; end if;
  insert into public.delivery_exceptions (delivery_job_id, reported_by, kind, notes, evidence_path)
  values (j.id, j.courier_id, p_kind, coalesce(p_notes, ''), p_evidence_path);
  update public.delivery_jobs set status = 'exception' where id = j.id;
  insert into public.custody_events (seller_order_id, delivery_job_id, actor_id, actor_role, event, note, evidence_path)
  values (j.seller_order_id, j.id, j.courier_id, 'courier', 'exception:' || p_kind, p_notes, p_evidence_path);
  insert into public.cases (kind, delivery_job_id, seller_order_id, campus_id, opened_by, reason)
  values ('delivery_exception', j.id, j.seller_order_id, j.campus_id, j.courier_id, p_kind || ': ' || coalesce(p_notes, ''))
  returning id into v_case;
  return v_case;
end $$;

-- ---------------------------------------------------------------------------
-- Staff resolution
-- ---------------------------------------------------------------------------
create function public.staff_resolve_case(p_case_id uuid, p_outcome text, p_amount_cents bigint default null,
                                          p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  c public.cases;
  so public.seller_orders;
  v_staff uuid;
  v_left bigint;
begin
  select * into c from public.cases where id = p_case_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  v_staff := private.require_staff(c.campus_id);
  if c.status in ('resolved', 'denied') then raise exception 'already_resolved' using errcode = '55000'; end if;
  if p_outcome not in ('refund_full', 'refund_partial', 'release_payout', 'return', 'deny', 'other') then
    raise exception 'invalid_outcome' using errcode = '22023';
  end if;
  if p_outcome in ('refund_full', 'refund_partial', 'release_payout', 'return', 'deny') and c.seller_order_id is not null
     and c.kind <> 'delivery_exception' and c.kind <> 'message_report' then
    select * into so from public.seller_orders where id = c.seller_order_id for update;
    if so.status <> 'disputed' then raise exception 'invalid_status' using errcode = '55000'; end if;
    v_left := so.subtotal_cents + so.delivery_fee_cents - so.refunded_cents;
    if p_outcome in ('refund_full', 'return') then
      perform private.refund_seller_order(so.id, v_left, 'Case ' || c.id || ': ' || coalesce(p_note, p_outcome), c.opened_by, v_staff);
      perform private.release_holds(so.id);
      perform private.set_so_status(so.id, 'refunded', v_staff, p_outcome);
      update public.seller_orders set payout_state = 'none' where id = so.id;
    elsif p_outcome = 'refund_partial' then
      if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents >= v_left then
        raise exception 'invalid_refund_amount' using errcode = '22023';
      end if;
      perform private.refund_seller_order(so.id, p_amount_cents, 'Case ' || c.id || ': partial', c.opened_by, v_staff);
      perform private.settle_seller_order(so.id, v_staff);
    else
      perform private.settle_seller_order(so.id, v_staff);
    end if;
  end if;
  update public.cases set status = case when p_outcome = 'deny' then 'denied'::public.case_status else 'resolved' end,
         outcome = p_outcome, outcome_cents = p_amount_cents, resolution_note = p_note,
         resolved_by = v_staff, resolved_at = now() where id = c.id;
  if c.kind = 'delivery_exception' then
    update public.delivery_exceptions set status = 'resolved' where delivery_job_id = c.delivery_job_id and status = 'open';
  end if;
  perform private.audit('case.resolved', 'case', c.id::text, jsonb_build_object('outcome', p_outcome, 'amount', p_amount_cents));
  perform private.notify(c.opened_by, 'case_resolved', 'Your report was reviewed', coalesce(p_note, 'Outcome: ' || p_outcome),
                         '/activity/orders', jsonb_build_object('case_id', c.id), true);
end $$;

-- ---------------------------------------------------------------------------
-- Payouts (finance role; payouts are never automatic during the pilot)
-- ---------------------------------------------------------------------------
create function private.payable_available(p_user uuid, p_role text) returns bigint
language sql stable security definer set search_path = public as $$
  select private.account_balance(case p_role when 'seller' then 'seller_payable' else 'courier_payable' end, p_user)
       - coalesce((select sum(amount_cents) from public.payouts
                    where user_id = p_user and role = p_role and status in ('requested', 'approved', 'processing')), 0)
$$;

create function public.my_balances() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_user uuid := private.require_user();
begin
  return jsonb_build_object(
    'wallet_cents', coalesce((select balance_cents from public.wallets where user_id = v_user), 0),
    'seller_available_cents', private.payable_available(v_user, 'seller'),
    'courier_available_cents', private.payable_available(v_user, 'courier'),
    'held_cents', coalesce((select sum(total_cents - refunded_cents) from public.seller_orders
                             where seller_user_id = v_user and payout_state = 'held'), 0));
end $$;

create function public.add_payout_destination(p_bank text, p_holder text, p_last4 text, p_provider_ref text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.payout_destinations (user_id, bank_name, account_holder, account_last4, provider_ref, is_default)
  values (private.require_user(), p_bank, p_holder, p_last4, p_provider_ref,
          not exists (select 1 from public.payout_destinations where user_id = auth.uid()))
  returning id into v_id;
  return v_id;
end $$;

create function public.request_payout(p_amount_cents bigint, p_role text, p_destination_id uuid, p_idempotency_key text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_id uuid;
begin
  if p_role not in ('seller', 'courier') then raise exception 'invalid_role' using errcode = '22023'; end if;
  perform 1 from public.profiles where id = v_user for update;  -- serialise requests per user
  select id into v_id from public.payouts where idempotency_key = p_idempotency_key and user_id = v_user;
  if found then return v_id; end if;
  if not exists (select 1 from public.payout_destinations where id = p_destination_id and user_id = v_user) then
    raise exception 'destination_required' using errcode = '22023';
  end if;
  if p_amount_cents <= 0 or p_amount_cents > private.payable_available(v_user, p_role) then
    raise exception 'insufficient_available_funds' using errcode = '23514';
  end if;
  insert into public.payouts (user_id, role, destination_id, amount_cents, requested_by, idempotency_key)
  values (v_user, p_role, p_destination_id, p_amount_cents, v_user, p_idempotency_key) returning id into v_id;
  return v_id;
end $$;

create function public.finance_set_payout(p_payout_id uuid, p_status text, p_provider_ref text default null,
                                          p_failure text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_fin uuid := private.require_role('finance');
  p public.payouts;
begin
  select * into p from public.payouts where id = p_payout_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p_status not in ('approved', 'processing', 'paid', 'failed', 'cancelled') then raise exception 'invalid_status' using errcode = '22023'; end if;
  if p.status in ('paid', 'failed', 'cancelled') then raise exception 'already_final' using errcode = '55000'; end if;
  if p_status = 'paid' then
    perform private.post_journal('payout', p.id, 'Payout',
      jsonb_build_array(
        jsonb_build_object('account', case p.role when 'seller' then 'seller_payable' else 'courier_payable' end,
                           'owner', p.user_id, 'debit', p.amount_cents),
        jsonb_build_object('account', 'provider_clearing', 'credit', p.amount_cents)), 'payout:' || p.id);
  end if;
  update public.payouts set status = p_status, approved_by = case when p_status = 'approved' then v_fin else approved_by end,
         provider_ref = coalesce(p_provider_ref, provider_ref), failure_reason = p_failure,
         settled_at = case when p_status in ('paid', 'failed', 'cancelled') then now() end where id = p.id;
  perform private.audit('payout.' || p_status, 'payout', p.id::text);
end $$;

-- Matches captured provider payments with the provider's own total for a period.
create function public.finance_reconcile(p_provider text, p_from timestamptz, p_to timestamptz, p_provider_total_cents bigint)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_fin uuid := private.require_role('finance');
  v_ledger bigint;
  v_ex jsonb;
  v_id uuid;
begin
  select coalesce(sum(amount_cents - refunded_cents), 0) into v_ledger from public.payment_intents
   where provider = p_provider and captured_at >= p_from and captured_at < p_to;
  select coalesce(jsonb_agg(jsonb_build_object('intent_id', id, 'status', status, 'amount_cents', amount_cents)), '[]')
    into v_ex from public.payment_intents
   where provider = p_provider and created_at >= p_from and created_at < p_to
     and status in ('uncertain', 'reconciliation_required', 'provider_pending');
  insert into public.reconciliation_runs (provider, period_start, period_end, status, provider_total_cents, ledger_total_cents, exceptions, run_by)
  values (p_provider, p_from, p_to,
          case when v_ledger = p_provider_total_cents and v_ex = '[]' then 'matched' else 'exceptions' end,
          p_provider_total_cents, v_ledger, v_ex, v_fin) returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Scheduled housekeeping (pg_cron or the service role)
-- ---------------------------------------------------------------------------
create function public.expire_stale() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_unpaid int := 0;
  v_timeout int := 0;
  v_settled int := 0;
  v_cancel_codes int;
begin
  if coalesce(auth.role(), 'service_role') not in ('service_role') and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  for r in select id from public.orders where status = 'pending_payment' and expires_at <= now() for update skip locked loop
    perform private.fail_order(r.id, 'payment window expired', 'expired');
    v_unpaid := v_unpaid + 1;
  end loop;
  for r in select id, buyer_id, seller_user_id, number from public.seller_orders
            where status = 'awaiting_seller' and accept_by <= now() for update skip locked loop
    perform private.cancel_seller_order(r.id, 'timed_out', null, 'Seller did not respond in time');
    perform private.notify(r.buyer_id, 'order_timed_out', 'Order refunded', 'The seller did not respond to order ' || r.number || '. You were refunded.',
                           '/activity/order/' || r.id, jsonb_build_object('seller_order_id', r.id), true);
    perform private.notify(r.seller_user_id, 'order_timed_out', 'Order expired', 'Order ' || r.number || ' expired without a response.',
                           '/activity/order/' || r.id, jsonb_build_object('seller_order_id', r.id));
    v_timeout := v_timeout + 1;
  end loop;
  for r in select id from public.seller_orders where status = 'issue_window' and issue_window_ends_at <= now() for update skip locked loop
    perform private.settle_seller_order(r.id, null);
    v_settled := v_settled + 1;
  end loop;
  update public.handoff_challenges set expires_at = now() where consumed_at is null and expires_at > now() and created_at < now() - interval '1 day';
  get diagnostics v_cancel_codes = row_count;
  return jsonb_build_object('unpaid_orders_expired', v_unpaid, 'seller_timeouts', v_timeout, 'orders_settled', v_settled);
end $$;
