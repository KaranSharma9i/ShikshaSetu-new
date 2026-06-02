-- Migration: 0031_homework_ai_generation.sql
-- ------------------------------------------------------------
-- Add AI generation related columns to the homework table
-- ------------------------------------------------------------

BEGIN;

-- Add ai_generated column if not exists
-- Marks whether this homework was created via AI generation
ALTER TABLE homework
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT false;

-- Add generated_content column if not exists
-- Stores the raw AI output: array of question objects before PDF is made
ALTER TABLE homework
ADD COLUMN IF NOT EXISTS generated_content JSONB DEFAULT NULL;

-- Add pdf_url column if not exists
-- Supabase Storage public URL of the generated PDF, populated after publish
ALTER TABLE homework
ADD COLUMN IF NOT EXISTS pdf_url TEXT DEFAULT NULL;

-- Add generation_status column if not exists
-- Tracks the AI generation lifecycle: 'generating' | 'generated' | 'published' | 'failed'
ALTER TABLE homework
ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT NULL;

-- Add check constraint for generation_status to ensure valid lifecycle values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'homework' AND constraint_name = 'homework_generation_status_check'
    ) THEN
        ALTER TABLE homework 
        ADD CONSTRAINT homework_generation_status_check 
        CHECK (generation_status IN ('generating', 'generated', 'published', 'failed'));
    END IF;
END $$;

-- Add question_config column if not exists
-- Stores the teacher's original question count inputs (mcq, short, long, etc.)
ALTER TABLE homework
ADD COLUMN IF NOT EXISTS question_config JSONB DEFAULT NULL;

COMMIT;
