import { createClient } from '@supabase/supabase-js'

// ดึงค่า URL และ Key จาก Environment Variables หรือจาก LocalStorage ที่ตั้งค่าไว้ในหน้า Admin
const getSupabaseConfig = () => {
  const envUrl = import.meta.env?.VITE_SUPABASE_URL || ''
  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || ''

  let localUrl = ''
  let localKey = ''
  try {
    if (typeof window !== 'undefined') {
      localUrl = localStorage.getItem('triples_supabase_url') || ''
      localKey = localStorage.getItem('triples_supabase_key') || ''
    }
  } catch (e) {}

  return {
    url: localUrl.trim() || envUrl.trim(),
    key: localKey.trim() || envKey.trim(),
  }
}

let supabaseInstance = null
let currentConfig = { url: '', key: '' }

export const getSupabase = () => {
  const { url, key } = getSupabaseConfig()

  if (!url || !key) return null

  // สร้างใหม่ถ้า config มีการเปลี่ยนแปลง
  if (!supabaseInstance || currentConfig.url !== url || currentConfig.key !== key) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: { persistSession: false },
      })
      currentConfig = { url, key }
    } catch (e) {
      console.error('Supabase initialization failed:', e)
      return null
    }
  }

  return supabaseInstance
}

export const isSupabaseConfigured = () => {
  const { url, key } = getSupabaseConfig()
  return Boolean(url && key)
}
