import { createClient } from '@supabase/supabase-js'

// ค่าเริ่มต้นสำหรับ Supabase กลางของแก๊ง TRIPLES
const DEFAULT_SUPABASE_URL = 'https://vsirrrlrrmzqotwbomlt.supabase.co'
const DEFAULT_SUPABASE_KEY = 'sb_publishable_15HU2W29SjSRr9aDpxL08A_qONqIDNn'

// ดึงค่า URL และ Key จาก LocalStorage, Environment Variables หรือค่าเริ่มต้นกลาง
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

  const finalUrl = localUrl.trim() || envUrl.trim() || DEFAULT_SUPABASE_URL
  const finalKey = localKey.trim() || envKey.trim() || DEFAULT_SUPABASE_KEY

  return {
    url: finalUrl,
    key: finalKey,
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
