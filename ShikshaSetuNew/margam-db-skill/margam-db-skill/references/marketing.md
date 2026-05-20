# Marketing Domain

## ENUMs

```sql
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE campaign_channel AS ENUM ('social_media', 'email', 'sms', 'whatsapp', 'referral', 'offline', 'other');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'interested', 'visit_scheduled', 'visited', 'enrolled', 'dropped');
```

## Tables

### campaigns
Marketing campaigns run by institutions to attract new students.
```sql
CREATE TABLE campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  name              TEXT NOT NULL,
  channel           campaign_channel NOT NULL,
  status            campaign_status NOT NULL DEFAULT 'draft',
  budget            NUMERIC(12,2) CHECK (budget >= 0),
  spent             NUMERIC(12,2) DEFAULT 0 CHECK (spent >= 0),
  target_leads      INTEGER CHECK (target_leads > 0),
  starts_on         DATE,
  ends_on           DATE,
  description       TEXT,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

CREATE INDEX idx_campaigns_institution ON campaigns(institution_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
```

### leads
Prospective students/parents captured via campaigns or walk-ins.
```sql
CREATE TABLE leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  campaign_id       UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  parent_name       TEXT NOT NULL,
  parent_phone      TEXT NOT NULL,
  parent_email      TEXT,
  student_name      TEXT,
  interested_class  TEXT,                   -- e.g. 'Grade 5'
  source            TEXT,                   -- e.g. 'Facebook Ad', 'Walk-in', 'Referral'
  status            lead_status NOT NULL DEFAULT 'new',
  assigned_to       UUID REFERENCES users(id) ON DELETE SET NULL,
  visit_scheduled_at TIMESTAMPTZ,
  visited_at        TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_leads_institution ON leads(institution_id);
CREATE INDEX idx_leads_campaign ON leads(campaign_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
```

### lead_activities
Timeline of interactions with a lead (calls, visits, messages).
```sql
CREATE TABLE lead_activities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  performed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type     TEXT NOT NULL,          -- e.g. 'call', 'visit', 'email_sent'
  notes             TEXT,
  performed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_date ON lead_activities(performed_at);
```

### enrollment_conversions
When a lead converts to an actual enrolled student, link them here.
```sql
CREATE TABLE enrollment_conversions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE RESTRICT,
  student_id        UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  converted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_conversions_lead ON enrollment_conversions(lead_id);
CREATE INDEX idx_conversions_student ON enrollment_conversions(student_id);
```

## Relationships
- `campaigns` → `institutions`, `users` (creator)
- `leads` → `institutions`, `campaigns`, `users` (assigned staff)
- `lead_activities` → `leads`, `users`
- `enrollment_conversions` → `leads`, `students`, `academic_years`

## Power BI Metrics Available
- Campaign ROI: `spent` vs enrolled conversions per campaign
- Lead funnel: count per `lead_status` per campaign
- Conversion rate: `enrollment_conversions` / total leads
- Channel performance: leads and conversions grouped by `campaign.channel`
