-- Migration: 0040_create_id_card_settings.sql
-- Create id_card_settings table to store default ID card configuration per institution

CREATE TABLE public.id_card_settings (
  institution_id    UUID PRIMARY KEY REFERENCES public.institutions(id) ON DELETE RESTRICT,
  selected_template TEXT NOT NULL CHECK (selected_template IN ('template_1', 'template_2', 'template_3')) DEFAULT 'template_1',
  template_config   JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying
CREATE INDEX idx_id_card_settings_institution ON public.id_card_settings(institution_id);

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER trg_id_card_settings_timestamp
BEFORE UPDATE ON public.id_card_settings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();
