# Circulars Domain

## ENUMs

```sql
CREATE TYPE circular_audience AS ENUM ('all', 'students', 'teachers', 'parents', 'specific_class');
```

## Tables

### circulars
Rich-text announcements with optional file attachments.
```sql
CREATE TABLE circulars (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  created_by        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,          -- rich text (HTML or markdown)
  audience          circular_audience NOT NULL DEFAULT 'all',
  is_published      BOOLEAN NOT NULL DEFAULT FALSE,
  published_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,            -- optional expiry for time-sensitive notices
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_circulars_institution ON circulars(institution_id);
CREATE INDEX idx_circulars_academic_year ON circulars(academic_year_id);
CREATE INDEX idx_circulars_published ON circulars(is_published, published_at);
```

### circular_attachments
Files attached to a circular (stored as URLs/paths — no blobs).
```sql
CREATE TABLE circular_attachments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circular_id       UUID NOT NULL REFERENCES circulars(id) ON DELETE CASCADE,
  file_name         TEXT NOT NULL,
  file_url          TEXT NOT NULL,          -- S3/cloud storage URL
  file_type         TEXT,                   -- MIME type e.g. 'application/pdf'
  file_size_bytes   BIGINT CHECK (file_size_bytes > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_circular_attachments_circular ON circular_attachments(circular_id);
```

### circular_class_targets
When audience = 'specific_class', list which sections receive the circular.
```sql
CREATE TABLE circular_class_targets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circular_id       UUID NOT NULL REFERENCES circulars(id) ON DELETE CASCADE,
  section_id        UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (circular_id, section_id)
);

CREATE INDEX idx_circular_targets_circular ON circular_class_targets(circular_id);
CREATE INDEX idx_circular_targets_section ON circular_class_targets(section_id);
```

### circular_read_receipts
Track which users have seen/read a circular.
```sql
CREATE TABLE circular_read_receipts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circular_id       UUID NOT NULL REFERENCES circulars(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (circular_id, user_id)
);

CREATE INDEX idx_circular_receipts_circular ON circular_read_receipts(circular_id);
CREATE INDEX idx_circular_receipts_user ON circular_read_receipts(user_id);
```

## Relationships
- `circulars` → `institutions`, `academic_years`, `users` (creator)
- `circular_attachments` → `circulars`
- `circular_class_targets` → `circulars`, `sections` (used when audience = 'specific_class')
- `circular_read_receipts` → `circulars`, `users`
