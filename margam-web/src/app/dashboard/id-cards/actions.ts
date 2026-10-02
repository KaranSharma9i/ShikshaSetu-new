'use server'

import { createClient } from '@/utils/supabase/server'
import { upsertIdCardSettings } from '@/lib/repositories/idCardSettings'
import { revalidatePath } from 'next/cache'

export async function saveIdCardSettingsAction(
  institutionId: string,
  selectedTemplate:
    | 'template_1'
    | 'template_2'
    | 'template_3'
    | 'template_4'
    | 'template_5'
    | 'template_6'
    | 'template_7'
    | 'template_8',
  templateConfig?: Record<string, any>
) {
  try {
    const supabase = await createClient()

    const { success, error } = await upsertIdCardSettings(
      supabase,
      institutionId,
      selectedTemplate,
      templateConfig
    )

    if (!success) {
      console.error('Failed to save ID card settings:', error)
      return { success: false, error: error || 'Failed to save settings' }
    }

    revalidatePath('/dashboard/id-cards')
    return { success: true }
  } catch (err: any) {
    console.error('Error in saveIdCardSettingsAction:', err)
    return { success: false, error: err.message || 'An unexpected error occurred' }
  }
}
