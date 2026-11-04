// ─── Supabase + Static Member Service (รองรับทั้ง Cloud Realtime และ Local Fallback) ───
import defaultData from '../data/members.json'
import { getSupabase } from './supabaseClient'

// รายชื่อผู้ก่อตั้ง 6 คนที่ยศต้องเป็น HEAD (Rank 1) ตลอดกาล ห้ามเปลี่ยน
export const FIXED_HEAD_NAMES = [
  'awake unfair',
  'rix triples',
  'summer triples',
  'song triples',
  'yawhan triples',
  'normal triples',
]

// Key mapping สำหรับกลุ่มสมาชิกทั้งหมด (รองรับทั้งตัวพิมพ์ใหญ่และตัวพิมพ์เล็ก)
export const ROSTER_KEYS = {
  'MAIN TRIPLES': 'members',
  'TRIPLES PERFECT': 'triples_perfect',
  'TRIPLES LADY': 'triples_lady',
  'TAMSTEP': 'tamstep',
  'PERFECT': 'perfect',
  'HEREWEGOAGAIN': 'herewegoagain',
  'BABYYOUOK': 'babyyouok',
  'ROCKS': 'rocks',
  'members': 'members',
  'triples_perfect': 'triples_perfect',
  'triples_lady': 'triples_lady',
  'tamstep': 'tamstep',
  'perfect': 'perfect',
  'herewegoagain': 'herewegoagain',
  'babyyouok': 'babyyouok',
  'rocks': 'rocks',
}

export const ALL_ROSTER_KEYS = [
  'members',
  'triples_perfect',
  'triples_lady',
  'tamstep',
  'perfect',
  'herewegoagain',
  'babyyouok',
  'rocks',
]

const STORAGE_KEY = 'triples_roster_data'

// ดึงข้อมูลตั้งต้นจาก members.json
const baseDefault = defaultData?.data && typeof defaultData.data === 'object' && !Array.isArray(defaultData.data)
  ? defaultData.data
  : defaultData

// ฟังก์ชันล็อกยศ HEAD ให้ 6 ผู้ก่อตั้งถาวร
export function enforceFixedHeads(membersList) {
  if (!Array.isArray(membersList)) return membersList
  return membersList.map((m) => {
    const nameLower = (m.name || m.username || '').toLowerCase().trim()
    if (FIXED_HEAD_NAMES.includes(nameLower)) {
      return {
        ...m,
        role: 'Head',
        rankOrder: '1',
      }
    }
    return m
  })
}

// ฟังก์ชันโหลดข้อมูลสมาชิกจาก LocalStorage / Default
function loadStoredDB() {
  const merged = { ...baseDefault }

  if (merged.members) {
    merged.members = enforceFixedHeads(merged.members)
  }

  if (typeof window === 'undefined') return merged

  let storedObject = {}
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed === 'object') {
        const valid = parsed?.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data) ? parsed.data : parsed
        storedObject = { ...valid }
      }
    }
  } catch (e) {
    console.warn('LocalStorage load notice:', e)
  }

  ALL_ROSTER_KEYS.forEach((k) => {
    if (!storedObject[k] || !Array.isArray(storedObject[k]) || storedObject[k].length === 0) {
      try {
        const ind = localStorage.getItem(`triples_members_${k}`) || localStorage.getItem(`triples_admin_${k}`)
        if (ind) {
          const parsedInd = JSON.parse(ind)
          if (Array.isArray(parsedInd) && parsedInd.length > 0) {
            storedObject[k] = parsedInd
          }
        }
      } catch (e) {}
    }
  })

  Object.keys(storedObject).forEach((k) => {
    if (Array.isArray(storedObject[k]) && storedObject[k].length > 0) {
      merged[k] = storedObject[k]
    }
  })

  if (merged.members) {
    merged.members = enforceFixedHeads(merged.members)
  }

  return merged
}

// In-memory cache เริ่มต้น
let memoryDB = loadStoredDB()

// Subscribers สำหรับแจ้งเตือนเมื่อมีการเปลี่ยนแปลงข้อมูล
const listeners = new Set()

export const subscribeToRosterChanges = (callback) => {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

const notifyListeners = () => {
  listeners.forEach((cb) => {
    try {
      cb(memoryDB)
    } catch (e) {
      console.error(e)
    }
  })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('triples_roster_updated', { detail: memoryDB }))
  }
}

// ช่องทาง Realtime Subscription สำหรับ Supabase
let realtimeChannel = null

function setupSupabaseRealtime(supabase) {
  if (realtimeChannel || !supabase) return
  try {
    realtimeChannel = supabase
      .channel('public:triples_roster')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'triples_roster' },
        (payload) => {
          if (payload.new && payload.new.group_key) {
            const key = payload.new.group_key
            let members = Array.isArray(payload.new.members) ? payload.new.members : []
            if (key === 'members') members = enforceFixedHeads(members)

            memoryDB = {
              ...memoryDB,
              [key]: members,
            }
            notifyListeners()
          }
        }
      )
      .subscribe()
  } catch (e) {
    console.warn('Supabase Realtime subscription error:', e)
  }
}

