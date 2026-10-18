-- Migration: 003_money_ledger.sql
-- Money, payments, ledger, refunds, payouts (plan.md §9.3)
-- Integer cents in ZAR. Immutable financial records.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. payment_intents and payment_events
CREATE TYPE payment_status AS ENUM ('created', 'provider_pending', 'authorised', 'captured', 'reconciled', 'failed', 'uncertain', 'refund_pending', 'partially_refunded', 'refunded', 'disputed', 'reconciliation_required');

CREATE TABLE payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_user_id UUID NOT NULL REFERENCES users(id),
    checkout_session_id UUID NOT NULL,            -- reference to checkout
    amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    provider TEXT NOT NULL,                       -- 'paystack', 'stripe', 'yoco', etc.
    provider_payment_intent_id TEXT,
    provider_payment_method_id TEXT,
    status payment_status NOT NULL DEFAULT 'created',
    capture_mode TEXT NOT NULL DEFAULT 'automatic', -- 'automatic', 'manual'
    metadata JSONB NOT NULL DEFAULT '{}',
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    captured_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT
);
CREATE INDEX idx_payment_intents_buyer ON payment_intents(buyer_user_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
CREATE INDEX idx_payment_intents_idempotency ON payment_intents(idempotency_key);
CREATE INDEX idx_payment_intents_checkout ON payment_intents(checkout_session_id);

CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id UUID NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,                     -- 'created', 'authorized', 'captured', 'failed', 'refunded', 'disputed'
    provider_event_id TEXT NOT NULL,
    provider_event_type TEXT,
    amount_cents BIGINT,
    currency TEXT,
    raw_payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processing_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_events_intent ON payment_events(payment_intent_id);
CREATE INDEX idx_payment_events_provider_id ON payment_events(provider_event_id);
CREATE INDEX idx_payment_events_created ON payment_events(created_at);

-- 2. provider_webhook_events with idempotency
CREATE TABLE provider_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,                       -- provider's event ID
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
    processing_status TEXT NOT NULL DEFAULT 'pending', -- pending, processed, failed, duplicate
    processing_error TEXT,
    related_payment_intent_id UUID REFERENCES payment_intents(id),
    idempotency_key TEXT NOT NULL UNIQUE,         -- provider + event_id
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);
CREATE INDEX idx_webhook_provider_event ON provider_webhook_events(provider, event_id);
CREATE INDEX idx_webhook_idempotency ON provider_webhook_events(idempotency_key);
CREATE INDEX idx_webhook_status ON provider_webhook_events(processing_status);

-- 3. ledger_accounts and ledger_entries (double-entry)
CREATE TYPE ledger_account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

CREATE TABLE ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,                    -- '1000', '2000', '4000', etc.
    name TEXT NOT NULL,
    type ledger_account_type NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Core accounts (seeded)
INSERT INTO ledger_accounts (code, name, type) VALUES
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

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL,               -- groups related entries
    account_id UUID NOT NULL REFERENCES ledger_accounts(id),
    amount_cents BIGINT NOT NULL,                 -- positive = debit, negative = credit
    currency TEXT NOT NULL DEFAULT 'ZAR',
    description TEXT NOT NULL,
    reference_type TEXT,                          -- 'payment', 'refund', 'payout', 'fee', 'adjustment'
    reference_id UUID,
    posted_by UUID REFERENCES users(id),          -- system user for automated
    posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_posted BOOLEAN NOT NULL DEFAULT TRUE,      -- immutable once posted
    metadata JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_ledger_entries_account ON ledger_entries(account_id);
CREATE INDEX idx_ledger_entries_journal ON ledger_entries(journal_entry_id);
CREATE INDEX idx_ledger_entries_posted ON ledger_entries(posted_at);
CREATE INDEX idx_ledger_entries_reference ON ledger_entries(reference_type, reference_id);

-- 4. fee_policies with versions
CREATE TABLE fee_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INT NOT NULL,
    transaction_fee_bps INT NOT NULL,             -- basis points (100 = 1%)
    min_fee_cents BIGINT NOT NULL DEFAULT 0,
    max_fee_cents BIGINT,
    delivery_fee_bps INT,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (version)
);
CREATE INDEX idx_fee_policies_active ON fee_policies(is_active, effective_from);

