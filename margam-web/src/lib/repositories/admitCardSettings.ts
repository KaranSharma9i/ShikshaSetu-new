import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export type AdmitCardSettingsRow = Database['public']['Tables']['admit_card_settings']['Row']

export interface AdmitCardTemplateConfig {
  title?: string;
  instructions?: string[];
  footerNote?: string;
  [key: string]: any;
}

export const DEFAULT_ADMIT_CARD_CONFIG: AdmitCardTemplateConfig = {
  title: "ADMIT CARD",
  instructions: [
    "Please bring your admit card and school ID card to the examination hall.",
    "Report to the examination room at least 15 minutes before the start time.",
    "Do not bring books, bags, mobile phones, or smartwatches into the hall.",
    "Students will not be allowed to enter the hall after 15 minutes of exam start.",
    "Maintain silence and discipline inside the examination hall."
  ],
  footerNote: "This is a computer generated admit card. No physical signature is required."
};

/**
 * Fetches the default admit card settings for a given institution.
 * Returns null if no settings have been saved yet.
 */
export async function getAdmitCardSettings(
  supabase: SupabaseClient<Database>,
  institutionId: string
): Promise<AdmitCardSettingsRow | null> {
  const { data, error } = await (supabase
    .from('admit_card_settings') as any)
    .select('*')
    .eq('institution_id', institutionId)
    .maybeSingle()

  if (error) {
    console.error('Error in getAdmitCardSettings:', error)
    return null
  }
  return data
}

/**
 * Creates or updates the admit card settings for a given institution.
 * Always filters/scopes the write operation to the current institution_id.
 */
export async function upsertAdmitCardSettings(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  selectedTemplate: string,
  templateConfig?: Record<string, any>
): Promise<{ success: boolean; data?: AdmitCardSettingsRow; error?: string }> {
  const { data, error } = await (supabase
    .from('admit_card_settings') as any)
    .upsert({
      institution_id: institutionId,
      selected_template: selectedTemplate,
      template_config: templateConfig ?? DEFAULT_ADMIT_CARD_CONFIG
    })
    .select()
    .single()

  if (error) {
    console.error('Error in upsertAdmitCardSettings:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}