// โหลดข้อมูลสมาชิกทั้งหมด (ดึงจาก Supabase ก่อนเสมอ หากเชื่อมต่อไว้)
export async function fetchAllMembers() {
  const supabase = getSupabase()

  if (supabase) {
    try {
      setupSupabaseRealtime(supabase)

      const { data, error } = await supabase
        .from('triples_roster')
        .select('group_key, members')

      if (!error && Array.isArray(data) && data.length > 0) {
        const cloudData = { ...memoryDB }
        data.forEach((row) => {
          if (row.group_key && Array.isArray(row.members)) {
            cloudData[row.group_key] = row.group_key === 'members'
              ? enforceFixedHeads(row.members)
              : row.members
          }
        })
        memoryDB = cloudData
        notifyListeners()

        // บันทึกลง LocalStorage ไว้เป็นแคชสำรอง
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryDB))
          }
        } catch (e) {}

        return memoryDB
      }
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to local:', e)
    }
  }

  // Fallback: ดึงข้อมูลล่าสุดจาก public/data/members.json และ LocalStorage
  try {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/data/members.json?t=${Date.now()}`)
        if (res.ok) {
          const remoteJson = await res.json()
          const remoteData = remoteJson?.data && typeof remoteJson.data === 'object' && !Array.isArray(remoteJson.data)
            ? remoteJson.data
            : remoteJson
          if (remoteData && typeof remoteData === 'object') {
            Object.assign(baseDefault, remoteData)
          }
        }
      } catch (err) {}

      memoryDB = loadStoredDB()
      notifyListeners()
      return memoryDB
    }
  } catch (e) {}

  memoryDB = loadStoredDB()
  notifyListeners()
  return memoryDB
}

// ดึงข้อมูลทั้งหมดในฐานข้อมูล (Synchronous สำหรับ UI render ทันที)
export function getAllMembers() {
  return memoryDB
}

// ดึงข้อมูลสมาชิกของกลุ่มที่ระบุ
export function getRosterMembers(rosterId) {
  const key = ROSTER_KEYS[rosterId] || rosterId || 'members'
  return memoryDB[key] || []
}

// บันทึกฐานข้อมูลสมาชิกทั้งหมดลง LocalStorage และ Supabase
export async function saveAllMembers(newData) {
  if (newData.members) {
    newData.members = enforceFixedHeads(newData.members)
  }

  memoryDB = { ...memoryDB, ...newData }
  notifyListeners()

  // 1. บันทึกลง LocalStorage ในเครื่อง
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryDB))
      ALL_ROSTER_KEYS.forEach((k) => {
        if (memoryDB[k] !== undefined) {
          try {
            localStorage.setItem(`triples_members_${k}`, JSON.stringify(memoryDB[k]))
          } catch (e) {}
        }
      })
    }
  } catch (err) {
    console.error('LocalStorage save error:', err)
  }

  // 2. บันทึกขึ้น Supabase Cloud Database หากตั้งค่าไว้
  const supabase = getSupabase()
  if (supabase) {
    try {
      const rows = ALL_ROSTER_KEYS.map((k) => ({
        group_key: k,
        members: memoryDB[k] || [],
        updated_at: new Date().toISOString(),
      }))
      await supabase.from('triples_roster').upsert(rows, { onConflict: 'group_key' })
    } catch (e) {
      console.error('Supabase saveAllMembers error:', e)
    }
  }

  return true
}

// บันทึกเฉพาะกลุ่มสมาชิก (เช่น เมื่อแก้ไขในแผง Admin หรือสลับตำแหน่ง)
export async function saveRosterMembers(rosterId, memberList) {
  const key = ROSTER_KEYS[rosterId] || rosterId || 'members'
  const finalMemberList = key === 'members' ? enforceFixedHeads(memberList) : memberList

  const updated = {
    ...memoryDB,
    [key]: finalMemberList,
  }

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`triples_members_${key}`, JSON.stringify(finalMemberList))
    }
  } catch (e) {}

  // ส่งขึ้น Supabase Cloud ทันที
  const supabase = getSupabase()
  if (supabase) {
    try {
      await supabase.from('triples_roster').upsert({
        group_key: key,
        members: finalMemberList,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'group_key' })
    } catch (e) {
      console.error('Supabase saveRosterMembers error:', e)
    }
  }

  return await saveAllMembers(updated)
}

// อัปเดตรูปโปรไฟล์ของสมาชิกรายบุคคล
export async function updateMemberAvatar(memberIdOrName, newAvatarUrl, groupNameOrKey) {
  let targetKey = ROSTER_KEYS[groupNameOrKey] || groupNameOrKey

  if (!targetKey || !memoryDB[targetKey]) {
    for (const k of Object.keys(memoryDB)) {
      if (Array.isArray(memoryDB[k])) {
        const found = memoryDB[k].some(
          (m) => m.id === memberIdOrName || m.name === memberIdOrName
        )
        if (found) {
          targetKey = k
          break
        }
      }
    }
  }

  targetKey = targetKey || 'members'
  const currentList = memoryDB[targetKey] || []
  const updatedList = currentList.map((m) => {
    if (m.id === memberIdOrName || (m.name && m.name === memberIdOrName)) {
      return {
        ...m,
        avatar: newAvatarUrl,
        imageUrl: newAvatarUrl,
      }
    }
    return m
  })

  return await saveRosterMembers(targetKey, updatedList)
}

// เริ่มต้นแจ้งเตือนทันทีเมื่อโมดูลโหลด
if (typeof window !== 'undefined') {
  setTimeout(() => {
    notifyListeners()
    fetchAllMembers().catch(() => {})
  }, 0)
}
