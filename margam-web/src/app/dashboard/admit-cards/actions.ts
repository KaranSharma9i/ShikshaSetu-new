'use server'

import { createClient } from '@/utils/supabase/server'
import { upsertAdmitCardSettings } from '@/lib/repositories/admitCardSettings'
import { revalidatePath } from 'next/cache'

export async function saveAdmitCardSettingsAction(
  institutionId: string,
  selectedTemplate: 'template_1' | 'template_2' | 'template_3',
  templateConfig?: Record<string, any>
) {
  try {
    const supabase = await createClient()

    const { success, error } = await upsertAdmitCardSettings(
      supabase,
      institutionId,
      selectedTemplate,
      templateConfig
    )

    if (!success) {
      console.error('Failed to save admit card settings:', error)
      return { success: false, error: error || 'Failed to save settings' }
    }

    revalidatePath('/dashboard/admit-cards')
    return { success: true }
  } catch (err: any) {
    console.error('Error in saveAdmitCardSettingsAction:', err)
    return { success: false, error: err.message || 'An unexpected error occurred' }
  }
}
