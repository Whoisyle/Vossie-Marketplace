-- Migration: 002_marketplace.sql
-- Marketplace core: sellers, listings, services, catalog, moderation
-- References plan.md §9.2

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. seller_profiles
CREATE TABLE seller_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_description TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    campus_code TEXT NOT NULL,                    -- primary campus
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,   -- staff-verified
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    verification_notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft',         -- draft, pending_review, active, suspended, rejected
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seller_profiles_user_id ON seller_profiles(user_id);
CREATE INDEX idx_seller_profiles_status ON seller_profiles(status);
CREATE INDEX idx_seller_profiles_campus ON seller_profiles(campus_code);

-- 2. service_provider_profiles (separate from sellers for services)
CREATE TABLE service_provider_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_description TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    campus_code TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_provider_profiles_user_id ON service_provider_profiles(user_id);
CREATE INDEX idx_service_provider_profiles_status ON service_provider_profiles(status);

-- 3. categories and versioned category attribute definitions
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,                    -- 'books', 'food', 'electronics', etc.
    name TEXT NOT NULL,
    parent_id UUID REFERENCES categories(id),     -- for hierarchy
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_parent ON categories(parent_id);

CREATE TABLE category_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    attribute_key TEXT NOT NULL,                  -- 'condition', 'size', 'weight', 'duration'
    attribute_type TEXT NOT NULL,                 -- 'enum', 'text', 'number', 'boolean'
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_values JSONB,                         -- for enum types
    unit TEXT,                                    -- 'kg', 'cm', 'minutes'
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (category_id, attribute_key, version)
);

-- 4. listings
CREATE TYPE listing_type AS ENUM ('goods', 'service');
CREATE TYPE listing_status AS ENUM ('draft', 'checking', 'flagged', 'under_review', 'published', 'paused', 'sold_out', 'archived', 'rejected');

CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
    type listing_type NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price_cents BIGINT NOT NULL,                  -- ZAR cents, integer
    currency TEXT NOT NULL DEFAULT 'ZAR',
    status listing_status NOT NULL DEFAULT 'draft',
    campus_code TEXT NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}',       -- validated against category_attributes
    condition TEXT,                               -- for goods: 'new', 'like_new', 'good', 'fair', 'poor'
    inventory_count INT NOT NULL DEFAULT 1,       -- for goods
    max_per_order INT,
    fulfillment_type TEXT,                        -- 'campus_handoff', 'door_to_door', 'both'
    package_dimensions JSONB,                     -- {length, width, height, weight} in cm/kg
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);
CREATE INDEX idx_listings_seller ON listings(seller_id);
CREATE INDEX idx_listings_category ON listings(category_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_campus ON listings(campus_code);
CREATE INDEX idx_listings_published ON listings(published_at) WHERE status = 'published';

-- 5. listing_media
CREATE TABLE listing_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL,                     -- 'image', 'video'
    storage_path TEXT NOT NULL,                   -- Supabase Storage path
    sort_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_listing_media_listing ON listing_media(listing_id);

-- 6. listing_attributes (Eav model for flexible attributes)
CREATE TABLE listing_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    attribute_key TEXT NOT NULL,
    attribute_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (listing_id, attribute_key)
);

-- 7. listing_inventory (for multi-variant goods)
CREATE TABLE listing_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    variant_sku TEXT NOT NULL,
    variant_attributes JSONB NOT NULL DEFAULT '{}', -- e.g., {size: "M", color: "blue"}
    quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (listing_id, variant_sku)
);
CREATE INDEX idx_listing_inventory_listing ON listing_inventory(listing_id);

-- 8. service_definitions
CREATE TABLE service_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES service_provider_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    duration_minutes INT NOT NULL,
    location_type TEXT NOT NULL,                  -- 'campus', 'remote', 'both'
    campus_code TEXT,                             -- required if location_type = 'campus'
    cancellation_policy TEXT NOT NULL,            -- 'full_refund_24h', 'full_refund_1h', 'no_refund'
    cancellation_cutoff_minutes INT NOT NULL DEFAULT 1440, -- 24h default
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_definitions_provider ON service_definitions(provider_id);
CREATE INDEX idx_service_definitions_category ON service_definitions(category_id);
CREATE INDEX idx_service_definitions_status ON service_definitions(status);

-- 9. service_slots
CREATE TABLE service_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_definition_id UUID NOT NULL REFERENCES service_definitions(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    max_bookings INT NOT NULL DEFAULT 1,
    current_bookings INT NOT NULL DEFAULT 0,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_slots_definition ON service_slots(service_definition_id);
CREATE INDEX idx_service_slots_start ON service_slots(start_at) WHERE NOT is_blocked;

-- 10. slot_holds (temporary holds during checkout)
CREATE TABLE slot_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL REFERENCES service_slots(id) ON DELETE CASCADE,
    buyer_user_id UUID NOT NULL REFERENCES users(id),
    checkout_session_id UUID,                     -- reference to checkout
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (slot_id, buyer_user_id)
);
CREATE INDEX idx_slot_holds_expires ON slot_holds(expires_at);

