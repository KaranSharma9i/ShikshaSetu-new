-- 0023_create_marketing.sql
-- Migration for Marketing domain

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Marketing campaigns
CREATE TABLE marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    budget NUMERIC(12,2),
    objective TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Marketing channels (e.g., email, social, sms)
CREATE TABLE marketing_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    channel_type VARCHAR(50) NOT NULL,  -- e.g., "email", "social", "sms"
    details TEXT,                      -- JSON or description of channel specifics
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Marketing leads generated from campaigns
CREATE TABLE marketing_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
    source VARCHAR(100),               -- e.g., "website", "referral"
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'new',  -- e.g., "new", "contacted", "qualified", "lost"
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Marketing metrics (KPIs) per campaign
CREATE TABLE marketing_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Indexes for fast look‑ups
CREATE INDEX idx_marketing_campaigns_institution ON marketing_campaigns(institution_id);
CREATE INDEX idx_marketing_channels_campaign ON marketing_channels(campaign_id);
CREATE INDEX idx_marketing_leads_campaign ON marketing_leads(campaign_id);
CREATE INDEX idx_marketing_metrics_campaign ON marketing_metrics(campaign_id);
