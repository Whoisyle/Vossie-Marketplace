-- ============================================================================
-- VOSSIE MARKETPLACE — MASTER ALL-IN-ONE DATABASE SCHEMA & MOCK DATA
-- ============================================================================
-- Complete, self-contained, fully idempotent setup for Supabase Postgres.
-- Run in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/elrqoyiegcnnjmjnjlja/sql)
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SAFE CUSTOM ENUMS (Idempotent)
DO $$ BEGIN
    CREATE TYPE membership_role AS ENUM ('buyer', 'seller', 'service_provider', 'courier', 'operations_staff', 'finance_staff', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE membership_state AS ENUM ('invited', 'active', 'suspended', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE listing_type AS ENUM ('goods', 'service');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE listing_status AS ENUM ('draft', 'checking', 'flagged', 'under_review', 'published', 'paused', 'sold_out', 'archived', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE goods_order_status AS ENUM ('requested', 'accepted', 'rejected', 'cancelled', 'expired', 'completed', 'issue_reported');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE service_booking_status AS ENUM ('requested', 'accepted', 'declined', 'cancelled', 'expired', 'completed', 'no_show_reported');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE flag_status AS ENUM ('open', 'under_review', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('created', 'provider_pending', 'authorised', 'captured', 'reconciled', 'failed', 'uncertain', 'refund_pending', 'partially_refunded', 'refunded', 'disputed', 'reconciliation_required');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE ledger_account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. UPDATED-AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. BASE IDENTITY & ACCESS TABLES
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending_verification',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_external_id ON public.users(external_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY,
    student_number TEXT,
    display_name TEXT,
    avatar_url TEXT,
    preferred_campus TEXT NOT NULL DEFAULT 'potchefstroom',
    contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_campus ON public.user_profiles(preferred_campus);

CREATE TABLE IF NOT EXISTS public.identity_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL,
    subject TEXT NOT NULL,
    tenant_id TEXT,
    issuer TEXT NOT NULL,
    claims_json JSONB NOT NULL DEFAULT '{}',
    verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    UNIQUE (provider, subject)
);

CREATE TABLE IF NOT EXISTS public.student_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    institution_domain TEXT NOT NULL,
    campus_code TEXT NOT NULL,
    campus_name TEXT NOT NULL,
    enrollment_status TEXT NOT NULL,
    evidence_source TEXT NOT NULL,
    evidence_ref TEXT,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role membership_role NOT NULL,
    state membership_state NOT NULL DEFAULT 'invited',
    campus_codes TEXT[] NOT NULL DEFAULT '{}',
    resource_scopes TEXT[] NOT NULL DEFAULT '{}',
    invited_by UUID,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID,
    revoked_reason TEXT,
    UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.staff_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID NOT NULL,
    target_email TEXT NOT NULL,
    requested_role membership_role NOT NULL,
    campus_codes TEXT[] NOT NULL DEFAULT '{}',
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL,
    provider_session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    scope JSONB NOT NULL DEFAULT '{}',
    correlation_id UUID,
    outcome TEXT NOT NULL,
    error_code TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CAMPUSES, CATEGORIES & PROFILES
CREATE TABLE IF NOT EXISTS public.campuses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.categories(id),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.category_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    attribute_key TEXT NOT NULL,
    attribute_type TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_values JSONB,
    unit TEXT,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (category_id, attribute_key, version)
);

CREATE TABLE IF NOT EXISTS public.seller_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    business_name TEXT NOT NULL,
    business_description TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    campus_code TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    verification_notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_provider_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    business_name TEXT NOT NULL,
    business_description TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    campus_code TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.courier_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    campus_codes TEXT[] NOT NULL DEFAULT '{}',
    vehicle_type TEXT DEFAULT 'walking',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. LISTINGS, MEDIA & SERVICES
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    type listing_type NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    status listing_status NOT NULL DEFAULT 'draft',
    campus_code TEXT NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}',
    condition TEXT,
    inventory_count INT NOT NULL DEFAULT 1,
    max_per_order INT,
    fulfillment_type TEXT,
    package_dimensions JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_campus ON public.listings(campus_code);

CREATE TABLE IF NOT EXISTS public.listing_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listing_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    attribute_key TEXT NOT NULL,
    attribute_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (listing_id, attribute_key)
);

