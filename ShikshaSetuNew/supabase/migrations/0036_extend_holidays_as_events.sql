-- Migration: 0036_extend_holidays_as_events.sql
ALTER TABLE holidays DROP CONSTRAINT IF EXISTS holidays_institution_id_date_key;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'holiday';
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS category TEXT;
