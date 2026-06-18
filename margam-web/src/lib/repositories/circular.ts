import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export interface CircularsFilters {
  search?: string
  category?: string
  role?: string
}

export interface CreateCircularParams {
  institution_id: string
  title: string
  content: string
  publish_date: string
  expiry_date?: string | null
  created_by?: string | null
  category: string
  target_roles: string[]
  target_class_id?: string | null
}

export async function getCircularsList(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  filters: CircularsFilters
) {
  let query = (supabase
    .from('circulars') as any)
    .select(`
      id,
      title,
      content,
      publish_date,
      expiry_date,
      created_by,
      created_at,
      category,
      target_roles,
      target_class_id,
      class:classes (
        id,
        name
      ),
      creator:users (
        full_name
      )
    `)
    .eq('institution_id', institutionId)
    .is('deleted_at', null)

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }

  if (filters.role && filters.role !== 'all') {
    query = query.contains('target_roles', [filters.role])
  }

  // We fetch all non-deleted circulars, client-side search can filter further or we do a simple regex/ilike on search
  if (filters.search && filters.search.trim()) {
    query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
    .order('publish_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error in getCircularsList:', error)
    return []
  }

  return (data || []).map((c: any) => ({
    id: c.id,
    title: c.title,
    content: c.content,
    publish_date: c.publish_date,
    expiry_date: c.expiry_date,
    created_by: c.created_by,
    created_at: c.created_at,
    category: c.category || 'Announcement',
    target_roles: c.target_roles || [],
    target_class_id: c.target_class_id,
    class_name: c.class?.name || null,
    creator_name: c.creator?.full_name || 'System Admin'
  }))
}

export async function createCircular(
  supabase: SupabaseClient<Database>,
  params: CreateCircularParams
) {
  const { data, error } = await (supabase
    .from('circulars') as any)
    .insert({
      institution_id: params.institution_id,
      title: params.title,
      content: params.content,
      publish_date: params.publish_date,
      expiry_date: params.expiry_date || null,
      created_by: params.created_by || null,
      category: params.category,
      target_roles: params.target_roles,
      target_class_id: params.target_class_id || null
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error in createCircular:', error)
    return { success: false, error: error.message }
  }

  return { success: true, id: data.id }
}

export async function deleteCircular(
  supabase: SupabaseClient<Database>,
  id: string,
  institutionId: string
) {
  const { error } = await (supabase
    .from('circulars') as any)
    .update({
      deleted_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('institution_id', institutionId)

  if (error) {
    console.error('Error in deleteCircular:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getCircularDetails(
  supabase: SupabaseClient<Database>,
  id: string,
  institutionId: string
) {
  const { data, error } = await (supabase
    .from('circulars') as any)
    .select(`
      id,
      title,
      content,
      publish_date,
      expiry_date,
      created_by,
      created_at,
      category,
      target_roles,
      target_class_id,
      class:classes (
        id,
        name
      ),
      creator:users (
        full_name
      )
    `)
    .eq('id', id)
    .eq('institution_id', institutionId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    console.error('Error in getCircularDetails:', error)
    return null
  }

  if (!data) return null

  return {
    id: data.id,
    title: data.title,
    content: data.content,
    publish_date: data.publish_date,
    expiry_date: data.expiry_date,
    created_by: data.created_by,
    created_at: data.created_at,
    category: data.category || 'Announcement',
    target_roles: data.target_roles || [],
    target_class_id: data.target_class_id,
    class_name: (data.class as any)?.name || null,
    creator_name: (data.creator as any)?.full_name || 'System Admin'
  }
}