CREATE TABLE IF NOT EXISTS public.listing_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    variant_sku TEXT NOT NULL,
    variant_attributes JSONB NOT NULL DEFAULT '{}',
    quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (listing_id, variant_sku)
);

CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.service_provider_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    hourly_rate_cents BIGINT NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'draft',
    campus_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    service_definition_id UUID,
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    max_bookings INT NOT NULL DEFAULT 1,
    current_bookings INT NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.slot_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL REFERENCES public.service_slots(id) ON DELETE CASCADE,
    buyer_user_id UUID NOT NULL,
    checkout_session_id UUID,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (slot_id, buyer_user_id)
);

CREATE TABLE IF NOT EXISTS public.listing_policy_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    check_type TEXT NOT NULL,
    status TEXT NOT NULL,
    details JSONB,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listing_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    reporter_user_id UUID NOT NULL,
    flag_type TEXT NOT NULL,
    description TEXT,
    status flag_status NOT NULL DEFAULT 'open',
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moderation_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    flag_id UUID REFERENCES public.listing_flags(id) ON DELETE SET NULL,
    assigned_to UUID,
    status TEXT NOT NULL DEFAULT 'open',
    decision TEXT,
    decision_notes TEXT,
    decided_by UUID,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. MONEY, PAYMENTS & DOUBLE-ENTRY LEDGER
CREATE TABLE IF NOT EXISTS public.payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_user_id UUID NOT NULL,
    checkout_session_id UUID NOT NULL,
    amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    provider TEXT NOT NULL,
    provider_payment_intent_id TEXT,
    provider_payment_method_id TEXT,
    status payment_status NOT NULL DEFAULT 'created',
    capture_mode TEXT NOT NULL DEFAULT 'automatic',
    metadata JSONB NOT NULL DEFAULT '{}',
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    captured_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT
);

CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id UUID NOT NULL REFERENCES public.payment_intents(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    provider_event_type TEXT,
    amount_cents BIGINT,
    currency TEXT,
    raw_payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processing_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
    processing_status TEXT NOT NULL DEFAULT 'pending',
    processing_error TEXT,
    related_payment_intent_id UUID REFERENCES public.payment_intents(id),
    idempotency_key TEXT NOT NULL UNIQUE,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type ledger_account_type NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    reference_type TEXT NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.ledger_transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.ledger_accounts(id),
    direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    currency TEXT NOT NULL DEFAULT 'ZAR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seller_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    available_cents BIGINT NOT NULL DEFAULT 0,
    pending_cents BIGINT NOT NULL DEFAULT 0,
    reserved_cents BIGINT NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (seller_id, currency)
);

CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id),
    amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    status TEXT NOT NULL DEFAULT 'pending',
    provider_payout_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id UUID NOT NULL REFERENCES public.payment_intents(id),
    order_id UUID,
    amount_cents BIGINT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id UUID NOT NULL REFERENCES public.payment_intents(id),
    order_id UUID,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    amount_cents BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- 8. ORDERS, BOOKINGS, DELIVERY & MESSAGES
CREATE TABLE IF NOT EXISTS public.goods_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id),
    listing_id UUID NOT NULL REFERENCES public.listings(id),
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
    issue_reported_by UUID,
    issue_reason TEXT,
    cancellation_requested_by UUID,
    cancellation_requested_at TIMESTAMPTZ,
    cancellation_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goods_orders_buyer ON public.goods_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_goods_orders_seller ON public.goods_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_goods_orders_listing ON public.goods_orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_goods_orders_status ON public.goods_orders(status);

