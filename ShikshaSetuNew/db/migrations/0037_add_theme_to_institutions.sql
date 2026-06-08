-- Migration: 0037_add_theme_to_institutions.sql
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}'::jsonb;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS tagline TEXT;
