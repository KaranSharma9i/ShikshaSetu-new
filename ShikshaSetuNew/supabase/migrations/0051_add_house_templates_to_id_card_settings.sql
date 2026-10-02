-- Migration: 0051_add_house_templates_to_id_card_settings.sql
-- Update id_card_settings table check constraint to support templates 5-8 (House templates)

-- Drop the old constraint
ALTER TABLE public.id_card_settings 
DROP CONSTRAINT IF EXISTS id_card_settings_selected_template_check;

-- Add the updated constraint
ALTER TABLE public.id_card_settings 
ADD CONSTRAINT id_card_settings_selected_template_check 
CHECK (selected_template IN (
  'template_1', 'template_2', 'template_3', 'template_4',
  'template_5', 'template_6', 'template_7', 'template_8'
));