-- 11. listing_policy_checks
CREATE TABLE listing_policy_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    check_type TEXT NOT NULL,                     -- 'required_fields', 'prohibited_items', 'carrier_eligibility'
    status TEXT NOT NULL,                         -- 'passed', 'failed', 'warning'
    details JSONB,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_listing_policy_checks_listing ON listing_policy_checks(listing_id);

-- 12. listing_flags and moderation_cases
CREATE TYPE flag_status AS ENUM ('open', 'under_review', 'resolved', 'dismissed');

CREATE TABLE listing_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    reporter_user_id UUID NOT NULL REFERENCES users(id),
    flag_type TEXT NOT NULL,                      -- 'prohibited', 'misleading', 'spam', 'other'
    description TEXT,
    status flag_status NOT NULL DEFAULT 'open',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_listing_flags_listing ON listing_flags(listing_id);
CREATE INDEX idx_listing_flags_status ON listing_flags(status);

CREATE TABLE moderation_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    flag_id UUID REFERENCES listing_flags(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'open',          -- open, under_review, resolved
    decision TEXT,                                -- 'approve', 'reject', 'request_changes'
    decision_notes TEXT,
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_moderation_cases_status ON moderation_cases(status);

-- RLS
ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_policy_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_cases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Seller profiles: owner can read/write; public can read active
CREATE POLICY "Seller can manage own profile" ON seller_profiles
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can read active seller profiles" ON seller_profiles
    FOR SELECT USING (status = 'active' AND is_verified);

-- Service provider profiles
CREATE POLICY "Provider can manage own profile" ON service_provider_profiles
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can read active providers" ON service_provider_profiles
    FOR SELECT USING (status = 'active' AND is_verified);

-- Categories: public read
CREATE POLICY "Public can read active categories" ON categories
    FOR SELECT USING (is_active);

CREATE POLICY "Public can read category attributes" ON category_attributes
    FOR SELECT USING (EXISTS (SELECT 1 FROM categories c WHERE c.id = category_id AND c.is_active));

-- Listings: seller manages own; public reads published
CREATE POLICY "Seller can manage own listings" ON listings
    FOR ALL USING (seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid()))
    WITH CHECK (seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public can read published listings" ON listings
    FOR SELECT USING (status = 'published');

-- Listing media: seller manages; public reads for published listings
CREATE POLICY "Seller can manage own listing media" ON listing_media
    FOR ALL USING (listing_id IN (SELECT id FROM listings WHERE seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid())));

CREATE POLICY "Public can read media for published listings" ON listing_media
    FOR SELECT USING (listing_id IN (SELECT id FROM listings WHERE status = 'published'));

-- Service definitions: provider manages; public reads active
CREATE POLICY "Provider can manage own services" ON service_definitions
    FOR ALL USING (provider_id IN (SELECT id FROM service_provider_profiles WHERE user_id = auth.uid()))
    WITH CHECK (provider_id IN (SELECT id FROM service_provider_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public can read active services" ON service_definitions
    FOR SELECT USING (status = 'active');

-- Service slots: provider manages; buyers see available
CREATE POLICY "Provider can manage own slots" ON service_slots
    FOR ALL USING (service_definition_id IN (SELECT id FROM service_definitions WHERE provider_id IN (SELECT id FROM service_provider_profiles WHERE user_id = auth.uid())));

CREATE POLICY "Buyers can read available slots" ON service_slots
    FOR SELECT USING (NOT is_blocked AND current_bookings < max_bookings AND start_at > now());

-- Slot holds: buyer manages own
CREATE POLICY "Buyer can manage own holds" ON slot_holds
    FOR ALL USING (buyer_user_id = auth.uid()) WITH CHECK (buyer_user_id = auth.uid());

-- Flags: reporter can read own; staff can read all
CREATE POLICY "Reporter can read own flags" ON listing_flags
    FOR SELECT USING (reporter_user_id = auth.uid());

CREATE POLICY "Staff can read all flags" ON listing_flags
    FOR SELECT USING (EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.role IN ('operations_staff', 'admin') AND m.state = 'active'));

-- Moderation: staff only
CREATE POLICY "Staff can manage moderation" ON moderation_cases
    FOR ALL USING (EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.role IN ('operations_staff', 'admin') AND m.state = 'active'));

-- Updated at triggers
CREATE TRIGGER update_seller_profiles_updated_at BEFORE UPDATE ON seller_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_provider_profiles_updated_at BEFORE UPDATE ON service_provider_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listing_inventory_updated_at BEFORE UPDATE ON listing_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_definitions_updated_at BEFORE UPDATE ON service_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_slots_updated_at BEFORE UPDATE ON service_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();