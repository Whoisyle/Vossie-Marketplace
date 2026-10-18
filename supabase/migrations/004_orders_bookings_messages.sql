-- Migration: 004_orders_bookings_messages.sql
-- Orders, reservations, service bookings, handoffs, issue reporting, private order messages, and atomic workflows.
-- Implements contracts defined in docs/architecture/marketplace-mvp-backend-contracts.md

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. user_profiles: Protected private user profile and demo student number storage
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    student_number TEXT,                          -- protected demo student number, e.g. eduv12345
    display_name TEXT,
    avatar_url TEXT,
    preferred_campus TEXT NOT NULL DEFAULT 'potchefstroom',
    contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_campus ON user_profiles(preferred_campus);

-- 2. goods_orders: Physical goods orders and reservation lifecycle
CREATE TYPE goods_order_status AS ENUM (
    'requested',
    'accepted',
    'rejected',
    'cancelled',
    'expired',
    'completed',
    'issue_reported'
);

CREATE TABLE IF NOT EXISTS goods_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id),
    listing_id UUID NOT NULL REFERENCES listings(id),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price_cents BIGINT NOT NULL,
    total_price_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    campus_code TEXT NOT NULL,
    status goods_order_status NOT NULL DEFAULT 'requested',
    note TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    buyer_confirmed_at TIMESTAMPTZ,
    seller_confirmed_at TIMESTAMPTZ,
    issue_reported_at TIMESTAMPTZ,
    issue_reported_by UUID REFERENCES users(id),
    issue_reason TEXT,
    cancellation_requested_by UUID REFERENCES users(id),
    cancellation_requested_at TIMESTAMPTZ,
    cancellation_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goods_orders_buyer ON goods_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_goods_orders_seller ON goods_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_goods_orders_listing ON goods_orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_goods_orders_status ON goods_orders(status);
CREATE INDEX IF NOT EXISTS idx_goods_orders_campus ON goods_orders(campus_code);

-- 3. service_bookings: Bookings, slot holds, acceptance, and no-show lifecycle
CREATE TYPE service_booking_status AS ENUM (
    'requested',
    'accepted',
    'declined',
    'cancelled',
    'expired',
    'completed',
    'no_show_reported'
);

CREATE TABLE IF NOT EXISTS service_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID NOT NULL REFERENCES service_provider_profiles(id),
    service_id UUID NOT NULL REFERENCES services(id),
    slot_id UUID NOT NULL REFERENCES service_slots(id),
    status service_booking_status NOT NULL DEFAULT 'requested',
    note TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    no_show_reported_at TIMESTAMPTZ,
    no_show_reported_by UUID REFERENCES users(id),
    no_show_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_bookings_buyer ON service_bookings(buyer_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_provider ON service_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_service ON service_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_slot ON service_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_status ON service_bookings(status);

-- 4. order_messages: Private participant-only order communication
CREATE TABLE IF NOT EXISTS order_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES goods_orders(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_order_messages_order ON order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_sender ON order_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_recipient ON order_messages(recipient_id);

-- RLS Configuration
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can read own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Goods orders policies
CREATE POLICY "Buyers and sellers can read own goods orders" ON goods_orders
    FOR SELECT USING (
        auth.uid() = buyer_id
        OR EXISTS (
            SELECT 1 FROM seller_profiles sp
            WHERE sp.id = goods_orders.seller_id AND sp.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.user_id = auth.uid()
            AND m.role IN ('operations_staff', 'admin')
            AND m.state = 'active'
        )
    );

-- Service bookings policies
CREATE POLICY "Buyers and providers can read own bookings" ON service_bookings
    FOR SELECT USING (
        auth.uid() = buyer_id
        OR EXISTS (
            SELECT 1 FROM service_provider_profiles spp
            WHERE spp.id = service_bookings.provider_id AND spp.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.user_id = auth.uid()
            AND m.role IN ('operations_staff', 'admin')
            AND m.state = 'active'
        )
    );

-- Order messages policies
CREATE POLICY "Participants can read order messages" ON order_messages
    FOR SELECT USING (
        auth.uid() IN (sender_id, recipient_id)
        OR EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.user_id = auth.uid()
            AND m.role IN ('operations_staff', 'admin')
            AND m.state = 'active'
        )
    );

CREATE POLICY "Participants can insert order messages" ON order_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM goods_orders go
            WHERE go.id = order_messages.order_id
            AND (
                go.buyer_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM seller_profiles sp
                    WHERE sp.id = go.seller_id AND sp.user_id = auth.uid()
                )
            )
        )
    );

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goods_orders_updated_at BEFORE UPDATE ON goods_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_bookings_updated_at BEFORE UPDATE ON service_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

