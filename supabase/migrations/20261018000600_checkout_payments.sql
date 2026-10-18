-- Checkout and payments. The client never sets a price, fee, stock level or payment result:
-- place_order() prices everything from the database, and payment results arrive from the wallet path
-- or from the trusted payment Edge Function through apply_payment_event().

create function private.log_order_event(p_so uuid, p_actor uuid, p_from public.seller_order_status,
                                        p_to public.seller_order_status, p_note text default null) returns void
language sql security definer set search_path = public as $$
  insert into public.order_events (seller_order_id, actor_id, from_status, to_status, note)
  values (p_so, p_actor, p_from, p_to, p_note)
$$;

-- Moves a seller order to a new status with an audit trail; the caller has already checked the move is legal.
create function private.set_so_status(p_so uuid, p_to public.seller_order_status, p_actor uuid, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_from public.seller_order_status;
begin
  select status into v_from from public.seller_orders where id = p_so for update;
  update public.seller_orders set status = p_to where id = p_so;
  perform private.log_order_event(p_so, p_actor, v_from, p_to, p_note);
end $$;

-- Gives back stock and slot capacity held for a seller order. Safe to call once per order.
create function private.release_holds(p_so uuid, p_booking_status public.booking_status default 'cancelled') returns void
language plpgsql security definer set search_path = public as $$
declare i record;
begin
  for i in select * from public.order_items where seller_order_id = p_so loop
    if i.type = 'goods' then
      if i.stock_committed then
        update public.listing_options set on_hand = on_hand + i.quantity where id = i.option_id and not unlimited;
      else
        update public.listing_options set reserved = greatest(0, reserved - i.quantity) where id = i.option_id and not unlimited;
      end if;
    else
      update public.service_slots set reserved = greatest(0, reserved - 1) where id = i.slot_id
        and exists (select 1 from public.bookings b where b.order_item_id = i.id and b.status in ('held', 'booked'));
    end if;
  end loop;
  update public.bookings set status = p_booking_status where seller_order_id = p_so and status in ('held', 'booked');
  update public.order_items set stock_committed = false where seller_order_id = p_so;
end $$;

-- ---------------------------------------------------------------------------
-- Refunds
-- ---------------------------------------------------------------------------
-- p_amount is in escrow value (items plus delivery). The buyer receives the share of it they actually paid;
-- any voucher-funded part is returned to the promotions expense account.
create function private.refund_seller_order(p_so uuid, p_amount bigint, p_reason text, p_requested_by uuid,
                                            p_approved_by uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  so public.seller_orders;
  v_intent public.payment_intents;
  v_escrow bigint;
  v_cash bigint;
  v_promo bigint;
  v_refund uuid := gen_random_uuid();
  v_dest text;
begin
  select * into so from public.seller_orders where id = p_so for update;
  v_escrow := so.subtotal_cents + so.delivery_fee_cents;
  if p_amount <= 0 or p_amount > v_escrow - so.refunded_cents then
    raise exception 'invalid_refund_amount' using errcode = '22023';
  end if;
  select * into v_intent from public.payment_intents where order_id = so.order_id order by created_at desc limit 1;
  v_cash := case when v_escrow = 0 then 0 else round(p_amount::numeric * so.total_cents / v_escrow)::bigint end;
  v_promo := p_amount - v_cash;
  v_dest := case when v_intent.method = 'wallet' then 'wallet' else 'provider' end;

  insert into public.refunds (id, payment_intent_id, seller_order_id, amount_cents, reason, status, destination,
                              requested_by, approved_by, settled_at)
  values (v_refund, v_intent.id, so.id, greatest(v_cash, 1), p_reason,
          case when v_dest = 'wallet' then 'succeeded' else 'pending' end, v_dest, p_requested_by, p_approved_by,
          case when v_dest = 'wallet' then now() end);

  if v_dest = 'wallet' then
    if v_cash > 0 then
      perform private.wallet_move(so.buyer_id, v_cash, 'refund', 'Refund ' || so.number, 'escrow', 'refund', v_refund, 'refund:' || v_refund);
    end if;
  elsif v_cash > 0 then
    perform private.post_journal('refund', v_refund, 'Refund ' || so.number,
      jsonb_build_array(jsonb_build_object('account', 'escrow', 'debit', v_cash),
                        jsonb_build_object('account', 'refunds_payable', 'credit', v_cash)), 'refund:' || v_refund);
  end if;
  if v_promo > 0 then
    perform private.post_journal('refund_promo', v_refund, 'Voucher reversal ' || so.number,
      jsonb_build_array(jsonb_build_object('account', 'escrow', 'debit', v_promo),
                        jsonb_build_object('account', 'promotions_expense', 'credit', v_promo)), 'refund_promo:' || v_refund);
  end if;

  update public.seller_orders set refunded_cents = refunded_cents + p_amount where id = so.id;
  update public.payment_intents set refunded_cents = refunded_cents + v_cash,
    status = case when refunded_cents + v_cash >= amount_cents then 'refunded'::public.payment_status
                  else 'partially_refunded' end
   where id = v_intent.id;
  perform private.notify(so.buyer_id, 'refund', 'Refund issued', 'Refund for order ' || so.number || ' is on its way.',
                         '/activity/order/' || so.id, jsonb_build_object('seller_order_id', so.id), true);
  return v_refund;
end $$;

-- Provider refunds settle later; called by the trusted payments function.
create function public.settle_provider_refund(p_refund_id uuid, p_success boolean, p_provider_ref text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare r public.refunds;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.refunds where id = p_refund_id for update;
  if not found or r.status <> 'pending' then return; end if;
  if p_success then
    perform private.post_journal('refund_settled', r.id, 'Provider refund paid',
      jsonb_build_array(jsonb_build_object('account', 'refunds_payable', 'debit', r.amount_cents),
                        jsonb_build_object('account', 'provider_clearing', 'credit', r.amount_cents)), 'refund_settled:' || r.id);
  end if;
  update public.refunds set status = case when p_success then 'succeeded' else 'failed' end,
         provider_ref = coalesce(p_provider_ref, provider_ref), settled_at = now() where id = r.id;
end $$;

-- Cancels a seller order that has not been settled and refunds whatever was paid.
create function private.cancel_seller_order(p_so uuid, p_to public.seller_order_status, p_actor uuid, p_note text)
returns void
language plpgsql security definer set search_path = public as $$
declare so public.seller_orders;
begin
  select * into so from public.seller_orders where id = p_so for update;
  perform private.release_holds(so.id);
  update public.delivery_jobs set status = 'cancelled' where seller_order_id = so.id and status in ('pending_assignment', 'assigned');
  if so.status <> 'awaiting_payment' and so.subtotal_cents + so.delivery_fee_cents - so.refunded_cents > 0 then
    perform private.refund_seller_order(so.id, so.subtotal_cents + so.delivery_fee_cents - so.refunded_cents, p_note, p_actor);
  end if;
  perform private.set_so_status(so.id, p_to, p_actor, p_note);
  update public.seller_orders set payout_state = 'none' where id = so.id;
end $$;

-- ---------------------------------------------------------------------------
-- Payment capture
-- ---------------------------------------------------------------------------
create function private.mark_order_paid(p_order uuid, p_ledger_done boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  so record;
  v_hours int := (private.setting('seller_accept_hours') #>> '{}')::int;
  v_conv uuid;
begin
  select * into o from public.orders where id = p_order for update;
  if o.status <> 'pending_payment' then return; end if;

  if not p_ledger_done and o.total_cents > 0 then
    perform private.post_journal('payment', o.id, 'Payment ' || o.number,
      jsonb_build_array(jsonb_build_object('account', 'provider_clearing', 'debit', o.total_cents),
                        jsonb_build_object('account', 'escrow', 'credit', o.total_cents)), 'pay:' || o.id);
  end if;
  if o.discount_cents > 0 then
    perform private.post_journal('voucher', o.id, 'Voucher funding ' || o.number,
      jsonb_build_array(jsonb_build_object('account', 'promotions_expense', 'debit', o.discount_cents),
                        jsonb_build_object('account', 'escrow', 'credit', o.discount_cents)), 'voucher:' || o.id);
  end if;

  update public.orders set status = 'paid', paid_at = now() where id = o.id;
  update public.payment_intents set status = 'captured', captured_at = now()
   where order_id = o.id and status in ('created', 'provider_pending', 'authorised');
  if o.voucher_code is not null then
    update public.vouchers set used_count = used_count + 1 where code = o.voucher_code;
  end if;

  for so in select * from public.seller_orders where order_id = o.id loop
    update public.seller_orders set status = 'awaiting_seller', accept_by = now() + make_interval(hours => v_hours)
     where id = so.id;
    perform private.log_order_event(so.id, o.buyer_id, 'awaiting_payment', 'awaiting_seller', 'payment captured');
    v_conv := private.ensure_order_conversation(so.id);
    perform private.system_message(v_conv, 'Order ' || so.number || ' placed. The seller has ' || v_hours || ' hours to accept.');
    perform private.notify(so.seller_user_id, 'order_new', 'New order ' || so.number, 'Accept it within ' || v_hours || ' hours.',
                           '/activity/order/' || so.id, jsonb_build_object('seller_order_id', so.id));
  end loop;
  perform private.notify(o.buyer_id, 'order_paid', 'Order placed', 'Order ' || o.number || ' was sent to the seller.',
                         '/activity/orders', jsonb_build_object('order_id', o.id), true);
end $$;

create function private.fail_order(p_order uuid, p_reason text, p_status public.order_status default 'payment_failed') returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  so record;
begin
  select * into o from public.orders where id = p_order for update;
  if o.status <> 'pending_payment' then return; end if;
  update public.orders set status = p_status where id = o.id;
  update public.payment_intents set status = case when p_status = 'expired' then 'expired'::public.payment_status else 'failed' end,
         failure_reason = p_reason where order_id = o.id and status in ('created', 'provider_pending', 'authorised');
  for so in select id from public.seller_orders where order_id = o.id loop
    perform private.release_holds(so.id, 'expired');
    perform private.set_so_status(so.id, 'cancelled', o.buyer_id, p_reason);
  end loop;
end $$;

-- Provider callbacks. Called only by the payments Edge Function with the service role,
-- after it has verified the provider signature. Replays are ignored.
create function public.apply_payment_event(p_provider text, p_event_id text, p_intent_id uuid, p_type text,
                                           p_payload jsonb default '{}', p_signature_valid boolean default true)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_intent public.payment_intents;
  v_webhook uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.provider_webhook_events (provider, provider_event_id, event_type, payload, signature_valid)
  values (p_provider, p_event_id, p_type, p_payload, p_signature_valid)
  on conflict (provider, provider_event_id) do nothing returning id into v_webhook;
  if v_webhook is null then return 'duplicate'; end if;
  if not p_signature_valid then
    update public.provider_webhook_events set status = 'ignored', error = 'bad signature', processed_at = now() where id = v_webhook;
    return 'ignored';
  end if;

  select * into v_intent from public.payment_intents where id = p_intent_id for update;
  if not found then
    update public.provider_webhook_events set status = 'failed', error = 'unknown intent', processed_at = now() where id = v_webhook;
    return 'unknown_intent';
  end if;
  insert into public.payment_events (payment_intent_id, event_type, from_status, provider_event_id, payload)
  values (v_intent.id, p_type, v_intent.status, p_event_id, p_payload);

  if p_type = 'payment.captured' then
    if (p_payload ->> 'amount_cents')::bigint is distinct from v_intent.amount_cents then
      update public.payment_intents set status = 'reconciliation_required', failure_reason = 'amount mismatch' where id = v_intent.id;
      update public.provider_webhook_events set status = 'failed', error = 'amount mismatch', processed_at = now() where id = v_webhook;
      return 'amount_mismatch';
    end if;
    perform private.mark_order_paid(v_intent.order_id);
  elsif p_type = 'payment.failed' then
    perform private.fail_order(v_intent.order_id, coalesce(p_payload ->> 'reason', 'payment failed'));
  end if;
  update public.provider_webhook_events set status = 'processed', processed_at = now() where id = v_webhook;
  return 'processed';
end $$;

create function public.attach_provider_reference(p_intent_id uuid, p_provider text, p_reference text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.payment_intents set provider = p_provider, provider_ref = p_reference,
         status = 'provider_pending' where id = p_intent_id and status = 'created';
end $$;

-- ---------------------------------------------------------------------------
-- place_order
-- ---------------------------------------------------------------------------
create function public.place_order(p_fulfilment public.fulfilment_method, p_method public.payment_method,
                                   p_idempotency_key text, p_address text default null,
                                   p_instructions text default '', p_voucher_code text default null,
                                   p_payment_method_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_profile public.profiles;
  v_existing public.orders;
  v_order public.orders;
  v_intent public.payment_intents;
  v_window int := (private.setting('payment_window_minutes') #>> '{}')::int;
  v_delivery_fee bigint := (private.setting('delivery_fee_cents') #>> '{}')::bigint;
  v_policy uuid;
  v_bps int;
  v_voucher public.vouchers;
  c record;
  v_item public.order_items;
  v_so uuid;
  v_seq int := 0;
  v_subtotal bigint := 0;
  v_delivery bigint := 0;
  v_discount bigint := 0;
  v_assigned bigint := 0;
  v_balance bigint;
  v_has_goods boolean := false;
  r record;
  v_share bigint;
begin
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then
    raise exception 'idempotency_key_required' using errcode = '22023';
  end if;
  select * into v_existing from public.orders where buyer_id = v_user and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('order_id', v_existing.id, 'number', v_existing.number, 'status', v_existing.status,
                              'total_cents', v_existing.total_cents, 'replayed', true);
  end if;

  select * into v_profile from public.profiles where id = v_user and deleted_at is null;
  if not found or v_profile.preferred_campus_id is null then
    raise exception 'profile_incomplete' using errcode = '55000';
  end if;
  if not exists (select 1 from public.cart_items where user_id = v_user) then
    raise exception 'cart_empty' using errcode = '55000';
  end if;
  if p_method = 'card' and not exists (select 1 from public.payment_methods where id = p_payment_method_id and user_id = v_user) then
    raise exception 'payment_method_required' using errcode = '22023';
  end if;

  select policy_id, bps into v_policy, v_bps from private.active_fee_bps();
  v_bps := coalesce(v_bps, 0);

  insert into public.orders (buyer_id, fulfilment, delivery_address, delivery_campus_id, delivery_instructions,
                             payment_method, idempotency_key, expires_at)
  values (v_user, p_fulfilment, case when p_fulfilment = 'vossie_delivery' then btrim(p_address) end,
          v_profile.preferred_campus_id, coalesce(p_instructions, ''), p_method, p_idempotency_key,
          now() + make_interval(mins => v_window))
  returning * into v_order;
  if p_fulfilment = 'vossie_delivery' and length(coalesce(btrim(p_address), '')) < 5 then
    raise exception 'address_required' using errcode = '22023';
  end if;

  for c in
    select ci.*, l.seller_id, l.type, l.campus_id as listing_campus, l.title, l.status as listing_status,
           l.handoff_available, l.delivery_eligible, l.mode, l.cancel_cutoff_hours,
           o.label as option_label, o.price_cents, o.active as option_active, o.on_hand, o.reserved, o.unlimited,
           s.status as seller_status, s.user_id as seller_user_id, s.campus_id as seller_campus
      from public.cart_items ci
      join public.listings l on l.id = ci.listing_id
      join public.listing_options o on o.id = ci.option_id
      join public.sellers s on s.id = l.seller_id
     where ci.user_id = v_user
     order by l.seller_id, ci.created_at
     for update of o
  loop
    if c.listing_status <> 'published' or c.seller_status <> 'active' or not c.option_active then
      raise exception 'item_unavailable: %', c.title using errcode = '55000';
    end if;
    if c.seller_user_id = v_user then raise exception 'own_listing' using errcode = '42501'; end if;
    if not (c.type = 'service' and c.mode = 'remote') and c.listing_campus <> v_profile.preferred_campus_id then
      raise exception 'wrong_campus: %', c.title using errcode = '55000';
    end if;
    if c.type = 'goods' then
      v_has_goods := true;
      if p_fulfilment = 'campus_handoff' and not c.handoff_available then raise exception 'handoff_unavailable: %', c.title using errcode = '55000'; end if;
      if p_fulfilment = 'vossie_delivery' and not c.delivery_eligible then raise exception 'delivery_unavailable: %', c.title using errcode = '55000'; end if;
      if not c.unlimited and c.on_hand - c.reserved < c.quantity then
        raise exception 'insufficient_stock: %', c.title using errcode = '55000';
      end if;
      update public.listing_options set reserved = reserved + c.quantity where id = c.option_id and not unlimited;
    else
      c.quantity := 1;
      if c.slot_id is null then raise exception 'slot_required: %', c.title using errcode = '22023'; end if;
      update public.service_slots set reserved = reserved + 1
       where id = c.slot_id and listing_id = c.listing_id and not cancelled and starts_at > now() and reserved < capacity;
      if not found then raise exception 'slot_unavailable: %', c.title using errcode = '55000'; end if;
    end if;

    select id into v_so from public.seller_orders where order_id = v_order.id and seller_id = c.seller_id;
    if v_so is null then
      v_seq := v_seq + 1;
      insert into public.seller_orders (order_id, number, seller_id, seller_user_id, buyer_id, campus_id, fulfilment, has_goods,
                                        subtotal_cents, total_cents, fee_policy_id)
      values (v_order.id, v_order.number || '-' || v_seq, c.seller_id, c.seller_user_id, v_user, v_profile.preferred_campus_id,
              p_fulfilment, false, 0, 0, v_policy)
      returning id into v_so;
    end if;
    insert into public.order_items (seller_order_id, listing_id, option_id, slot_id, type, title, option_label,
                                    unit_price_cents, quantity, line_total_cents, fee_bps, stock_committed)
    values (v_so, c.listing_id, c.option_id, c.slot_id, c.type, c.title, c.option_label,
            c.price_cents, c.quantity, c.price_cents * c.quantity, v_bps, false)
    returning * into v_item;
    if c.type = 'service' then
      insert into public.bookings (order_item_id, seller_order_id, buyer_id, seller_id, listing_id, slot_id, starts_at, ends_at,
                                   cancel_cutoff_at, hold_expires_at)
      select v_item.id, v_so, v_user, c.seller_id, c.listing_id, s.id, s.starts_at, s.ends_at,
             s.starts_at - make_interval(hours => c.cancel_cutoff_hours), v_order.expires_at
        from public.service_slots s where s.id = c.slot_id;
    end if;
    update public.seller_orders so set
      subtotal_cents = so.subtotal_cents + v_item.line_total_cents,
      has_goods = so.has_goods or c.type = 'goods'
     where so.id = v_so;
  end loop;

  -- delivery fee per seller order that has goods and is delivered by Vossie
  if p_fulfilment = 'vossie_delivery' then
    update public.seller_orders set delivery_fee_cents = v_delivery_fee where order_id = v_order.id and has_goods;
  end if;
  select coalesce(sum(subtotal_cents), 0), coalesce(sum(delivery_fee_cents), 0)
    into v_subtotal, v_delivery from public.seller_orders where order_id = v_order.id;

  -- voucher
  if p_voucher_code is not null and btrim(p_voucher_code) <> '' then
    select * into v_voucher from public.vouchers where code = upper(btrim(p_voucher_code)) and active
       and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
       and (max_uses is null or used_count < max_uses) for update;
    if not found or v_subtotal < v_voucher.min_subtotal_cents then
      raise exception 'invalid_voucher' using errcode = '22023';
    end if;
    v_discount := least(v_subtotal, coalesce(v_voucher.cents_off, round(v_subtotal::numeric * v_voucher.percent_off / 100)::bigint));
    v_order.voucher_code := v_voucher.code;
  end if;
  for r in select id, subtotal_cents from public.seller_orders where order_id = v_order.id order by created_at, id loop
    v_share := case when v_subtotal = 0 then 0 else floor(v_discount::numeric * r.subtotal_cents / v_subtotal)::bigint end;
    v_assigned := v_assigned + v_share;
    update public.seller_orders set discount_cents = v_share where id = r.id;
  end loop;
  if v_discount > v_assigned then  -- rounding remainder goes to the first order
    update public.seller_orders set discount_cents = discount_cents + (v_discount - v_assigned)
     where id = (select id from public.seller_orders where order_id = v_order.id order by created_at, id limit 1);
  end if;
  update public.seller_orders set
    total_cents = subtotal_cents + delivery_fee_cents - discount_cents,
    fee_cents = (select coalesce(sum(round(i.line_total_cents::numeric * i.fee_bps / 10000)), 0)::bigint
                   from public.order_items i where i.seller_order_id = public.seller_orders.id)
   where order_id = v_order.id;

  update public.orders set subtotal_cents = v_subtotal, delivery_fee_cents = v_delivery, discount_cents = v_discount,
         total_cents = v_subtotal + v_delivery - v_discount, voucher_code = v_order.voucher_code
   where id = v_order.id returning * into v_order;

  insert into public.payment_intents (order_id, buyer_id, amount_cents, method, payment_method_id, idempotency_key, expires_at,
                                      provider)
  values (v_order.id, v_user, v_order.total_cents, p_method, p_payment_method_id, p_idempotency_key, v_order.expires_at,
          case when p_method = 'wallet' then 'wallet' else 'none' end)
  returning * into v_intent;

  delete from public.cart_items where user_id = v_user;

  if p_method = 'wallet' and v_order.total_cents > 0 then
    v_balance := private.wallet_move(v_user, -v_order.total_cents, 'purchase', 'Order ' || v_order.number, 'escrow',
                                     'payment', v_order.id, 'pay:' || v_order.id);
  end if;
  if p_method = 'wallet' or v_order.total_cents = 0 then
    perform private.mark_order_paid(v_order.id, true);
  end if;
  select * into v_order from public.orders where id = v_order.id;
  return jsonb_build_object('order_id', v_order.id, 'number', v_order.number, 'status', v_order.status,
                            'total_cents', v_order.total_cents, 'payment_intent_id', v_intent.id,
                            'payment_method', p_method, 'replayed', false);
end $$;

-- Read-only price preview for the checkout screen; same rules as place_order, nothing is reserved.
create function public.quote_cart(p_fulfilment public.fulfilment_method, p_voucher_code text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_delivery_fee bigint := (private.setting('delivery_fee_cents') #>> '{}')::bigint;
  v_subtotal bigint := 0;
  v_sellers int := 0;
  v_delivery bigint := 0;
  v_discount bigint := 0;
  v_voucher public.vouchers;
begin
  select coalesce(sum(o.price_cents * case when l.type = 'service' then 1 else ci.quantity end), 0)
    into v_subtotal
    from public.cart_items ci join public.listing_options o on o.id = ci.option_id join public.listings l on l.id = ci.listing_id
   where ci.user_id = v_user;
  if p_fulfilment = 'vossie_delivery' then
    select count(distinct l.seller_id) into v_sellers
      from public.cart_items ci join public.listings l on l.id = ci.listing_id where ci.user_id = v_user and l.type = 'goods';
    v_delivery := v_sellers * v_delivery_fee;
  end if;
  if p_voucher_code is not null and btrim(p_voucher_code) <> '' then
    select * into v_voucher from public.vouchers where code = upper(btrim(p_voucher_code)) and active
       and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
       and (max_uses is null or used_count < max_uses);
    if not found or v_subtotal < v_voucher.min_subtotal_cents then
      return jsonb_build_object('valid_voucher', false, 'subtotal_cents', v_subtotal, 'delivery_fee_cents', v_delivery,
                                'discount_cents', 0, 'total_cents', v_subtotal + v_delivery);
    end if;
    v_discount := least(v_subtotal, coalesce(v_voucher.cents_off, round(v_subtotal::numeric * v_voucher.percent_off / 100)::bigint));
  end if;
  return jsonb_build_object('valid_voucher', p_voucher_code is null or v_discount > 0, 'subtotal_cents', v_subtotal,
                            'delivery_fee_cents', v_delivery, 'discount_cents', v_discount,
                            'total_cents', v_subtotal + v_delivery - v_discount);
end $$;