-- 5. refunds
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id UUID NOT NULL REFERENCES payment_intents(id),
    seller_order_id UUID,                         -- optional, for seller-specific refund
    amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    reason TEXT NOT NULL,                         -- 'buyer_dispute', 'seller_timeout', 'unavailable', 'cancellation'
    status TEXT NOT NULL DEFAULT 'pending',       -- pending, processing, completed, failed
    provider_refund_id TEXT,
    idempotency_key TEXT NOT NULL UNIQUE,
    requested_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX idx_refunds_payment ON refunds(payment_intent_id);
CREATE INDEX idx_refunds_status ON refunds(status);

-- 6. payout_destinations
CREATE TYPE payout_type AS ENUM ('bank_transfer', 'mobile_money', 'digital_wallet');

CREATE TABLE payout_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type payout_type NOT NULL,
    provider TEXT NOT NULL,
    account_details_encrypted TEXT NOT NULL,      -- encrypted bank details
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payout_destinations_user ON payout_destinations(user_id);

-- 7. payouts
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID NOT NULL REFERENCES payout_destinations(id),
    seller_order_ids UUID[] NOT NULL DEFAULT '{}', -- linked seller orders
    amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    fee_cents BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',       -- pending, processing, paid, failed, reversed
    provider_payout_id TEXT,
    idempotency_key TEXT NOT NULL UNIQUE,
    initiated_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),        -- finance staff
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT
);
CREATE INDEX idx_payouts_destination ON payouts(destination_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- 8. reconciliation_runs
CREATE TABLE reconciliation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',       -- running, completed, exceptions
    total_expected_cents BIGINT,
    total_actual_cents BIGINT,
    difference_cents BIGINT,
    exceptions_count INT NOT NULL DEFAULT 0,
    report_json JSONB,
    initiated_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reconciliation_provider_period ON reconciliation_runs(provider, period_start);

-- RLS
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Payment intents: buyer can read own; finance staff can read all
CREATE POLICY "Buyer can read own payments" ON payment_intents
    FOR SELECT USING (buyer_user_id = auth.uid());

CREATE POLICY "Finance staff can read all payments" ON payment_intents
    FOR SELECT USING (EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.role = 'finance_staff' AND m.state = 'active'));

-- Payment events: same as intents
CREATE POLICY "Buyer can read own payment events" ON payment_events
    FOR SELECT USING (payment_intent_id IN (SELECT id FROM payment_intents WHERE buyer_user_id = auth.uid()));

CREATE POLICY "Finance can read all payment events" ON payment_events
    FOR SELECT USING (EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.role = 'finance_staff' AND m.state = 'active'));

-- Webhook events: finance/system only
CREATE POLICY "Finance can read webhooks" ON provider_webhook_events
    FOR SELECT USING (EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.role IN ('finance_staff', 'admin') AND m.state = 'active'));

-- Ledger: finance/admin only
CREATE POLICY "Finance can read ledger" ON ledger_entries
    FOR SELECT USING (EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.role IN ('finance_staff', 'admin') AND m.state = 'active'));

CREATE POLICY "Finance can read accounts" ON ledger_accounts
    FOR SELECT USING (EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.role IN ('finance_staff', 'admin') AND m.state = 'active'));

-- Fee policies: public read active
CREATE POLICY "Public can read active fee policy" ON fee_policies
    FOR SELECT USING (is_active AND effective_from <= now() AND (effective_to IS NULL OR effective_to > now()));

-- Refunds: buyer can read own; finance can read all
CREATE POLICY "Buyer can read own refunds" ON refunds
    FOR SELECT USING (payment_intent_id IN (SELECT id FROM payment_intents WHERE buyer_user_id = auth.uid()));

CREATE POLICY "Finance can read all refunds" ON refunds
    FOR SELECT USING (EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.role = 'finance_staff' AND m.state = 'active'));

-- Payout destinations: owner manages
CREATE POLICY "User manages own payout destinations" ON payout_destinations
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Payouts: finance manages; seller can read own
CREATE POLICY "Finance manages payouts" ON payouts
    FOR ALL USING (EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.role = 'finance_staff' AND m.state = 'active'));

CREATE POLICY "Seller can read own payouts" ON payouts
    FOR SELECT USING (destination_id IN (SELECT id FROM payout_destinations WHERE user_id = auth.uid()));

-- Reconciliation: finance/admin
CREATE POLICY "Finance can read reconciliation" ON reconciliation_runs
    FOR SELECT USING (EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.role IN ('finance_staff', 'admin') AND m.state = 'active'));

-- Updated at triggers
CREATE TRIGGER update_payout_destinations_updated_at BEFORE UPDATE ON payout_destinations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();