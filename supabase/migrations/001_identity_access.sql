-- Migration: 001_identity_access.sql
-- Identity and access foundation (Phase 2 foundation)
-- Immutable audit log and strict RLS for all identity data.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. users: internal identity reference and lifecycle status
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT NOT NULL UNIQUE, -- provider subject (Eduvos/Microsoft OIDC sub)
    provider TEXT NOT NULL,           -- 'eduvos', 'microsoft', 'invited'
    email TEXT,                       -- nullable until verified
    display_name TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending_verification', -- pending_verification, active, suspended, deleted
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_users_external_id ON users(external_id);
CREATE INDEX idx_users_status ON users(status);

-- 2. identity_links: provider, subject, tenant, issuer, and verification metadata
CREATE TABLE identity_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,                    -- 'eduvos', 'microsoft'
    subject TEXT NOT NULL,                     -- OIDC sub claim
    tenant_id TEXT,                            -- Azure AD tenant ID
    issuer TEXT NOT NULL,                      -- OIDC issuer URL
    claims_json JSONB NOT NULL DEFAULT '{}',   -- raw verified claims
    verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    UNIQUE (provider, subject)
);
CREATE INDEX idx_identity_links_user_id ON identity_links(user_id);

-- 3. student_eligibility: institution status, campus, evidence source
CREATE TABLE student_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_domain TEXT NOT NULL,          -- e.g., 'eduvos.ac.za'
    campus_code TEXT NOT NULL,                 -- e.g., 'PTA', 'STB', 'DBN'
    campus_name TEXT NOT NULL,                 -- human-readable
    enrollment_status TEXT NOT NULL,           -- 'active', 'graduated', 'suspended', 'expired'
    evidence_source TEXT NOT NULL,             -- 'sso_claim', 'document_upload', 'manual_review'
    evidence_ref TEXT,                         -- reference to uploaded doc or claim
    verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_student_eligibility_user_id ON student_eligibility(user_id);
CREATE INDEX idx_student_eligibility_campus ON student_eligibility(campus_code);

-- 4. memberships: role/capability, campus/resource scope
CREATE TYPE membership_role AS ENUM ('buyer', 'seller', 'service_provider', 'courier', 'operations_staff', 'finance_staff', 'admin');
CREATE TYPE membership_state AS ENUM ('invited', 'active', 'suspended', 'revoked');

CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role membership_role NOT NULL,
    state membership_state NOT NULL DEFAULT 'invited',
    campus_codes TEXT[] NOT NULL DEFAULT '{}', -- empty = all campuses
    resource_scopes TEXT[] NOT NULL DEFAULT '{}', -- fine-grained scopes
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    revoked_reason TEXT,
    UNIQUE (user_id, role)
);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_role_state ON memberships(role, state);

-- 5. staff_invitations: inviter, target, requested role, expiry, acceptance
CREATE TABLE staff_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID NOT NULL REFERENCES users(id),
    target_email TEXT NOT NULL,
    requested_role membership_role NOT NULL,
    campus_codes TEXT[] NOT NULL DEFAULT '{}',
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES users(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_invitations_token ON staff_invitations(token);
CREATE INDEX idx_staff_invitations_target_email ON staff_invitations(target_email);

-- 6. sessions: provider-session references (optional, for audit)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- 7. audit_events: actor, action, target, scope, correlation, outcome, immutable timestamp
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id), -- nullable for system events
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,      -- e.g., 'user', 'listing', 'order', 'payout'
    target_id UUID,
    scope JSONB NOT NULL DEFAULT '{}', -- campus, resource, etc.
    correlation_id UUID,            -- links related events
    outcome TEXT NOT NULL,          -- 'success', 'failure', 'denied'
    error_code TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_user_id);
CREATE INDEX idx_audit_events_target ON audit_events(target_type, target_id);
CREATE INDEX idx_audit_events_correlation ON audit_events(correlation_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);

-- RLS: Enable row-level security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can read their own identity data
CREATE POLICY "Users can read own identity" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Identity links: user can read their own links
CREATE POLICY "Users can read own identity links" ON identity_links
    FOR SELECT USING (auth.uid() = user_id);

-- Student eligibility: user can read own eligibility
CREATE POLICY "Users can read own eligibility" ON student_eligibility
    FOR SELECT USING (auth.uid() = user_id);

-- Memberships: user can read own memberships; staff can read for their campuses
CREATE POLICY "Users can read own memberships" ON memberships
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.user_id = auth.uid()
            AND m.role IN ('operations_staff', 'finance_staff', 'admin')
            AND m.state = 'active'
            AND (m.campus_codes = '{}' OR m.campus_codes @> (SELECT campus_codes FROM student_eligibility WHERE user_id = auth.uid() LIMIT 1))
        )
    );

-- Staff invitations: inviter can read their own; target can read by email
CREATE POLICY "Inviters can read own invitations" ON staff_invitations
    FOR SELECT USING (auth.uid() = inviter_id);

CREATE POLICY "Targets can read invitations by email" ON staff_invitations
    FOR SELECT USING (auth.jwt() ->> 'email' = target_email);

-- Sessions: user can read own sessions
CREATE POLICY "Users can read own sessions" ON sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Audit events: user can read events where they are actor or target; staff can read all
CREATE POLICY "Users can read own audit events" ON audit_events
    FOR SELECT USING (
        auth.uid() = actor_user_id
        OR auth.uid() = target_id
        OR EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.user_id = auth.uid()
            AND m.role IN ('operations_staff', 'finance_staff', 'admin')
            AND m.state = 'active'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_eligibility_updated_at BEFORE UPDATE ON student_eligibility
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();