-- Migration: 0029_exams_syllabus.sql
-- ------------------------------------------------------------
-- Add syllabus_file_url, exam_time, venue to exams table
-- ------------------------------------------------------------

-- Add syllabus_file_url to exams table
ALTER TABLE exams
ADD COLUMN IF NOT EXISTS syllabus_file_url TEXT;

-- Add exam_time if not already exists
-- ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_time TIME;

-- Add venue/hall if not already exists  
ALTER TABLE exams
ADD COLUMN IF NOT EXISTS venue TEXT;