--------------------------------------------------------------------------------
-- Atomic RPC Database Functions
--------------------------------------------------------------------------------

-- 1. request_goods_order: Atomically reserves stock and creates order request
CREATE OR REPLACE FUNCTION request_goods_order(
    p_listing_id UUID,
    p_quantity INT,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_buyer_id UUID := auth.uid();
    v_listing listings%ROWTYPE;
    v_order goods_orders%ROWTYPE;
    v_seller_profile seller_profiles%ROWTYPE;
BEGIN
    IF v_buyer_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
    END IF;

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be greater than zero' USING ERRCODE = 'P0002';
    END IF;

    -- Lock the listing row for update to prevent concurrent race conditions
    SELECT * INTO v_listing FROM listings WHERE id = p_listing_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found' USING ERRCODE = 'P0003';
    END IF;

    IF v_listing.status != 'published' THEN
        RAISE EXCEPTION 'Listing is not available for purchase' USING ERRCODE = 'P0004';
    END IF;

    IF v_listing.inventory_count < p_quantity THEN
        RAISE EXCEPTION 'Insufficient inventory available. Available: %', v_listing.inventory_count USING ERRCODE = 'P0005';
    END IF;

    SELECT * INTO v_seller_profile FROM seller_profiles WHERE id = v_listing.seller_id;
    IF v_seller_profile.user_id = v_buyer_id THEN
        RAISE EXCEPTION 'Sellers cannot purchase their own listings' USING ERRCODE = 'P0006';
    END IF;

    -- Atomically reserve inventory
    UPDATE listings
    SET inventory_count = inventory_count - p_quantity,
        status = CASE WHEN (inventory_count - p_quantity) = 0 THEN 'sold_out'::listing_status ELSE status END,
        updated_at = now()
    WHERE id = p_listing_id;

    -- Create goods order with 24-hour expiry
    INSERT INTO goods_orders (
        buyer_id,
        seller_id,
        listing_id,
        quantity,
        unit_price_cents,
        total_price_cents,
        currency,
        campus_code,
        status,
        note,
        expires_at
    ) VALUES (
        v_buyer_id,
        v_listing.seller_id,
        v_listing.id,
        p_quantity,
        v_listing.price_cents,
        v_listing.price_cents * p_quantity,
        v_listing.currency,
        v_listing.campus_code,
        'requested',
        p_note,
        now() + interval '24 hours'
    )
    RETURNING * INTO v_order;

    -- Insert audit event
    INSERT INTO audit_events (
        actor_user_id,
        action,
        target_type,
        target_id,
        scope,
        outcome,
        metadata
    ) VALUES (
        v_buyer_id,
        'order.requested',
        'goods_order',
        v_order.id,
        jsonb_build_object('campus', v_order.campus_code),
        'success',
        jsonb_build_object('quantity', p_quantity, 'total_price_cents', v_order.total_price_cents)
    );

    RETURN to_jsonb(v_order);
END;
$$;

-- 2. respond_goods_order: Seller accepts or rejects; rejection restores inventory
CREATE OR REPLACE FUNCTION respond_goods_order(
    p_order_id UUID,
    p_accept BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_order goods_orders%ROWTYPE;
BEGIN
    SELECT * INTO v_order FROM goods_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0003';
    END IF;

    -- Verify seller ownership
    IF NOT EXISTS (
        SELECT 1 FROM seller_profiles sp
        WHERE sp.id = v_order.seller_id AND sp.user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: only seller can respond to this order' USING ERRCODE = '42501';
    END IF;

    IF v_order.status != 'requested' THEN
        RAISE EXCEPTION 'Order is not in requested state' USING ERRCODE = 'P0007';
    END IF;

    IF now() >= v_order.expires_at THEN
        -- Expire the order and release inventory
        UPDATE goods_orders SET status = 'expired', updated_at = now() WHERE id = p_order_id;
        UPDATE listings
        SET inventory_count = inventory_count + v_order.quantity,
            status = 'published',
            updated_at = now()
        WHERE id = v_order.listing_id;
        RAISE EXCEPTION 'Order request has expired' USING ERRCODE = 'P0008';
    END IF;

    IF p_accept THEN
        UPDATE goods_orders
        SET status = 'accepted', updated_at = now()
        WHERE id = p_order_id
        RETURNING * INTO v_order;
    ELSE
        -- Rejected: release reserved inventory back to listing
        UPDATE goods_orders
        SET status = 'rejected', updated_at = now()
        WHERE id = p_order_id
        RETURNING * INTO v_order;

        UPDATE listings
        SET inventory_count = inventory_count + v_order.quantity,
            status = 'published',
            updated_at = now()
        WHERE id = v_order.listing_id;
    END IF;

    -- Audit event
    INSERT INTO audit_events (
        actor_user_id,
        action,
        target_type,
        target_id,
        outcome,
        metadata
    ) VALUES (
        v_user_id,
        CASE WHEN p_accept THEN 'order.accepted' ELSE 'order.rejected' END,
        'goods_order',
        v_order.id,
        'success',
        jsonb_build_object('status', v_order.status)
    );

    RETURN to_jsonb(v_order);
END;
$$;

-- 3. cancel_goods_order: Buyer cancels pending order; restores inventory
CREATE OR REPLACE FUNCTION cancel_goods_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_buyer_id UUID := auth.uid();
    v_order goods_orders%ROWTYPE;
BEGIN
    SELECT * INTO v_order FROM goods_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0003';
    END IF;

    IF v_order.buyer_id != v_buyer_id THEN
        RAISE EXCEPTION 'Unauthorized: only buyer can cancel a pending request' USING ERRCODE = '42501';
    END IF;

    IF v_order.status != 'requested' THEN
        RAISE EXCEPTION 'Only pending requested orders can be cancelled directly by buyer' USING ERRCODE = 'P0007';
    END IF;

    UPDATE goods_orders
    SET status = 'cancelled', updated_at = now()
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    -- Release reserved inventory back
    UPDATE listings
    SET inventory_count = inventory_count + v_order.quantity,
        status = 'published',
        updated_at = now()
    WHERE id = v_order.listing_id;

    -- Audit event
    INSERT INTO audit_events (
        actor_user_id,
        action,
        target_type,
        target_id,
        outcome,
        metadata
    ) VALUES (
        v_buyer_id,
        'order.cancelled',
        'goods_order',
        v_order.id,
        'success',
        jsonb_build_object('quantity', v_order.quantity)
    );

    RETURN to_jsonb(v_order);
END;
$$;

-- 4. confirm_goods_handoff: Independent buyer/seller confirmation; completes when both confirmed
CREATE OR REPLACE FUNCTION confirm_goods_handoff(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_order goods_orders%ROWTYPE;
    v_is_buyer BOOLEAN := FALSE;
    v_is_seller BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_order FROM goods_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0003';
    END IF;

    IF v_order.status != 'accepted' THEN
        RAISE EXCEPTION 'Handoff can only be confirmed for accepted orders' USING ERRCODE = 'P0009';
    END IF;

    IF v_order.buyer_id = v_user_id THEN
        v_is_buyer := TRUE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM seller_profiles sp
        WHERE sp.id = v_order.seller_id AND sp.user_id = v_user_id
    ) THEN
        v_is_seller := TRUE;
    END IF;

    IF NOT (v_is_buyer OR v_is_seller) THEN
        RAISE EXCEPTION 'Unauthorized: must be buyer or seller' USING ERRCODE = '42501';
    END IF;

    IF v_is_buyer THEN
        v_order.buyer_confirmed_at := now();
    END IF;

    IF v_is_seller THEN
        v_order.seller_confirmed_at := now();
    END IF;

    -- If both confirmed and no unresolved issue, mark completed
    IF v_order.buyer_confirmed_at IS NOT NULL AND v_order.seller_confirmed_at IS NOT NULL THEN
        v_order.status := 'completed';
    END IF;

    UPDATE goods_orders
    SET buyer_confirmed_at = v_order.buyer_confirmed_at,
        seller_confirmed_at = v_order.seller_confirmed_at,
        status = v_order.status,
        updated_at = now()
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    -- Audit event
    INSERT INTO audit_events (
        actor_user_id,
        action,
        target_type,
        target_id,
        outcome,
        metadata
    ) VALUES (
        v_user_id,
        'order.handoff_confirmed',
        'goods_order',
        v_order.id,
        'success',
        jsonb_build_object('status', v_order.status, 'is_buyer', v_is_buyer, 'is_seller', v_is_seller)
    );

    RETURN to_jsonb(v_order);
END;
$$;

-- 5. report_goods_issue: Reports handoff problem; freezes order for staff review
CREATE OR REPLACE FUNCTION report_goods_issue(
    p_order_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_order goods_orders%ROWTYPE;
BEGIN
    SELECT * INTO v_order FROM goods_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0003';
    END IF;

    IF NOT (
        v_order.buyer_id = v_user_id OR
        EXISTS (
            SELECT 1 FROM seller_profiles sp
            WHERE sp.id = v_order.seller_id AND sp.user_id = v_user_id
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized: must be buyer or seller' USING ERRCODE = '42501';
    END IF;

    IF v_order.status NOT IN ('accepted', 'requested') THEN
        RAISE EXCEPTION 'Cannot report issue on order in status %', v_order.status USING ERRCODE = 'P0010';
    END IF;

    UPDATE goods_orders
    SET status = 'issue_reported',
        issue_reported_by = v_user_id,
        issue_reported_at = now(),
        issue_reason = p_reason,
        updated_at = now()
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    -- Audit event
    INSERT INTO audit_events (
        actor_user_id,
        action,
        target_type,
        target_id,
        outcome,
        metadata
    ) VALUES (
        v_user_id,
        'order.issue_reported',
        'goods_order',
        v_order.id,
        'success',
        jsonb_build_object('reason', p_reason)
    );

    RETURN to_jsonb(v_order);
END;
$$;

-- 6. request_service_booking: Concurrency-safe service slot booking
CREATE OR REPLACE FUNCTION request_service_booking(
    p_service_id UUID,
    p_slot_id UUID,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_buyer_id UUID := auth.uid();
    v_service services%ROWTYPE;
    v_slot service_slots%ROWTYPE;
    v_booking service_bookings%ROWTYPE;
BEGIN
    IF v_buyer_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_service FROM services WHERE id = p_service_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service not found' USING ERRCODE = 'P0003';
    END IF;

    -- Lock slot
    SELECT * INTO v_slot FROM service_slots WHERE id = p_slot_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Slot not found' USING ERRCODE = 'P0003';
    END IF;

    IF NOT v_slot.is_available THEN
        RAISE EXCEPTION 'Slot is no longer available' USING ERRCODE = 'P0011';
    END IF;

    -- Mark slot held
    UPDATE service_slots
    SET is_available = FALSE
    WHERE id = p_slot_id;

    INSERT INTO service_bookings (
        buyer_id,
        provider_id,
        service_id,
        slot_id,
        status,
        note,
        expires_at
    ) VALUES (
        v_buyer_id,
        v_service.provider_id,
        v_service.id,
        v_slot.id,
        'requested',
        p_note,
        now() + interval '24 hours'
    )
    RETURNING * INTO v_booking;

    -- Audit event
    INSERT INTO audit_events (
        actor_user_id,
        action,
        target_type,
        target_id,
        outcome
    ) VALUES (
        v_buyer_id,
        'booking.requested',
        'service_booking',
        v_booking.id,
        'success'
    );

    RETURN to_jsonb(v_booking);
END;
$$;

-- 7. respond_service_booking: Provider accepts or declines booking
CREATE OR REPLACE FUNCTION respond_service_booking(
    p_booking_id UUID,
    p_accept BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_booking service_bookings%ROWTYPE;
BEGIN
    SELECT * INTO v_booking FROM service_bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0003';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM service_provider_profiles spp
        WHERE spp.id = v_booking.provider_id AND spp.user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: only provider can respond to booking' USING ERRCODE = '42501';
    END IF;

    IF v_booking.status != 'requested' THEN
        RAISE EXCEPTION 'Booking is not in requested state' USING ERRCODE = 'P0007';
    END IF;

    IF p_accept THEN
        UPDATE service_bookings
        SET status = 'accepted', updated_at = now()
        WHERE id = p_booking_id
        RETURNING * INTO v_booking;
    ELSE
        UPDATE service_bookings
        SET status = 'declined', updated_at = now()
        WHERE id = p_booking_id
        RETURNING * INTO v_booking;

        -- Free slot
        UPDATE service_slots
        SET is_available = TRUE
        WHERE id = v_booking.slot_id;
    END IF;

    -- Audit event
    INSERT INTO audit_events (
        actor_user_id,
        action,
        target_type,
        target_id,
        outcome
    ) VALUES (
        v_user_id,
        CASE WHEN p_accept THEN 'booking.accepted' ELSE 'booking.declined' END,
        'service_booking',
        v_booking.id,
        'success'
    );

    RETURN to_jsonb(v_booking);
END;
$$;

-- 8. cancel_service_booking: Cancels booking before start, restores slot
CREATE OR REPLACE FUNCTION cancel_service_booking(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_booking service_bookings%ROWTYPE;
BEGIN
    SELECT * INTO v_booking FROM service_bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0003';
    END IF;

    IF NOT (
        v_booking.buyer_id = v_user_id OR
        EXISTS (
            SELECT 1 FROM service_provider_profiles spp
            WHERE spp.id = v_booking.provider_id AND spp.user_id = v_user_id
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized to cancel booking' USING ERRCODE = '42501';
    END IF;

    UPDATE service_bookings
    SET status = 'cancelled', updated_at = now()
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;

    -- Free slot
    UPDATE service_slots
    SET is_available = TRUE
    WHERE id = v_booking.slot_id;

    -- Audit event
    INSERT INTO audit_events (
        actor_user_id,
        action,
        target_type,
        target_id,
        outcome
    ) VALUES (
        v_user_id,
        'booking.cancelled',
        'service_booking',
        v_booking.id,
        'success'
    );

    RETURN to_jsonb(v_booking);
END;
$$;

-- 9. report_service_no_show: Reports service no-show for staff review
CREATE OR REPLACE FUNCTION report_service_no_show(
    p_booking_id UUID,
    p_details TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_booking service_bookings%ROWTYPE;
BEGIN
    SELECT * INTO v_booking FROM service_bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0003';
    END IF;

    IF NOT (
        v_booking.buyer_id = v_user_id OR
        EXISTS (
            SELECT 1 FROM service_provider_profiles spp
            WHERE spp.id = v_booking.provider_id AND spp.user_id = v_user_id
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized to report no-show' USING ERRCODE = '42501';
    END IF;

    UPDATE service_bookings
    SET status = 'no_show_reported',
        no_show_reported_by = v_user_id,
        no_show_reported_at = now(),
        no_show_details = p_details,
        updated_at = now()
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;

    -- Audit event
    INSERT INTO audit_events (
        actor_user_id,
        action,
        target_type,
        target_id,
        outcome,
        metadata
    ) VALUES (
        v_user_id,
        'booking.no_show_reported',
        'service_booking',
        v_booking.id,
        'success',
        jsonb_build_object('details', p_details)
    );

    RETURN to_jsonb(v_booking);
END;
$$;

-- 10. send_order_message: Sends private message within order context
CREATE OR REPLACE FUNCTION send_order_message(
    p_order_id UUID,
    p_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_order goods_orders%ROWTYPE;
    v_recipient_id UUID;
    v_seller_user_id UUID;
    v_message order_messages%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
    END IF;

    IF trim(p_body) = '' THEN
        RAISE EXCEPTION 'Message body cannot be empty' USING ERRCODE = 'P0012';
    END IF;

    SELECT * INTO v_order FROM goods_orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0003';
    END IF;

    SELECT user_id INTO v_seller_user_id FROM seller_profiles WHERE id = v_order.seller_id;

    IF v_user_id = v_order.buyer_id THEN
        v_recipient_id := v_seller_user_id;
    ELSIF v_user_id = v_seller_user_id THEN
        v_recipient_id := v_order.buyer_id;
    ELSE
        RAISE EXCEPTION 'Unauthorized: only order participants can send messages' USING ERRCODE = '42501';
    END IF;

    INSERT INTO order_messages (
        order_id,
        sender_id,
        recipient_id,
        body
    ) VALUES (
        p_order_id,
        v_user_id,
        v_recipient_id,
        trim(p_body)
    )
    RETURNING * INTO v_message;

    RETURN to_jsonb(v_message);
END;
$$;
