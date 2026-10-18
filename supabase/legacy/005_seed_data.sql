-- Migration: 005_seed_data.sql
-- Seed owner-approved campuses, categories, signed-in & unsigned-in students, and marketplace catalog fixtures.
-- Reference: docs/product/marketplace-mvp.md §Campus directory

-- 1. campuses table for catalog and filtering
CREATE TABLE IF NOT EXISTS campuses (
    id TEXT PRIMARY KEY,                          -- approved stable key
    name TEXT NOT NULL,                           -- human-readable display name
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active campuses" ON campuses;
CREATE POLICY "Public can read active campuses" ON campuses
    FOR SELECT USING (is_active = TRUE);

-- Seed the 12 approved campuses
INSERT INTO campuses (id, name, sort_order) VALUES
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

-- Seed initial categories
INSERT INTO categories (code, name, sort_order) VALUES
    ('books', 'Books & Study Materials', 1),
    ('food', 'Campus Food & Treats', 2),
    ('fashion', 'Student Fashion & Apparel', 3),
    ('electronics', 'Tech & Devices', 4),
    ('services', 'Peer Tutoring & Student Services', 5)
ON CONFLICT (code) DO NOTHING;

-- 3. STUDENTS, PROFILES, SELLERS, LISTINGS, ORDERS, AND MESSAGES
DO $$
DECLARE
    -- Category IDs
    v_cat_books UUID;
    v_cat_food UUID;
    v_cat_fashion UUID;
    v_cat_tech UUID;
    v_cat_services UUID;

    -- 3 Signed-in Student IDs
    v_student_avery UUID := '11111111-0000-0000-0000-000000000001';
    v_student_thabo UUID := '11111111-0000-0000-0000-000000000002';
    v_student_chloe UUID := '11111111-0000-0000-0000-000000000003';

    -- 3 Unsigned-in / Pending Verification Student IDs
    v_student_sipho UUID := '22222222-0000-0000-0000-000000000001';
    v_student_anika UUID := '22222222-0000-0000-0000-000000000002';
    v_student_liam  UUID := '22222222-0000-0000-0000-000000000003';

    -- Student Merchant / Seller Profile IDs
    v_seller_avery UUID := '33333333-0000-0000-0000-000000000001';
    v_seller_chloe UUID := '33333333-0000-0000-0000-000000000002';
    v_provider_thabo UUID := '44444444-0000-0000-0000-000000000001';

    -- Listing IDs
    v_listing_calc UUID := '55555555-0000-0000-0000-000000000001';
    v_listing_books UUID := '55555555-0000-0000-0000-000000000002';
    v_listing_laptop UUID := '55555555-0000-0000-0000-000000000003';
    v_listing_coffee UUID := '55555555-0000-0000-0000-000000000004';
    v_listing_hoodie UUID := '55555555-0000-0000-0000-000000000005';

    -- Service and Slot IDs
    v_service_tutor UUID := '66666666-0000-0000-0000-000000000001';
    v_slot_tutor UUID := '77777777-0000-0000-0000-000000000001';

    -- Order ID
    v_order_calc UUID := '88888888-0000-0000-0000-000000000001';

BEGIN
    -- Fetch category IDs
    SELECT id INTO v_cat_books FROM categories WHERE code = 'books';
    SELECT id INTO v_cat_food FROM categories WHERE code = 'food';
    SELECT id INTO v_cat_fashion FROM categories WHERE code = 'fashion';
    SELECT id INTO v_cat_tech FROM categories WHERE code = 'electronics';
    SELECT id INTO v_cat_services FROM categories WHERE code = 'services';

    -- =========================================================================
    -- A. 3 SIGNED-IN STUDENTS (Active, profile verified, preferred campus set)
    -- =========================================================================

    -- Student 1: Avery Demo (Potchefstroom)
    INSERT INTO users (id, external_id, provider, email, display_name, status)
    VALUES (
        v_student_avery,
        'eduvos-oidc-avery-01',
        'eduvos',
        'avery.demo@vossie.net',
        'Avery Demo',
        'active'
    ) ON CONFLICT (id) DO UPDATE SET status = 'active', display_name = 'Avery Demo';

    INSERT INTO user_profiles (id, student_number, display_name, preferred_campus, contact_phone)
    VALUES (
        v_student_avery,
        'eduv202401',
        'Avery Demo',
        'potchefstroom',
        '+27 82 123 4567'
    ) ON CONFLICT (id) DO UPDATE SET preferred_campus = 'potchefstroom';

    INSERT INTO student_eligibility (user_id, institution_domain, campus_code, campus_name, enrollment_status, evidence_source)
    VALUES (
        v_student_avery,
        'eduvos.ac.za',
        'potchefstroom',
        'Potchefstroom',
        'active',
        'sso_claim'
    ) ON CONFLICT DO NOTHING;

    -- Student 2: Thabo Ndlovu (Pretoria)
    INSERT INTO users (id, external_id, provider, email, display_name, status)
    VALUES (
        v_student_thabo,
        'eduvos-oidc-thabo-02',
        'eduvos',
        'thabo.ndlovu@vossie.net',
        'Thabo Ndlovu',
        'active'
    ) ON CONFLICT (id) DO UPDATE SET status = 'active', display_name = 'Thabo Ndlovu';

    INSERT INTO user_profiles (id, student_number, display_name, preferred_campus, contact_phone)
    VALUES (
        v_student_thabo,
        'eduv202402',
        'Thabo Ndlovu',
        'pretoria',
        '+27 83 234 5678'
    ) ON CONFLICT (id) DO UPDATE SET preferred_campus = 'pretoria';

    INSERT INTO student_eligibility (user_id, institution_domain, campus_code, campus_name, enrollment_status, evidence_source)
    VALUES (
        v_student_thabo,
        'eduvos.ac.za',
        'pretoria',
        'Pretoria',
        'active',
        'sso_claim'
    ) ON CONFLICT DO NOTHING;

    -- Student 3: Chloe Van Der Merwe (Tyger Valley, Cape Town)
    INSERT INTO users (id, external_id, provider, email, display_name, status)
    VALUES (
        v_student_chloe,
        'eduvos-oidc-chloe-03',
        'eduvos',
        'chloe.vdm@vossie.net',
        'Chloe Van Der Merwe',
        'active'
    ) ON CONFLICT (id) DO UPDATE SET status = 'active', display_name = 'Chloe Van Der Merwe';

    INSERT INTO user_profiles (id, student_number, display_name, preferred_campus, contact_phone)
    VALUES (
        v_student_chloe,
        'eduv202403',
        'Chloe Van Der Merwe',
        'tyger-valley-cape-town',
        '+27 84 345 6789'
    ) ON CONFLICT (id) DO UPDATE SET preferred_campus = 'tyger-valley-cape-town';

    INSERT INTO student_eligibility (user_id, institution_domain, campus_code, campus_name, enrollment_status, evidence_source)
    VALUES (
        v_student_chloe,
        'eduvos.ac.za',
        'tyger-valley-cape-town',
        'Tyger Valley (Cape Town)',
        'active',
        'sso_claim'
    ) ON CONFLICT DO NOTHING;

    -- =========================================================================
    -- B. 3 STUDENTS NOT YET SIGNED IN (Pending OTP Verification / Invited)
    -- =========================================================================

    -- Student 4: Sipho Mthembu (Midrand Head Office) - Pending
    INSERT INTO users (id, external_id, provider, email, display_name, status)
    VALUES (
        v_student_sipho,
        'eduvos-oidc-sipho-04',
        'eduvos',
        'sipho.mthembu@vossie.net',
        'Sipho Mthembu (Invited)',
        'pending_verification'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO user_profiles (id, student_number, display_name, preferred_campus)
    VALUES (
        v_student_sipho,
        'eduv202404',
        'Sipho Mthembu',
        'midrand-head-office'
    ) ON CONFLICT (id) DO NOTHING;

    -- Student 5: Anika Patel (Durban Umhlanga) - Pending
    INSERT INTO users (id, external_id, provider, email, display_name, status)
    VALUES (
        v_student_anika,
        'eduvos-oidc-anika-05',
        'eduvos',
        'anika.patel@vossie.net',
        'Anika Patel (Invited)',
        'pending_verification'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO user_profiles (id, student_number, display_name, preferred_campus)
    VALUES (
        v_student_anika,
        'eduv202405',
        'Anika Patel',
        'durban-umhlanga'
    ) ON CONFLICT (id) DO NOTHING;

    -- Student 6: Liam Naidoo (Bloemfontein) - Pending
    INSERT INTO users (id, external_id, provider, email, display_name, status)
    VALUES (
        v_student_liam,
        'eduvos-oidc-liam-06',
        'eduvos',
        'liam.naidoo@vossie.net',
        'Liam Naidoo (Invited)',
        'pending_verification'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO user_profiles (id, student_number, display_name, preferred_campus)
    VALUES (
        v_student_liam,
        'eduv202406',
        'Liam Naidoo',
        'bloemfontein'
    ) ON CONFLICT (id) DO NOTHING;

    -- =========================================================================
    -- C. STUDENT MERCHANT & SERVICE PROVIDER PROFILES
    -- =========================================================================

    -- Avery's Campus Essentials (Potchefstroom)
    INSERT INTO seller_profiles (
        id, user_id, business_name, business_description, contact_email,
        contact_phone, campus_code, is_verified, status
    ) VALUES (
        v_seller_avery,
        v_student_avery,
        'Avery’s Study Desk',
        'Curated campus notebooks, tech accessories, and iced coffee.',
        'avery.demo@vossie.net',
        '+27 82 123 4567',
        'potchefstroom',
        TRUE,
        'active'
    ) ON CONFLICT (id) DO NOTHING;

    -- Chloe's Campus Thrift & Books (Tyger Valley)
    INSERT INTO seller_profiles (
        id, user_id, business_name, business_description, contact_email,
        contact_phone, campus_code, is_verified, status
    ) VALUES (
        v_seller_chloe,
        v_student_chloe,
        'Chloe’s Campus Thrift & Textbooks',
        'Quality pre-loved student hoodies, academic textbooks, and gear.',
        'chloe.vdm@vossie.net',
        '+27 84 345 6789',
        'tyger-valley-cape-town',
        TRUE,
        'active'
    ) ON CONFLICT (id) DO NOTHING;

    -- Thabo's STEM & Coding Peer Tutoring (Pretoria)
    INSERT INTO service_provider_profiles (
        id, user_id, business_name, business_description, contact_email,
        contact_phone, campus_code, is_verified, status
    ) VALUES (
        v_provider_thabo,
        v_student_thabo,
        'Thabo STEM & Code Mentorship',
        '1-on-1 peer tutoring for Computer Science, Python, Calculus, and Database Systems.',
        'thabo.ndlovu@vossie.net',
        '+27 83 234 5678',
        'pretoria',
        TRUE,
        'active'
    ) ON CONFLICT (id) DO NOTHING;

    -- =========================================================================
    -- D. PUBLISHED LISTINGS ACROSS CAMPUSES
    -- =========================================================================

    -- 1. Study Notebook Set (Potchefstroom)
    INSERT INTO listings (
        id, seller_id, type, category_id, title, description, price_cents,
        currency, status, campus_code, condition, inventory_count, fulfillment_type
    ) VALUES (
        v_listing_books,
        v_seller_avery,
        'goods',
        v_cat_books,
        'A Study Notebook Set',
        '3-pack lined hardcover campus notebooks, mint condition with perforated pages.',
        12000, -- R120.00
        'ZAR',
        'published',
        'potchefstroom',
        'new',
        14,
        'campus_handoff'
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Iced Coffee (Campus Brew) (Potchefstroom)
    INSERT INTO listings (
        id, seller_id, type, category_id, title, description, price_cents,
        currency, status, campus_code, condition, inventory_count, fulfillment_type
    ) VALUES (
        v_listing_coffee,
        v_seller_avery,
        'goods',
        v_cat_food,
        'Iced Coffee (Campus)',
        'Freshly brewed cold brew with oat milk and caramel syrup, delivered chilled on campus.',
        4500, -- R45.00
        'ZAR',
        'published',
        'potchefstroom',
        'new',
        25,
        'campus_handoff'
    ) ON CONFLICT (id) DO NOTHING;

    -- 3. Mint Campus Laptop 14-inch (Potchefstroom)
    INSERT INTO listings (
        id, seller_id, type, category_id, title, description, price_cents,
        currency, status, campus_code, condition, inventory_count, fulfillment_type
    ) VALUES (
        v_listing_laptop,
        v_seller_avery,
        'goods',
        v_cat_tech,
        'Mint Campus Laptop',
        'Ultra-light 14-inch student laptop with fast SSD, charger, and padded protective sleeve.',
        250000, -- R2,500.00
        'ZAR',
        'published',
        'potchefstroom',
        'like_new',
        1,
        'campus_handoff'
    ) ON CONFLICT (id) DO NOTHING;

    -- 4. Scientific Calculator Casio FX-991ZA (Potchefstroom / Pretoria)
    INSERT INTO listings (
        id, seller_id, type, category_id, title, description, price_cents,
        currency, status, campus_code, condition, inventory_count, fulfillment_type
    ) VALUES (
        v_listing_calc,
        v_seller_avery,
        'goods',
        v_cat_tech,
        'Casio FX-991ZA Plus Scientific Calculator',
        'Approved for university exams, natural textbook display, perfect working condition.',
        28000, -- R280.00
        'ZAR',
        'published',
        'potchefstroom',
        'like_new',
        3,
        'campus_handoff'
    ) ON CONFLICT (id) DO NOTHING;

    -- 5. Eduvos Navy Campus Hoodie (Tyger Valley)
    INSERT INTO listings (
        id, seller_id, type, category_id, title, description, price_cents,
        currency, status, campus_code, condition, inventory_count, fulfillment_type
    ) VALUES (
        v_listing_hoodie,
        v_seller_chloe,
        'goods',
        v_cat_fashion,
        'Eduvos Navy Campus Fleece Hoodie (Size M)',
        'Warm fleece pullover hoodie in deep navy, lightly worn, pristine condition.',
        32000, -- R320.00
        'ZAR',
        'published',
        'tyger-valley-cape-town',
        'good',
        2,
        'campus_handoff'
    ) ON CONFLICT (id) DO NOTHING;

    -- =========================================================================
    -- E. SERVICES & BOOKABLE SLOTS
    -- =========================================================================

    -- Python & Database Mentorship Session (Pretoria)
    INSERT INTO services (
        id, provider_id, category_id, title, description, hourly_rate_cents,
        duration_minutes, status, campus_code
    ) VALUES (
        v_service_tutor,
        v_provider_thabo,
        v_cat_services,
        'Python & Database Systems Peer Tutoring',
        'Comprehensive 1-on-1 tutoring covering Python syntax, data structures, and PostgreSQL SQL queries.',
        15000, -- R150.00/hr
        60,
        'published',
        'pretoria'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO service_slots (
        id, service_id, start_time, end_time, is_available
    ) VALUES (
        v_slot_tutor,
        v_service_tutor,
        now() + interval '2 days',
        now() + interval '2 days 1 hour',
        TRUE
    ) ON CONFLICT (id) DO NOTHING;

    -- =========================================================================
    -- F. ACTIVE ORDERS & PRIVATE HANDOFF CHAT (Avery buyer, Thabo seller)
    -- =========================================================================

    INSERT INTO goods_orders (
        id, buyer_id, seller_id, listing_id, quantity, unit_price_cents,
        total_price_cents, currency, campus_code, status, note,
        expires_at
    ) VALUES (
        v_order_calc,
        v_student_chloe,          -- Chloe is buying
        v_seller_avery,           -- Avery is selling
        v_listing_calc,
        1,
        28000,
        28000,
        'ZAR',
        'potchefstroom',
        'accepted',               -- Seller accepted
        'Meet by campus library cafeteria',
        now() + interval '24 hours'
    ) ON CONFLICT (id) DO NOTHING;

    -- Private In-Order Handoff Chat Messages between Chloe and Avery
    INSERT INTO order_messages (
        order_id, sender_id, recipient_id, body, created_at
    ) VALUES (
        v_order_calc,
        v_student_chloe,
        v_student_avery,
        'Hey Avery! Can we meet at the campus library cafeteria around 13:00 to hand over the calculator?',
        now() - interval '30 minutes'
    ) ON CONFLICT DO NOTHING;

    INSERT INTO order_messages (
        order_id, sender_id, recipient_id, body, created_at
    ) VALUES (
        v_order_calc,
        v_student_avery,
        v_student_chloe,
        'Hi Chloe! 13:00 works great. I will be wearing a navy Eduvos jacket. See you there!',
        now() - interval '15 minutes'
    ) ON CONFLICT DO NOTHING;

END;
$$;
