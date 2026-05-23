import { supabase } from './supabase'

const testSupabase = async () => {
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .limit(1)

  if (error) {
    console.log('❌ Connection failed:', error.message)
  } else {
    console.log('✅ Supabase connected successfully!')
    console.log('Data:', data)
  }
}

testSupabase()