CREATE TABLE IF NOT EXISTS public.service_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL,
    provider_id UUID NOT NULL REFERENCES public.service_provider_profiles(id),
    service_id UUID NOT NULL REFERENCES public.services(id),
    slot_id UUID NOT NULL REFERENCES public.service_slots(id),
    status service_booking_status NOT NULL DEFAULT 'requested',
    note TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    no_show_reported_at TIMESTAMPTZ,
    no_show_reported_by UUID,
    no_show_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.delivery_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.goods_orders(id) ON DELETE CASCADE,
    courier_id UUID REFERENCES public.courier_profiles(id),
    pickup_campus TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_courier',
    tracking_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.delivery_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.delivery_jobs(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    note TEXT,
    location TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.goods_orders(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_order_messages_order ON public.order_messages(order_id);

CREATE TABLE IF NOT EXISTS public.dispute_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.goods_orders(id),
    opened_by UUID NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    resolution_notes TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES public.dispute_cases(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cancellation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.goods_orders(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    resolved_at TIMESTAMPTZ
);

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;

-- Campuses & Categories: Public Read
DROP POLICY IF EXISTS "Public can read active campuses" ON public.campuses;
CREATE POLICY "Public can read active campuses" ON public.campuses FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can read active categories" ON public.categories;
CREATE POLICY "Public can read active categories" ON public.categories FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can read category attributes" ON public.category_attributes;
CREATE POLICY "Public can read category attributes" ON public.category_attributes FOR SELECT USING (TRUE);

-- Listings: Public Read Published, Sellers Manage Own
DROP POLICY IF EXISTS "Public can view published listings" ON public.listings;
CREATE POLICY "Public can view published listings" ON public.listings FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Sellers can manage own listings" ON public.listings;
CREATE POLICY "Sellers can manage own listings" ON public.listings FOR ALL
    USING (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()))
    WITH CHECK (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Public can view listing media" ON public.listing_media;
CREATE POLICY "Public can view listing media" ON public.listing_media FOR SELECT USING (TRUE);

-- Services: Public Read Published, Providers Manage Own
DROP POLICY IF EXISTS "Public can view published services" ON public.services;
CREATE POLICY "Public can view published services" ON public.services FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Providers can manage own services" ON public.services;
CREATE POLICY "Providers can manage own services" ON public.services FOR ALL
    USING (provider_id IN (SELECT id FROM public.service_provider_profiles WHERE user_id = auth.uid()))
    WITH CHECK (provider_id IN (SELECT id FROM public.service_provider_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Public can view available slots" ON public.service_slots;
CREATE POLICY "Public can view available slots" ON public.service_slots FOR SELECT USING (is_available = TRUE AND NOT is_blocked);

-- Profiles: Public Read Basic info, Users/Sellers Manage Own
DROP POLICY IF EXISTS "Public can view user profiles" ON public.user_profiles;
CREATE POLICY "Public can view user profiles" ON public.user_profiles FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can update own user profile" ON public.user_profiles;
CREATE POLICY "Users can update own user profile" ON public.user_profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Public can read active sellers" ON public.seller_profiles;
CREATE POLICY "Public can read active sellers" ON public.seller_profiles FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Sellers can manage own profile" ON public.seller_profiles;
CREATE POLICY "Sellers can manage own profile" ON public.seller_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can read active providers" ON public.service_provider_profiles;
CREATE POLICY "Public can read active providers" ON public.service_provider_profiles FOR SELECT USING (status = 'active');

-- Orders & Messages: Demo & Participants Read
DROP POLICY IF EXISTS "Order participants can view orders" ON public.goods_orders;
CREATE POLICY "Order participants can view orders" ON public.goods_orders FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Order participants can view messages" ON public.order_messages;
CREATE POLICY "Order participants can view messages" ON public.order_messages FOR SELECT USING (TRUE);

-- 10. ATOMIC RPC FUNCTIONS
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
    v_listing public.listings%ROWTYPE;
    v_order public.goods_orders%ROWTYPE;
BEGIN
    IF v_buyer_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found' USING ERRCODE = 'P0003';
    END IF;

    IF v_listing.inventory_count < p_quantity THEN
        RAISE EXCEPTION 'Insufficient inventory available. Available: %', v_listing.inventory_count USING ERRCODE = 'P0005';
    END IF;

    UPDATE public.listings
    SET inventory_count = inventory_count - p_quantity,
        status = CASE WHEN (inventory_count - p_quantity) = 0 THEN 'sold_out'::listing_status ELSE status END,
        updated_at = now()
    WHERE id = p_listing_id;

    INSERT INTO public.goods_orders (
        buyer_id, seller_id, listing_id, quantity, unit_price_cents,
        total_price_cents, currency, campus_code, status, note, expires_at
    ) VALUES (
        v_buyer_id, v_listing.seller_id, v_listing.id, p_quantity, v_listing.price_cents,
        v_listing.price_cents * p_quantity, v_listing.currency, v_listing.campus_code,
        'requested', p_note, now() + interval '24 hours'
    ) RETURNING * INTO v_order;

    RETURN to_jsonb(v_order);
END;
$$;

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
    v_order public.goods_orders%ROWTYPE;
BEGIN
    SELECT * INTO v_order FROM public.goods_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0003';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = v_order.seller_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: only seller may respond' USING ERRCODE = 'P0002';
    END IF;

    IF v_order.status != 'requested' THEN
        RAISE EXCEPTION 'Order is not in requested status' USING ERRCODE = 'P0006';
    END IF;

    IF p_accept THEN
        UPDATE public.goods_orders SET status = 'accepted', updated_at = now() WHERE id = p_order_id RETURNING * INTO v_order;
    ELSE
        UPDATE public.goods_orders SET status = 'rejected', updated_at = now() WHERE id = p_order_id RETURNING * INTO v_order;
        UPDATE public.listings
        SET inventory_count = inventory_count + v_order.quantity,
            status = 'published',
            updated_at = now()
        WHERE id = v_order.listing_id;
    END IF;

    RETURN to_jsonb(v_order);
END;
$$;

-- 11. COMPLETE MOCK DATA SEED
-- A. All 12 Eduvos Campuses
INSERT INTO public.campuses (id, name, sort_order) VALUES
    ('midrand-head-office', 'Midrand (Head Office)', 1),
    ('bedfordview', 'Bedfordview', 2),
    ('pretoria', 'Pretoria', 3),
    ('potchefstroom', 'Potchefstroom', 4),
    ('vaal-vanderbijlpark', 'Vaal (Vanderbijlpark)', 5),
    ('bloemfontein', 'Bloemfontein', 6),
    ('durban-umhlanga', 'Durban (Umhlanga)', 7),
    ('east-london', 'East London', 8),
    ('nelson-mandela-bay-gqeberha', 'Nelson Mandela Bay (Gqeberha)', 9),
    ('cape-town-mowbray', 'Cape Town (Mowbray)', 10),
    ('tyger-valley-cape-town', 'Tyger Valley (Cape Town)', 11),
    ('nelspruit-mbombela', 'Nelspruit (Mbombela)', 12)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

-- B. Categories
INSERT INTO public.categories (code, name, sort_order) VALUES
    ('books', 'Books & Study Materials', 1),
    ('food', 'Campus Food & Treats', 2),
    ('fashion', 'Student Fashion & Apparel', 3),
    ('electronics', 'Tech & Devices', 4),
    ('services', 'Peer Tutoring & Student Services', 5)
ON CONFLICT (code) DO NOTHING;

-- C. Core Ledger Accounts
INSERT INTO public.ledger_accounts (code, name, type) VALUES
    ('1000', 'Cash - Payment Provider', 'asset'),
    ('1010', 'Funds Held for Sellers', 'liability'),
    ('1020', 'Funds Held for Couriers', 'liability'),
    ('1030', 'Escrow - Fulfillment Waitlist', 'liability'),
    ('2000', 'Platform Revenue', 'revenue'),
    ('2010', 'Transaction Fees', 'revenue'),
    ('2020', 'Delivery Fees Collected', 'revenue'),
    ('3000', 'Seller Payouts Payable', 'liability'),
    ('3010', 'Courier Payouts Payable', 'liability'),
    ('4000', 'Refunds', 'expense'),
    ('4010', 'Chargebacks', 'expense'),
    ('4020', 'Platform Costs', 'expense')
ON CONFLICT (code) DO NOTHING;

-- D. Insert Students into auth.users (Supabase Auth compatible)
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
) VALUES
    ('11111111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'avery.demo@vossie.net', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Avery Demo"}', false, now(), now()),
    ('11111111-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'thabo.ndlovu@vossie.net', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Thabo Ndlovu"}', false, now(), now()),
    ('11111111-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chloe.vdm@vossie.net', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Chloe Van Der Merwe"}', false, now(), now()),
    ('22222222-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sipho.mthembu@vossie.net', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Sipho Mthembu"}', false, now(), now()),
    ('22222222-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anika.patel@vossie.net', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Anika Patel"}', false, now(), now()),
    ('22222222-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'liam.naidoo@vossie.net', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Liam Naidoo"}', false, now(), now())
ON CONFLICT (id) DO NOTHING;

-- E. Insert Students into public.users and public.user_profiles
DO $$
DECLARE
    v_cat_books UUID;
    v_cat_food UUID;
    v_cat_fashion UUID;
    v_cat_tech UUID;
    v_cat_services UUID;

    v_student_avery UUID := '11111111-0000-0000-0000-000000000001';
    v_student_thabo UUID := '11111111-0000-0000-0000-000000000002';
    v_student_chloe UUID := '11111111-0000-0000-0000-000000000003';

    v_student_sipho UUID := '22222222-0000-0000-0000-000000000001';
    v_student_anika UUID := '22222222-0000-0000-0000-000000000002';
    v_student_liam  UUID := '22222222-0000-0000-0000-000000000003';

    v_seller_avery UUID := '33333333-0000-0000-0000-000000000001';
    v_seller_chloe UUID := '33333333-0000-0000-0000-000000000002';
    v_provider_thabo UUID := '44444444-0000-0000-0000-000000000001';

    v_listing_calc UUID := '55555555-0000-0000-0000-000000000001';
    v_listing_books UUID := '55555555-0000-0000-0000-000000000002';
    v_listing_laptop UUID := '55555555-0000-0000-0000-000000000003';
    v_listing_coffee UUID := '55555555-0000-0000-0000-000000000004';
    v_listing_hoodie UUID := '55555555-0000-0000-0000-000000000005';

    v_service_tutor UUID := '66666666-0000-0000-0000-000000000001';
    v_slot_tutor UUID := '77777777-0000-0000-0000-000000000001';
    v_order_calc UUID := '88888888-0000-0000-0000-000000000001';

BEGIN
    SELECT id INTO v_cat_books FROM public.categories WHERE code = 'books';
    SELECT id INTO v_cat_food FROM public.categories WHERE code = 'food';
    SELECT id INTO v_cat_fashion FROM public.categories WHERE code = 'fashion';
    SELECT id INTO v_cat_tech FROM public.categories WHERE code = 'electronics';
    SELECT id INTO v_cat_services FROM public.categories WHERE code = 'services';

    -- 3 Signed-in Students
    INSERT INTO public.users (id, external_id, provider, email, display_name, status)
    VALUES (v_student_avery, 'eduvos-oidc-avery-01', 'eduvos', 'avery.demo@vossie.net', 'Avery Demo', 'active')
    ON CONFLICT (id) DO UPDATE SET status = 'active', display_name = 'Avery Demo';

    INSERT INTO public.user_profiles (id, student_number, display_name, preferred_campus, contact_phone)
    VALUES (v_student_avery, 'eduv202401', 'Avery Demo', 'potchefstroom', '+27 82 123 4567')
    ON CONFLICT (id) DO UPDATE SET preferred_campus = 'potchefstroom';

    INSERT INTO public.users (id, external_id, provider, email, display_name, status)
    VALUES (v_student_thabo, 'eduvos-oidc-thabo-02', 'eduvos', 'thabo.ndlovu@vossie.net', 'Thabo Ndlovu', 'active')
    ON CONFLICT (id) DO UPDATE SET status = 'active', display_name = 'Thabo Ndlovu';

    INSERT INTO public.user_profiles (id, student_number, display_name, preferred_campus, contact_phone)
    VALUES (v_student_thabo, 'eduv202402', 'Thabo Ndlovu', 'pretoria', '+27 83 234 5678')
    ON CONFLICT (id) DO UPDATE SET preferred_campus = 'pretoria';

    INSERT INTO public.users (id, external_id, provider, email, display_name, status)
    VALUES (v_student_chloe, 'eduvos-oidc-chloe-03', 'eduvos', 'chloe.vdm@vossie.net', 'Chloe Van Der Merwe', 'active')
    ON CONFLICT (id) DO UPDATE SET status = 'active', display_name = 'Chloe Van Der Merwe';

    INSERT INTO public.user_profiles (id, student_number, display_name, preferred_campus, contact_phone)
    VALUES (v_student_chloe, 'eduv202403', 'Chloe Van Der Merwe', 'tyger-valley-cape-town', '+27 84 345 6789')
    ON CONFLICT (id) DO UPDATE SET preferred_campus = 'tyger-valley-cape-town';

    -- 3 Unsigned-in Students
    INSERT INTO public.users (id, external_id, provider, email, display_name, status)
    VALUES (v_student_sipho, 'eduvos-oidc-sipho-04', 'eduvos', 'sipho.mthembu@vossie.net', 'Sipho Mthembu (Invited)', 'pending_verification')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_profiles (id, student_number, display_name, preferred_campus)
    VALUES (v_student_sipho, 'eduv202404', 'Sipho Mthembu', 'midrand-head-office')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.users (id, external_id, provider, email, display_name, status)
    VALUES (v_student_anika, 'eduvos-oidc-anika-05', 'eduvos', 'anika.patel@vossie.net', 'Anika Patel (Invited)', 'pending_verification')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_profiles (id, student_number, display_name, preferred_campus)
    VALUES (v_student_anika, 'eduv202405', 'Anika Patel', 'durban-umhlanga')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.users (id, external_id, provider, email, display_name, status)
    VALUES (v_student_liam, 'eduvos-oidc-liam-06', 'eduvos', 'liam.naidoo@vossie.net', 'Liam Naidoo (Invited)', 'pending_verification')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_profiles (id, student_number, display_name, preferred_campus)
    VALUES (v_student_liam, 'eduv202406', 'Liam Naidoo', 'bloemfontein')
    ON CONFLICT (id) DO NOTHING;

    -- Student Merchants & Service Providers
    INSERT INTO public.seller_profiles (id, user_id, business_name, business_description, contact_email, campus_code, is_verified, status)
    VALUES (v_seller_avery, v_student_avery, 'Avery’s Study Desk', 'Curated campus notebooks and stationery', 'avery.demo@vossie.net', 'potchefstroom', TRUE, 'active')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.seller_profiles (id, user_id, business_name, business_description, contact_email, campus_code, is_verified, status)
    VALUES (v_seller_chloe, v_student_chloe, 'Chloe’s Campus Thrift', 'Student clothing and textbooks', 'chloe.vdm@vossie.net', 'tyger-valley-cape-town', TRUE, 'active')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.service_provider_profiles (id, user_id, business_name, business_description, contact_email, campus_code, is_verified, status)
    VALUES (v_provider_thabo, v_student_thabo, 'Thabo STEM Mentorship', '1-on-1 coding and math tutoring', 'thabo.ndlovu@vossie.net', 'pretoria', TRUE, 'active')
    ON CONFLICT (id) DO NOTHING;

    -- 5 Marketplace Listings
    INSERT INTO public.listings (id, seller_id, type, category_id, title, description, price_cents, currency, status, campus_code, condition, inventory_count, fulfillment_type)
    VALUES (v_listing_books, v_seller_avery, 'goods', v_cat_books, 'A Study Notebook Set', '3-pack lined hardcover campus notebooks.', 12000, 'ZAR', 'published', 'potchefstroom', 'new', 14, 'campus_handoff')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.listings (id, seller_id, type, category_id, title, description, price_cents, currency, status, campus_code, condition, inventory_count, fulfillment_type)
    VALUES (v_listing_coffee, v_seller_avery, 'goods', v_cat_food, 'Iced Coffee (Campus)', 'Freshly brewed cold brew with oat milk.', 4500, 'ZAR', 'published', 'potchefstroom', 'new', 25, 'campus_handoff')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.listings (id, seller_id, type, category_id, title, description, price_cents, currency, status, campus_code, condition, inventory_count, fulfillment_type)
    VALUES (v_listing_laptop, v_seller_avery, 'goods', v_cat_tech, 'Mint Campus Laptop', '14-inch student laptop with charger and sleeve.', 250000, 'ZAR', 'published', 'potchefstroom', 'like_new', 1, 'campus_handoff')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.listings (id, seller_id, type, category_id, title, description, price_cents, currency, status, campus_code, condition, inventory_count, fulfillment_type)
    VALUES (v_listing_calc, v_seller_avery, 'goods', v_cat_tech, 'Casio FX-991ZA Plus Scientific Calculator', 'Exam-approved scientific calculator.', 28000, 'ZAR', 'published', 'potchefstroom', 'like_new', 3, 'campus_handoff')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.listings (id, seller_id, type, category_id, title, description, price_cents, currency, status, campus_code, condition, inventory_count, fulfillment_type)
    VALUES (v_listing_hoodie, v_seller_chloe, 'goods', v_cat_fashion, 'Eduvos Navy Campus Fleece Hoodie (Size M)', 'Warm fleece pullover in navy.', 32000, 'ZAR', 'published', 'tyger-valley-cape-town', 'good', 2, 'campus_handoff')
    ON CONFLICT (id) DO NOTHING;

    -- Service & Bookable Slot
    INSERT INTO public.services (id, provider_id, category_id, title, description, hourly_rate_cents, duration_minutes, status, campus_code)
    VALUES (v_service_tutor, v_provider_thabo, v_cat_services, 'Python & Database Systems Peer Tutoring', '1-on-1 tutoring covering Python and SQL.', 15000, 60, 'published', 'pretoria')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.service_slots (id, service_id, start_time, end_time, is_available)
    VALUES (v_slot_tutor, v_service_tutor, now() + interval '2 days', now() + interval '2 days 1 hour', TRUE)
    ON CONFLICT (id) DO NOTHING;

    -- Active Goods Order & Handoff Messages
    INSERT INTO public.goods_orders (id, buyer_id, seller_id, listing_id, quantity, unit_price_cents, total_price_cents, currency, campus_code, status, note, expires_at)
    VALUES (v_order_calc, v_student_chloe, v_seller_avery, v_listing_calc, 1, 28000, 28000, 'ZAR', 'potchefstroom', 'accepted', 'Meet by campus library cafeteria', now() + interval '24 hours')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.order_messages (order_id, sender_id, recipient_id, body, created_at)
    VALUES (v_order_calc, v_student_chloe, v_student_avery, 'Hey Avery! Can we meet at the campus library cafeteria around 13:00 to hand over the calculator?', now() - interval '30 minutes')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.order_messages (order_id, sender_id, recipient_id, body, created_at)
    VALUES (v_order_calc, v_student_avery, v_student_chloe, 'Hi Chloe! 13:00 works great. I will be wearing a navy Eduvos jacket. See you there!', now() - interval '15 minutes')
    ON CONFLICT DO NOTHING;

END;
$$;
