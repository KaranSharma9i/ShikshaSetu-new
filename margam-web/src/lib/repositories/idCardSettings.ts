import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export type IDCardSettingsRow = Database['public']['Tables']['id_card_settings']['Row']

/**
 * Fetches the default ID card settings for a given institution.
 * Returns null if no settings have been saved yet.
 */
export async function getIdCardSettings(
  supabase: SupabaseClient<Database>,
  institutionId: string
): Promise<IDCardSettingsRow | null> {
  const { data, error } = await (supabase
    .from('id_card_settings') as any)
    .select('*')
    .eq('institution_id', institutionId)
    .maybeSingle()

  if (error) {
    console.error('Error in getIdCardSettings:', error)
    return null
  }
  return data
}

/**
 * Creates or updates the ID card settings for a given institution.
 * Always filters/scopes the write operation to the current institution_id.
 */
export async function upsertIdCardSettings(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  selectedTemplate: string,
  templateConfig?: Record<string, any>
): Promise<{ success: boolean; data?: IDCardSettingsRow; error?: string }> {
  const { data, error } = await (supabase
    .from('id_card_settings') as any)
    .upsert({
      institution_id: institutionId,
      selected_template: selectedTemplate,
      template_config: templateConfig ?? {}
    })
    .select()
    .single()

  if (error) {
    console.error('Error in upsertIdCardSettings:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}
