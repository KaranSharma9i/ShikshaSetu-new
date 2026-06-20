-- Migration: 0048_add_template_4_id_card_settings.sql
-- Update id_card_settings table check constraint to support template_4 (Portrait + Watermark)

-- Drop the old constraint
ALTER TABLE public.id_card_settings 
DROP CONSTRAINT IF EXISTS id_card_settings_selected_template_check;

-- Add the updated constraint
ALTER TABLE public.id_card_settings 
ADD CONSTRAINT id_card_settings_selected_template_check 
CHECK (selected_template IN ('template_1', 'template_2', 'template_3', 'template_4'));
