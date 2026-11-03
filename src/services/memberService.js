// ─── Pure Static Member Service (Frontend Static สำหรับ Vercel) ────────────────
import defaultData from '../data/members.json'

// Key mapping สำหรับกลุ่มสมาชิกทั้งหมด
export const ROSTER_KEYS = {
  'MAIN TRIPLES': 'members',
  'TRIPLES PERFECT': 'triples_perfect',
  'TRIPLES LADY': 'triples_lady',
  'TAMSTEP': 'tamstep',
  'PERFECT': 'perfect',
  'HEREWEGOAGAIN': 'herewegoagain',
  'BABYYOUOK': 'babyyouok',
  'ROCKS': 'rocks',
}

const STORAGE_KEY = 'triples_roster_data'

// ดึงข้อมูลตั้งต้นจาก members.json (รองรับทั้งรูปแบบห่อหุ้ม { data: ... } หรือ object ตรง)
const baseDefault = defaultData?.data && typeof defaultData.data === 'object' && !Array.isArray(defaultData.data)
  ? defaultData.data
  : defaultData

// In-memory cache เริ่มต้นจาก localStorage หรือ defaultData
let memoryDB = (() => {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') {
          const valid = parsed?.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data) ? parsed.data : parsed
          return { ...baseDefault, ...valid }
        }
      }
    }
  } catch (e) {
    console.warn('LocalStorage load notice:', e)
  }
  return { ...baseDefault }
})()

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

// โหลดข้อมูลสมาชิกทั้งหมด (ทำงานแบบ Static 100% รวดเร็ว ไม่มีติดขัด)
export async function fetchAllMembers() {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') {
          const valid = parsed?.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data) ? parsed.data : parsed
          memoryDB = { ...baseDefault, ...valid }
          notifyListeners()
          return memoryDB
        }
      }
    }
  } catch (e) {}

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

// บันทึกฐานข้อมูลสมาชิกทั้งหมดลง LocalStorage
export async function saveAllMembers(newData) {
  memoryDB = { ...memoryDB, ...newData }
  notifyListeners()

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryDB))
    }
    return true
  } catch (err) {
    console.error('Failed to save members to LocalStorage:', err)
    return false
  }
}

// บันทึกเฉพาะกลุ่มสมาชิก (เช่น เมื่อแก้ไขในแผง Admin หรือสลับตำแหน่ง)
export async function saveRosterMembers(rosterId, memberList) {
  const key = ROSTER_KEYS[rosterId] || rosterId || 'members'
  const updated = {
    ...memoryDB,
    [key]: memberList,
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
  setTimeout(() => notifyListeners(), 0)
}
