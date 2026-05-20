-- Migration: 0021_create_circulars.sql
-- ------------------------------------------------------------
-- Circulars (announcements) tables for the Margam ERP platform
-- ------------------------------------------------------------

CREATE TABLE circulars (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  title             TEXT NOT NULL,
  content           TEXT NOT NULL,
  publish_date      DATE NOT NULL,
  expiry_date       DATE,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (institution_id, title, publish_date)
);

CREATE INDEX idx_circulars_institution ON circulars(institution_id);
CREATE INDEX idx_circulars_publish_date ON circulars(publish_date);
