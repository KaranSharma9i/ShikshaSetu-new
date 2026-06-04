-- Migration: 0035_add_circular_category.sql
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS target_roles TEXT[] DEFAULT ARRAY['institution_admin'::text, 'teacher'::text, 'student'::text, 'driver'::text];
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS target_class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS category TEXT;
